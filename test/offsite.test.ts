import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync, existsSync, chmodSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
import { startMediaWorker } from '../src/media.js';
import { validateSnapshot } from '../src/backup.js';

const modulePath = '../src/offsite.js';
async function load() { const m = await import(modulePath).catch(() => null); assert.ok(m?.runOffsiteBackup && m?.produceOffsiteCopy && m?.recoverOffsiteCopy, 'cópia age por pull e recuperação integral devem existir'); return m; }
async function fixture(t: { after(fn: () => unknown): void }) {
  const base = mkdtempSync(join(tmpdir(), 'zap-offsite-'));
  t.after(() => rmSync(base, { recursive: true }));
  for (const name of ['source-ops', 'notebook-ops', 'copies', 'kit']) mkdirSync(join(base, name), { mode: 0o700 });
  const identityFile = join(base, 'kit', 'identity');
  execFileSync('/usr/bin/age-keygen', ['-o', identityFile], { stdio: 'ignore' }); chmodSync(identityFile, 0o600);
  const recipient = execFileSync('/usr/bin/age-keygen', ['-y', identityFile], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const recipientFile = join(base, 'recipient'); writeFileSync(recipientFile, recipient, { mode: 0o600 });
  const dataDir = join(base, 'source'), s = createService({ dataDir });
  createAuthState(s.authDb, { newProfile: true }); await s.setPassword('senha de fixture independente');
  const bytes = Buffer.from('PRIVATE_SENTINEL_ORIGINAL');
  s.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'offsite', fromMe: false }, messageTimestamp: 1700000000, message: { imageMessage: { url: 'https://mmg.whatsapp.net/file', mediaKey: Buffer.alloc(32), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest(), caption: 'PRIVATE_SENTINEL_CAPTION' } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dataDir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop(); await s.close();
  const events: string[] = []; let running = true;
  const controller = { async stop() { events.push('stop'); running = false; }, async start() { events.push('resume'); running = true; }, async inspect() { return { running, autostart: false, pid: running ? process.pid : 0, startTime: null, machineId: 'fixture', profileProcesses: running ? 1 : 0, mode: 'offline' }; } };
  const source: any = { role: 'source', dataDir, operationDir: join(base, 'source-ops'), destination: join(base, 'snapshot'), priorMode: 'offline', priorRelease: 'fixture', supervisor: { kind: 'systemd', name: 'fixture.service', dataDir, machineId: '0'.repeat(32) }, recipientFile, maxBytes: 10_000_000, reserveBytes: 0 };
  const pull: any = { role: 'pull', operationDir: join(base, 'notebook-ops'), destinationDir: join(base, 'copies'), identityFile, maxBytes: 10_000_000, reserveBytes: 0 };
  return { base, source, pull, controller, events, bytes };
}
function adapter(m: any, f: Awaited<ReturnType<typeof fixture>>, fault?: string) {
  return {
    async putNew(id: string, output: string, signal: AbortSignal) {
      const result = await m.produceOffsiteCopy(f.source, id, { controller: f.controller });
      assert.equal((await f.controller.inspect()).running, true); f.events.push('network');
      copyFileSync(result.file, output); chmodSync(output, 0o600);
      if (fault === 'partial') { writeFileSync(output, 'partial'); throw Error('PRIVATE_SENTINEL_REMOTE_AUTH'); }
      if (fault === 'corrupt') writeFileSync(output, 'corrupt'); signal.throwIfAborted();
    },
    async getById(id: string, output: string) { copyFileSync(join(f.pull.destinationDir, id + '.age'), output); chmodSync(output, 0o600); if (fault === 'readback') writeFileSync(output, 'corrupt readback'); },
    async acknowledge(receipt: any) { await m.acknowledgeOffsiteCopy(f.source, receipt); }
  };
}

test('pull age retoma antes da rede e recupera SQL FTS sessão e todos originais', async t => {
  const f = await fixture(t), m = await load();
  const result = await m.runOffsiteBackup(f.pull, { adapter: adapter(m, f) });
  assert.deepEqual(f.events, ['stop', 'resume', 'network']); assert.equal(result.verified, true);
  const encrypted = readFileSync(join(f.pull.destinationDir, result.operationId + '.age')); assert.equal(encrypted.includes(Buffer.from('PRIVATE_SENTINEL')), false);
  const recovery = await m.recoverOffsiteCopy(f.pull, result.operationId, join(f.base, 'recovered'));
  const snapshot = validateSnapshot(recovery.snapshotDir); assert.equal(snapshot.manifest.databases['archive.sqlite'].counts.messages, 1);
  for (const file of snapshot.manifest.files.filter((x: any) => x.path.endsWith('.bin'))) assert.deepEqual(readFileSync(join(recovery.snapshotDir, file.path)), f.bytes);
  const restored = createService({ dataDir: recovery.restoredDir });
  try { assert.equal(restored.archive.getCoverage().uniqueMessages, 1); assert.equal((restored.archiveDb.prepare("SELECT count(*) n FROM search_fts WHERE search_fts MATCH 'CAPTION'").get() as { n: number }).n, 1); assert.throws(() => restored.startCollector(), /offline|restaurad|promo/i); } finally { await restored.close(); }
});

test('partial corrupção readback e chave errada não publicam sucesso externo', async t => {
  const m = await load();
  for (const point of ['partial', 'corrupt', 'readback', 'key']) {
    const f = await fixture(t);
    if (point === 'key') { const bad = join(f.base, 'kit', 'wrong'); execFileSync('/usr/bin/age-keygen', ['-o', bad], { stdio: 'ignore' }); chmodSync(bad, 0o600); f.pull.identityFile = bad; }
    await assert.rejects(m.runOffsiteBackup(f.pull, { adapter: adapter(m, f, point) }));
    const state = JSON.parse(readFileSync(join(f.pull.operationDir, 'offsite-state.json'), 'utf8')); assert.equal(state.lastVerifiedSuccess ?? null, null); assert.equal((await f.controller.inspect()).running, true);
  }
});

test('produtor reapresenta somente mesmo ID imutável sem nova parada e ACK exige digest', async t => {
  const f = await fixture(t), m = await load(), id = randomUUID();
  const first = await m.produceOffsiteCopy(f.source, id, { controller: f.controller });
  const second = await m.produceOffsiteCopy(f.source, id, { controller: f.controller });
  assert.equal(first.file, second.file); assert.deepEqual(f.events, ['stop', 'resume']);
  await assert.rejects(m.acknowledgeOffsiteCopy(f.source, { ...first.receipt, manifestHash: '0'.repeat(64) }));
  assert.equal(JSON.parse(readFileSync(join(f.source.operationDir, 'offsite-state.json'), 'utf8')).lastVerifiedSuccess ?? null, null);
  assert.equal(existsSync(join(f.base, 'source', 'auth.sqlite')), true);
});

test('status mede RPO pela criação do snapshot e autentica allowlist sem identificadores', async t => {
  const f = await fixture(t), m = await load(); assert.equal(typeof m.backupStatus, 'function', 'status honesto do backup deve existir');
  await m.runOffsiteBackup(f.pull, { adapter: adapter(m, f) });
  const path = join(f.pull.operationDir, 'offsite-state.json'), state = JSON.parse(readFileSync(path, 'utf8'));
  const now = Date.now(); state.lastVerifiedSuccess.snapshotCreatedAt = new Date(now - 25 * 3600000).toISOString(); state.lastVerifiedSuccess.verifiedAt = new Date(now - 1000).toISOString(); writeFileSync(path, JSON.stringify(state), { mode: 0o600 });
  const status = m.backupStatus(path, now); assert.equal(status.overdue24h, true); assert.equal(status.ageSeconds, 25 * 3600); assert.equal(status.result, 'success');
  assert.equal(status.lastVerifiedAt, state.lastVerifiedSuccess.verifiedAt); assert.equal(JSON.stringify(status).includes(state.operationId), false); assert.equal(JSON.stringify(status).includes(f.base), false);
  const service = createService({ dataDir: f.source.dataDir, backupStateFile: path } as any), server = service.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise<void>(r => server.close(() => r())); await service.close(); });
  const base = `http://127.0.0.1:${(server.address() as any).port}`; assert.equal((await fetch(base + '/api/status')).status, 401);
  const challenge = await fetch(base + '/api/session'), csrfToken = (await challenge.json()).csrfToken;
  const login = await fetch(base + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'senha de fixture independente', csrfToken }) }); assert.equal(login.status, 200);
  const response = await fetch(base + '/api/status', { headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } }); assert.deepEqual((await response.json()).backup, status);
  state.result = 'failed'; state.safeFailureCode = 'PRIVATE_SENTINEL_REMOTE_HOST'; writeFileSync(path, JSON.stringify(state)); assert.equal(JSON.stringify(m.backupStatus(path)).includes('PRIVATE_SENTINEL'), false);
});

test('último bom permanece após capacidade timeout auth key symlink e concorrência', async t => {
  const f = await fixture(t), m = await load(); await m.runOffsiteBackup(f.pull, { adapter: adapter(m, f) });
  const path = join(f.pull.operationDir, 'offsite-state.json'), last = JSON.parse(readFileSync(path, 'utf8')).lastVerifiedSuccess, original = readFileSync(join(f.pull.destinationDir, last.operationId + '.age'));
  let attempts = 0;
  const denied = { ...adapter(m, f), async putNew() { attempts++; throw Error('PRIVATE_SENTINEL_SSH_AUTH'); } };
  await assert.rejects(m.runOffsiteBackup(f.pull, { adapter: denied })); assert.equal(attempts, 3); assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')).lastVerifiedSuccess, last);
  await assert.rejects(m.runOffsiteBackup(f.pull, { adapter: denied, fault: (p: string) => { if (p === 'capacity') throw Object.assign(Error('ENOSPC'), { code: 'ENOSPC' }); } })); assert.equal(attempts, 3); assert.equal(m.backupStatus(path).safeFailureCode, 'capacity_insufficient');
  await assert.rejects(m.runOffsiteBackup(f.pull, { adapter: denied, fault: (p: string) => { if (p === 'transfer') throw new DOMException('private timeout', 'TimeoutError'); } })); assert.equal(m.backupStatus(path).safeFailureCode, 'deadline_exceeded');
  const link = join(f.base, 'link'); symlinkSync(f.pull.destinationDir, link); await assert.rejects(m.runOffsiteBackup({ ...f.pull, destinationDir: link }, { adapter: denied }));
  await assert.rejects(m.runOffsiteBackup({ ...f.pull, identityFile: join(f.base, 'missing') }, { adapter: denied }));
  await m.runOffsiteBackup(f.pull, { adapter: adapter(m, f), fault: async (p: string) => { if (p === 'readback') await assert.rejects(m.runOffsiteBackup(f.pull, { adapter: denied }), /ativo/); } });
  assert.deepEqual(readFileSync(join(f.pull.destinationDir, last.operationId + '.age')), original);
});

test('ENOSPC real por orçamento recusa produtor antes de parar a fonte', async t => {
  const f = await fixture(t), m = await load();
  await assert.rejects(m.produceOffsiteCopy({ ...f.source, maxBytes: 1024 }, randomUUID(), { controller: f.controller }), /Orçamento/); assert.deepEqual(f.events, []);
});

test('SIGKILL durante pull/publicação/readback mantém último bom e retoma mesmo ID', async t => {
  const f = await fixture(t), m = await load(); await m.runOffsiteBackup(f.pull, { adapter: adapter(m, f) });
  const path = join(f.pull.operationDir, 'offsite-state.json'); let last = JSON.parse(readFileSync(path, 'utf8')).lastVerifiedSuccess;
  for (const point of ['publishing', 'readback', 'verified']) {
    const prepared = await m.produceOffsiteCopy(f.source, randomUUID(), { controller: f.controller });
    const childSource = `import{runOffsiteBackup,acknowledgeOffsiteCopy}from'./dist/src/offsite.js';import{copyFileSync,chmodSync}from'node:fs';import{join}from'node:path';const c=JSON.parse(process.env.CONFIG),s=JSON.parse(process.env.SOURCE);const a={async putNew(i,p){copyFileSync(process.env.CIPHER,p);chmodSync(p,384)},async getById(i,p){copyFileSync(join(c.destinationDir,i+'.age'),p);chmodSync(p,384)},async acknowledge(r){await acknowledgeOffsiteCopy(s,r)}};await runOffsiteBackup(c,{adapter:a,fault:async p=>{if(p===process.env.POINT){console.log('ready');await new Promise(()=>setInterval(()=>{},1000))}}});`;
    const state = JSON.parse(readFileSync(path, 'utf8')); state.result = 'pending'; state.operationId = prepared.receipt.operationId; writeFileSync(path, JSON.stringify(state));
    const child = spawn(process.execPath, ['--input-type=module', '-e', childSource], { env: { ...process.env, CONFIG: JSON.stringify(f.pull), SOURCE: JSON.stringify(f.source), CIPHER: prepared.file, POINT: point }, stdio: ['ignore', 'pipe', 'pipe'] }); t.after(() => child.kill('SIGKILL'));
    await new Promise<void>((accept, reject) => { const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('crash timeout')); }, 5000); child.stdout.on('data', b => { if (String(b).includes('ready')) { clearTimeout(timer); accept(); } }); child.once('exit', code => { clearTimeout(timer); reject(Error('crash exited ' + code)); }); });
    const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit;
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')).lastVerifiedSuccess, last);
    await m.runOffsiteBackup(f.pull, { adapter: adapter(m, f) }); last = JSON.parse(readFileSync(path, 'utf8')).lastVerifiedSuccess;
    assert.equal(last.operationId, prepared.receipt.operationId);
  }
});

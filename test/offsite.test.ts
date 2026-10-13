import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
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

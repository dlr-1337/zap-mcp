import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';
import { createAuthState } from '../src/whatsapp.js';
const bytes = Buffer.from('original persistido');
const hash = createHash('sha256').update(bytes).digest();
function media(id: string, node: Record<string, unknown> = {}) { return { key: { remoteJid: '1@s.whatsapp.net', id, fromMe: false }, messageTimestamp: 1700000000, message: { documentMessage: { url: 'https://mmg.whatsapp.net/file', mediaKey: Buffer.alloc(32), fileLength: bytes.length, fileSha256: hash, ...node } } }; }
function setup(t: { after(fn: () => unknown): void }) { const dir = mkdtempSync(join(tmpdir(), 'zap-recovery-')); let service = createService({ dataDir: dir }); t.after(async () => { await service.close(); rmSync(dir, { recursive: true }); }); return { dir, get service() { return service; }, reopen() { service.close(); service = createService({ dataDir: dir }); } }; }
function idOf(s: ReturnType<typeof createService>, message: ReturnType<typeof media>) { return (s.archive.readStoredMessage(message.key) as any).attachments[0].id as string; }

test('reinício detecta original disponível corrompido sem perder mensagem', async t => {
  const f = setup(t), message = media('corrupt'); f.service.archive.ingestUpsert({ messages: [message], type: 'notify' });
  const worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const id = idOf(f.service, message); writeFileSync(join(f.dir, 'media', id + '.bin'), 'corrupt'); f.reopen();
  assert.equal((f.service.archive.getAttachment(id) as any).state, 'retry_wait', 'reconcile deve conferir hash do final');
  assert.equal(f.service.archive.getCoverage().uniqueMessages, 1); assert.equal(readFileSync(join(f.dir, 'media', id + '.bin'), 'utf8'), 'corrupt');
});

test('máximo2, tentativas4/5/6, lease e offline preservam orçamento', async t => {
  const f = setup(t); const messages = Array.from({ length: 6 }, (_, i) => media('retry' + i)); f.service.archive.ingestUpsert({ messages, type: 'notify' });
  let live = 0, peak = 0, online = false, time = 0, calls = 0;
  const worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), online: () => online, now: () => time,
    downloadOriginal: async () => { calls++; live++; peak = Math.max(peak, live); await new Promise(resolve => setImmediate(resolve)); live--; throw Error('404/410'); } });
  await worker.drain(); assert.equal(calls, 0); online = true;
  for (let i = 1; i <= 6; i++) { await worker.drain(); time += 60_000; const jobs = f.service.archive.db.prepare('SELECT attempts,state FROM media_jobs').all() as any[]; assert.ok(jobs.every(j => j.attempts === Math.min(i, 5))); if (i === 4) assert.ok(jobs.every(j => j.state === 'retry_wait')); if (i >= 5) assert.ok(jobs.every(j => j.state === 'unavailable')); }
  await worker.stop(); assert.equal(calls, 30); assert.equal(peak, 2);
});

test('reserva no limiar e ENOSPC pausam sem alterar originais anteriores', async t => {
  const f = setup(t); const prior = media('prior'); f.service.archive.ingestUpsert({ messages: [prior], type: 'notify' });
  let worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const id = idOf(f.service, prior), next = media('next'); f.service.archive.ingestUpsert({ messages: [next], type: 'notify' });
  let calls = 0, free = 256n * 1024n * 1024n;
  worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), diskSpace: () => ({ free, total: 1n << 30n }), downloadOriginal: async () => { calls++; return Readable.from((async function* () { yield bytes.subarray(0, 2); throw Object.assign(Error('disk'), { code: 'ENOSPC' }); })()); } } as Parameters<typeof startMediaWorker>[0]);
  await worker.drain(); assert.equal(calls, 0); assert.equal(worker.snapshot().paused, true); assert.equal((f.service.archive.getAttachment(idOf(f.service, next)) as any).attempts, 0);
  free--; await worker.drain(); assert.equal(calls, 0); free = 1n << 30n; await worker.drain(); assert.equal(calls, 1); assert.equal(worker.snapshot().paused, true); assert.match(worker.snapshot().diagnostic!, /espaço/i); await worker.stop();
  assert.deepEqual(readFileSync(join(f.dir, 'media', id + '.bin')), bytes); assert.equal(f.service.archive.getCoverage().uniqueMessages, 2);
});

test('reserva de tamanho desconhecido cede variação do disco sem cancelar compromisso conhecido', async t => {
  const f = setup(t), known = media('known-space'), unknown = media('unknown-space', { fileLength: undefined, fileSha256: undefined });
  f.service.archive.ingestUpsert({ messages: [known, unknown], type: 'notify' });
  let free = 1n << 30n, calls = 0;
  const worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), diskSpace: () => ({ free, total: 1n << 30n }),
    downloadOriginal: async () => { calls++; if (calls === 2) free -= 4096n; return Readable.from([bytes]); } });
  await worker.drain(); await worker.stop();
  assert.equal(calls, 2); assert.equal(f.service.archive.getAttachment(idOf(f.service, known))!.state, 'available'); assert.equal(f.service.archive.getAttachment(idOf(f.service, unknown))!.state, 'available');
  assert.equal(worker.snapshot().diagnostic, null);
});

test('crash após job/part/publicação/beforeAvailable recupera sem apagar acervo', async t => {
  for (const point of ['job', 'part', 'published', 'beforeAvailable']) {
    const dir = mkdtempSync(join(tmpdir(), 'zap-crash-')); const parent = createService({ dataDir: dir });
    parent.archive.ingestUpsert({ messages: [media('prior')], type: 'notify' });
    const worker = startMediaWorker({ archive: parent.archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop(); const prior = idOf(parent, media('prior')); parent.close();
    const source = `import {createService} from './dist/src/main.js';import {startMediaWorker} from './dist/src/media.js';import {Readable} from 'node:stream';import {createHash} from 'node:crypto';const b=Buffer.from('original persistido');const s=createService({dataDir:process.env.ZAP_DATA_DIR});s.archive.ingestUpsert({type:'notify',messages:[{key:{remoteJid:'1@s.whatsapp.net',id:'crash',fromMe:false},messageTimestamp:1700000000,message:{documentMessage:{url:'https://mmg.whatsapp.net/file',mediaKey:Buffer.alloc(32),fileLength:b.length,fileSha256:createHash('sha256').update(b).digest()}}}]});const wait=()=>{console.log('ready');return new Promise(()=>{});};if(process.env.POINT==='job')await wait();const w=startMediaWorker({archive:s.archive,mediaDir:process.env.ZAP_DATA_DIR+'/media',downloadOriginal:async()=>Readable.from((async function*(){yield b.subarray(0,2);if(process.env.POINT==='part')await wait();yield b.subarray(2);})()),fault:async p=>{if(p===process.env.POINT)await wait();}});await w.drain();`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, ZAP_DATA_DIR: dir, POINT: point }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = ''; child.stderr.on('data', x => { stderr += x; });
    t.after(() => { child.kill('SIGKILL'); rmSync(dir, { recursive: true }); });
    await new Promise<void>((resolve, reject) => { const timeout = setTimeout(() => reject(Error('child timeout: ' + stderr)), 5000); child.stdout.on('data', data => { if (String(data).includes('ready')) { clearTimeout(timeout); resolve(); } }); child.once('exit', code => { clearTimeout(timeout); reject(Error('child exit: ' + code + stderr)); }); });
    child.kill('SIGKILL'); await once(child, 'exit');
    let restored = createService({ dataDir: dir }); const id = idOf(restored, media('crash'));
    if (point === 'published' || point === 'beforeAvailable') assert.equal(restored.archive.getAttachment(id)!.state, 'available');
    else { assert.notEqual(restored.archive.getAttachment(id)!.state, 'available'); const retry = startMediaWorker({ archive: restored.archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await retry.drain(); await retry.stop(); }
    assert.deepEqual(readFileSync(join(dir, 'media', id + '.bin')), bytes); assert.deepEqual(readFileSync(join(dir, 'media', prior + '.bin')), bytes);
    assert.equal(restored.archive.getCoverage().uniqueMessages, 2); restored.close(); restored = createService({ dataDir: dir }); assert.equal(restored.archive.getAttachment(id)!.state, 'available'); assert.equal((restored.archive.db.prepare('SELECT count(*) n FROM media_jobs').get() as any).n, 2); restored.close();
  }
});

test('reconcile conserva órfãos desconhecidos e falha SQL nunca confirma available', async t => {
  const f = setup(t), message = media('sql'); f.service.archive.ingestUpsert({ messages: [message], type: 'notify' });
  f.service.archive.db.exec("CREATE TRIGGER media_fault BEFORE UPDATE OF state ON attachments WHEN NEW.state='available' BEGIN SELECT RAISE(ABORT,'injected'); END");
  const worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const id = idOf(f.service, message); assert.notEqual(f.service.archive.getAttachment(id)!.state, 'available'); assert.deepEqual(readFileSync(join(f.dir, 'media', id + '.bin')), bytes);
  f.service.archive.db.exec('DROP TRIGGER media_fault'); writeFileSync(join(f.dir, 'media', 'unknown.bin'), 'unknown'); f.reopen(); f.reopen(); assert.equal(f.service.archive.getAttachment(id)!.state, 'available'); assert.equal(readFileSync(join(f.dir, 'media', 'unknown.bin'), 'utf8'), 'unknown');
});

test('lease vencida e stream tardio após stop jamais publicam available', async t => {
  const f = setup(t), message = media('lease'); f.service.archive.ingestUpsert({ messages: [message], type: 'notify' }); const id = idOf(f.service, message);
  const worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from((async function* () {
    yield bytes.subarray(0, 2); f.service.archive.db.prepare("UPDATE media_jobs SET generation='retired' WHERE attachment_id=?").run(id); yield bytes.subarray(2);
  })()) }); await worker.drain(); await worker.stop(); assert.notEqual(f.service.archive.getAttachment(id)!.state, 'available'); assert.equal(existsSync(join(f.dir, 'media', id + '.bin')), false);
  f.reopen();
  let accept!: (value: Readable) => void, started!: () => void; const begun = new Promise<void>(r => { started = r; });
  const late = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => { started(); return new Promise<Readable>(r => { accept = r; }); } });
  await begun; await late.stop(); const stream = Readable.from([bytes]); accept(stream); await new Promise(r => setImmediate(r)); assert.equal(stream.destroyed, true); assert.notEqual(f.service.archive.getAttachment(id)!.state, 'available');
});

test('original ausente e espaço desconhecido esgotado ficam explícitos sem apagar acervo', async t => {
  const f = setup(t), message = media('missing'); f.service.archive.ingestUpsert({ messages: [message], type: 'notify' });
  let worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop(); const id = idOf(f.service, message); rmSync(join(f.dir, 'media', id + '.bin')); f.reopen(); assert.equal(f.service.archive.getAttachment(id)!.state, 'retry_wait');
  const unknown = media('unknown', { fileLength: undefined, fileSha256: undefined }); f.service.archive.ingestUpsert({ messages: [unknown], type: 'notify' });
  f.service.archive.db.prepare("UPDATE media_jobs SET attempts=5,state='unavailable' WHERE attachment_id=?").run(id);
  worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), diskSpace: () => ({ free: 256n * 1024n * 1024n + 2n, total: 1n << 30n }), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  assert.equal(f.service.archive.getCoverage().uniqueMessages, 2); assert.equal(f.service.archive.getAttachment(idOf(f.service, unknown))!.attempts, 1); assert.notEqual(f.service.archive.getAttachment(idOf(f.service, unknown))!.state, 'available'); assert.equal(worker.snapshot().paused, true);
});

const backupModulePath = '../src/backup.js';
test('gate exige restore autenticado do mesmo perfil e restauração nunca habilita coletor', async t => {
  const m = await import(backupModulePath); assert.ok(m.verifyBackup && m.assertCollectorReady, 'gate precisa de prova efetiva de restore');
  const base = mkdtempSync(join(tmpdir(), 'zap-gate-')), source = join(base, 'source'), snapshot = join(base, 'snapshot'); t.after(() => rmSync(base, { recursive: true }));
  let s = createService({ dataDir: source }); createAuthState(s.authDb, { newProfile: true });
  for (const type of ['imageMessage','audioMessage','videoMessage','documentMessage']) s.archive.ingestUpsert({ type: 'notify', messages: [media(type, {})].map(value => ({ ...value, message: { [type]: value.message.documentMessage } })) });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(source, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  assert.throws(() => m.assertCollectorReady(source, s.authDb)); await s.close();
  await m.createSnapshot({ dataDir: source, destination: snapshot });
  s = createService({ dataDir: source }); assert.throws(() => m.assertCollectorReady(source, s.authDb)); await s.close();
  const verified = await m.verifyBackup({ dataDir: source, snapshotDir: snapshot, destination: join(base, 'checked') }); assert.equal(verified.messages, 4);
  s = createService({ dataDir: source }); assert.doesNotThrow(() => m.assertCollectorReady(source, s.authDb)); await s.close();
  assert.throws(() => m.preflight(source), /owner-set/);
  s = createService({ dataDir: source }); await s.setPassword('senha sintética do proprietário'); await s.close(); assert.doesNotThrow(() => m.preflight(source));
  const receipt = readFileSync(join(source, 'backup-receipt.json'));
  const restored = createService({ dataDir: join(base, 'checked') });
  try { assert.throws(() => m.assertCollectorReady(join(base, 'checked'), restored.authDb), /restaurad|offline/); assert.equal(existsSync(join(base, 'checked', 'backup-receipt.json')), false); } finally { await restored.close(); }
  const other = createService({ dataDir: join(base, 'other') }); createAuthState(other.authDb, { newProfile: true }); writeFileSync(join(base, 'other', 'backup-receipt.json'), receipt, { mode: 0o600 });
  try { assert.throws(() => m.assertCollectorReady(join(base, 'other'), other.authDb)); } finally { await other.close(); }
  const altered = JSON.parse(receipt.toString()); const proof = JSON.parse(altered.proof); proof.verifiedAt = new Date(0).toISOString(); altered.proof = JSON.stringify(proof); writeFileSync(join(source, 'backup-receipt.json'), JSON.stringify(altered));
  s = createService({ dataDir: source }); assert.throws(() => m.assertCollectorReady(source, s.authDb)); await s.close();
  writeFileSync(join(source, 'backup-receipt.json'), receipt); writeFileSync(join(snapshot, 'auth.sqlite'), 'tampered');
  s = createService({ dataDir: source }); assert.throws(() => m.assertCollectorReady(source, s.authDb)); await s.close();
});

test('ramo real libera exatamente um socket após prova e bloqueia clone restaurado antes do socket', async t => {
  const m = await import(backupModulePath), base = mkdtempSync(join(tmpdir(), 'zap-real-gate-')), dataDir = join(base, 'source'); t.after(() => rmSync(base, { recursive: true }));
  const s = createService({ dataDir }); createAuthState(s.authDb, { newProfile: true }); await s.close();
  const snapshotDir = join(base, 'snapshot'), restored = join(base, 'restore'); await m.createSnapshot({ dataDir, destination: snapshotDir });
  const verifyCli = spawn(process.execPath, ['dist/src/main.js', 'verify-backup', snapshotDir, restored], { env: { ...process.env, ZAP_DATA_DIR: dataDir }, stdio: ['ignore','ignore','pipe'] });
  let verifyError = ''; verifyCli.stderr.on('data', b => verifyError += b); const [verifyCode] = await once(verifyCli, 'exit'); assert.equal(verifyCode, 0, verifyError);
  const source = `import {mock} from 'node:test'; import {EventEmitter} from 'node:events'; import assert from 'node:assert/strict'; const baileys=await import('@whiskeysockets/baileys'); const exports=Object.fromEntries(Object.entries(baileys).filter(([k])=>k!=='default'));let sockets=0; mock.module('@whiskeysockets/baileys',{namedExports:{...exports,makeWASocket:()=>{sockets++;return {ev:new EventEmitter(),end(){}};}},defaultExport:baileys.default});const {createService}=await import('./dist/src/main.js');const s=createService({dataDir:process.env.ZAP_DATA_DIR});s.startCollector();assert.equal(sockets,1);assert.throws(()=>s.startCollector());assert.throws(()=>createService({dataDir:process.env.ZAP_DATA_DIR}));const clone=createService({dataDir:process.env.RESTORED});assert.throws(()=>clone.startCollector());assert.equal(sockets,1);await clone.close();await s.close();console.log('one socket, offline clone');`;
  const child = spawn(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', source], { env: { ...process.env, ZAP_DATA_DIR: dataDir, RESTORED: restored }, stdio: ['ignore','pipe','pipe'] });
  let stdout = '', stderr = ''; child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b); const [code] = await once(child, 'exit'); assert.equal(code, 0, stderr); assert.match(stdout, /one socket, offline clone/);
});

test('interrupção de backup ou verify antes do recibo não abre gate nem altera snapshot anterior', async t => {
  const m = await import(backupModulePath); assert.ok(m.verifyBackup, 'verify deve emitir prova somente após conclusão');
  for (const operation of ['backup', 'verify']) {
    const base = mkdtempSync(join(tmpdir(), 'zap-copy-kill-')), dataDir = join(base, 'source'), snapshot = join(base, 'snapshot'); t.after(() => rmSync(base, { recursive: true }));
    const s = createService({ dataDir }); createAuthState(s.authDb, { newProfile: true }); await s.close(); await m.createSnapshot({ dataDir, destination: snapshot }); const prior = readFileSync(join(snapshot, 'manifest.json'));
    const source = `import {createSnapshot,verifyBackup} from './dist/src/backup.js'; const wait=async point=>{if(point==='verified'){console.log('ready');await new Promise(()=>{});}}; if(process.env.OP==='backup')await createSnapshot({dataDir:process.env.ZAP_DATA_DIR,destination:process.env.NEW_DIR,fault:wait});else await verifyBackup({dataDir:process.env.ZAP_DATA_DIR,snapshotDir:process.env.SNAPSHOT,destination:process.env.NEW_DIR,fault:wait});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, OP: operation, ZAP_DATA_DIR: dataDir, SNAPSHOT: snapshot, NEW_DIR: join(base, 'new') }, stdio: ['ignore', 'pipe', 'pipe'] }); t.after(() => child.kill('SIGKILL'));
    await new Promise<void>((accept, reject) => { const timeout = setTimeout(() => reject(Error('timeout')), 5000); child.stdout.on('data', b => { if (String(b).includes('ready')) { clearTimeout(timeout); accept(); } }); child.once('exit', c => { clearTimeout(timeout); reject(Error('unexpected exit ' + c)); }); });
    child.kill('SIGKILL'); await once(child, 'exit'); assert.deepEqual(readFileSync(join(snapshot, 'manifest.json')), prior); assert.equal(existsSync(join(dataDir, 'backup-receipt.json')), false);
    const reopened = createService({ dataDir }); assert.throws(() => m.assertCollectorReady(dataDir, reopened.authDb)); await reopened.close();
  }
});

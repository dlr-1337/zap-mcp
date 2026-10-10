import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';
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

test('reconcile conserve órfãos inconnus, erreur SQL et génération expirée refusent available', async t => {
  const f = setup(t), message = media('sql'); f.service.archive.ingestUpsert({ messages: [message], type: 'notify' });
  f.service.archive.db.exec("CREATE TRIGGER media_fault BEFORE UPDATE OF state ON attachments WHEN NEW.state='available' BEGIN SELECT RAISE(ABORT,'injected'); END");
  const worker = startMediaWorker({ archive: f.service.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const id = idOf(f.service, message); assert.notEqual(f.service.archive.getAttachment(id)!.state, 'available'); assert.deepEqual(readFileSync(join(f.dir, 'media', id + '.bin')), bytes);
  f.service.archive.db.exec('DROP TRIGGER media_fault'); writeFileSync(join(f.dir, 'media', 'unknown.bin'), 'unknown'); f.reopen(); f.reopen(); assert.equal(f.service.archive.getAttachment(id)!.state, 'available'); assert.equal(readFileSync(join(f.dir, 'media', 'unknown.bin'), 'utf8'), 'unknown');
});

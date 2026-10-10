import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, createCipheriv } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { getMediaKeys } from '@whiskeysockets/baileys';
import type { MediaJob } from '../src/media.js';
import { serialize } from 'node:v8';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
import { createSnapshot, verifyBackup } from '../src/backup.js';
import { deserialize } from 'node:v8';

const bytes = Buffer.from('original sintético\0🧪');
const hash = createHash('sha256').update(bytes).digest();
function media(id: string, type = 'imageMessage', node: Record<string, unknown> = {}) {
  return { key: { remoteJid: '1@s.whatsapp.net', id, fromMe: false }, messageTimestamp: 1700000000,
    message: { [type]: { url: 'https://mmg.whatsapp.net/original', mediaKey: Buffer.alloc(32, 1), fileLength: bytes.length, fileSha256: hash, caption: 'legenda', fileName: '../../original\r\n.svg', ...node } } };
}
function fixture(t: { after(fn: () => unknown): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-media-')), service = createService({ dataDir: dir });
  t.after(async () => { await service.close(); rmSync(dir, { recursive: true }); });
  return { dir, service, archive: service.archive };
}
async function moduleMedia() { const path = '../src/media.js'; return import(path); }

test('PN/LID mantém o único original disponível, locator privado, HTTP offline e backup restaurado', async t => {
  const base = mkdtempSync(join(tmpdir(), 'zap-media-merge-')), dataDir = join(base, 'source');
  const service = createService({ dataDir }), archive = service.archive; let closed = false;
  t.after(async () => { if (!closed) await service.close(); rmSync(base, { recursive: true }); });
  createAuthState(service.authDb, { newProfile: true });
  const pn = media('same'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
  archive.ingestHistory({ messages: [pn, lid] });
  const kept = archive.readStoredMessage(pn.key)!, keptId = kept.attachments[0]!.id, availableId = archive.readStoredMessage(lid.key)!.attachments[0]!.id;
  archive.db.prepare("UPDATE attachments SET state='unavailable' WHERE id=?").run(keptId);
  archive.db.prepare("UPDATE media_jobs SET state='unavailable',attempts=5 WHERE attachment_id=?").run(keptId);
  let downloads = 0; const { startMediaWorker } = await moduleMedia();
  const worker = startMediaWorker({ archive, mediaDir: join(dataDir, 'media'), downloadOriginal: async () => { downloads++; return Readable.from([bytes]); } });
  await worker.drain(); await worker.stop();
  const job = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(availableId);
  archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
  const merged = archive.readStoredMessage(pn.key)!;
  assert.equal(merged.reference, kept.reference); assert.equal(archive.readStoredMessage(lid.key)!.reference, kept.reference);
  assert.equal(merged.attachments[0]!.id, availableId); assert.equal(merged.attachments[0]!.state, 'available');
  assert.equal(merged.attachments[0]!.sourceHashVerified, true); assert.equal(merged.attachments[0]!.sha256, hash.toString('hex'));
  assert.deepEqual(archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(availableId), job);
  const privateSource = archive.db.prepare('SELECT payload FROM revisions WHERE reference=?').get(kept.reference) as { payload: Buffer };
  assert.equal(deserialize(privateSource.payload).key.remoteJid, lid.key.remoteJid, 'locator do original mantido para renovação privada');
  assert.equal(merged.revisions.length, 1); assert.equal(archive.getCoverage().uniqueMessages, 1); assert.equal(downloads, 1);
  assert.deepEqual(archive.db.pragma('foreign_key_check'), []);
  await service.setPassword('synthetic-password');
  const server = service.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    assert.equal((await fetch(url + '/api/attachments/' + availableId)).status, 401);
    const challenge = await fetch(url + '/api/session'), form = await challenge.json() as { csrfToken: string };
    const login = await fetch(url + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'synthetic-password', csrfToken: form.csrfToken }) });
    assert.equal(login.status, 200);
    const response = await fetch(url + '/api/attachments/' + availableId, { headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } });
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  await service.close(); closed = true;
  const snapshotDir = join(base, 'snapshot'), destination = join(base, 'restore');
  await createSnapshot({ dataDir, destination: snapshotDir });
  assert.equal((await verifyBackup({ dataDir, snapshotDir, destination })).verified, true, 'restore inclui login e download HTTP offline autenticados');
  assert.deepEqual(readFileSync(join(destination, 'media', availableId + '.bin')), bytes);
});

test('PN/LID conserva a lease em andamento e finaliza uma vez em ambas as perspectivas', async t => {
  for (const activeJid of ['1@s.whatsapp.net', '9@lid']) {
    const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
    const pn = media('lease'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
    archive.ingestHistory({ messages: [pn, lid] });
    const activeId = archive.readStoredMessage({ ...pn.key, remoteJid: activeJid })!.attachments[0]!.id;
    const otherId = archive.readStoredMessage({ ...pn.key, remoteJid: activeJid === pn.key.remoteJid ? lid.key.remoteJid : pn.key.remoteJid })!.attachments[0]!.id;
    let start!: () => void, release!: (stream: Readable) => void, downloads = 0;
    const started = new Promise<void>(resolve => { start = resolve; }), blocked = new Promise<Readable>(resolve => { release = resolve; });
    const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => { downloads++; start(); return blocked; } });
    archive.db.prepare("UPDATE media_jobs SET retry_at=? WHERE attachment_id=?").run(Date.now() + 60_000, otherId);
    t.after(() => worker.stop()); await started;
    const lease = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(activeId);
    archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
    assert.deepEqual(archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(activeId), lease);
    release(Readable.from([bytes])); await worker.drain(); await worker.stop();
    assert.equal(archive.getAttachment(activeId)!.state, 'available'); assert.equal(downloads, 1);
    assert.deepEqual(readFileSync(join(dir, 'media', activeId + '.bin')), bytes);
  }
});
test('PN/LID conserva job pendente quando a outra origem esgotou tentativas', t => {
  const { archive } = fixture(t), pn = media('pending'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
  archive.ingestHistory({ messages: [pn, lid] });
  const failedId = archive.readStoredMessage(pn.key)!.attachments[0]!.id, pendingId = archive.readStoredMessage(lid.key)!.attachments[0]!.id;
  archive.db.prepare("UPDATE attachments SET state='unavailable' WHERE id=?").run(failedId);
  archive.db.prepare("UPDATE media_jobs SET state='unavailable',attempts=5 WHERE attachment_id=?").run(failedId);
  archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
  assert.equal(archive.readStoredMessage(pn.key)!.attachments[0]!.id, pendingId);
  assert.equal(archive.getAttachment(pendingId)!.state, 'pending');
});

test('thumbnail-only nunca cria job nem satisfaz original disponível', t => {
  const { archive } = fixture(t); const message = media('thumbnail', 'imageMessage', { url: undefined, mediaKey: undefined, thumbnailDirectPath: '/thumb' });
  archive.ingestUpsert({ messages: [message], type: 'notify' });
  const attachment = (archive.readStoredMessage(message.key) as any).attachments[0];
  assert.equal(attachment.state, 'unavailable', 'miniatura não é original');
  assert.equal((archive.db.prepare('SELECT count(*) n FROM media_jobs').get() as any).n, 0);
});

test('fila legada sem original é reclassificada antes do downloader', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia(); const message = media('legacy'); archive.ingestUpsert({ messages: [message], type: 'notify' });
  archive.db.prepare('UPDATE attachments SET descriptor=?').run(serialize({ thumbnailDirectPath: '/thumb', mediaKey: Buffer.alloc(32) })); let called = 0;
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => { called++; return Readable.from([bytes]); } }); await worker.drain(); await worker.stop();
  assert.equal(called, 0); assert.equal((archive.readStoredMessage(message.key) as any).attachments[0].state, 'unavailable');
});

test('quatro originais têm bytes conferidos e download HTTP autenticado offline', async t => {
  const { archive, service, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const messages = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage'].map((type, i) => media(String(i), type));
  archive.ingestUpsert({ messages, type: 'notify' });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes.subarray(0, 3), bytes.subarray(3)]) });
  await worker.drain(); await worker.stop();
  const ids = messages.map(m => (archive.readStoredMessage(m.key) as any).attachments[0].id);
  for (const id of ids) { const a = archive.getAttachment(id) as any; assert.equal(a.state, 'available'); assert.equal(a.sha256, hash.toString('hex')); assert.equal(a.size, bytes.length); assert.deepEqual(readFileSync(join(dir, 'media', id + '.bin')), bytes); }
  await service.setPassword('synthetic-password'); const server = service.app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const method of ['GET', 'HEAD']) assert.equal((await fetch(base + '/api/attachments/' + ids[0], { method, headers: { Range: 'bytes=0-2' } })).status, 401);
  const challenge = await fetch(base + '/api/session'), form = await challenge.json() as any;
  const login = await fetch(base + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'synthetic-password', csrfToken: form.csrfToken }) });
  const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0] };
  for (const id of ids) { const response = await fetch(base + '/api/attachments/' + id, { headers }); assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes); assert.match(response.headers.get('content-disposition')!, /^attachment;/); assert.equal(response.headers.get('content-type'), 'application/octet-stream'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.equal(response.headers.get('cache-control'), 'no-store'); }
  const partial = await fetch(base + '/api/attachments/' + ids[0], { headers: { ...headers, Range: 'bytes=1-3' } }); assert.equal(partial.status, 206); assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(1, 4));
  assert.equal((await fetch(base + '/api/attachments/' + ids[0], { method: 'HEAD', headers })).headers.get('content-length'), String(bytes.length));
  assert.equal((await fetch(base + '/api/attachments/' + ids[0], { headers: { ...headers, Range: 'bytes=999-' } })).status, 416);
});

test('tamanho n-1/n/n+1, hash e Long inválido nunca publicam corrupção', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const cases = [{ fileLength: bytes.length - 1 }, { fileLength: bytes.length + 1 }, { fileSha256: Buffer.alloc(32) }, { fileLength: { low: -1, high: 2147483647, unsigned: true } }, { fileLength: Number.MAX_SAFE_INTEGER + 1 }, { fileLength: { low: 1.5, high: 0 } }];
  const messages = cases.map((node, i) => media('bad' + i, 'documentMessage', node));
  messages.push(media('good'), media('unknown', 'audioMessage', { fileName: undefined, fileLength: undefined, fileSha256: undefined }));
  archive.ingestUpsert({ messages, type: 'notify' });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  for (const m of messages.slice(0, -2)) assert.notEqual((archive.readStoredMessage(m.key) as any).attachments[0].state, 'available');
  for (const m of messages.slice(-2)) assert.equal((archive.readStoredMessage(m.key) as any).attachments[0].state, 'available');
  assert.equal((archive.readStoredMessage(messages.at(-1)!.key) as any).attachments[0].sourceHashVerified, false);
});

test('erros antes/tarde e cancelamento mantêm parcial indisponível e viewOnce restrito', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const a = media('before'), b = media('late'), view = media('view');
  archive.ingestUpsert({ messages: [a, b, { ...view, message: { ephemeralMessage: { message: { viewOnceMessageV2: { message: view.message } } } } }, { key: { ...view.key, id: 'quote' }, message: { extendedTextMessage: { text: 'texto', contextInfo: { quotedMessage: { viewOnceMessage: { message: view.message } } } } } }], type: 'notify' });
  let calls = 0;
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async (job: any) => { calls++; if (job.message.key.id === 'before') throw Error('PRIVATE URL'); return Readable.from((async function* () { yield bytes.subarray(0, 2); throw Error('PRIVATE KEY'); })()); } });
  await worker.drain(); await worker.stop(); assert.equal(calls, 2);
  for (const m of [a, b]) { const attachment = (archive.readStoredMessage(m.key) as any).attachments[0]; assert.equal(attachment.state, 'retry_wait'); assert.doesNotMatch(JSON.stringify(attachment), /PRIVATE|https:|mediaKey|descriptor|path/); }
  assert.equal((archive.readStoredMessage(view.key) as any).restricted, true);
  assert.equal((archive.readStoredMessage({ ...view.key, id: 'quote' }) as any).attachments.length, 0);
});

test('dispatcher bloqueia URL interna, redirect host e DNS privado antes de conexão', async () => {
  const { mediaDispatcher } = await moduleMedia(); let dns = 0;
  const dispatcher = mediaDispatcher(new AbortController().signal, async () => { dns++; return [{ address: '127.0.0.1', family: 4 }]; });
  for (const url of ['http://mmg.whatsapp.net/file', 'https://127.0.0.1/file', 'https://mmg.whatsapp.net.evil.test/file', 'https://mmg.whatsapp.net:444/file', 'https://user@mmg.whatsapp.net/file', 'https://mmg.whatsapp.net/file']) await assert.rejects(fetch(url, { dispatcher } as any));
  assert.equal(dns, 1, 'só host permitido consulta DNS, endereço interno não conecta');
  let first = true;
  const redirect = { dispatch(options: any, handler: any) {
    if (!first) return dispatcher.dispatch(options, handler);
    first = false; queueMicrotask(() => { handler.onConnect(() => {}); handler.onHeaders(302, [Buffer.from('location'), Buffer.from('https://127.0.0.1/private')], () => {}, 'Found'); handler.onComplete([]); }); return true;
  } };
  await assert.rejects(fetch('https://mmg.whatsapp.net/redirect', { dispatcher: redirect } as any)); assert.equal(dns, 1, 'redirect interno é recusado antes de DNS/conexão');
});

test('adapter Baileys fixado entrega plaintext original e renova 404 com locator privado', async t => {
  const { service } = fixture(t), events = new EventEmitter(), key = Buffer.alloc(32, 1);
  const keys = await getMediaKeys(key, 'image'); const cipher = createCipheriv('aes-256-cbc', keys.cipherKey, keys.iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final(), Buffer.alloc(10)]);
  let fetches = 0, renewed = 0; const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(typeof (options as any).dispatcher.dispatch, 'function'); fetches++;
    return fetches === 1 ? new Response(null, { status: 404 }) : new Response(encrypted);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const collector = service.startCollector({ newProfile: true, socketFactory: () => ({ ev: events, end() {}, async updateMediaMessage(message: any) { renewed++; return { ...message, message: { imageMessage: { ...message.message.imageMessage, url: 'https://mmg.whatsapp.net/refreshed' } } }; } }) as any });
  events.emit('connection.update', { connection: 'open' });
  const message = media('adapter'), descriptor = message.message.imageMessage;
  const job = { id: 'internal', type: 'imageMessage', descriptor, message, attempts: 1, generation: 'synthetic' } as unknown as MediaJob;
  const stream = await collector.downloadOriginal(job, new AbortController().signal), chunks = [];
  for await (const chunk of stream) chunks.push(chunk); assert.deepEqual(Buffer.concat(chunks), bytes); assert.equal(renewed, 1); assert.equal(fetches, 2);
  await assert.rejects(collector.downloadOriginal({ ...job, descriptor: { ...descriptor, viewOnce: true } }, new AbortController().signal)); assert.equal(fetches, 2);
});

test('conteúdo vazio só é disponível quando comprimento zero é confirmado pela origem', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const known = media('zero', 'documentMessage', { fileLength: 0, fileSha256: createHash('sha256').digest() }), unknown = media('unknown-zero', 'audioMessage', { fileLength: undefined, fileSha256: undefined });
  archive.ingestUpsert({ messages: [known, unknown], type: 'notify' });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([]) }); await worker.drain(); await worker.stop();
  assert.equal((archive.readStoredMessage(known.key) as any).attachments[0].state, 'available'); assert.notEqual((archive.readStoredMessage(unknown.key) as any).attachments[0].state, 'available');
});

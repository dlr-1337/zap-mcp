import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';

export const bytes = Buffer.from('original sintético\0🧪');
export const hash = createHash('sha256').update(bytes).digest();
export function media(id: string, type = 'imageMessage', node: Record<string, unknown> = {}) {
  return { key: { remoteJid: '1@s.whatsapp.net', id, fromMe: false }, messageTimestamp: 1700000000,
    message: { [type]: { url: 'https://mmg.whatsapp.net/original', mediaKey: Buffer.alloc(32, 1), fileLength: bytes.length, fileSha256: hash, caption: 'legenda', fileName: '../../original\r\n.svg', ...node } } };
}
export function fixture(t: { after(fn: () => unknown): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-media-')), service = createService({ dataDir: dir });
  t.after(async () => { await service.close(); rmSync(dir, { recursive: true }); });
  return { dir, service, archive: service.archive };
}
export async function moduleMedia() { const path = '../src/media.js'; return import(path); }

test('thumbnail-only nunca cria job nem satisfaz original disponível', t => {
  const { archive } = fixture(t); const message = media('thumbnail', 'imageMessage', { url: undefined, mediaKey: undefined, thumbnailDirectPath: '/thumb' });
  archive.ingestUpsert({ messages: [message], type: 'notify' });
  const attachment = (archive.readStoredMessage(message.key) as any).attachments[0];
  assert.equal(attachment.state, 'unavailable', 'miniatura não é original');
  assert.equal((archive.db.prepare('SELECT count(*) n FROM media_jobs').get() as any).n, 0);
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
});

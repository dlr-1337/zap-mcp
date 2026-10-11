import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
async function fixture(t: any, bytes = png, mime: string | undefined = 'image/png') {
  const dir = mkdtempSync(join(tmpdir(), 'zap-preview-')), s = createService({ dataDir: dir });
  const key = { remoteJid: '1@lid', id: 'image', fromMe: false };
  s.archive.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { imageMessage: { caption: 'imagem preservada', mimetype: mime, fileName: '../../nome\r\nשלום.png', url: 'https://mmg.whatsapp.net/synthetic', mediaKey: Buffer.alloc(32, 1), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest() } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const attachment = s.archive.readStoredMessage(key)!.attachments[0]!;
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; await s.setPassword('senha sintética');
  const c = await fetch(base + '/api/session'), challenge = await c.json();
  const login = await fetch(base + '/login', { method: 'POST', headers: { Cookie: c.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'senha sintética', csrfToken: challenge.csrfToken }) }); assert.equal(login.status, 200);
  return { s, dir, attachment, base, headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } };
}
test('PNG privado preserva bytes em GET HEAD Range e original offline', async t => {
  const { s, dir, attachment, base, headers } = await fixture(t), path = '/api/attachments/' + attachment.id;
  const r = await fetch(base + path + '/preview', { headers }); assert.equal(r.status, 200, 'PNG disponível deve ter preview privado');
  assert.equal(r.headers.get('content-type'), 'image/png'); assert.match(r.headers.get('content-disposition')!, /^inline;/);
  assert.equal(r.headers.get('cache-control'), 'no-store'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.equal(r.headers.get('accept-ranges'), 'bytes');
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
  const head = await fetch(base + path + '/preview', { method: 'HEAD', headers }); assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(png.length)); assert.equal(await head.text(), '');
  const range = await fetch(base + path + '/preview', { headers: { ...headers, Range: 'bytes=1-3' } }); assert.equal(range.status, 206); assert.deepEqual(Buffer.from(await range.arrayBuffer()), png.subarray(1, 4));
  const original = await fetch(base + path, { headers }); assert.equal(original.headers.get('content-type'), 'application/octet-stream'); assert.deepEqual(Buffer.from(await original.arrayBuffer()), png);
  for (const method of ['GET', 'HEAD']) assert.equal((await fetch(base + path + '/preview', { method, headers: { Range: 'bytes=0-0' } })).status, 401);
  s.authDb.exec('UPDATE web_sessions SET touched_at=0'); assert.equal((await fetch(base + path + '/preview', { headers })).status, 401);
  unlinkSync(join(dir, 'media', attachment.id + '.bin')); assert.ok(s.archiveDb.prepare('SELECT 1 FROM messages WHERE reference=?').get(attachment.reference), 'mensagem preservada');
});

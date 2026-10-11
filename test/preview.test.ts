import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, unlinkSync, renameSync, symlinkSync, closeSync, readSync, fstatSync, readdirSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { get } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { startMediaWorker, openVerifiedAttachment, classifyPreview } from '../src/media.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
async function fixture(t: any, bytes: Buffer = png, mime: string | null = 'image/png') {
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
  unlinkSync(join(dir, 'media', attachment.id + '.bin')); assert.equal((await fetch(base + path + '/preview', { headers })).status, 404); assert.ok(s.archiveDb.prepare('SELECT 1 FROM messages WHERE reference=?').get(attachment.reference), 'mensagem preservada');
  s.authDb.exec('UPDATE web_sessions SET touched_at=0'); assert.equal((await fetch(base + path + '/preview', { headers })).status, 401);
});

const mp4 = Buffer.from('00000018667479706d7034320000000069736f6d6d703432', 'hex');
const webm = Buffer.from('1a45dfa38b4282847765626d42878102', 'hex');
const mp3 = Buffer.alloc(421); Buffer.from('fffb9000', 'hex').copy(mp3); Buffer.from('fffb9000', 'hex').copy(mp3, 417);
const supported: [string, Buffer][] = [
  ['image/jpeg', Buffer.from('ffd8ffe000104a46494600010100000100010000', 'hex')], ['image/png', png],
  ['image/gif', Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00')],
  ['image/webp', Buffer.from('5249464614000000574542505650382000000000', 'hex')],
  ['audio/wav', Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00')],
  ['audio/mpeg', Buffer.from('4944330400000000000073796e746865746963', 'hex')],
  ['audio/mpeg', mp3],
  ['audio/ogg', Buffer.from('OggS\x00\x02' + '\x00'.repeat(22))], ['audio/flac', Buffer.from('664c614300000022', 'hex')],
  ['video/mp4', mp4], ['video/webm', webm]
];
test('allowlist de raster áudio vídeo exige MIME e assinatura coerentes', async t => {
  for (const [mime, bytes] of supported) {
    const { base, headers, attachment } = await fixture(t, bytes, mime);
    const r = await fetch(base + '/api/attachments/' + attachment.id + '/preview', { headers });
    assert.equal(r.status, 200, mime + ' deve ser classificado'); assert.equal(r.headers.get('content-type'), mime); assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes);
  }
});
test('ativo divergente inconclusivo e vazio conservam download original sem inline', async t => {
  for (const [bytes, mime] of [[Buffer.from('<html><script>PRIVATE_SENTINEL</script>'), 'image/png'], [Buffer.from('<svg onload="alert(1)"/>'), 'image/svg+xml'], [Buffer.from('%PDF-1.7'), 'application/pdf'], [Buffer.from('PK\x03\x04'), 'application/zip'], [png, 'image/jpeg'], [png, null], [Buffer.from('89504e47', 'hex'), 'image/png'], [Buffer.alloc(0), 'image/png'], [Buffer.from('RIFF....AVI '), 'audio/wav'], [mp4, 'text/html'], [webm, 'video/mp4']] as [Buffer, string | null][]) {
    const { base, headers, attachment } = await fixture(t, bytes, mime), path = '/api/attachments/' + attachment.id;
    for (const method of ['GET', 'HEAD']) { const r = await fetch(base + path + '/preview', { method, headers }); assert.equal(r.status, 415); assert.doesNotMatch(JSON.stringify([...r.headers]) + await r.text(), /PRIVATE_SENTINEL|inline;|image\/png|mediaKey/); }
    assert.equal(readdirSync('/proc/self/fd').filter(fd => { try { return readlinkSync('/proc/self/fd/' + fd).endsWith(attachment.id + '.bin'); } catch { return false; } }).length, 0, '415 fecha o descritor');
    const r = await fetch(base + path, { headers }); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/octet-stream'); assert.match(r.headers.get('content-disposition')!, /^attachment;/); assert.doesNotMatch(r.headers.get('content-disposition')!, /[\r\n]|\.\.\//); assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes);
  }
});
test('preview range paths symlink e fd verificado até fechamento', async t => {
  const { s, dir, base, headers, attachment } = await fixture(t), path = '/api/attachments/' + attachment.id + '/preview';
  for (const [range, expected] of [['bytes=0-0', png.subarray(0, 1)], ['bytes=-1', png.subarray(-1)], [`bytes=${png.length - 1}-`, png.subarray(-1)], ['bytes=-999', png]] as [string, Buffer][]) for (const method of ['GET', 'HEAD']) {
    const r = await fetch(base + path, { method, headers: { ...headers, Range: range } }); assert.equal(r.status, 206); assert.equal(r.headers.get('content-length'), String(expected.length)); assert.deepEqual(Buffer.from(await r.arrayBuffer()), method === 'HEAD' ? Buffer.alloc(0) : expected);
  }
  const openFds = () => readdirSync('/proc/self/fd').filter(fd => { try { return readlinkSync('/proc/self/fd/' + fd).startsWith(join(dir, 'media')); } catch { return false; } }).length;
  for (let n = 0; n < 3; n++) {
    for (const range of ['bytes=0-0,1-1', 'bytes=-0', 'bytes=2-1', 'bytes=999-', 'bytes=NaN-1', 'bytes=9007199254740992-', 'bytes=0-9007199254740992', 'items=0-1']) assert.equal((await fetch(base + path, { headers: { ...headers, Range: range } })).status, 416);
    assert.equal((await fetch(base + path, { method: 'HEAD', headers })).status, 200); assert.equal(openFds(), 0, 'HEAD/416 não deixam fd privado aberto');
  }
  for (const id of ['%2Fetc%2Fpasswd', '..%2Fsecret', 'unknown']) assert.equal((await fetch(base + '/api/attachments/' + id + '/preview', { headers })).status, 404);
  const verified = openVerifiedAttachment(s.archive, join(dir, 'media'), attachment.id)!;
  const original = join(dir, 'media', attachment.id + '.bin'); renameSync(original, original + '.saved'); symlinkSync('/etc/hosts', original);
  assert.equal(classifyPreview(verified), 'image/png'); const actual = Buffer.alloc(png.length); readSync(verified.fd, actual, 0, actual.length, 0); assert.deepEqual(actual, png, 'classificação/stream usam mesmo inode'); closeSync(verified.fd); assert.throws(() => fstatSync(verified.fd));
  assert.equal((await fetch(base + path, { headers })).status, 404); assert.equal(openFds(), 0); assert.ok(s.archiveDb.prepare('SELECT 1 FROM messages WHERE reference=?').get(attachment.reference));
});
test('stream de preview abortado fecha fd sem alterar original', async t => {
  const bytes = Buffer.concat([png, Buffer.alloc(4 * 1024 * 1024)]), { s, dir, base, headers, attachment } = await fixture(t, bytes);
  await new Promise<void>((resolve, reject) => {
    get(base + '/api/attachments/' + attachment.id + '/preview', { headers }, response => { assert.equal(response.statusCode, 200); response.on('error', () => {}); response.once('data', () => { response.destroy(); resolve(); }); }).on('error', reject);
  });
  const openFds = () => readdirSync('/proc/self/fd').filter(fd => { try { return readlinkSync('/proc/self/fd/' + fd).startsWith(join(dir, 'media')); } catch { return false; } }).length;
  for (let n = 0; n < 100 && openFds(); n++) await new Promise(r => setTimeout(r, 5));
  assert.equal(openFds(), 0); assert.equal(s.archive.getAttachment(attachment.id)!.state, 'available'); assert.equal(s.archive.getAttachment(attachment.id)!.sha256, createHash('sha256').update(bytes).digest('hex'));
});

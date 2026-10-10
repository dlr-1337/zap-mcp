import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, renameSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once, EventEmitter } from 'node:events';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';
import type { SocketFactory } from '../src/whatsapp.js';

test('HTTP privado nega HEAD/Range, paths e vazamentos; revalida expiração antes de responder QR', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-security-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`, password = 'sintético seguro';
  await s.setPassword(password);
  const authenticate = async () => {
    const c = await fetch(base + '/api/session'), d = await c.json();
    const r = await fetch(base + '/login', { method: 'POST', headers: { Cookie: c.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken: d.csrfToken }) });
    assert.equal(r.status, 200); return { Cookie: r.headers.get('set-cookie')!.split(';')[0] };
  };
  let headers = await authenticate();
  const secret = 'PRIVATE_SENTINEL_NEVER_RETURN', key = { remoteJid: 'synthetic@lid', id: 'm', fromMe: false };
  const html = '<script>window.EXECUTED=1</script>\n🧪 שלום';
  s.archive.ingestHistory({ messages: [{ key, messageTimestamp: 123, privateEnvelope: secret, message: { documentMessage: { caption: html, fileName: '../../x\r\nHeader:evil.svg', url: 'https://mmg.whatsapp.net/' + secret, mediaKey: Buffer.alloc(32, 1), mimetype: 'text/html' } } }, { key: { ...key, id: 'quoted' }, message: { extendedTextMessage: { text: html, contextInfo: { quotedMessage: { viewOnceMessage: { message: { conversation: secret } } } } } } }, {}] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([html]) }); await worker.drain(); await worker.stop();
  const stored = s.archive.readStoredMessage(key)!, attachment = stored.attachments[0]!, id = stored.conversationId;
  const paths = ['/api/status', '/api/qr', '/api/conversations', `/api/conversations/${id}/messages`, '/api/attachments/' + attachment.id, '/api/attachments/unknown', '/api/conversations/%ZZ/messages'];
  for (const cookie of ['', 'zap.sid=', 'zap.sid=invalid']) for (const path of paths) for (const method of ['GET', 'HEAD']) {
    const r = await fetch(base + path, { method, headers: { Cookie: cookie, Range: 'bytes=0-0' } }); assert.equal(r.status, 401, path); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.equal(r.headers.get('content-range'), null);
  }
  const body = await (await fetch(base + `/api/conversations/${id}/messages`, { headers })).text(); assert.match(body, /caption|script/); assert.doesNotMatch(body, /PRIVATE_SENTINEL|mediaKey|descriptor|privateEnvelope|https:\/\/|path/);
  const file = '/api/attachments/' + attachment.id;
  for (const range of ['bytes=0-0', 'bytes=-1', `bytes=${Buffer.byteLength(html) - 1}-`]) { const r = await fetch(base + file, { headers: { ...headers, Range: range } }); assert.equal(r.status, 206); assert.equal((await r.arrayBuffer()).byteLength, 1); }
  for (const range of ['bytes=0-0,1-1', 'bytes=-0', 'bytes=2-1', 'bytes=999-', 'bytes=NaN-1', 'bytes=9007199254740992-', 'items=0-1']) assert.equal((await fetch(base + file, { headers: { ...headers, Range: range } })).status, 416, range);
  const head = await fetch(base + file, { method: 'HEAD', headers }); assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(html))); assert.equal(head.headers.get('content-type'), 'application/octet-stream'); assert.match(head.headers.get('content-disposition')!, /^attachment;/); assert.doesNotMatch(head.headers.get('content-disposition')!, /[\r\n]|\.\.\//); assert.equal(head.headers.get('x-content-type-options'), 'nosniff');
  for (const path of ['/api/attachments/%2Fetc%2Fpasswd', '/api/attachments/..%2Fsecret', '/api/conversations/%E2%80%AE/messages', '/api/conversations/' + id + '/messages?cursor=%22%20OR%201=1', '/api/conversations?limit=Infinity', '/api/conversations?limit=1&limit=2']) assert.ok([400, 404].includes((await fetch(base + path, { headers })).status), path);
  const original = join(dir, 'media', attachment.id + '.bin'); renameSync(original, original + '.saved'); symlinkSync('/etc/hosts', original);
  assert.equal((await fetch(base + file, { headers })).status, 404); unlinkSync(original); renameSync(original + '.saved', original);
  s.archiveDb.prepare("UPDATE attachments SET state='available' WHERE id=?").run(attachment.id); s.archiveDb.prepare("UPDATE media_jobs SET state='available' WHERE attachment_id=?").run(attachment.id);
  const before = console.error, logs: string[] = []; console.error = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  try {
    s.archiveDb.exec(`CREATE TRIGGER hostile_insert BEFORE INSERT ON messages BEGIN SELECT RAISE(ABORT,'${secret}'); END`);
    s.archive.ingestUpsert({ type: 'notify', messages: [{ key: { ...key, id: 'failure' }, message: { conversation: secret } }] });
    const outputs = await Promise.all(['/api/status', `/api/conversations/${id}/messages`, file].map(async path => (await fetch(base + path, { headers })).text())); assert.doesNotMatch(outputs.join(''), /PRIVATE_SENTINEL/); assert.doesNotMatch(logs.join(''), /PRIVATE_SENTINEL/);
  } finally { console.error = before; }
  const ev = new EventEmitter(), collector = s.startCollector({ newProfile: true, socketFactory: () => ({ ev, end() {} }) as unknown as ReturnType<SocketFactory> }); ev.emit('connection.update', { qr: 'SYNTHETIC_QR_SECRET' });
  let release!: () => void, started!: () => void; const held = new Promise<void>(r => release = r), begun = new Promise<void>(r => started = r), pairing = collector.pairing;
  collector.pairing = async () => { started(); await held; return pairing(); };
  const pending = fetch(base + '/api/qr', { headers }); await begun;
  s.authDb.prepare('UPDATE web_sessions SET touched_at=?').run(Date.now() - 30 * 60_000 - 1); release();
  assert.equal((await pending).status, 401, 'QR aguardou encoder; sessão expirou antes da resposta');
  for (const path of paths.slice(0, -1)) assert.equal((await fetch(base + path, { headers })).status, 401);
  headers = await authenticate();
  const session = await (await fetch(base + '/api/session', { headers })).json();
  assert.equal((await fetch(base + '/logout', { method: 'POST', headers: { ...headers, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken: session.csrfToken }) })).status, 200);
  for (const path of paths.slice(0, -1)) assert.equal((await fetch(base + path, { method: 'HEAD', headers })).status, 401);
});

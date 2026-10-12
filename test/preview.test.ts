import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, unlinkSync, renameSync, symlinkSync, closeSync, readSync, fstatSync, readdirSync, readlinkSync, readFileSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { get } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { startMediaWorker, openVerifiedAttachment, streamVerifiedAttachment, classifyPreview } from '../src/media.js';
import { parsePeriod } from '../src/archive.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
test('restrição posterior bloqueia leitores snapshots redirects e bytes sem apagar originais', async t => {
  for (const redirect of [false, true]) {
    const { s, dir, base, headers, attachment } = await fixture(t);
    const key = { remoteJid: '1@lid', id: 'image', fromMe: false }, old = s.archive.readStoredMessage(key)!;
    const filters = { query: 'imagem' }, session = 'restriction-test';
    const search = s.archive.searchMessages({ terms: ['imagem'], conversationId: null, session, filters });
    const context = s.archive.openContext(old.reference, session, search.snapshotId);
    assert.equal(context.matchedEvidence[0].text, 'imagem preservada');
    if (redirect) {
      s.archive.ingestHistory({ messages: [{ key: { ...key, remoteJid: '1@s.whatsapp.net' }, messageTimestamp: 123, message: { conversation: 'cópia recebida' } }] });
      s.archive.ingestContacts({ lid: '1@lid', pn: '1@s.whatsapp.net' });
    }
    s.archive.ingestHistory({ messages: [{ key: { ...key, isViewOnce: true }, messageTimestamp: 123, message: { imageMessage: { caption: 'RESTRICTED_SENTINEL' } } }] });
    const safe = (value: any) => {
      assert.doesNotMatch(JSON.stringify(value), /imagem preservada|cópia recebida|RESTRICTED_SENTINEL|nome.*שלום|image\/png/);
      for (const m of value.messages ?? [value]) if (m.reference === s.archive.readStoredMessage(key)!.reference || m.reference === old.reference) {
        assert.equal(m.restricted, true); assert.equal(m.text, null); assert.deepEqual(m.attachments, []);
        assert.ok(m.revisions.every((r: any) => r.text === null && r.quote === null && r.restricted));
      }
    };
    safe(s.archive.readStoredMessage(old.reference));
    safe(s.archive.readConversation(old.conversationId));
    safe(s.archive.searchMessages({ terms: ['imagem'], conversationId: null, session, filters, snapshotId: search.snapshotId }));
    safe(s.archive.readContextPage({ reference: old.reference, session, snapshotId: context.snapshotId, ordinal: 0 }));
    const fresh = s.archive.openContext(old.reference, session, search.snapshotId); safe(fresh); assert.deepEqual(fresh.matchedEvidence, []);
    safe(s.archive.freezeExportSelection(old.conversationId, parsePeriod()));
    for (const path of ['/api/context/' + old.reference, '/api/conversations/' + old.conversationId + '/messages']) {
      const r = await fetch(base + path, { headers }); assert.equal(r.status, 200); safe(await r.json());
    }
    assert.equal(openVerifiedAttachment(s.archive, join(dir, 'media'), attachment.id), null);
    for (const suffix of ['', '/preview']) for (const method of ['GET', 'HEAD']) for (const range of [undefined, 'bytes=0-0']) {
      const r = await fetch(base + '/api/attachments/' + attachment.id + suffix, { method, headers: { ...headers, ...(range ? { Range: range } : {}) } });
      assert.equal(r.status, 404); assert.doesNotMatch(await r.text(), /imagem preservada|RESTRICTED_SENTINEL/);
    }
    assert.equal(s.archive.getAttachment(attachment.id)!.state, 'available', 'restrição de acesso não reclassifica o original armazenado');
    assert.deepEqual(readFileSync(join(dir, 'media', attachment.id + '.bin')), png);
    assert.match((s.archiveDb.prepare('SELECT evidence FROM revisions WHERE id=?').get(attachment.revisionId) as any).evidence, /imagem preservada/);
  }
});
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
  return { s, dir, attachment, base, headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] }, server };
}
test('original já bufferizado nega consumo após restrição e libera dono do fd', async t => {
  const bytes = Buffer.concat([png, Buffer.alloc(256 * 1024)]), { s, dir, attachment } = await fixture(t, bytes);
  const file = openVerifiedAttachment(s.archive, join(dir, 'media'), attachment.id)!;
  const stream = streamVerifiedAttachment(s.archive, file), errors: Error[] = [];
  t.after(() => stream.destroy());
  stream.on('error', e => errors.push(e));
  await once(stream, 'readable'); assert.ok(stream.readableLength > 0, 'buffer retido antes de transmitir');
  s.archive.ingestHistory({ messages: [{ key: { remoteJid: '1@lid', id: 'image', fromMe: false, isViewOnce: true }, message: { imageMessage: {} } }] });
  assert.equal(stream.read() === null, true, 'nenhum byte bufferizado liberado após restrição');
  await new Promise<void>(r => { if (stream.closed) r(); else stream.once('close', r); }); assert.ok(errors.length);
  for (let i = 0; i < 100; i++) { try { fstatSync(file.fd); await new Promise(r => setTimeout(r, 5)); } catch { break; } }
  assert.throws(() => fstatSync(file.fd));
  const probe = openSync(join(dir, 'archive.sqlite'), 'r');
  try { stream.destroy(); await new Promise(r => setImmediate(r)); assert.ok(fstatSync(probe).isFile()); } finally { closeSync(probe); }
  assert.deepEqual(readFileSync(join(dir, 'media', attachment.id + '.bin')), bytes); assert.equal(s.archive.getAttachment(attachment.id)!.state, 'available');
});
test('original e preview HTTP sob backpressure negam bytes futuros inclusive Range sem polling', async t => {
  for (const suffix of ['', '/preview']) for (const range of [false, true]) {
    const bytes = Buffer.concat([png, Buffer.alloc(256 * 1024)]), { s, dir, base, headers, attachment, server } = await fixture(t, bytes);
    const path = '/api/attachments/' + attachment.id + suffix;
    let begun!: () => void, resume!: () => void, writes = 0, complete = false, received = 0;
    const started = new Promise<void>(r => begun = r);
    server.prependListener('request', (req, res) => {
      if (req.url !== path) return;
      const write = res.write.bind(res), emit = res.emit.bind(res); let held = true;
      res.emit = ((name: string, ...args: unknown[]) => name === 'drain' && held ? false : emit(name, ...args)) as typeof res.emit;
      res.write = ((...args: Parameters<typeof res.write>) => { writes++; const flowing = write(...args); begun(); return writes === 1 ? false : flowing; }) as typeof res.write;
      resume = () => { held = false; res.emit('drain'); };
    });
    const ended = new Promise<void>((resolve, reject) => {
      get(base + path, { headers: { ...headers, ...(range ? { Range: 'bytes=0-131071' } : {}) } }, res => {
        assert.equal(res.statusCode, range ? 206 : 200); res.pause(); res.on('data', b => received += b.length); res.on('end', () => { complete = true; }); res.on('error', () => {}); res.on('close', resolve);
        const drain = resume; resume = () => { drain(); res.resume(); };
      }).on('error', reject);
    });
    await started; await new Promise(r => setTimeout(r, 20)); assert.equal(writes, 1);
    s.archive.ingestHistory({ messages: [{ key: { remoteJid: '1@lid', id: 'image', fromMe: false, isViewOnce: true }, message: { imageMessage: {} } }] });
    resume(); await ended; assert.equal(writes, 1, 'somente primeiro bloco já transmitido'); assert.equal(complete, false); assert.ok(received < (range ? 131072 : bytes.length));
    assert.deepEqual(readFileSync(join(dir, 'media', attachment.id + '.bin')), bytes); assert.equal(s.archive.getCoverage().uniqueMessages, 1);
  }
});
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

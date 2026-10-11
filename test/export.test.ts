import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import yauzl from 'yauzl';
import { crc32 } from 'node:zlib';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';

export async function entries(path: string) {
  const zip = await new Promise<yauzl.ZipFile>((ok, fail) => yauzl.open(path, { lazyEntries: true, strictFileNames: true, validateEntrySizes: true }, (e, z) => e ? fail(e) : ok(z!)));
  const result = new Map<string, Buffer>();
  await new Promise<void>((ok, fail) => {
    zip.on('error', fail); zip.on('end', ok);
    zip.on('entry', async (entry: yauzl.Entry) => {
      try {
        assert.equal(result.has(entry.fileName), false);
        const stream = await new Promise<Readable>((yes, no) => zip.openReadStream(entry, (e, s) => e ? no(e) : yes(s!)));
        const chunks: Buffer[] = []; for await (const b of stream) chunks.push(b);
        const data = Buffer.concat(chunks); assert.equal(data.length, entry.uncompressedSize); assert.equal(crc32(data), entry.crc32);
        result.set(entry.fileName, data); zip.readEntry();
      } catch (e) { zip.close(); fail(e); }
    }); zip.readEntry();
  }); return result;
}
async function fixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-export-')), s = createService({ dataDir: dir });
  const key = { remoteJid: '1@lid', id: 'file', fromMe: false }, bytes = Buffer.from('original Unicode 🧪');
  s.archive.ingestHistory({ messages: [...Array.from({ length: 161 }, (_, i) => ({ key: { ...key, id: 'm' + i }, messageTimestamp: 1700000000 + i, message: { conversation: 'mensagem ' + i } })), { key, messageTimestamp: 1700000001, privateEnvelope: 'PRIVATE_SENTINEL', message: { documentMessage: { caption: 'legenda original', fileName: '../../igual 🧪.bin', url: 'https://mmg.whatsapp.net/PRIVATE_SENTINEL', mediaKey: Buffer.alloc(32), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest() } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; await s.setPassword('senha sintética');
  const c = await fetch(base + '/api/session'), d = await c.json();
  const l = await fetch(base + '/login', { method: 'POST', headers: { Cookie: c.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'senha sintética', csrfToken: d.csrfToken }) }); assert.equal(l.status, 200);
  const headers = { Cookie: l.headers.get('set-cookie')!.split(';')[0] }, session = await (await fetch(base + '/api/session', { headers })).json();
  const conversationId = s.archive.readStoredMessage(key)!.conversationId;
  const post = (body: any = {}) => fetch(base + '/api/exports', { method: 'POST', headers: { ...headers, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, from: '', to: '', csrfToken: session.csrfToken, ...body }) });
  return { s, dir, base, headers, key, bytes, post, conversationId, csrfToken: session.csrfToken };
}
async function ready(f: Awaited<ReturnType<typeof fixture>>, id: string) {
  for (let i = 0; i < 200; i++) {
    const r = await fetch(f.base + '/api/exports/' + id, { headers: f.headers }); assert.equal(r.status, 200); const job = await r.json();
    if (job.state !== 'preparing') return job;
    await new Promise(r => setTimeout(r, 5));
  } throw Error('job timeout');
}
test('ZIP HTTP inclui todas as páginas e um original congelado', async t => {
  const f = await fixture(t), r = await f.post(); assert.equal(r.status, 202, 'criação privada deve iniciar exportação completa'); const initial = await r.json();
  assert.equal(initial.state, 'preparing');
  f.s.archive.ingestUpdates([{ key: f.key, update: { messageTimestamp: 1700000100, message: { conversation: 'edit posterior' } } }]);
  f.s.archive.ingestUpsert({ type: 'notify', messages: [{ key: { ...f.key, id: 'retro' }, messageTimestamp: 1700000001, message: { conversation: 'retroativo posterior' } }] });
  const job = await ready(f, initial.jobId); assert.equal(job.state, 'ready'); assert.equal(job.counts.messages, 162); assert.equal(job.counts.files, 1);
  const download = await fetch(f.base + job.downloadURL, { headers: f.headers }); assert.equal(download.status, 200); assert.equal(download.headers.get('content-type'), 'application/zip');
  const path = join(f.dir, 'checked.zip'); writeFileSync(path, Buffer.from(await download.arrayBuffer()));
  const zip = await entries(path), manifest = JSON.parse(zip.get('manifest.json')!.toString()); assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.messages.length, 162); assert.equal(manifest.coverage.completeAccount, false);
  assert.doesNotMatch(zip.get('mensagens.txt')!.toString() + zip.get('manifest.json')!.toString(), /PRIVATE_SENTINEL|mediaKey|descriptor|edit posterior|retroativo posterior/);
  const a = manifest.messages.flatMap((m: any) => m.attachments)[0]; assert.deepEqual(zip.get(a.path), f.bytes); assert.equal(a.sha256, createHash('sha256').update(f.bytes).digest('hex'));
  assert.equal(spawnSync('unzip', ['-t', path]).status, 0);
});

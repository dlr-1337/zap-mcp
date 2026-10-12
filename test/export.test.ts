import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, closeSync, existsSync, readdirSync, readlinkSync, openSync, fstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once, EventEmitter } from 'node:events';
import { createHash, randomBytes } from 'node:crypto';
import { get as httpGet } from 'node:http';
import { Readable } from 'node:stream';
import { spawnSync, spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import yazl from 'yazl';
import type { AddressInfo } from 'node:net';
import yauzl from 'yauzl';
import { crc32 } from 'node:zlib';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';
import { createExportManager, verifyZip } from '../src/export.js';
import { openArchive, parsePeriod } from '../src/archive.js';
import type { SocketFactory } from '../src/whatsapp.js';

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
test('fechar serviço sem geração ativa libera perfil imediatamente', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-export-close-')); t.after(() => rmSync(dir, { recursive: true }));
  const s = createService({ dataDir: dir }), closing = s.close(); let reopened = false;
  try { const next = createService({ dataDir: dir }); reopened = true; await next.close(); } catch {} finally { await closing; }
  assert.equal(reopened, true, 'fechamento ocioso precisa conservar contrato síncrono');
});
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
  return { s, dir, base, headers, key, bytes, post, conversationId, csrfToken: session.csrfToken, server };
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
test('restrição posterior revoga ZIP pronto e falha preparação congelada sem apagar acervo', async t => {
  const f = await fixture(t), initial = await (await f.post()).json();
  assert.equal((await ready(f, initial.jobId)).state, 'ready');
  f.s.archive.ingestHistory({ messages: [{ key: { ...f.key, isViewOnce: true }, messageTimestamp: 1700000001, message: { conversation: 'restrita' } }] });
  const job = await (await fetch(f.base + '/api/exports/' + initial.jobId, { headers: f.headers })).json();
  assert.equal(job.state, 'failed'); assert.match(job.reason, /restrit/);
  for (const method of ['GET', 'HEAD']) assert.equal((await fetch(f.base + '/api/exports/' + initial.jobId + '/download', { method, headers: f.headers })).status, 409);
  assert.equal(existsSync(join(f.dir, 'exports', initial.jobId + '.zip')), false);
  const stored = f.s.archiveDb.prepare('SELECT id FROM attachments').get() as { id: string };
  assert.deepEqual(readFileSync(join(f.dir, 'media', stored.id + '.bin')), f.bytes);

  const second = await fixture(t); let release!: () => void, began!: () => void;
  const held = new Promise<void>(r => release = r), started = new Promise<void>(r => began = r);
  const manager = createExportManager({ archive: second.s.archive, dataDir: second.dir, mediaDir: join(second.dir, 'media'), fault: async point => { if (point === 'stream') { began(); await held; } } });
  const pending = manager.createExportJob('private-session', second.conversationId, '', '');
  await started;
  second.s.archive.ingestHistory({ messages: [{ key: { ...second.key, isViewOnce: true }, message: { conversation: 'restrita' } }] });
  release(); await manager.close();
  const db = new Database(join(second.dir, 'exports', 'jobs.sqlite'));
  const row = db.prepare('SELECT state FROM jobs WHERE id=?').get(pending.jobId) as { state: string }; db.close();
  assert.equal(row.state, 'failed', 'descritor já aberto não autoriza publicação após restrição');
  assert.equal(existsSync(join(second.dir, 'exports', pending.jobId + '.zip')), false);
  assert.equal(existsSync(join(second.dir, 'exports', pending.jobId + '.part')), false);
});
test('ZIP HTTP em backpressure interrompe bytes futuros com e sem polling', async t => {
  for (const polling of [false, true]) {
    const f = await fixture(t), bytes = randomBytes(2 * 1024 ** 2), key = { ...f.key, id: 'large' };
    f.s.archive.ingestHistory({ messages: [{ key, messageTimestamp: 1700000002, message: { documentMessage: { url: 'https://mmg.whatsapp.net/test', mediaKey: Buffer.alloc(32), fileLength: bytes.length } } }] });
    const worker = startMediaWorker({ archive: f.s.archive, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
    const initial = await (await f.post()).json(), job = await ready(f, initial.jobId);
    let began!: () => void, resume!: () => void, writes = 0;
    const started = new Promise<void>(r => began = r);
    f.server.prependListener('request', (req, res) => {
      if (req.url !== job.downloadURL) return;
      const write = res.write.bind(res), emit = res.emit.bind(res); let held = true;
      res.emit = ((name: string, ...args: unknown[]) => name === 'drain' && held ? false : emit(name, ...args)) as typeof res.emit;
      res.write = ((...args: Parameters<typeof res.write>) => { writes++; const flowing = write(...args); began(); return writes === 1 ? false : flowing; }) as typeof res.write;
      resume = () => { held = false; res.emit('drain'); };
    });
    let received = 0, completed = false;
    const finished = new Promise<void>((resolve, reject) => {
      const req = httpGet(f.base + job.downloadURL, { headers: { ...f.headers, Range: 'bytes=0-999999' } }, res => {
        assert.equal(res.statusCode, 200); res.pause();
        res.on('data', b => received += b.length); res.on('end', () => { completed = true; }); res.on('error', () => {}); res.on('close', resolve);
        resume = (() => { const drain = resume; return () => { drain(); res.resume(); }; })();
      }); req.on('error', reject);
    });
    await started; await new Promise(r => setTimeout(r, 20));
    assert.equal(writes, 1, 'resposta retida após primeiro chunk');
    f.s.archive.ingestHistory({ messages: [{ key: { ...key, isViewOnce: true }, message: { conversation: 'restrita' } }] });
    if (polling) assert.equal((await ready(f, initial.jobId)).state, 'failed');
    resume(); await finished;
    assert.equal(writes, 1, 'nenhum write posterior à restrição'); assert.equal(completed, false); assert.ok(received < bytes.length);
    assert.equal((await ready(f, initial.jobId)).state, 'failed');
    assert.equal(f.s.archive.getCoverage().uniqueMessages, 163);
    const attachment = f.s.archiveDb.prepare('SELECT id FROM attachments WHERE reference=?').get(f.s.archive.readStoredMessage(key)!.reference) as { id: string };
    assert.deepEqual(readFileSync(join(f.dir, 'media', attachment.id + '.bin')), bytes);
  }
});
test('ZIP já aberto conserva guarda, descarta buffer e fecha fd uma vez', async t => {
  for (const invalidation of ['restricted', 'polling', 'session', 'expiry', 'close']) {
    const dir = mkdtempSync(join(tmpdir(), 'zap-export-open-')), archive = openArchive(dir);
    const manager = createExportManager({ archive, dataDir: dir, mediaDir: join(dir, 'media') });
    let closed = false;
    t.after(async () => { if (!closed) await manager.close(); archive.close(); rmSync(dir, { recursive: true }); });
    const key = { remoteJid: 'open@lid', id: 'm', fromMe: false };
    archive.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { conversation: 'mensagem comum' } }] });
    const id = archive.readStoredMessage(key)!.conversationId, job = manager.createExportJob('session', id, '', '');
    for (let i = 0; i < 200 && manager.getExportJob(job.jobId, 'session').state === 'preparing'; i++) await new Promise(r => setTimeout(r, 5));
    const opened = manager.openExport(job.jobId, 'session'), errors: Error[] = [];
    assert.equal('fd' in opened, false, 'API não delega fd cru sem guarda');
    opened.stream.on('error', e => errors.push(e));
    const ended = new Promise<void>(r => opened.stream.once('close', r));
    opened.stream.read(0); assert.ok(opened.stream.readableLength > 0, 'chunk já retido no stream');
    if (invalidation === 'restricted' || invalidation === 'polling') {
      archive.ingestHistory({ messages: [{ key: { ...key, isViewOnce: true }, message: { conversation: 'restrita' } }] });
      if (invalidation === 'polling') assert.equal(manager.getExportJob(job.jobId, 'session').state, 'failed');
    } else if (invalidation === 'session') manager.dropSession('session');
    else if (invalidation === 'expiry') { const db = new Database(join(dir, 'exports', 'jobs.sqlite')); db.prepare('UPDATE jobs SET expires=0').run(); db.close(); manager.purge(); }
    else { await manager.close(); closed = true; }
    await ended; assert.ok(errors.length); assert.equal(opened.stream.read(), null);
    const probe = openSync(join(dir, 'archive.sqlite'), 'r');
    try { opened.stream.destroy(); await new Promise(r => setImmediate(r)); assert.ok(fstatSync(probe).isFile(), 'destroy repetido não fecha fd reutilizado'); } finally { closeSync(probe); }
    assert.equal(archive.getCoverage().uniqueMessages, 1);
  }
});
test('expiração elimina DTOs privados derivados e mantém tombstone seguro', async t => {
  const f = await fixture(t), r = await f.post(), j = await r.json(); assert.equal((await ready(f, j.jobId)).state, 'ready');
  const db = new Database(join(f.dir, 'exports', 'jobs.sqlite')); db.prepare('UPDATE jobs SET expires=0').run();
  assert.equal((await fetch(f.base + '/api/exports/' + j.jobId, { headers: f.headers })).status, 410);
  assert.equal(existsSync(join(f.dir, 'exports', j.jobId + '.zip')), false);
  const row = db.prepare('SELECT selection FROM jobs WHERE id=?').get(j.jobId) as { selection: string }; db.close();
  assert.equal(/mensagem 160|legenda original/.test(row.selection), false, 'TTL precisa remover evidência privada derivada');
});
test('manifesto conserva versões Unicode citações faltantes e nomes iguais sem sobrescrever', async t => {
  const f = await fixture(t), a = f.s.archive;
  const node = { fileName: '../../igual 🧪.bin', caption: 'legenda editada', url: 'https://mmg.whatsapp.net/edit', mediaKey: Buffer.alloc(32), fileLength: f.bytes.length };
  a.ingestUpdates([{ key: f.key, update: { messageTimestamp: 1700000200, message: { documentMessage: node } } }]);
  a.ingestHistory({ messages: [{ key: { ...f.key, id: 'quote' }, messageTimestamp: 1700000010, message: { extendedTextMessage: { text: 'שלום e\u0301', contextInfo: { stanzaId: 'file', participant: '2@lid', quotedMessage: { conversation: 'citação preservada' } } } } }, { key: { ...f.key, id: 'restricted' }, message: { viewOnceMessage: { message: { conversation: 'PRIVATE_RESTRICTED' } } } }] });
  const r = await f.post(), initial = await r.json();
  a.ingestUpdates([{ key: f.key, update: { message: null } }]); a.ingestContacts([{ id: '1@lid', lid: '1@lid', phoneNumber: '1@s.whatsapp.net' }]);
  const worker = startMediaWorker({ archive: a, mediaDir: join(f.dir, 'media'), downloadOriginal: async () => Readable.from([f.bytes]) }); await worker.drain(); await worker.stop();
  const job = await ready(f, initial.jobId); assert.equal(job.state, 'ready');
  const bytes = Buffer.from(await (await fetch(f.base + job.downloadURL, { headers: f.headers })).arrayBuffer()), path = join(f.dir, 'versions.zip'); writeFileSync(path, bytes);
  const zip = await entries(path), manifest = JSON.parse(zip.get('manifest.json')!.toString()), message = manifest.messages.find((m: any) => m.key?.id === 'file');
  assert.equal(message.revoked, false); assert.deepEqual(message.revisions.map((r: any) => r.text), ['legenda original', 'legenda editada']);
  assert.equal(message.attachments.length, 2); assert.equal(message.attachments[1].capturedState, 'pending'); assert.equal(message.attachments[1].path, null); assert.equal(job.counts.missing, 1);
  assert.equal(manifest.messages.find((m: any) => m.key?.id === 'quote').quote.text, 'citação preservada'); assert.doesNotMatch(zip.get('manifest.json')!.toString(), /PRIVATE_RESTRICTED/);
  assert.equal(spawnSync('unzip', ['-t', path]).status, 0); assert.ok(a.readStoredMessage(f.key)!.revoked);
  const retry = await (await f.post()).json(), newer = await ready(f, retry.jobId); assert.equal(newer.counts.files, 2); assert.equal(newer.counts.missing, 0);
  const nextPath = join(f.dir, 'retry.zip'); writeFileSync(nextPath, Buffer.from(await (await fetch(f.base + newer.downloadURL, { headers: f.headers })).arrayBuffer())); const nextZip = await entries(nextPath), next = JSON.parse(nextZip.get('manifest.json')!.toString());
  const revisions = next.messages.find((m: any) => m.key?.id === 'file'); assert.equal(revisions.revoked, true); assert.equal(revisions.revisions.length, 3); assert.equal(new Set(revisions.attachments.map((a: any) => a.path)).size, 2); assert.equal(spawnSync('unzip', ['-t', nextPath]).status, 0);
});
test('período exportado compartilha DST limites inclusivos desconhecido vazio e ordenação', async t => {
  const f = await fixture(t), a = f.s.archive;
  const period = parsePeriod('2018-11-04', '2018-11-04');
  a.ingestHistory({ messages: [period.startMs! - 1000, period.startMs!, period.endMs! - 1000, period.endMs!].map((ms, i) => ({ key: { ...f.key, id: 'dst' + i }, messageTimestamp: ms / 1000, message: { conversation: 'DST ' + i } })).concat([{ key: { ...f.key, id: 'unknown' }, message: { conversation: 'unknown' } }] as any) });
  const frozen = a.freezeExportSelection(f.conversationId, period); assert.deepEqual(frozen.messages.map(m => m.text), ['DST 1', 'DST 2']); assert.equal(period.endMs! - period.startMs!, 23 * 3600_000);
  assert.equal(a.freezeExportSelection(f.conversationId, parsePeriod()).messages.at(-1)!.originalTimestamp, null);
  assert.equal((await f.post({ from: '2099-01-01' })).status, 422); assert.equal((await f.post({ from: '2024-02-30' })).status, 400); assert.equal((await f.post({ from: '2024-01-02', to: '2024-01-01' })).status, 400);
});
test('verificação ZIP rejeita CRC SHA conjunto duplicata traversal e absoluto', async t => {
  const f = await fixture(t), data = Buffer.from('expected'), expected = new Map([['mensagens.txt', { size: data.length, sha256: createHash('sha256').update(data).digest('hex') }]]);
  const make = async (names: string[], content = data) => { const zip = new yazl.ZipFile(), path = join(f.dir, 'invalid-' + Math.random() + '.zip'); for (const n of names) zip.addBuffer(content, n, { compress: false }); zip.end(); const chunks: Buffer[] = []; for await (const b of zip.outputStream) chunks.push(Buffer.from(b)); writeFileSync(path, Buffer.concat(chunks)); return path; };
  await assert.rejects(verifyZip(await make([]), expected)); await assert.rejects(verifyZip(await make(['mensagens.txt', 'mensagens.txt']), expected)); await assert.rejects(verifyZip(await make(['manifest.json']), expected)); await assert.rejects(verifyZip(await make(['mensagens.txt'], Buffer.from('tampered')), expected));
  const crcPath = await make(['mensagens.txt']), changed = readFileSync(crcPath); const central = changed.indexOf(Buffer.from('504b0102', 'hex')); changed.writeUInt32LE(0, central + 16); writeFileSync(crcPath, changed); await assert.rejects(verifyZip(crcPath, expected), /Integridade/);
  for (const name of ['../x', '/etc', 'a\\b']) {
    const path = await make(['evilx']); const raw = readFileSync(path); for (let i = raw.indexOf(Buffer.from('evilx')); i !== -1; i = raw.indexOf(Buffer.from('evilx'), i + 5)) Buffer.from(name.padEnd(5, 'x')).copy(raw, i); writeFileSync(path, raw); await assert.rejects(verifyZip(path, expected));
  }
});
test('falhas ENOSPC stream conferência e publicação não anunciam pronto nem apagam acervo', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-export-fault-')), a = openArchive(dir); t.after(() => { a.close(); rmSync(dir, { recursive: true }); });
  const key = { remoteJid: 'fault@lid', id: 'm', fromMe: false }; a.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { conversation: 'intacto' } }] });
  const bytes = Buffer.from('original intacto'), mediaKey = { ...key, id: 'file' }; a.ingestHistory({ messages: [{ key: mediaKey, messageTimestamp: 123, message: { documentMessage: { url: 'https://mmg.whatsapp.net/synthetic', mediaKey: Buffer.alloc(32), fileLength: bytes.length } } }] }); const worker = startMediaWorker({ archive: a, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop(); const attachment = a.readStoredMessage(mediaKey)!.attachments[0];
  const id = a.readStoredMessage(key)!.conversationId;
  for (const point of ['claimed', 'stream', 'entry', 'written', 'verified', 'synced', 'published']) {
    const m = createExportManager({ archive: a, dataDir: dir, mediaDir: join(dir, 'media'), fault: async (stage, path) => { if (stage === point) { if (point === 'written') writeFileSync(path, 'truncated'); else if (point === 'stream') { const fd = readdirSync('/proc/self/fd').find(n => { try { return readlinkSync('/proc/self/fd/' + n) === join(dir, 'media', attachment.id + '.bin'); } catch { return false; } }); assert.ok(fd); closeSync(Number(fd)); } else throw Object.assign(Error('PRIVATE_FAULT'), { code: 'ENOSPC' }); } } });
    const j = m.createExportJob('session', id, '', ''); assert.equal(j.state, 'preparing'); assert.throws(() => m.createExportJob('other', id, '', ''), (e: any) => e.status === 409);
    for (let i = 0; i < 100 && m.getExportJob(j.jobId, 'session').state === 'preparing'; i++) await new Promise(r => setTimeout(r, 5));
    const done = m.getExportJob(j.jobId, 'session'); assert.equal(done.state, 'failed', point); assert.equal('downloadURL' in done, false); assert.doesNotMatch(done.reason!, /PRIVATE_FAULT/); assert.throws(() => m.openExport(j.jobId, 'session'));
    assert.equal(a.readStoredMessage(key)!.text, 'intacto'); assert.deepEqual(readFileSync(join(dir, 'media', attachment.id + '.bin')), bytes); assert.equal(a.getAttachment(attachment.id)!.state, 'available'); assert.equal(readdirSync(join(dir, 'exports')).some(n => /\.(part|zip)$/.test(n)), false); await m.close();
  }
});
test('limites de seleção e orçamento recusam explicitamente sem truncar o arquivo', async t => {
  const f = await fixture(t), a = f.s.archive;
  const attachment = a.readStoredMessage(f.key)!.attachments[0]; a.db.prepare('UPDATE attachments SET size=? WHERE id=?').run(3 * 1024 ** 3, attachment.id);
  assert.equal((await f.post()).status, 413); assert.equal(a.getCoverage().uniqueMessages, 162);
  a.db.prepare('UPDATE attachments SET size=? WHERE id=?').run(f.bytes.length, attachment.id);
  a.db.prepare("WITH RECURSIVE n(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM n WHERE i<50001) INSERT INTO messages(reference,conversation_id,text) SELECT 'excess-'||i,?,'small' FROM n").run(f.conversationId);
  assert.equal((await f.post()).status, 413); assert.equal(a.getCoverage().uniqueMessages, 50163);
});
test('SIGKILL antes e após publicação recupera preparing como failed preservando original', async t => {
  for (const stage of ['claimed', 'verified', 'published']) {
    const dir = mkdtempSync(join(tmpdir(), 'zap-export-kill-')); t.after(() => rmSync(dir, { recursive: true }));
    const a = openArchive(dir), key = { remoteJid: 'kill@lid', id: 'm', fromMe: false }; a.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { conversation: 'preservado' } }] }); const id = a.readStoredMessage(key)!.conversationId; a.close();
    const script = `import {openArchive} from './dist/src/archive.js';import {createExportManager} from './dist/src/export.js';const archive=openArchive(process.env.DIR);const m=createExportManager({archive,dataDir:process.env.DIR,mediaDir:process.env.DIR+'/media',fault:async point=>{if(point===process.env.STAGE){console.log('held');await new Promise(()=>{});}}});m.createExportJob('session',process.env.ID,'','');setInterval(()=>{},1000);`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, DIR: dir, ID: id, STAGE: stage }, stdio: ['ignore', 'pipe', 'pipe'] }); t.after(() => child.kill('SIGKILL'));
    await new Promise<void>((ok, fail) => { const timer = setTimeout(() => { child.kill('SIGKILL'); fail(Error('crash timeout')); }, 5000); child.stdout.on('data', b => { if (String(b).includes('held')) { clearTimeout(timer); ok(); } }); child.once('exit', code => { clearTimeout(timer); fail(Error('early exit ' + code)); }); });
    child.kill('SIGKILL'); await once(child, 'exit');
    const restored = openArchive(dir), m = createExportManager({ archive: restored, dataDir: dir, mediaDir: join(dir, 'media') }), db = new Database(join(dir, 'exports', 'jobs.sqlite')); const row = db.prepare('SELECT id FROM jobs').get() as { id: string }; db.close();
    assert.equal(m.getExportJob(row.id, 'session').state, 'failed'); assert.equal(readdirSync(join(dir, 'exports')).some(n => /\.(part|zip)$/.test(n)), false); assert.equal(restored.readStoredMessage(key)!.text, 'preservado'); await m.close(); restored.close();
  }
});
test('ciclo completo de exportação consulta somente arquivo sem métodos WhatsApp', async t => {
  const f = await fixture(t), ev = new EventEmitter(); let forbidden = 0, sockets = 0;
  const reject = () => { forbidden++; throw Error('proibido'); };
  const collector = f.s.startCollector({ newProfile: true, socketFactory: () => { sockets++; return { ev, end() {}, sendMessage: reject, chatModify: reject, readMessages: reject, sendReceipt: reject, sendPresenceUpdate: reject, logout: reject } as unknown as ReturnType<SocketFactory>; } });
  await collector.stop();
  const r = await f.post(); assert.equal(r.status, 202); const j = await r.json(), job = await ready(f, j.jobId); assert.equal(job.state, 'ready'); assert.equal((await fetch(f.base + job.downloadURL, { headers: f.headers })).status, 200);
  for (const path of ['/send', '/edit', '/delete', '/read', '/presence', '/mcp', '/export', '/ingest']) assert.equal((await fetch(f.base + path, { method: 'POST', headers: f.headers })).status, 404);
  assert.equal(forbidden, 0); assert.equal(sockets, 1); assert.equal(f.s.archive.getCoverage().uniqueMessages, 162);
});

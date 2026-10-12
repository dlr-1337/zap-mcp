import Database from 'better-sqlite3';
import { chmodSync, closeSync, constants, createReadStream, createWriteStream, existsSync, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readdirSync, realpathSync, statfsSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { once } from 'node:events';
import { crc32 } from 'node:zlib';
import yazl from 'yazl';
import yauzl from 'yauzl';
import { parsePeriod, type Archive } from './archive.js';
import { openVerifiedAttachment, streamVerifiedAttachment } from './media.js';

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BUDGET = 2 * 1024 ** 3, TTL = 30 * 60_000;
const error = (status: number, text: string) => Object.assign(Error(text), { status });
type Expected = Map<string, { size: number; sha256: string }>;
type Selection = ReturnType<Archive['freezeExportSelection']>;
function newlyRestricted(archive: Archive, selection: Selection) {
  return selection.messages.some(m => !m.restricted && archive.isRestricted(m.reference));
}
type Fault = (point: string, path: string) => void | Promise<void>;
const digest = (b: Buffer) => ({ size: b.length, sha256: createHash('sha256').update(b).digest('hex') });
function syncDirectory(directory: string) { const fd = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW); try { fsyncSync(fd); } finally { closeSync(fd); } }
function space(directory: string, estimate = 0) {
  const s = statfsSync(directory, { bigint: true }), free = s.bavail * s.bsize, total = s.blocks * s.bsize;
  const reserve = total / 20n > 256n * 1024n ** 2n ? total / 20n : 256n * 1024n ** 2n;
  if (free - BigInt(estimate) < reserve) throw error(507, 'Espaço insuficiente para preparar a exportação.');
}
export async function verifyZip(path: string, expected: Expected) {
  const zip = await new Promise<yauzl.ZipFile>((ok, fail) => yauzl.open(path, { lazyEntries: true, strictFileNames: true, validateEntrySizes: true }, (e, z) => e ? fail(e) : ok(z!)));
  const seen = new Set<string>();
  await new Promise<void>((ok, fail) => {
    const stop = (e: unknown) => { zip.close(); fail(e); };
    zip.on('error', stop); zip.on('end', () => seen.size === expected.size ? ok() : stop(Error('Conjunto ZIP incompleto')));
    zip.on('entry', async (entry: yauzl.Entry) => {
      try {
        const wanted = expected.get(entry.fileName);
        if (!wanted || seen.has(entry.fileName) || !/^(mensagens\.txt|manifest\.json|arquivos\/[0-9a-f-]{36}\.bin)$/.test(entry.fileName) || entry.uncompressedSize !== wanted.size) throw Error('Entrada ZIP inválida');
        seen.add(entry.fileName);
        const stream = await new Promise<Readable>((yes, no) => zip.openReadStream(entry, (e, s) => e ? no(e) : yes(s!)));
        const hash = createHash('sha256'); let size = 0, crc = 0;
        for await (const chunk of stream) { size += chunk.length; if (size > wanted.size) throw Error('Entrada ZIP excessiva'); hash.update(chunk); crc = crc32(chunk, crc); }
        if (size !== wanted.size || crc !== entry.crc32 || hash.digest('hex') !== wanted.sha256) throw Error('Integridade ZIP divergente');
        zip.readEntry();
      } catch (e) { stop(e); }
    }); zip.readEntry();
  });
}
export async function buildZip(archive: Archive, mediaDir: string, path: string, selection: Selection, fault?: Fault) {
  const zip = new yazl.ZipFile(), source = zip.outputStream as Readable, streams = new Set<Readable>(), expected: Expected = new Map();
  let written = 0, checked = 0;
  const bounded = new Transform({ transform(chunk, _encoding, callback) {
    try { written += chunk.length; if (written > BUDGET) throw error(413, 'Exportação excede 2GiB. Restrinja o período.'); if (written - checked >= 1024 ** 2) { space(join(path, '..')); checked = written; } callback(null, chunk); } catch (e) { callback(e as Error); }
  } });
  const output = createWriteStream(path, { flags: 'wx', mode: 0o600 });
  zip.on('error', e => source.destroy(e));
  const writing = pipeline(source, bounded, output); void writing.catch(() => { for (const stream of streams) stream.destroy(); });
  try {
    if (newlyRestricted(archive, selection)) throw Error('Conteúdo restrito indisponível');
    const messages = structuredClone(selection.messages).map(m => ({ ...m, originalUtc: m.originalTimestamp, originalLocal: m.originalTimestamp ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'long' }).format(new Date(m.originalTimestamp)) : null, attachments: m.attachments.map(a => ({ ...a, capturedState: a.state, packagingState: 'missing', reason: (a.reason ?? 'Original não disponível no instante do recorte') as string | null, path: null as string | null })) }));
    let files = 0, missing = 0;
    for (const m of messages) for (const a of m.attachments) {
      if (a.capturedState !== 'available') { missing++; continue; }
      const file = openVerifiedAttachment(archive, mediaDir, a.id);
      if (!file) { a.reason = 'Arquivo local ausente ou divergente'; missing++; continue; }
      if (file.size !== a.size || file.sha256 !== a.sha256) { closeSync(file.fd); a.reason = 'Original divergiu do recorte congelado'; missing++; continue; }
      const name = 'arquivos/' + a.id + '.bin';
      if (expected.has(name)) { closeSync(file.fd); throw Error('Anexo duplicado'); }
      a.path = name; a.packagingState = 'included'; a.reason = null;
      expected.set(name, { size: file.size, sha256: file.sha256 }); files++;
      const stream = streamVerifiedAttachment(archive, file); streams.add(stream);
      stream.on('error', e => source.destroy(e));
      await fault?.('stream', path);
      zip.addReadStreamLazy(name, { size: file.size, mode: 0o100600 }, callback => callback(null, stream));
      await once(stream, 'close'); streams.delete(stream); await fault?.('entry', path);
    }
    const counts = { messages: messages.length, files, missing };
    const manifest = { schemaVersion: 1, ...selection, messages, counts, missing: messages.flatMap(m => m.attachments.filter(a => a.packagingState === 'missing').map(a => ({ reference: m.reference, revisionId: a.revisionId, attachmentId: a.id, reason: a.reason }))) };
    const text = ['Arquivo observado; não garante histórico integral da conta.', 'Fuso: America/Sao_Paulo', 'Filtros: ' + JSON.stringify(selection.effectiveFilters), ...messages.map(m => '\n' + [m.originalLocal ?? 'Instante original desconhecido', 'UTC: ' + (m.originalTimestamp ?? 'desconhecido'), 'Referência: ' + m.reference, 'Autor: ' + (m.author ?? 'desconhecido') + ' · Direção: ' + (m.fromMe === null ? 'desconhecida' : m.fromMe ? 'enviada' : 'recebida'), m.text ?? 'Texto não informado ou indisponível', 'Evidência: ' + JSON.stringify(m)].join('\n'))].join('\n');
    for (const [name, bytes] of [['mensagens.txt', Buffer.from(text)], ['manifest.json', Buffer.from(JSON.stringify(manifest, null, 2))]] as [string, Buffer][]) { expected.set(name, digest(bytes)); zip.addBuffer(bytes, name, { mode: 0o100600 }); }
    zip.end(); await writing; await fault?.('written', path);
    await verifyZip(path, expected); await fault?.('verified', path);
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW); try { fsyncSync(fd); } finally { closeSync(fd); }
    await fault?.('synced', path);
    if (newlyRestricted(archive, selection)) throw Error('Conteúdo restrito indisponível');
    return counts;
  } catch (e) { for (const stream of streams) stream.destroy(); source.destroy(e as Error); output.destroy(); await writing.catch(() => {}); throw e; }
}

export function createExportManager({ archive, dataDir, mediaDir, fault }: { archive: Archive; dataDir: string; mediaDir: string; fault?: Fault }) {
  const directory = resolve(dataDir, 'exports'); mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (lstatSync(directory).isSymbolicLink() || realpathSync(directory) !== directory) throw Error('Derivados privados inválidos');
  chmodSync(directory, 0o700);
  const dbPath = join(directory, 'jobs.sqlite'); if (existsSync(dbPath) && (!lstatSync(dbPath).isFile() || lstatSync(dbPath).isSymbolicLink())) throw Error('Derivados privados inválidos');
  const db = new Database(dbPath); db.pragma('synchronous = FULL');
  chmodSync(dbPath, 0o600); db.pragma('secure_delete = ON');
  db.exec("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,session TEXT NOT NULL,state TEXT NOT NULL,selection TEXT NOT NULL,expires INTEGER NOT NULL,counts TEXT,reason TEXT); CREATE UNIQUE INDEX IF NOT EXISTS single_export ON jobs(state) WHERE state='preparing'; UPDATE jobs SET state='failed',reason='Preparação interrompida. Gere novamente.' WHERE state='preparing';");
  db.prepare("UPDATE jobs SET selection='{}',counts=NULL WHERE expires<=?").run(Date.now());
  let active: Promise<void> | undefined, stopped = false;
  const remove = (id: string) => { if (!idPattern.test(id)) return; for (const suffix of ['.part', '.zip']) { const path = join(directory, id + suffix); if (existsSync(path)) unlinkSync(path); } };
  const expire = (id: string) => { remove(id); db.prepare("UPDATE jobs SET state='failed',selection='{}',counts=NULL,reason='Esta exportação expirou.' WHERE id=?").run(id); };
  for (const name of readdirSync(directory)) if (/^[0-9a-f-]{36}\.(part|zip)$/.test(name)) {
    const id = name.slice(0, 36), row = db.prepare('SELECT state,expires FROM jobs WHERE id=?').get(id) as { state: string; expires: number } | undefined;
    if (row && row.expires <= Date.now()) expire(id);
    else if (!row || row.state !== 'ready' || name.endsWith('.part')) remove(id);
  }
  const get = (id: string, session: string) => {
    if (!idPattern.test(id)) throw error(404, 'Exportação não encontrada');
    const row = db.prepare('SELECT * FROM jobs WHERE id=? AND session=?').get(id, session) as { id: string; state: string; selection: string; expires: number; counts: string | null; reason: string | null } | undefined;
    if (!row) throw error(404, 'Exportação não encontrada');
    if (row.expires <= Date.now()) { expire(id); throw error(410, 'Esta exportação expirou. Gere novamente.'); }
    const selection: Selection = JSON.parse(row.selection);
    if (newlyRestricted(archive, selection)) {
      remove(id);
      db.prepare("UPDATE jobs SET state='failed',selection=?,counts=NULL,reason=? WHERE id=?").run(JSON.stringify({ ...selection, messages: [] }), 'O recorte contém conteúdo marcado como restrito. Gere novamente.', id);
      return { jobId: id, state: 'failed', effectiveFilters: selection.effectiveFilters, conversation: selection.conversation, snapshotAt: selection.snapshotAt, expiresAt: new Date(row.expires).toISOString(), counts: { messages: 0, files: null, missing: null }, reason: 'O recorte contém conteúdo marcado como restrito. Gere novamente.' };
    }
    return { jobId: id, state: row.state, effectiveFilters: selection.effectiveFilters, conversation: selection.conversation, snapshotAt: selection.snapshotAt, expiresAt: new Date(row.expires).toISOString(), counts: row.counts ? JSON.parse(row.counts) : { messages: selection.messages.length, files: null, missing: null }, reason: row.reason, ...(row.state === 'ready' ? { downloadURL: '/api/exports/' + id + '/download' } : {}) };
  };
  const create = (session: string, conversationId: unknown, from: unknown, to: unknown) => {
    if (stopped) throw error(409, 'Preparação indisponível');
    if (active || db.prepare("SELECT id FROM jobs WHERE state='preparing'").get()) throw error(409, 'Já há uma exportação em preparação. Aguarde.');
    if (typeof conversationId !== 'string' || !idPattern.test(conversationId)) throw error(404, 'Não encontrado no acervo');
    const selection = archive.freezeExportSelection(conversationId, parsePeriod(from, to));
    const json = JSON.stringify(selection), binary = selection.messages.flatMap(m => m.attachments).filter(a => a.state === 'available').reduce((n, a) => n + (a.size ?? BUDGET), 0);
    const estimate = Buffer.byteLength(json) * 5 + binary + selection.messages.length * 2048;
    let used = 0; for (const name of readdirSync(directory)) if (/^[0-9a-f-]{36}\.(part|zip)$/.test(name)) { const path = join(directory, name), row = db.prepare('SELECT expires FROM jobs WHERE id=?').get(name.slice(0, 36)) as { expires: number } | undefined; if (!row || row.expires <= Date.now()) remove(name.slice(0, 36)); else used += lstatSync(path).size; }
    if (!Number.isSafeInteger(estimate) || estimate + used > BUDGET) throw error(413, 'Exportações excedem o orçamento de 2GiB. Restrinja o período ou aguarde expiração.');
    space(directory, estimate);
    const id = randomUUID(), expires = Date.now() + TTL;
    db.transaction(() => db.prepare("INSERT INTO jobs(id,session,state,selection,expires) VALUES(?,?,'preparing',?,?)").run(id, session, json, expires))();
    const part = join(directory, id + '.part'), final = join(directory, id + '.zip');
    active = new Promise<void>(resolve => setImmediate(resolve)).then(async () => {
      try {
        await fault?.('claimed', part); const counts = await buildZip(archive, mediaDir, part, selection, fault);
        if (newlyRestricted(archive, selection)) throw Error('Conteúdo restrito indisponível');
        if (!db.prepare("SELECT id FROM jobs WHERE id=? AND state='preparing' AND expires>?").get(id, Date.now())) throw Error('Revogado');
        linkSync(part, final); unlinkSync(part); syncDirectory(directory); await fault?.('published', final);
        const changed = db.prepare("UPDATE jobs SET state='ready',counts=? WHERE id=? AND state='preparing' AND expires>?").run(JSON.stringify(counts), id, Date.now());
        if (!changed.changes) throw Error('Revogado'); await fault?.('ready', final);
      } catch (e) { remove(id); const reason = (e as { code?: string }).code === 'ENOSPC' || (e as { status?: number }).status === 507 ? 'Espaço insuficiente. Gere novamente após liberar espaço.' : 'Não foi possível conferir o pacote. Gere novamente.'; db.prepare("UPDATE jobs SET state='failed',reason=? WHERE id=?").run(reason, id); }
    }).finally(() => { active = undefined; });
    return get(id, session);
  };
  return {
    createExportJob: create, getExportJob: get,
    openExport(id: string, session: string) {
      const job = get(id, session); if (job.state !== 'ready') throw error(409, 'Exportação ainda não está pronta');
      const fd = openSync(join(directory, id + '.zip'), constants.O_RDONLY | constants.O_NOFOLLOW);
      try { const stat = fstatSync(fd); if (!stat.isFile()) throw Error('Pacote inválido'); return { fd, size: stat.size }; } catch (e) { closeSync(fd); throw e; }
    },
    dropSession(session: string) { for (const row of db.prepare('SELECT id FROM jobs WHERE session=?').all(session) as { id: string }[]) remove(row.id); db.prepare('DELETE FROM jobs WHERE session=?').run(session); },
    purge() { for (const row of db.prepare('SELECT id FROM jobs WHERE expires<=?').all(Date.now()) as { id: string }[]) expire(row.id); db.prepare('DELETE FROM jobs WHERE expires<?').run(Date.now() - 24 * 3600_000); },
    close() { stopped = true; if (active) return active.then(() => db.close()); db.close(); }
  };
}

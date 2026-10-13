import { constants, mkdirSync, realpathSync, lstatSync, chmodSync, openSync, readSync, fstatSync, closeSync, fsyncSync, linkSync, unlinkSync, writeFileSync, existsSync, createWriteStream, createReadStream, statfsSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { deserialize } from 'node:v8';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import type { Dispatcher } from 'undici-types';
import type { Archive } from './archive.js';

type Node = Record<string, unknown>;
export type MediaJob = { id: string; type: string; descriptor: Node; message: { key: Node; message: Node }; attempts: number; generation: string };
export type DownloadOriginal = (job: MediaJob, signal: AbortSignal) => Promise<Readable>;
const internalId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function mediaDirectory(archive: Archive, mediaDir: string) {
  const dir = resolve(mediaDir);
  if (dirname(dir) !== dirname(resolve(archive.db.name))) throw Error('Mídia fora do diretório privado');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (realpathSync(dir) !== dir || lstatSync(dir).isSymbolicLink()) throw Error('Diretório de mídia inválido');
  chmodSync(dir, 0o700); return dir;
}
function integer(value: unknown): bigint | null {
  if (value == null) return null;
  let n: bigint;
  if (typeof value === 'bigint') n = value;
  else if (typeof value === 'number' && Number.isSafeInteger(value)) n = BigInt(value);
  else if (typeof value === 'string' && /^\d+$/.test(value)) n = BigInt(value);
  else if (typeof value === 'object') {
    const v = value as Node;
    if (!Number.isInteger(v.low) || !Number.isInteger(v.high) || Number(v.low) < -2147483648 || Number(v.low) > 4294967295 || Number(v.high) < -2147483648 || Number(v.high) > 4294967295) throw Error('Tamanho de origem inválido');
    n = BigInt(Number(v.high) >>> 0) << 32n | BigInt(Number(v.low) >>> 0);
    if (!v.unsigned) n = BigInt.asIntN(64, n);
  } else throw Error('Tamanho de origem inválido');
  if (n < 0n || n > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('Tamanho de origem inválido');
  return n;
}
function expected(node: Node) {
  const size = integer(node.fileLength);
  if (node.fileSha256 != null && (!(node.fileSha256 instanceof Uint8Array) || node.fileSha256.length !== 32)) throw Error('Hash de origem inválido');
  return { size, sha256: node.fileSha256 == null ? null : Buffer.from(node.fileSha256 as Uint8Array).toString('hex') };
}
function compare(size: bigint, sha256: string, node: Node) {
  const source = expected(node);
  if (source.size !== null && size !== source.size || source.sha256 !== null && sha256 !== source.sha256 || size === 0n && source.size !== 0n) throw Error('Integridade do original divergente');
  return Boolean(source.sha256);
}
function syncDirectory(dir: string) { const fd = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW); try { fsyncSync(fd); } finally { closeSync(fd); } }
function hashFile(path: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd); if (!stat.isFile() || !Number.isSafeInteger(stat.size)) throw Error('Final inválido');
    const digest = createHash('sha256'), buffer = Buffer.alloc(64 * 1024); let size = 0, count: number;
    while ((count = readSync(fd, buffer, 0, buffer.length, null))) { digest.update(buffer.subarray(0, count)); size += count; if (!Number.isSafeInteger(size)) throw Error('Final inválido'); }
    return { fd, size, sha256: digest.digest('hex') };
  } catch (error) { closeSync(fd); throw error; }
}
function failure(archive: Archive, id: string, reason: string, generation?: string, retryAt = 0, permanent = false) {
  return archive.db.transaction(() => {
    const changed = archive.db.prepare(`UPDATE media_jobs SET state=CASE WHEN attempts>=5 OR ? THEN 'unavailable' ELSE 'retry_wait' END,lease_until=NULL,retry_at=? WHERE attachment_id=? ${generation ? 'AND generation=? AND state=\'downloading\'' : ''}`).run(Number(permanent), retryAt, id, ...generation ? [generation] : []);
    if (changed.changes) archive.db.prepare('UPDATE attachments SET state=(SELECT state FROM media_jobs WHERE attachment_id=?),reason=? WHERE id=?').run(id, reason, id);
    return changed.changes;
  })();
}
export function openVerifiedAttachment(archive: Archive, mediaDir: string, id: string) {
  if (!internalId.test(id)) return null;
  const attachment = archive.getAttachment(id);
  if (!attachment || attachment.state !== 'available' || archive.isRestricted(attachment.reference)) return null;
  let file: ReturnType<typeof hashFile> | undefined;
  try {
    file = hashFile(join(mediaDirectory(archive, mediaDir), id + '.bin'));
    if (file.size !== attachment.size || file.sha256 !== attachment.sha256) throw Error('Final divergente');
    return { ...file, attachment };
  } catch { if (file) closeSync(file.fd); failure(archive, id, 'Arquivo local ausente ou divergente'); return null; }
}

export function streamVerifiedAttachment(archive: Archive, file: NonNullable<ReturnType<typeof openVerifiedAttachment>>, start = 0, end?: number) {
  const source = createReadStream('', { fd: file.fd, autoClose: true, start, end });
  const check = () => { if (archive.isRestricted(file.attachment.reference)) throw Error('Conteúdo restrito indisponível'); };
  const stream = Readable.from((async function* () {
    for await (const chunk of source) {
      check();
      yield chunk;
    }
  })(), { objectMode: false });
  // Gate consumption too: Readable.from may already have prefetched a permitted chunk.
  const read = stream.read.bind(stream);
  stream.read = size => { if (stream.destroyed) return null; try { check(); return read(size); } catch (e) { stream.destroy(e as Error); return null; } };
  const unsubscribe = archive.onChange(() => { try { check(); } catch (e) { stream.destroy(e as Error); } });
  stream.on('close', () => { unsubscribe(); source.destroy(); }); return stream;
}

export function classifyPreview(file: NonNullable<ReturnType<typeof openVerifiedAttachment>>) {
  const buffer = Buffer.alloc(Math.min(file.size, 1445));
  const header = buffer.subarray(0, readSync(file.fd, buffer, 0, buffer.length, 0));
  const mime = file.attachment.mimeType?.split(';')[0].trim().toLowerCase();
  const begins = (hex: string) => header.subarray(0, hex.length / 2).equals(Buffer.from(hex, 'hex'));
  const text = (start: number, end: number) => header.toString('latin1', start, end);
  // Signatures identify containers, never promise a decodable codec (WHATWG MIME Sniffing §6).
  switch (mime) {
    case 'image/png': return begins('89504e470d0a1a0a') ? mime : null;
    case 'image/jpeg': return begins('ffd8ff') ? mime : null;
    case 'image/gif': return ['GIF87a', 'GIF89a'].includes(text(0, 6)) ? mime : null;
    case 'image/webp': return text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(text(12, 16)) ? mime : null;
    case 'audio/wav': case 'audio/wave': case 'audio/x-wav': return text(0, 4) === 'RIFF' && text(8, 12) === 'WAVE' ? 'audio/wav' : null;
    case 'audio/ogg': return begins('4f67675300') ? mime : null;
    case 'audio/flac': case 'audio/x-flac': return begins('664c6143') ? 'audio/flac' : null;
    case 'audio/mpeg': {
      if (begins('494433') && header.length >= 10 && [2, 3, 4].includes(header[3]) && header.subarray(6, 10).every(n => n < 128)) return mime;
      const frameSize = (at: number) => {
        if (at + 4 > header.length || header[at] !== 255 || (header[at + 1] & 224) !== 224 || (header[at + 1] & 6) !== 2) return 0;
        const version = (header[at + 1] >> 3) & 3, rate = header[at + 2] >> 4, sample = (header[at + 2] >> 2) & 3;
        if (version === 1 || rate === 0 || rate === 15 || sample === 3) return 0;
        const bitrate = (version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[rate] * 1000;
        const frequency = [44100,48000,32000][sample] / (version === 3 ? 1 : version === 2 ? 2 : 4);
        return Math.floor((version === 3 ? 144 : 72) * bitrate / frequency) + ((header[at + 2] >> 1) & 1);
      };
      const next = frameSize(0); return next >= 4 && frameSize(next) >= 4 ? mime : null;
    }
    case 'video/mp4': {
      if (header.length < 16 || text(4, 8) !== 'ftyp') return null;
      const size = header.readUInt32BE(0); if (size < 16 || size > header.length || size % 4) return null;
      for (let at = 8; at < size; at += at === 8 ? 8 : 4) if (text(at, at + 3) === 'mp4') return mime;
      return null;
    }
    case 'video/webm': {
      if (!begins('1a45dfa3')) return null;
      const doctype = header.indexOf(Buffer.from('4282847765626d', 'hex'), 4);
      // shortcut: unusual EBML DocType encodings fall back to download, expand if real files need them.
      return doctype >= 4 && doctype < 38 ? mime : null;
    }
    default: return null;
  }
}

const running = new WeakSet<Archive>();
type FinalRow = { id: string; descriptor: Buffer; size: number | null; sha256: string | null; generation: string | null; job_state: string };
function adoptFinal(archive: Archive, dir: string, row: FinalRow) {
  if (!internalId.test(row.id)) throw Error('Identificador interno inválido');
  let file: ReturnType<typeof hashFile>;
  try { file = hashFile(join(dir, row.id + '.bin')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing'; throw error; }
  try {
    if (row.size === null || !row.sha256) return 'unverified';
    if (file.size !== row.size || file.sha256 !== row.sha256) return 'divergent';
    const descriptor = deserialize(row.descriptor) as Node; expected(descriptor);
    try { compare(BigInt(file.size), file.sha256, descriptor); } catch { return 'divergent'; }
  } finally { closeSync(file.fd); }
  // SQL failure must preserve the verified final and its publication generation.
  archive.db.transaction(() => {
    const changed = archive.db.prepare("UPDATE media_jobs SET state='available',lease_until=NULL WHERE attachment_id=? AND generation IS ? AND state=?").run(row.id, row.generation, row.job_state);
    if (!changed.changes) throw Error('Lease encerrada');
    archive.db.prepare("UPDATE attachments SET state='available',reason=NULL WHERE id=?").run(row.id);
  })();
  return 'available';
}
export function reconcileMedia(archive: Archive, mediaDir: string) {
  if (running.has(archive)) throw Error('Pare o worker antes de reconciliar');
  const dir = mediaDirectory(archive, mediaDir);
  for (const row of archive.db.prepare('SELECT a.id,a.descriptor,a.size,a.sha256,a.state,j.attempts,j.generation,j.state job_state FROM attachments a JOIN media_jobs j ON j.attachment_id=a.id').all() as (FinalRow & { state: string; attempts: number })[]) {
    if (adoptFinal(archive, dir, row) === 'available') continue;
    archive.db.transaction(() => {
      if (row.state === 'available') failure(archive, row.id, 'Arquivo local ausente ou divergente');
      else {
        const state = row.attempts >= 5 ? 'unavailable' : 'pending';
        archive.db.prepare('UPDATE media_jobs SET state=?,lease_until=NULL,retry_at=0 WHERE attachment_id=?').run(state, row.id);
        archive.db.prepare('UPDATE attachments SET state=?,reason=? WHERE id=?').run(state, 'Download integral pendente após reinício', row.id);
      }
    })();
  }
}

// Baileys rc14 forwards dispatcher, but drops signal/redirect options in getHttpStream.
export function mediaDispatcher(signal: AbortSignal, resolveDns: (hostname: string) => Promise<{ address: string; family: number }[]> = hostname => lookup(hostname, { all: true, family: 4 }), onFailure: () => void = () => {}) {
  return { dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler) {
    let completed = false, headersReceived = false;
    const fail = (error: Error) => {
      if (!completed) {
        completed = true; onFailure();
        // Baileys pipes the fetched body without forwarding errors. Abort plaintext and end
        // the encrypted body safely instead of emitting an unhandled upstream error.
        if (headersReceived) handler.onComplete?.([]); else handler.onError?.(error);
      }
    };
    let url: URL;
    try {
      url = new URL(options.path, String(options.origin));
      if (url.protocol !== 'https:' || url.port && url.port !== '443' || url.username || url.password || !/^(?:[a-z0-9-]+\.)*whatsapp\.(?:net|com)$/.test(url.hostname) || options.method !== 'GET') throw Error('Destino de mídia recusado');
      signal.throwIfAborted();
    } catch { queueMicrotask(() => fail(Error('Destino de mídia recusado'))); return true; }
    void resolveDns(url.hostname).then(addresses => {
      signal.throwIfAborted();
      const publicAddress = (address: string) => {
        const parts = address.split('.').map(Number); if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
        const [a, b, c] = parts;
        return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 || b === 2) || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
      };
      if (!addresses.length || addresses.some(a => a.family !== 4 || !publicAddress(a.address))) throw Error('Endereço de mídia recusado');
      const raw = options.headers;
      const headers = Array.isArray(raw) ? Object.fromEntries(Array.from({ length: raw.length / 2 }, (_, i) => [raw[i * 2], raw[i * 2 + 1]])) : raw;
      const req = request(url, { method: 'GET', headers: { ...headers as Record<string, string>, 'accept-encoding': 'identity' }, agent: false, family: 4, lookup: (_host, _opts, callback) => callback(null, addresses[0].address, 4) }, response => {
        if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.destroy(); fail(Error('Codificação de mídia recusada')); return; }
        headersReceived = true;
        const resume = () => response.resume();
        if (handler.onHeaders?.(response.statusCode!, response.rawHeaders.map(h => Buffer.from(h)), resume, response.statusMessage ?? '') === false) response.pause();
        response.on('data', data => { if (handler.onData?.(data) === false) response.pause(); });
        response.on('error', fail); response.on('aborted', () => fail(Error('Stream interrompido')));
        response.on('end', () => { if (!completed) { completed = true; handler.onComplete?.([]); } });
      });
      const abort = () => req.destroy(Error('Download cancelado'));
      signal.addEventListener('abort', abort, { once: true });
      req.on('close', () => signal.removeEventListener('abort', abort)); req.on('error', fail);
      handler.onConnect?.(abort); req.end();
    }).catch(() => fail(Error('Destino de mídia recusado')));
    return true;
  } };
}

export function startMediaWorker({ archive, mediaDir, downloadOriginal, online = () => true, now = Date.now, onStatus = () => {}, diskSpace, fault = async () => {} }: { archive: Archive; mediaDir: string; downloadOriginal: DownloadOriginal; online?: () => boolean; now?: () => number; onStatus?: () => void; diskSpace?: () => { free: bigint; total: bigint }; fault?: (point: 'published' | 'beforeAvailable') => Promise<void> }) {
  if (running.has(archive)) throw Error('Worker de mídia já ativo');
  reconcileMedia(archive, mediaDir); running.add(archive);
  const dir = mediaDirectory(archive, mediaDir), active = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  const reserved = new Map<string, bigint>();
  const unknownSize = new Set<string>();
  let stopped = false, diskPaused = false, pauseUntil = 0, diagnostic: string | null = null;
  const space = diskSpace ?? (() => { const s = statfsSync(dir, { bigint: true }); return { free: s.bavail * s.bsize, total: s.blocks * s.bsize }; });
  function budget(except?: string) {
    const { free, total } = space();
    if (typeof free !== 'bigint' || typeof total !== 'bigint' || free < 0n || total <= 0n || free > total) throw Error('Medição de espaço inválida');
    const floor = 256n * 1024n * 1024n, reserve = total / 20n > floor ? total / 20n : floor;
    // Shrink speculative unknown lengths proportionally so disk variation cannot starve later writers.
    const spare = free - reserve - [...reserved].reduce((sum, [id, n]) => sum + (unknownSize.has(id) ? 0n : n), 0n);
    const unknownReserved = [...unknownSize].reduce((sum, id) => sum + (reserved.get(id) ?? 0n), 0n);
    for (const id of unknownSize) { const prior = reserved.get(id) ?? 0n; reserved.set(id, spare <= 0n ? 0n : unknownReserved > spare ? prior * spare / unknownReserved : prior); }
    return free - reserve - [...reserved].reduce((sum, [id, n]) => sum + (id === except ? 0n : n), 0n);
  }
  const noSpace = () => Object.assign(Error('Espaço insuficiente; downloads pausados'), { code: 'ENOSPC' });
  function claim(): MediaJob | null {
    return archive.db.transaction(() => {
      // Recover published finals even when an earlier job cannot reserve space or attempts ran out.
      for (const row of archive.db.prepare("SELECT a.id,a.descriptor,a.size,a.sha256,j.generation,j.state job_state FROM media_jobs j JOIN attachments a ON a.id=j.attachment_id JOIN messages m ON m.reference=a.reference WHERE j.state IN ('pending','retry_wait','unavailable') AND j.retry_at<=? AND a.size IS NOT NULL AND a.sha256 IS NOT NULL AND m.restricted=0").all(now()) as FinalRow[]) adoptFinal(archive, dir, row);
      const row = archive.db.prepare("SELECT a.id,a.type,a.descriptor,a.source_key,a.size,a.sha256,r.payload,j.attempts,j.generation,j.state job_state FROM media_jobs j JOIN attachments a ON a.id=j.attachment_id JOIN revisions r ON r.id=a.revision_id JOIN messages m ON m.reference=a.reference WHERE j.state IN ('pending','retry_wait') AND j.attempts<5 AND j.retry_at<=? AND m.restricted=0 ORDER BY j.rowid LIMIT 1").get(now()) as (FinalRow & { type: string; source_key: string | null; payload: Buffer; attempts: number }) | undefined;
      if (!row) return null;
      const final = adoptFinal(archive, dir, row);
      if (final === 'available') return null;
      if (final === 'unverified') throw Error('Final local não verificado; acervo preservado');
      const generation = randomUUID(), stored = deserialize(row.payload) as { key: Node }, descriptor = deserialize(row.descriptor) as Node;
      const key = row.source_key ? JSON.parse(row.source_key) as Node : stored.key;
      if (descriptor.viewOnce === true || key.isViewOnce === true || !(descriptor.url || descriptor.directPath) || !(descriptor.mediaKey instanceof Uint8Array) || descriptor.mediaKey.length !== 32) {
        failure(archive, row.id, 'Original não recebido ou mídia restrita', undefined, 0, true); return null;
      }
      let size: bigint | null; try { size = expected(descriptor).size; } catch { size = 0n; }
      const free = budget();
      if (free <= 0n || size !== null && size > free) { diskPaused = true; diagnostic = 'Espaço insuficiente; downloads pausados, acervo preservado'; onStatus(); return null; }
      if (final === 'divergent') { renameSync(join(dir, row.id + '.bin'), join(dir, `${row.id}.${generation}.damaged`)); syncDirectory(dir); }
      archive.db.prepare("UPDATE media_jobs SET state='downloading',attempts=attempts+1,generation=?,lease_until=? WHERE attachment_id=?").run(generation, now() + 120_000, row.id);
      archive.db.prepare("UPDATE attachments SET state='downloading',reason=NULL WHERE id=?").run(row.id);
      reserved.set(row.id, size ?? free);
      if (size === null) unknownSize.add(row.id);
      return { id: row.id, type: row.type, descriptor, message: { key, message: { [row.type]: descriptor } }, attempts: row.attempts + 1, generation };
    })();
  }
  function assertLease(job: MediaJob, signal: AbortSignal) {
    signal.throwIfAborted();
    if (!archive.db.prepare("SELECT 1 FROM media_jobs WHERE attachment_id=? AND generation=? AND state='downloading' AND lease_until>?").get(job.id, job.generation, now())) throw Error('Lease encerrada');
  }
  async function run(job: MediaJob, controller: AbortController) {
    const signal = controller.signal, temp = join(dir, `${job.id}.${job.generation}.part`), final = join(dir, job.id + '.bin');
    const timeout = setTimeout(() => controller.abort(), 120_000); timeout.unref();
    let input: Readable | undefined;
    try {
      const source = expected(job.descriptor); assertLease(job, signal);
      if (existsSync(final)) throw Error('Final local existente; acervo preservado');
      const promise = downloadOriginal(job, signal);
      promise.then(stream => { if (signal.aborted) { stream.on('error', () => {}); stream.destroy(); } }, () => {});
      const stream = await new Promise<Readable>((accept, reject) => {
        const abort = () => reject(Error('Download cancelado')); signal.addEventListener('abort', abort, { once: true });
        promise.then(accept, reject).finally(() => signal.removeEventListener('abort', abort));
      });
      input = stream;
      assertLease(job, signal);
      let size = 0n; const digest = createHash('sha256');
      const count = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        try {
          assertLease(job, signal);
          const length = BigInt(chunk.length);
          if (source.size !== null && size + length > source.size) throw Error('Tamanho divergente');
          if (length > budget(job.id) || length > (reserved.get(job.id) ?? 0n)) throw noSpace();
          size += length;
          if (size > BigInt(Number.MAX_SAFE_INTEGER) || source.size !== null && size > source.size) throw Error('Tamanho divergente');
          reserved.set(job.id, (reserved.get(job.id) ?? 0n) - length);
          digest.update(chunk); callback(null, chunk);
        } catch (error) { callback(error as Error); }
      } });
      await pipeline(stream, count, createWriteStream(temp, { flags: 'wx', mode: 0o600, flush: true }), { signal });
      const sha256 = digest.digest('hex'), verified = compare(size, sha256, job.descriptor); assertLease(job, signal);
      // Persist the verified descriptor before publication so a crash can adopt the final.
      archive.db.prepare('UPDATE attachments SET size=?,sha256=?,source_hash_verified=? WHERE id=?').run(Number(size), sha256, Number(verified), job.id);
      const manifest = join(dir, `${job.id}.${job.generation}.manifest`);
      writeFileSync(manifest, JSON.stringify({ id: job.id, size: String(size), sha256 }), { mode: 0o600, flag: 'wx' });
      const mf = openSync(manifest, constants.O_RDONLY | constants.O_NOFOLLOW); try { fsyncSync(mf); } finally { closeSync(mf); }
      assertLease(job, signal);
      // link+unlink provides no-replace atomic publication; rename can clobber a valid final.
      linkSync(temp, final); unlinkSync(temp); syncDirectory(dir);
      await fault('published'); assertLease(job, signal);
      await fault('beforeAvailable'); assertLease(job, signal);
      archive.db.transaction(() => {
        const result = archive.db.prepare("UPDATE media_jobs SET state='available',lease_until=NULL WHERE attachment_id=? AND generation=? AND state='downloading'").run(job.id, job.generation);
        if (!result.changes) throw Error('Lease encerrada');
        archive.db.prepare("UPDATE attachments SET state='available',reason=NULL WHERE id=?").run(job.id);
      })();
    } catch (error) {
      const full = (error as NodeJS.ErrnoException).code === 'ENOSPC';
      if (full) { diskPaused = true; pauseUntil = now() + 5000; diagnostic = 'Espaço insuficiente; downloads pausados, acervo preservado'; for (const a of active.values()) a.controller.abort(); }
      try { failure(archive, job.id, full ? diagnostic! : signal.aborted ? 'Download interrompido; retomada integral pendente' : 'Falha ao obter ou verificar original', job.generation, now() + Math.min(60_000, 1000 * 2 ** (job.attempts - 1))); }
      catch { diagnostic = 'Falha de persistência; mídia não confirmada'; stopped = true; for (const a of active.values()) a.controller.abort(); }
    } finally { clearTimeout(timeout); if (input && !input.destroyed) { input.on('error', () => {}); input.destroy(); } reserved.delete(job.id); unknownSize.delete(job.id); onStatus(); }
  }
  function tick() {
    if (stopped || !online()) return;
    try {
      if (diskPaused) { if (now() < pauseUntil || budget() <= 0n) return; diskPaused = false; diagnostic = null; }
      while (active.size < 2) {
      const job = claim(); if (!job) break;
      const controller = new AbortController(), promise = run(job, controller).finally(() => active.delete(job.id)); active.set(job.id, { controller, promise });
    } } catch { diagnostic = 'Falha de persistência; downloads suspensos'; stopped = true; }
  }
  const poll = setInterval(tick, 1000); poll.unref(); queueMicrotask(tick);
  return {
    snapshot: () => ({ active: active.size, paused: stopped || diskPaused, diagnostic, concurrency: 2, attemptsLimit: 5, timeoutSeconds: 120, reserve: 'max(256MiB,5% do filesystem)' }),
    async drain() { tick(); while (active.size) { await Promise.all([...active.values()].map(a => a.promise)); tick(); } },
    async stop() { stopped = true; clearInterval(poll); for (const a of active.values()) a.controller.abort(); await Promise.all([...active.values()].map(a => a.promise)); running.delete(archive); }
  };
}

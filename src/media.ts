import { constants, mkdirSync, realpathSync, lstatSync, chmodSync, openSync, readSync, fstatSync, closeSync, fsyncSync, linkSync, unlinkSync, writeFileSync, existsSync, createWriteStream, statfsSync, renameSync } from 'node:fs';
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
  if (!attachment || attachment.state !== 'available') return null;
  let file: ReturnType<typeof hashFile> | undefined;
  try {
    file = hashFile(join(mediaDirectory(archive, mediaDir), id + '.bin'));
    if (file.size !== attachment.size || file.sha256 !== attachment.sha256) throw Error('Final divergente');
    return { ...file, attachment };
  } catch { if (file) closeSync(file.fd); failure(archive, id, 'Arquivo local ausente ou divergente'); return null; }
}

const running = new WeakSet<Archive>();
export function reconcileMedia(archive: Archive, mediaDir: string) {
  if (running.has(archive)) throw Error('Pare o worker antes de reconciliar');
  const dir = mediaDirectory(archive, mediaDir);
  for (const row of archive.db.prepare('SELECT a.id,a.descriptor,a.size,a.sha256,a.state,j.attempts FROM attachments a JOIN media_jobs j ON j.attachment_id=a.id').all() as { id: string; descriptor: Buffer; size: number | null; sha256: string | null; state: string; attempts: number }[]) {
    if (!internalId.test(row.id)) throw Error('Identificador interno inválido');
    let file: ReturnType<typeof hashFile> | undefined, valid = false;
    try {
      if (row.size === null || !row.sha256) throw Error('Final não verificado');
      file = hashFile(join(dir, row.id + '.bin'));
      if (file.size !== row.size || file.sha256 !== row.sha256) throw Error('Final divergente');
      compare(BigInt(file.size), file.sha256, deserialize(row.descriptor) as Node); valid = true;
    } catch { /* Unknown/corrupt files stay on disk; only verified finals can be adopted. */ }
    finally { if (file) closeSync(file.fd); }
    archive.db.transaction(() => {
      if (valid) {
        archive.db.prepare("UPDATE media_jobs SET state='available',lease_until=NULL WHERE attachment_id=?").run(row.id);
        archive.db.prepare("UPDATE attachments SET state='available',reason=NULL WHERE id=?").run(row.id);
      } else if (row.state === 'available') failure(archive, row.id, 'Arquivo local ausente ou divergente');
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
      const req = request(url, { method: 'GET', headers: { ...headers as Record<string, string>, 'accept-encoding': 'identity' }, agent: false, lookup: (_host, _opts, callback) => callback(null, addresses[0].address, 4) }, response => {
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
    // Unknown length claims only current spare capacity, after known commitments and block allocation.
    let spare = free - reserve - [...reserved].reduce((sum, [id, n]) => sum + (unknownSize.has(id) ? 0n : n), 0n);
    for (const id of unknownSize) { const prior = reserved.get(id) ?? 0n, current = spare <= 0n ? 0n : prior < spare ? prior : spare; reserved.set(id, current); spare -= current; }
    return free - reserve - [...reserved].reduce((sum, [id, n]) => sum + (id === except ? 0n : n), 0n);
  }
  const noSpace = () => Object.assign(Error('Espaço insuficiente; downloads pausados'), { code: 'ENOSPC' });
  function claim(): MediaJob | null {
    return archive.db.transaction(() => {
      const row = archive.db.prepare("SELECT a.id,a.type,a.descriptor,r.payload,j.attempts FROM media_jobs j JOIN attachments a ON a.id=j.attachment_id JOIN revisions r ON r.id=a.revision_id JOIN messages m ON m.reference=a.reference WHERE j.state IN ('pending','retry_wait') AND j.attempts<5 AND j.retry_at<=? AND m.restricted=0 ORDER BY j.rowid LIMIT 1").get(now()) as { id: string; type: string; descriptor: Buffer; payload: Buffer; attempts: number } | undefined;
      if (!row) return null;
      const generation = randomUUID(), stored = deserialize(row.payload) as { key: Node }, descriptor = deserialize(row.descriptor) as Node;
      if (descriptor.viewOnce === true || stored.key.isViewOnce === true || !(descriptor.url || descriptor.directPath) || !(descriptor.mediaKey instanceof Uint8Array) || descriptor.mediaKey.length !== 32) {
        failure(archive, row.id, 'Original não recebido ou mídia restrita', undefined, 0, true); return null;
      }
      let size: bigint | null; try { size = expected(descriptor).size; } catch { size = 0n; }
      const free = budget();
      if (free <= 0n || size !== null && size > free) { diskPaused = true; diagnostic = 'Espaço insuficiente; downloads pausados, acervo preservado'; onStatus(); return null; }
      reserved.set(row.id, size ?? free);
      if (size === null) unknownSize.add(row.id);
      archive.db.prepare("UPDATE media_jobs SET state='downloading',attempts=attempts+1,generation=?,lease_until=? WHERE attachment_id=?").run(generation, now() + 120_000, row.id);
      archive.db.prepare("UPDATE attachments SET state='downloading',reason=NULL WHERE id=?").run(row.id);
      return { id: row.id, type: row.type, descriptor, message: { key: stored.key, message: { [row.type]: descriptor } }, attempts: row.attempts + 1, generation };
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
      if (existsSync(final)) {
        // Preserve damaged known finals before a retry; never clobber an existing binary.
        renameSync(final, join(dir, `${job.id}.${job.generation}.damaged`)); syncDirectory(dir);
      }
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

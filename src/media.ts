import { constants, mkdirSync, realpathSync, lstatSync, chmodSync, openSync, readSync, fstatSync, closeSync, fsyncSync, linkSync, unlinkSync, writeFileSync, existsSync, createWriteStream } from 'node:fs';
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

// Baileys rc14 forwards dispatcher, but drops signal/redirect options in getHttpStream.
export function mediaDispatcher(signal: AbortSignal, resolveDns: (hostname: string) => Promise<{ address: string; family: number }[]> = hostname => lookup(hostname, { all: true, family: 4 })) {
  return { dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler) {
    let completed = false;
    const fail = (error: Error) => { if (!completed) { completed = true; handler.onError?.(error); } };
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
      const req = request(url, { method: 'GET', headers: headers as Record<string, string>, agent: false, lookup: (_host, _opts, callback) => callback(null, addresses[0].address, 4) }, response => {
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

export function startMediaWorker({ archive, mediaDir, downloadOriginal, online = () => true, now = Date.now, onStatus = () => {} }: { archive: Archive; mediaDir: string; downloadOriginal: DownloadOriginal; online?: () => boolean; now?: () => number; onStatus?: () => void }) {
  const dir = mediaDirectory(archive, mediaDir), active = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  let stopped = false, diagnostic: string | null = null;
  function claim(): MediaJob | null {
    return archive.db.transaction(() => {
      const row = archive.db.prepare("SELECT a.id,a.type,a.descriptor,r.payload,j.attempts FROM media_jobs j JOIN attachments a ON a.id=j.attachment_id JOIN revisions r ON r.id=a.revision_id JOIN messages m ON m.reference=a.reference WHERE j.state IN ('pending','retry_wait') AND j.attempts<5 AND j.retry_at<=? AND m.restricted=0 ORDER BY j.rowid LIMIT 1").get(now()) as { id: string; type: string; descriptor: Buffer; payload: Buffer; attempts: number } | undefined;
      if (!row) return null;
      const generation = randomUUID(), stored = deserialize(row.payload) as { key: Node }, descriptor = deserialize(row.descriptor) as Node;
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
    try {
      const source = expected(job.descriptor); assertLease(job, signal);
      const promise = downloadOriginal(job, signal);
      promise.then(stream => { if (signal.aborted) { stream.on('error', () => {}); stream.destroy(); } }, () => {});
      const stream = await new Promise<Readable>((accept, reject) => {
        const abort = () => reject(Error('Download cancelado')); signal.addEventListener('abort', abort, { once: true });
        promise.then(accept, reject).finally(() => signal.removeEventListener('abort', abort));
      });
      assertLease(job, signal);
      let size = 0n; const digest = createHash('sha256');
      const count = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        try { assertLease(job, signal); size += BigInt(chunk.length); if (size > BigInt(Number.MAX_SAFE_INTEGER) || source.size !== null && size > source.size) throw Error('Tamanho divergente'); digest.update(chunk); callback(null, chunk); } catch { callback(Error('Integridade ou lease inválida')); }
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
      linkSync(temp, final); unlinkSync(temp); syncDirectory(dir); assertLease(job, signal);
      archive.db.transaction(() => {
        const result = archive.db.prepare("UPDATE media_jobs SET state='available',lease_until=NULL WHERE attachment_id=? AND generation=? AND state='downloading'").run(job.id, job.generation);
        if (!result.changes) throw Error('Lease encerrada');
        archive.db.prepare("UPDATE attachments SET state='available',reason=NULL WHERE id=?").run(job.id);
      })();
    } catch {
      try { failure(archive, job.id, signal.aborted ? 'Download interrompido; retomada integral pendente' : 'Falha ao obter ou verificar original', job.generation, now() + Math.min(60_000, 1000 * 2 ** (job.attempts - 1))); }
      catch { diagnostic = 'Falha de persistência; mídia não confirmada'; stopped = true; for (const a of active.values()) a.controller.abort(); }
    } finally { clearTimeout(timeout); onStatus(); }
  }
  function tick() {
    if (stopped || !online()) return;
    try { while (active.size < 2) {
      const job = claim(); if (!job) break;
      const controller = new AbortController(), promise = run(job, controller).finally(() => active.delete(job.id)); active.set(job.id, { controller, promise });
    } } catch { diagnostic = 'Falha de persistência; downloads suspensos'; stopped = true; }
  }
  const poll = setInterval(tick, 1000); poll.unref(); queueMicrotask(tick);
  return {
    snapshot: () => ({ active: active.size, paused: stopped, diagnostic, concurrency: 2, attemptsLimit: 5, timeoutSeconds: 120 }),
    async drain() { tick(); while (active.size) { await Promise.all([...active.values()].map(a => a.promise)); tick(); } },
    async stop() { stopped = true; clearInterval(poll); for (const a of active.values()) a.controller.abort(); await Promise.all([...active.values()].map(a => a.promise)); }
  };
}

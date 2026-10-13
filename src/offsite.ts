import { constants, openSync, closeSync, fsyncSync, lstatSync, statfsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, createReadStream, createWriteStream, linkSync, unlinkSync, readdirSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable, Transform, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ZipFile } from 'yazl';
import yauzl from 'yauzl';
import Database from 'better-sqlite3';
import { coordinatedSnapshot, recoverOperation, acquireOperation, privateFile, readPrivateJson, atomicPrivateJson, type OperationConfig, type Controller } from './operation.js';
import { validateSnapshot, restoreSnapshot, profileReadonly } from './backup.js';
import { acquireServiceLock } from './whatsapp.js';

type Budget = { maxBytes: number; reserveBytes: number; maxFiles?: number };
export type SourceOffsiteConfig = OperationConfig & Budget & { role: 'source'; recipientFile: string; recoveryFiles?: Partial<Record<RecoveryName, string>> };
export type PullOffsiteConfig = Budget & { role: 'pull'; operationDir: string; destinationDir: string; identityFile: string; remote?: { host: string; user: string; port?: number; identityFile: string; knownHostsFile: string; nodePath: string; mainPath: string; configFile: string; dataDir: string } };
type Receipt = { version: 1; operationId: string; snapshotCreatedAt: string; manifestHash: string; cipherHash: string };
type SnapshotIntent = { operationId: string; source: string; destination: string; profile: string; manifestHash: string };
type State = { version: 1; lastAttempt: string | null; operationId: string | null; result: 'pending' | 'success' | 'failed'; failedStage: string | null; safeFailureCode: string | null; lastVerifiedSuccess: (Receipt & { verifiedAt: string }) | null; pending?: Receipt; snapshotIntent?: SnapshotIntent };
type RecoveryName = 'promotion-state.json' | 'promotion-key.json' | 'promotion-receipt.json' | 'source-fence.json' | 'source-public-key.json';
const recoveryNames: RecoveryName[] = ['promotion-state.json', 'promotion-key.json', 'promotion-receipt.json', 'source-fence.json', 'source-public-key.json'];
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const mediaPattern = /^snapshot\/media\/[0-9a-f-]{36}(?:\.bin|\.[0-9a-f-]{36}\.manifest)$/;
const emptyState = (): State => ({ version: 1, lastAttempt: null, operationId: null, result: 'pending', failedStage: null, safeFailureCode: null, lastVerifiedSuccess: null });
type Fault = (stage: string) => unknown | Promise<unknown>;
export type OffsiteAdapter = { putNew(id: string, output: string, signal: AbortSignal): Promise<void>; getById(id: string, output: string, signal: AbortSignal): Promise<void>; acknowledge(receipt: Receipt, signal: AbortSignal): Promise<void>; reportFailure?(operationId: string, safeFailureCode: string, signal: AbortSignal): Promise<void> };
export type CipherAdapter = { encrypt(input: Readable, output: string, signal: AbortSignal): Promise<void>; decrypt(input: string, output: string, signal: AbortSignal): Promise<void> };

function id(value: string) { if (!idPattern.test(value)) throw Error('ID de backup inválido'); return value; }
function sync(path: string) { const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW); try { fsyncSync(fd); } finally { closeSync(fd); } }
function safeRegular(path: string) {
  const s = lstatSync(path); if (!s.isFile() || s.isSymbolicLink() || realpathSync(path) !== resolve(path) || s.nlink !== 1 || s.uid !== process.getuid!() || s.mode & 0o077) throw Error('Arquivo privado inválido'); return s;
}
function budget(config: Budget) { if (!Number.isSafeInteger(config.maxBytes) || config.maxBytes < 1024 || !Number.isSafeInteger(config.reserveBytes) || config.reserveBytes < 0 || !Number.isSafeInteger(config.maxFiles ?? 10000) || (config.maxFiles ?? 10000) < 16) throw Error('Orçamento de backup inválido'); }
function space(path: string, bytes: number, files: number, reserveBytes: number) {
  const disk = statfsSync(path, { bigint: true }), reserve = [256n * 1024n * 1024n, disk.blocks * disk.bsize / 20n, BigInt(reserveBytes)].reduce((a, b) => a > b ? a : b);
  if (disk.bavail * disk.bsize <= BigInt(bytes) + reserve || disk.files > 0n && disk.ffree <= BigInt(files + 32)) throw Object.assign(Error('Capacidade insuficiente'), { code: 'ENOSPC' });
}
function measure(path: string): { bytes: number; files: number } {
  let bytes = 0, files = 0;
  for (const name of readdirSync(path)) { const p = join(path, name), s = lstatSync(p); if (s.isSymbolicLink()) throw Error('Link recusado'); if (s.isDirectory()) { const m = measure(p); bytes += m.bytes; files += m.files; } else if (s.isFile()) { bytes += s.size; files++; } else throw Error('Entrada recusada'); }
  return { bytes, files };
}
function validReceipt(r: Receipt) { return r?.version === 1 && idPattern.test(r.operationId) && Number.isFinite(Date.parse(r.snapshotCreatedAt)) && /^[0-9a-f]{64}$/.test(r.manifestHash) && /^[0-9a-f]{64}$/.test(r.cipherHash); }
function loadState(operationDir: string): State {
  privateFile(operationDir, true); const path = join(operationDir, 'offsite-state.json'); if (!existsSync(path)) return emptyState();
  const s = readPrivateJson(path) as State;
  if (s.version !== 1 || !['pending', 'success', 'failed'].includes(s.result) || s.operationId !== null && !idPattern.test(s.operationId) || s.lastAttempt !== null && !Number.isFinite(Date.parse(s.lastAttempt)) || s.lastVerifiedSuccess && (!validReceipt(s.lastVerifiedSuccess) || !Number.isFinite(Date.parse(s.lastVerifiedSuccess.verifiedAt))) || s.pending && !validReceipt(s.pending)) throw Error('Estado de backup inválido');
  return s;
}
function saveState(dir: string, state: State) { atomicPrivateJson(join(dir, 'offsite-state.json'), state); }
function failureCode(error: unknown, stage: string) { return (error as NodeJS.ErrnoException)?.code === 'ENOSPC' ? 'capacity_insufficient' : (error as Error)?.name === 'AbortError' || (error as Error)?.name === 'TimeoutError' ? 'deadline_exceeded' : stage === 'decrypt' || stage === 'key' ? 'decryption_failed' : stage === 'validate' || stage === 'readback' ? 'integrity_failed' : stage === 'transfer' || stage === 'acknowledge' ? 'transport_failed' : 'operation_failed'; }
const safeCodes = new Set(['capacity_insufficient', 'deadline_exceeded', 'decryption_failed', 'integrity_failed', 'transport_failed', 'operation_failed', 'state_invalid']);
export function backupStatus(stateFile?: string, now = Date.now()) {
  let state = emptyState();
  try { if (stateFile) { if (resolve(stateFile) !== join(resolve(dirname(stateFile)), 'offsite-state.json')) throw Error('Estado inválido'); state = loadState(dirname(stateFile)); } }
  catch { state.result = 'failed'; state.safeFailureCode = 'state_invalid'; }
  const last = state.lastVerifiedSuccess, ageSeconds = last ? Math.max(0, Math.floor((now - Date.parse(last.snapshotCreatedAt)) / 1000)) : null;
  return { lastAttemptAt: state.lastAttempt, lastVerifiedAt: last?.verifiedAt ?? null, snapshotCreatedAt: last?.snapshotCreatedAt ?? null, ageSeconds, overdue24h: ageSeconds === null || ageSeconds > 86400, result: state.result, safeFailureCode: state.safeFailureCode === null ? null : safeCodes.has(state.safeFailureCode) ? state.safeFailureCode : 'state_invalid' };
}
function readStream(path: string) { safeRegular(path); return createReadStream(path, { fd: openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW), autoClose: true }); }
async function digest(path: string) { const hash = createHash('sha256'); for await (const chunk of readStream(path)) hash.update(chunk); return hash.digest('hex'); }
function publish(temp: string, destination: string) {
  safeRegular(temp); sync(temp); linkSync(temp, destination); unlinkSync(temp); sync(dirname(destination));
}
function limited(maxBytes: number) { let size = 0; return new Transform({ transform(chunk, _encoding, done) { size += chunk.length; done(size > maxBytes ? Error('Limite de cópia excedido') : null, chunk); } }); }
async function copy(input: Readable, output: string, maxBytes: number, signal: AbortSignal) {
  await pipeline(input, limited(maxBytes), createWriteStream(output, { flags: 'wx', mode: 0o600 }), { signal }); sync(output);
}
async function ageVersion() { const r = await promisify(execFile)('/usr/bin/age', ['--version'], { timeout: 5000, maxBuffer: 1024 }); if (!/^v?1\.3\.2$/.test(r.stdout.trim())) throw Error('age1.3.2 verificado obrigatório'); }
async function processStream(program: string, args: string[], input: Readable, output: Writable, signal: AbortSignal, keyFd?: number, maxBytes = Number.MAX_SAFE_INTEGER) {
  const child = spawn(program, args, { stdio: ['pipe', 'pipe', 'ignore', ...(keyFd === undefined ? [] : [keyFd])], signal, killSignal: 'SIGKILL', env: { PATH: '/usr/bin:/bin', HOME: '/nonexistent', LANG: 'C' } });
  const done = new Promise<void>((accept, reject) => { child.once('error', reject); child.once('close', code => code === 0 ? accept() : reject(Error('Processo privado falhou'))); });
  try { await Promise.all([done, pipeline(input, child.stdin!, { signal }), pipeline(child.stdout!, limited(maxBytes), output, { signal })]); }
  catch (error) { child.kill('SIGKILL'); await done.catch(() => {}); throw error; }
}
export function createAgeCipher({ recipientFile, identityFile, maxBytes }: { recipientFile?: string; identityFile?: string; maxBytes: number }): CipherAdapter {
  return {
    async encrypt(input, output, signal) { await ageVersion(); const file = privateFile(recipientFile!); const recipient = readFileSync(file, 'utf8').trim(); if (!/^age1[0-9a-z]{58}$/.test(recipient)) throw Error('Recipient público inválido'); const key = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { const sink = createWriteStream(output, { flags: 'wx', mode: 0o600 }); await processStream('/usr/bin/age', ['--encrypt', '-R', '/dev/fd/3'], input, sink, signal, key, maxBytes); sync(output); }
      finally { closeSync(key); }
    },
    async decrypt(input, output, signal) { await ageVersion(); const key = openSync(privateFile(identityFile!), constants.O_RDONLY | constants.O_NOFOLLOW); safeRegular(input);
      try { const sink = createWriteStream(output, { flags: 'wx', mode: 0o600 }); await processStream('/usr/bin/age', ['--decrypt', '-i', '/dev/fd/3'], readStream(input), sink, signal, key, maxBytes); sync(output); }
      finally { closeSync(key); }
    }
  };
}
function packageSnapshot(snapshotDir: string, operationId: string, config: SourceOffsiteConfig) {
  const verified = validateSnapshot(snapshotDir), zip = new ZipFile(), recovery: { path: string; size: number; sha256: string }[] = [];
  zip.addFile(join(snapshotDir, 'manifest.json'), 'snapshot/manifest.json', { compress: false });
  for (const file of verified.manifest.files) zip.addFile(join(snapshotDir, file.path), 'snapshot/' + file.path, { compress: false });
  const kit = new Map<RecoveryName, Buffer>();
  for (const [name, path] of Object.entries(config.recoveryFiles ?? {})) { if (!recoveryNames.includes(name as RecoveryName)) throw Error('Recovery kit inválido'); kit.set(name as RecoveryName, readFileSync(privateFile(path))); }
  const promotionPath = join(config.dataDir, 'promotion.json');
  if (existsSync(promotionPath)) {
    const receipt = readPrivateJson(promotionPath), proof = JSON.parse(receipt.proof);
    kit.set('promotion-receipt.json', Buffer.from(JSON.stringify(receipt)));
    for (const name of ['promotion-key.json', 'promotion-state.json'] as const) kit.set(name, readFileSync(privateFile(join(proof.operationDir, name))));
    if (proof.sourceFence) { kit.set('source-fence.json', Buffer.from(JSON.stringify(proof.sourceFence))); kit.set('source-public-key.json', Buffer.from(JSON.stringify({ publicKey: proof.sourceFencePublicKey }))); }
  }
  for (const [name, contents] of kit) {
    recovery.push({ path: 'recovery/' + name, size: contents.length, sha256: createHash('sha256').update(contents).digest('hex') }); zip.addBuffer(contents, 'recovery/' + name, { compress: false, mode: 0o100600 });
  }
  const metadata = { version: 1, operationId, snapshotCreatedAt: verified.manifest.createdAt, manifestHash: verified.digest, recovery };
  const input = zip.outputStream as Readable;
  zip.addBuffer(Buffer.from(JSON.stringify(metadata)), 'metadata.json', { compress: false, mode: 0o100600 }); zip.on('error', e => input.destroy(e)); zip.end(); return { input, metadata };
}

export async function produceOffsiteCopy(config: SourceOffsiteConfig, operationId: string, { controller, fault, cipher = createAgeCipher({ recipientFile: config.recipientFile, maxBytes: config.maxBytes }) }: { controller?: Controller; fault?: Fault; cipher?: CipherAdapter } = {}) {
  id(operationId); budget(config); if (config.role !== 'source') throw Error('Produtor obrigatório na fonte'); privateFile(config.recipientFile); privateFile(config.operationDir, true);
  const file = join(config.operationDir, operationId + '.age'), descriptor = join(config.operationDir, operationId + '.json');
  if (existsSync(file)) {
    const lock = acquireServiceLock(config.operationDir);
    try {
      const state = loadState(config.operationDir);
      // An interrupted link/fsync can be reconciled only against its original snapshot.
      if (!existsSync(descriptor)) { if (state.operationId !== operationId) throw Error('Publicação sem intenção'); const verified = validateSnapshot(config.destination + '-' + operationId); atomicPrivateJson(descriptor, { version: 1, operationId, snapshotCreatedAt: verified.manifest.createdAt, manifestHash: verified.digest, cipherHash: await digest(file) }); }
      const receipt = readPrivateJson(descriptor) as Receipt; if (!validReceipt(receipt) || receipt.operationId !== operationId || await digest(file) !== receipt.cipherHash) throw Error('Cópia preparada divergente');
      if (state.operationId === operationId && state.lastVerifiedSuccess?.operationId !== operationId) { state.pending = receipt; state.result = 'pending'; saveState(config.operationDir, state); }
    } finally { lock.release(); }
    const journalFile = join(config.operationDir, 'journal.json');
    if (existsSync(journalFile) && readPrivateJson(journalFile).stage === 'resumed') await recoverOperation(config, { controller });
    return { file, receipt: readPrivateJson(descriptor) as Receipt };
  }
  if (existsSync(descriptor)) throw Error('Publicação interrompida exige reconciliação privada');
  let receipt: Receipt | undefined, failed: unknown;
  // The operation mutex remains held through encryption; network starts after resume.
  const destination = config.destination + '-' + operationId;
  const precheck = () => { const measured = measure(privateFile(config.dataDir, true)); if (measured.bytes > config.maxBytes || measured.files > (config.maxFiles ?? 10000)) throw Object.assign(Error('Orçamento insuficiente'), { code: 'ENOSPC' }); space(dirname(destination), config.maxBytes * 3, measured.files * 3, config.reserveBytes); space(config.operationDir, config.maxBytes * 2, 8, config.reserveBytes); };
  try { precheck(); } catch (error) { const lock = acquireServiceLock(config.operationDir); try { const state = loadState(config.operationDir); state.lastAttempt = new Date().toISOString(); state.operationId = operationId; state.result = 'failed'; state.failedStage = 'capacity'; state.safeFailureCode = failureCode(error, 'capacity'); saveState(config.operationDir, state); } finally { lock.release(); } throw error; }
  const encryptSnapshot = async (snapshotDir: string) => {
    const state = loadState(config.operationDir); state.lastAttempt = new Date().toISOString(); state.operationId = operationId; state.result = 'pending'; state.failedStage = null; state.safeFailureCode = null; saveState(config.operationDir, state);
    const verified = validateSnapshot(snapshotDir);
    const intent = { operationId, source: resolve(config.dataDir), destination: resolve(snapshotDir), profile: verified.manifest.profile, manifestHash: verified.digest };
    if (state.snapshotIntent?.operationId === operationId && JSON.stringify(state.snapshotIntent) !== JSON.stringify(intent)) throw Error('Intenção de snapshot divergente');
    state.snapshotIntent = intent; saveState(config.operationDir, state);
    const temp = join(config.operationDir, '.cipher-' + operationId);
    // Only the mutex owner can reclaim a temp left by a killed encrypt for this ID.
    if (existsSync(temp)) { safeRegular(temp); rmSync(temp); }
    try { const pkg = packageSnapshot(snapshotDir, operationId, config); await fault?.('encrypt'); await cipher.encrypt(pkg.input, temp, AbortSignal.timeout(120_000));
      if (validateSnapshot(snapshotDir).digest !== pkg.metadata.manifestHash) throw Error('Snapshot mudou durante cifragem');
      receipt = { version: 1, operationId, snapshotCreatedAt: pkg.metadata.snapshotCreatedAt, manifestHash: pkg.metadata.manifestHash, cipherHash: await digest(temp) };
      await fault?.('publishing'); publish(temp, file); await fault?.('published'); atomicPrivateJson(descriptor, receipt); state.pending = receipt; saveState(config.operationDir, state); await fault?.('prepared');
    } catch (error) { failed = error; state.result = 'failed'; state.failedStage = 'encrypt'; state.safeFailureCode = failureCode(error, 'encrypt'); saveState(config.operationDir, state); }
    finally { if (existsSync(temp)) rmSync(temp); }
  };
  if (existsSync(destination)) {
    const operationConfig = { ...config, destination };
    let operation = acquireOperation(operationConfig, true);
    try {
      const state = loadState(config.operationDir), journal = operation.prior;
      if (state.operationId !== operationId || !journal || journal.kind !== 'backup' || journal.destination !== resolve(destination) || !['snapshotted', 'resumed', 'completed', 'recovered'].includes(journal.stage)) throw Error('Snapshot sem intenção reconciliável');
      const snapshot = validateSnapshot(destination);
      safeRegular(join(config.dataDir, 'auth.sqlite'));
      const auth = new Database(join(config.dataDir, 'auth.sqlite'), { readonly: true, fileMustExist: true });
      try { if (profileReadonly(auth) !== snapshot.manifest.profile) throw Error('Snapshot de outro perfil'); } finally { auth.close(); }
      // A crash may precede resume; reconcile the journal before encryption, without taking another snapshot.
      if (!['completed', 'recovered'].includes(journal.stage)) {
        operation.release(); await recoverOperation(operationConfig, { controller }); operation = acquireOperation(operationConfig, true);
      }
      await encryptSnapshot(destination);
      const recovered = operation.prior!; recovered.stage = 'completed'; operation.save(recovered);
    } finally { operation.release(); }
  } else {
    await coordinatedSnapshot({ ...config, destination }, { controller, fault: async stage => { if (stage === 'intended') { precheck(); const state = loadState(config.operationDir); state.lastAttempt = new Date().toISOString(); state.operationId = operationId; state.result = 'pending'; state.failedStage = null; state.safeFailureCode = null; saveState(config.operationDir, state); } }, transfer: encryptSnapshot });
  }
  if (failed) throw failed; if (!receipt) throw Error('Ciphertext ausente'); return { file, receipt };
}
export async function acknowledgeOffsiteCopy(config: SourceOffsiteConfig, receipt: Receipt) {
  if (config.role !== 'source' || !validReceipt(receipt)) throw Error('ACK inválido'); const lock = acquireServiceLock(privateFile(config.operationDir, true));
  try { const expected = readPrivateJson(join(config.operationDir, id(receipt.operationId) + '.json')) as Receipt;
    if (JSON.stringify(expected) !== JSON.stringify(receipt) || await digest(join(config.operationDir, receipt.operationId + '.age')) !== expected.cipherHash) throw Error('ACK divergente');
    const state = loadState(config.operationDir);
    if (state.lastVerifiedSuccess?.operationId === receipt.operationId) return;
    if (state.operationId !== receipt.operationId || state.pending?.manifestHash !== receipt.manifestHash) throw Error('ACK antigo ou não preparado');
    state.lastVerifiedSuccess = { ...receipt, verifiedAt: new Date().toISOString() }; state.result = 'success'; state.failedStage = null; state.safeFailureCode = null; delete state.pending; saveState(config.operationDir, state);
  } finally { lock.release(); }
}
export async function recordOffsiteFailure(config: SourceOffsiteConfig, input: { operationId: string; safeFailureCode: string }) {
  if (config.role !== 'source' || !idPattern.test(input?.operationId) || !safeCodes.has(input.safeFailureCode) || Object.keys(input).sort().join(',') !== 'operationId,safeFailureCode') throw Error('Falha informada inválida');
  const lock = acquireServiceLock(privateFile(config.operationDir, true));
  try { const state = loadState(config.operationDir); if (state.operationId !== input.operationId || state.lastVerifiedSuccess?.operationId === input.operationId) throw Error('Falha antiga recusada'); state.result = 'failed'; state.failedStage = 'external-verification'; state.safeFailureCode = input.safeFailureCode; saveState(config.operationDir, state); } finally { lock.release(); }
}

async function unpack(path: string, destination: string, config: Budget, signal: AbortSignal) {
  mkdirSync(destination, { mode: 0o700 }); mkdirSync(join(destination, 'snapshot'), { mode: 0o700 }); mkdirSync(join(destination, 'snapshot', 'media'), { mode: 0o700 }); mkdirSync(join(destination, 'recovery'), { mode: 0o700 });
  const zip = await new Promise<yauzl.ZipFile>((accept, reject) => yauzl.open(path, { lazyEntries: true, autoClose: false, strictFileNames: true, validateEntrySizes: true }, (e, z) => e ? reject(e) : accept(z!)));
  const names = new Set<string>(); let bytes = 0;
  try { await new Promise<void>((accept, reject) => {
    zip.once('error', reject); zip.once('end', accept);
    zip.on('entry', (entry: yauzl.Entry) => { void (async () => {
      signal.throwIfAborted(); const name = entry.fileName, mode = entry.externalFileAttributes >>> 16;
      if (names.has(name) || !['metadata.json', 'snapshot/manifest.json', 'snapshot/archive.sqlite', 'snapshot/auth.sqlite', ...recoveryNames.map(n => 'recovery/' + n)].includes(name) && !mediaPattern.test(name) || mode && (mode & 0o170000) !== 0o100000 || entry.isEncrypted() || !Number.isSafeInteger(entry.uncompressedSize)) throw Error('Entrada de pacote recusada');
      names.add(name); bytes += entry.uncompressedSize; if (bytes > config.maxBytes || names.size > (config.maxFiles ?? 10000)) throw Error('Pacote excedeu orçamento');
      const input = await new Promise<Readable>((a, r) => zip.openReadStream(entry, (e, s) => e ? r(e) : a(s!)));
      await copy(input, join(destination, name), entry.uncompressedSize, signal); zip.readEntry();
    })().catch(reject); }); zip.readEntry();
  }); } finally { zip.close(); }
  const metadata = readPrivateJson(join(destination, 'metadata.json'));
  if (metadata.version !== 1 || !idPattern.test(metadata.operationId) || !Array.isArray(metadata.recovery)) throw Error('Metadata inválida');
  const snapshot = validateSnapshot(join(destination, 'snapshot'));
  if (snapshot.digest !== metadata.manifestHash || snapshot.manifest.createdAt !== metadata.snapshotCreatedAt) throw Error('Snapshot do pacote divergente');
  const expected = new Set(['metadata.json', 'snapshot/manifest.json', ...snapshot.manifest.files.map(f => 'snapshot/' + f.path)]);
  for (const f of metadata.recovery) { if (!recoveryNames.some(n => f.path === 'recovery/' + n) || expected.has(f.path) || safeRegular(join(destination, f.path)).size !== f.size || await digest(join(destination, f.path)) !== f.sha256) throw Error('Recovery kit divergente'); expected.add(f.path); }
  if (expected.size !== names.size || [...names].some(n => !expected.has(n))) throw Error('Conjunto do pacote divergente');
  // Exercise FTS queries before any service can rebuild its derived indexes.
  const db = new Database(join(destination, 'snapshot', 'archive.sqlite'), { readonly: true });
  try { for (const row of db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND sql LIKE '%USING fts5%'").all() as { name: string }[]) db.prepare(`SELECT count(*) FROM "${row.name.replaceAll('"', '""')}" WHERE "${row.name.replaceAll('"', '""')}" MATCH ?`).get('"integrityprobe"'); } finally { db.close(); }
  return metadata;
}
async function recoverFile(config: PullOffsiteConfig, operationId: string, file: string, destination: string, cipher: CipherAdapter, fault?: Fault) {
  const parent = privateFile(dirname(resolve(destination)), true); if (existsSync(destination)) throw Error('Restore exige destino novo'); space(parent, config.maxBytes * 3, (config.maxFiles ?? 10000) * 3, config.reserveBytes);
  const work = mkdtempSync(join(parent, '.offsite-restore-')); let published = false, reserved = false;
  try { const signal = AbortSignal.timeout(120_000), zip = join(work, 'bundle.zip'); await fault?.('decrypt'); await cipher.decrypt(file, zip, signal); await fault?.('validate');
    const bundle = join(work, 'bundle'), metadata = await unpack(zip, bundle, config, signal); if (metadata.operationId !== operationId) throw Error('Replay de outro ID recusado');
    await restoreSnapshot({ snapshotDir: join(bundle, 'snapshot'), destination: join(bundle, 'restored') });
    const receipt: Receipt = { version: 1, operationId, snapshotCreatedAt: metadata.snapshotCreatedAt, manifestHash: metadata.manifestHash, cipherHash: await digest(file) };
    // Destination reservation is exclusive. Moving only a validated offline tree is safe.
    sync(join(bundle, 'snapshot', 'media')); sync(join(bundle, 'snapshot')); sync(join(bundle, 'recovery')); sync(bundle);
    mkdirSync(destination, { mode: 0o700 }); reserved = true; const { renameSync } = await import('node:fs'); renameSync(bundle, destination); sync(parent); published = true;
    return { receipt, snapshotDir: join(destination, 'snapshot'), restoredDir: join(destination, 'restored'), recoveryDir: join(destination, 'recovery') };
  } finally { rmSync(work, { recursive: true }); if (reserved && !published && existsSync(destination) && readdirSync(destination).length === 0) rmSync(destination); }
}
export async function recoverOffsiteCopy(config: PullOffsiteConfig, operationId: string, destination: string, { cipher = createAgeCipher({ identityFile: config.identityFile, maxBytes: config.maxBytes }), fault }: { cipher?: CipherAdapter; fault?: Fault } = {}) {
  id(operationId); budget(config); if (config.role !== 'pull') throw Error('Recuperação independente no notebook obrigatória'); privateFile(config.destinationDir, true); privateFile(config.identityFile);
  return recoverFile(config, operationId, join(config.destinationDir, operationId + '.age'), destination, cipher, fault);
}

function sshCommand(config: PullOffsiteConfig, command: 'offsite-produce' | 'offsite-ack' | 'offsite-failed', operationId?: string) {
  const r = config.remote; if (!r || !/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(r.host) || !/^[a-z_][a-z0-9_-]*$/.test(r.user) || !Number.isInteger(r.port ?? 22) || (r.port ?? 22) < 1 || (r.port ?? 22) > 65535) throw Error('Transporte SSH inválido');
  for (const path of [r.nodePath, r.mainPath, r.configFile, r.dataDir]) if (!/^\/[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').includes('..')) throw Error('Caminho remoto inválido');
  privateFile(r.identityFile); privateFile(r.knownHostsFile);
  return ['-F', '/dev/null', '-T', '-p', String(r.port ?? 22), '-i', r.identityFile, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + r.knownHostsFile, '-o', 'GlobalKnownHostsFile=/dev/null', '-o', 'UpdateHostKeys=no', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=2', '-o', 'ClearAllForwardings=yes', '-o', 'LogLevel=ERROR', '--', r.user + '@' + r.host,
    ['env', 'ZAP_DATA_DIR=' + r.dataDir, 'ZAP_OPERATION_CONFIG_FILE=' + r.configFile, r.nodePath, r.mainPath, command, ...(operationId ? [id(operationId)] : [])].join(' ')];
}
export function createNotebookAdapter(config: PullOffsiteConfig): OffsiteAdapter {
  return {
    async putNew(operationId, output, signal) { const stream = createWriteStream(output, { flags: 'wx', mode: 0o600 }); await processStream('/usr/bin/ssh', sshCommand(config, 'offsite-produce', operationId), Readable.from([]), stream, signal, undefined, config.maxBytes); sync(output); },
    async getById(operationId, output, signal) { const path = join(config.destinationDir, id(operationId) + '.age'); await copy(readStream(path), output, config.maxBytes, signal); },
    async acknowledge(receipt, signal) { const sink = new Transform({ transform(_chunk, _encoding, done) { done(); } }); sink.resume(); await processStream('/usr/bin/ssh', sshCommand(config, 'offsite-ack'), Readable.from([JSON.stringify(receipt)]), sink, signal); },
    async reportFailure(operationId, safeFailureCode, signal) { const sink = new Transform({ transform(_chunk, _encoding, done) { done(); } }); sink.resume(); await processStream('/usr/bin/ssh', sshCommand(config, 'offsite-failed'), Readable.from([JSON.stringify({ operationId, safeFailureCode })]), sink, signal); }
  };
}
export async function runOffsiteBackup(config: PullOffsiteConfig, { adapter = createNotebookAdapter(config), cipher = createAgeCipher({ identityFile: config.identityFile, maxBytes: config.maxBytes }), fault }: { adapter?: OffsiteAdapter; cipher?: CipherAdapter; fault?: Fault } = {}) {
  budget(config); if (config.role !== 'pull') throw Error('Backup deve ser iniciado pelo notebook'); privateFile(config.operationDir, true);
  const lock = acquireServiceLock(config.operationDir);
  let stage = 'key', work: string | undefined, state: State | undefined, operationId: string | undefined;
  try { state = loadState(config.operationDir); operationId = state.result !== 'success' && state.operationId ? state.operationId : randomUUID();
    state.lastAttempt = new Date().toISOString(); state.operationId = operationId; state.result = 'pending'; state.failedStage = null; state.safeFailureCode = null; saveState(config.operationDir, state);
    privateFile(config.identityFile); privateFile(config.destinationDir, true); stage = 'capacity';
    await fault?.(stage); space(config.destinationDir, config.maxBytes * 5, (config.maxFiles ?? 10000) * 4, config.reserveBytes);
    work = mkdtempSync(join(config.destinationDir, '.offsite-pull-')); const stored = join(config.destinationDir, operationId + '.age');
    stage = 'transfer'; await fault?.(stage);
    if (!existsSync(stored)) {
      let error: unknown;
      for (let attempt = 0; attempt < 3; attempt++) { const temp = join(work, 'incoming-' + attempt);
        try { await adapter.putNew(operationId, temp, AbortSignal.timeout(120_000)); safeRegular(temp); if (lstatSync(temp).size > config.maxBytes) throw Error('Ciphertext excedeu orçamento'); await fault?.('publishing'); publish(temp, stored); error = undefined; break; }
        catch (e) { error = e; if (existsSync(temp)) rmSync(temp); }
      } if (error) throw error;
    }
    const expectedHash = await digest(stored), readback = join(work, 'readback.age'); stage = 'readback'; await fault?.(stage); await adapter.getById(operationId, readback, AbortSignal.timeout(120_000));
    if (await digest(readback) !== expectedHash) throw Error('Ciphertext recuperado divergente');
    stage = 'decrypt'; const restored = await recoverFile(config, operationId, readback, join(work, 'verified'), cipher, async p => { stage = p; await fault?.(p); });
    stage = 'acknowledge'; await fault?.(stage); await adapter.acknowledge(restored.receipt, AbortSignal.timeout(120_000));
    stage = 'verified'; await fault?.(stage); state.lastVerifiedSuccess = { ...restored.receipt, verifiedAt: new Date().toISOString() }; state.result = 'success'; state.failedStage = null; state.safeFailureCode = null; saveState(config.operationDir, state);
    return { verified: true, operationId };
  } catch (error) { if (!state || !operationId) throw error; state.result = 'failed'; state.failedStage = stage; state.safeFailureCode = failureCode(error, stage); saveState(config.operationDir, state); if (['transfer', 'readback', 'decrypt', 'validate', 'acknowledge'].includes(stage)) await adapter.reportFailure?.(operationId, state.safeFailureCode, AbortSignal.timeout(120_000)).catch(() => {}); throw Error('Backup recusado: ' + state.safeFailureCode); }
  finally { try { if (work) rmSync(work, { recursive: true }); } finally { lock.release(); } }
}

export function readOffsiteConfig(path: string): SourceOffsiteConfig | PullOffsiteConfig { const c = readPrivateJson(path); budget(c); if (!['source', 'pull'].includes(c.role)) throw Error('Papel offsite inválido'); return c; }
export async function streamProducedCopy(config: SourceOffsiteConfig, operationId: string) { const result = await produceOffsiteCopy(config, operationId); await pipeline(readStream(result.file), process.stdout, { signal: AbortSignal.timeout(120_000) }); }

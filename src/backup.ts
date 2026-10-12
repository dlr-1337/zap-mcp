import Database from 'better-sqlite3';
import { constants, openSync, closeSync, fstatSync, readSync, writeSync, fsyncSync, chmodSync, lstatSync, realpathSync, existsSync, mkdirSync, readdirSync, rmSync, renameSync, readFileSync, writeFileSync, statfsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { acquireServiceLock } from './whatsapp.js';

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const allowed = new RegExp(`^(archive\\.sqlite|auth\\.sqlite|media/${uuid}\\.bin|media/${uuid}\\.${uuid}\\.manifest)$`);
type File = { path: string; size: number; sha256: string };
type Evidence = { schema: number; counts: Record<string, number>; schemaHash: string };
type Manifest = { version: 1; profile: string; createdAt: string; databases: Record<string, Evidence>; files: File[] };
type Fault = (point: string) => void | Promise<void>;

function privatePath(input: string, existing = true) {
  if (process.versions.node.split('.')[0] !== '24') throw Error('Node24 obrigatório');
  if (typeof input !== 'string' || !input || input.includes('\0')) throw Error('Diretório privado inválido');
  const path = resolve(input), checkout = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  if (path === '/' || path === checkout || path.startsWith(checkout + '/') || checkout.startsWith(path + '/')) throw Error('Armazenamento privado deve ficar fora do checkout');
  const parent = existing ? path : dirname(path), stat = lstatSync(parent);
  if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(parent) !== parent) throw Error('Diretório privado inválido');
  if (existing && (stat.uid !== process.getuid!() || (stat.mode & 0o077))) throw Error('Permissões privadas obrigatórias (0700)');
  if (!existing && existsSync(path)) throw Error('Destino já existe; use um diretório novo');
  return path;
}
function sync(path: string, directory = false) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | (directory ? constants.O_DIRECTORY : 0));
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function fileDigest(path: string, output?: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW); let out: number | undefined;
  try {
    const stat = fstatSync(fd); if (!stat.isFile() || stat.nlink !== 1 || !Number.isSafeInteger(stat.size) || stat.uid !== process.getuid!() || stat.mode & 0o077) throw Error('Arquivo privado inválido');
    if (output) out = openSync(output, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    const hash = createHash('sha256'), buffer = Buffer.alloc(64 * 1024); let size = 0, n: number;
    while ((n = readSync(fd, buffer, 0, buffer.length, null))) {
      hash.update(buffer.subarray(0, n)); size += n;
      if (out !== undefined) { let written = 0; while (written < n) written += writeSync(out, buffer, written, n - written); }
    }
    if (size !== stat.size) throw Error('Arquivo mudou durante cópia');
    if (out !== undefined) fsyncSync(out);
    return { size, sha256: hash.digest('hex') };
  } finally { closeSync(fd); if (out !== undefined) closeSync(out); }
}
function readPrivate(path: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const s = fstatSync(fd); if (!s.isFile() || s.size > 16 * 1024 * 1024 || s.uid !== process.getuid!() || s.mode & 0o077) throw Error('Manifest privado inválido'); return readFileSync(fd, 'utf8'); }
  finally { closeSync(fd); }
}
function openDb(path: string) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== process.getuid!() || stat.mode & 0o077) throw Error('Banco privado inválido');
  return new Database(path, { readonly: true, fileMustExist: true });
}
function evidence(db: Database.Database): Evidence {
  if (db.pragma('integrity_check', { simple: true }) !== 'ok' || (db.pragma('foreign_key_check') as unknown[]).length) throw Error('Banco inconsistente');
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
  const counts: Record<string, number> = {};
  for (const { name } of tables) counts[name] = (db.prepare(`SELECT count(*) n FROM "${name.replaceAll('"', '""')}"`).get() as { n: number }).n;
  const schema = db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all();
  return { schema: Number(db.pragma('user_version', { simple: true })), counts, schemaHash: createHash('sha256').update(JSON.stringify(schema)).digest('hex') };
}
function profileReadonly(db: Database.Database) {
  const row = db.prepare('SELECT creds FROM whatsapp_profile WHERE id=1').get() as { creds: string } | undefined;
  // BufferJSON encodes buffers as {type: Buffer,data: base64}; only the public identity is hashed.
  const pub = row && JSON.parse(row.creds).signedIdentityKey?.public;
  if (pub?.type !== 'Buffer' || typeof pub.data !== 'string' || Buffer.from(pub.data, 'base64').length !== 32) throw Error('Perfil ausente ou inválido; execute profile-init offline');
  return createHash('sha256').update(Buffer.from(pub.data, 'base64')).digest('hex');
}
function checkSpace(parent: string, bytes: bigint) {
  const disk = statfsSync(parent, { bigint: true }), total = disk.blocks * disk.bsize, free = disk.bavail * disk.bsize;
  const reserve = total / 20n > 256n * 1024n * 1024n ? total / 20n : 256n * 1024n * 1024n;
  if (free <= bytes + reserve) throw Error('Espaço insuficiente para cópia e reserva');
}
function stage(destination: string) {
  const dest = privatePath(destination, false), staging = join(dirname(dest), '.zap-copy-' + randomUUID());
  mkdirSync(staging, { mode: 0o700 }); mkdirSync(join(staging, 'media'), { mode: 0o700 });
  return { dest, staging };
}
function publish(staging: string, dest: string) {
  sync(join(staging, 'media'), true); sync(staging, true);
  // Reserve the name before rename: concurrent commands cannot overwrite a valid snapshot.
  mkdirSync(dest, { mode: 0o700 });
  try { renameSync(staging, dest); sync(dirname(dest), true); }
  catch (error) { if (existsSync(dest) && readdirSync(dest).length === 0) rmSync(dest); throw error; }
}
export async function createSnapshot({ dataDir, destination, fault }: { dataDir: string; destination: string; fault?: Fault }) {
  const source = privatePath(dataDir), dest = privatePath(destination, false);
  if (dest.startsWith(source + '/')) throw Error('Snapshot deve ficar fora do perfil fonte');
  const lock = acquireServiceLock(source), databases: Database.Database[] = []; let staging: string | undefined;
  try {
    const archive = openDb(join(source, 'archive.sqlite')); databases.push(archive);
    const auth = openDb(join(source, 'auth.sqlite')); databases.push(auth);
    const manifest: Manifest = { version: 1, profile: profileReadonly(auth), createdAt: new Date().toISOString(), databases: { 'archive.sqlite': evidence(archive), 'auth.sqlite': evidence(auth) }, files: [] };
    const originals = archive.prepare("SELECT a.id,a.size,a.sha256,j.id job,j.generation FROM attachments a JOIN media_jobs j ON j.attachment_id=a.id WHERE a.state='available' AND j.state='available' ORDER BY a.id").all() as { id: string; size: number; sha256: string; job: string; generation: string }[];
    const paths: File[] = [];
    if (realpathSync(join(source, 'media')) !== join(source, 'media')) throw Error('Diretório de mídia inválido');
    for (const row of originals) {
      const path = 'media/' + row.id + '.bin'; if (!allowed.test(path)) throw Error('Identificador interno inválido');
      const digest = fileDigest(join(source, path)); if (digest.size !== row.size || digest.sha256 !== row.sha256) throw Error('Original divergente'); paths.push({ path, ...digest });
      const receipt = `media/${row.id}.${row.generation}.manifest`;
      if (!allowed.test(receipt) || !existsSync(join(source, receipt))) throw Error('Manifest de mídia ausente ou inválido');
      const value = JSON.parse(readPrivate(join(source, receipt)));
      if (value.id !== row.id || value.sha256 !== digest.sha256 || value.size !== String(digest.size)) throw Error('Manifest de mídia divergente');
      paths.push({ path: receipt, ...fileDigest(join(source, receipt)) });
    }
    const dbBytes = databases.reduce((n, db) => n + BigInt(Number(db.pragma('page_count', { simple: true }))) * BigInt(Number(db.pragma('page_size', { simple: true }))), 0n);
    checkSpace(dirname(dest), dbBytes + paths.reduce((n, f) => n + BigInt(f.size), 0n));
    staging = stage(dest).staging;
    for (const [index, name] of ['archive.sqlite','auth.sqlite'].entries()) {
      await databases[index].backup(join(staging, name), { progress: () => { lock.assert(); checkSpace(dirname(dest), 0n); return 100; } });
      const copy = new Database(join(staging, name)); try { copy.pragma('journal_mode=DELETE'); } finally { copy.close(); }
      chmodSync(join(staging, name), 0o600); sync(join(staging, name)); manifest.files.push({ path: name, ...fileDigest(join(staging, name)) }); await fault?.('database');
    }
    for (const file of paths) { checkSpace(dirname(dest), BigInt(file.size)); const copy = fileDigest(join(source, file.path), join(staging, file.path)); if (JSON.stringify(copy) !== JSON.stringify({ size: file.size, sha256: file.sha256 })) throw Error('Cópia divergente'); manifest.files.push(file); await fault?.('file'); }
    writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600, flag: 'wx' }); sync(join(staging, 'manifest.json'));
    validateSnapshot(staging); await fault?.('verified'); lock.assert(); publish(staging, dest); staging = undefined;
    return { files: manifest.files.length, messages: manifest.databases['archive.sqlite'].counts.messages };
  } finally { for (const db of databases) db.close(); if (staging) rmSync(staging, { recursive: true }); lock.release(); }
}
export function validateSnapshot(snapshotDir: string): { manifest: Manifest; digest: string } {
  const dir = privatePath(snapshotDir), text = readPrivate(join(dir, 'manifest.json')), m = JSON.parse(text) as Manifest;
  if (readdirSync(dir).some(n => !['archive.sqlite','auth.sqlite','media','manifest.json'].includes(n))) throw Error('Snapshot contém arquivo não declarado');
  if (m.version !== 1 || !/^[0-9a-f]{64}$/.test(m.profile) || !Number.isFinite(Date.parse(m.createdAt)) || !Array.isArray(m.files) || m.files.length < 2 || !m.databases || !m.databases['archive.sqlite'] || !m.databases['auth.sqlite']) throw Error('Manifest inválido');
  if (realpathSync(join(dir, 'media')) !== join(dir, 'media')) throw Error('Diretório de mídia inválido');
  const names = new Set<string>();
  for (const f of m.files) {
    if (!f || typeof f.path !== 'string' || !allowed.test(f.path) || names.has(f.path) || !Number.isSafeInteger(f.size) || f.size < 0 || !/^[0-9a-f]{64}$/.test(f.sha256)) throw Error('Manifest inválido'); names.add(f.path);
    const got = fileDigest(join(dir, f.path)); if (got.size !== f.size || got.sha256 !== f.sha256) throw Error('Snapshot divergente');
  }
  if (readdirSync(join(dir, 'media')).some(n => !names.has('media/' + n))) throw Error('Snapshot contém mídia não declarada');
  for (const name of ['archive.sqlite','auth.sqlite']) {
    if (!names.has(name)) throw Error('Banco ausente'); const db = openDb(join(dir, name));
    try {
      if (JSON.stringify(evidence(db)) !== JSON.stringify(m.databases[name])) throw Error('Evidência SQL divergente');
      if (name === 'auth.sqlite' && profileReadonly(db) !== m.profile) throw Error('Perfil divergente');
      if (name === 'archive.sqlite') {
        for (const row of db.prepare("SELECT id,size,sha256 FROM attachments WHERE state='available'").all() as { id: string; size: number; sha256: string }[]) {
          const f = m.files.find(f => f.path === `media/${row.id}.bin`); if (!f || f.size !== row.size || f.sha256 !== row.sha256) throw Error('Original ausente do manifest');
        }
      }
    } finally { db.close(); }
  }
  return { manifest: m, digest: createHash('sha256').update(text).digest('hex') };
}

const checks = 'sql-fk-counts-schema-hashes-authenticated-offline-http';
type Proof = { version: 1; source: string; profile: string; snapshotDir: string; manifestHash: string; verifiedAt: string; checks: typeof checks };
function signingSecret(db: Database.Database) {
  const row = db.prepare("SELECT value FROM web_config WHERE key='signing-secret'").get() as { value: string } | undefined;
  if (!row?.value) throw Error('Configuração privada ausente'); return row.value;
}
export function assertCollectorReady(dataDir: string, authDb: Database.Database) {
  const source = privatePath(dataDir);
  if (existsSync(join(source, 'restored.json'))) throw Error('Perfil restaurado é somente consulta offline');
  if (dirname(resolve(authDb.name)) !== source) throw Error('Perfil fora da trava');
  const receipt = JSON.parse(readPrivate(join(source, 'backup-receipt.json'))) as { proof: string; mac: string };
  if (Object.keys(receipt).sort().join(',') !== 'mac,proof' || typeof receipt.proof !== 'string' || typeof receipt.mac !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.mac)) throw Error('Recibo de restore inválido');
  const expected = createHmac('sha256', signingSecret(authDb)).update(receipt.proof).digest();
  if (!timingSafeEqual(expected, Buffer.from(receipt.mac, 'hex'))) throw Error('Recibo de restore divergente');
  const proof = JSON.parse(receipt.proof) as Proof;
  if (proof.version !== 1 || proof.checks !== checks || proof.source !== createHash('sha256').update(source).digest('hex') || proof.profile !== profileReadonly(authDb) || !Number.isFinite(Date.parse(proof.verifiedAt))) throw Error('Recibo de outro perfil ou incompleto');
  const snapshot = validateSnapshot(proof.snapshotDir);
  if (snapshot.digest !== proof.manifestHash || snapshot.manifest.profile !== proof.profile) throw Error('Snapshot do recibo divergente');
}
async function verifyOffline(dataDir: string, manifest: Manifest) {
  const { createService } = await import('./main.js'); const s = createService({ dataDir });
  const server = s.app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening'); const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`, password = randomUUID() + randomUUID();
    // Change only the disposable restored login so the actual HTTP authentication path is exercised.
    await s.setPassword(password);
    const request = (path: string, options: RequestInit = {}) => fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
    const challenge = await request('/api/session'); const { csrfToken } = await challenge.json();
    const login = await request('/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken }) });
    if (login.status !== 200 || !login.headers.get('set-cookie')) throw Error('Login restaurado falhou');
    const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0] };
    const read = async (path: string) => { const r = await request(path, { headers }); if (r.status !== 200) throw Error('Consulta restaurada falhou'); return r.json(); };
    if ((await request('/api/conversations')).status !== 401) throw Error('Consulta sem autenticação');
    const status = await read('/api/status'); if (status.collectorEnabled || status.coverage.uniqueMessages !== manifest.databases['archive.sqlite'].counts.messages) throw Error('Restore divergente ou coletor ativo');
    let cursor: string | null = null, messages = 0;
    do {
      const page = await read('/api/conversations' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
      for (const c of page.conversations) {
        let before: string | null = null;
        do { const p = await read(`/api/conversations/${c.id}/messages` + (before ? '?cursor=' + encodeURIComponent(before) : '')); messages += p.messages.length; before = p.nextCursor; } while (before);
      }
      cursor = page.nextCursor;
    } while (cursor);
    if (messages !== manifest.databases['archive.sqlite'].counts.messages) throw Error('Mensagens restauradas divergentes');
    for (const file of manifest.files.filter(f => f.path.endsWith('.bin'))) {
      const id = file.path.slice(6, -4);
      if ((await request('/api/attachments/' + id)).status !== 401) throw Error('Original sem autenticação');
      const r = await request('/api/attachments/' + id, { headers }); if (r.status !== 200 || !r.body) throw Error('Original restaurado indisponível');
      const hash = createHash('sha256'); let size = 0; for await (const chunk of r.body) { hash.update(chunk); size += chunk.length; }
      if (size !== file.size || hash.digest('hex') !== file.sha256) throw Error('Download restaurado divergente');
    }
  } finally { await new Promise<void>(r => server.close(() => r())); await s.close(); }
}
export async function verifyBackup({ dataDir, snapshotDir, destination, fault }: { dataDir: string; snapshotDir: string; destination: string; fault?: Fault }) {
  const source = privatePath(dataDir), lock = acquireServiceLock(source); let auth: Database.Database | undefined;
  let temp: string | undefined;
  try {
    if (existsSync(join(source, 'restored.json'))) throw Error('Perfil restaurado é somente consulta offline');
    auth = openDb(join(source, 'auth.sqlite')); const snapshot = validateSnapshot(snapshotDir);
    if (profileReadonly(auth) !== snapshot.manifest.profile) throw Error('Snapshot de outro perfil');
    await restoreSnapshot({ snapshotDir, destination }); await verifyOffline(destination, snapshot.manifest);
    // Receipt is minted only after offline HTTP/download checks and a final snapshot recheck.
    if (validateSnapshot(snapshotDir).digest !== snapshot.digest) throw Error('Snapshot mudou durante verificação');
    const proof: Proof = { version: 1, source: createHash('sha256').update(source).digest('hex'), profile: snapshot.manifest.profile, snapshotDir: resolve(snapshotDir), manifestHash: snapshot.digest, verifiedAt: new Date().toISOString(), checks };
    const body = JSON.stringify(proof), mac = createHmac('sha256', signingSecret(auth)).update(body).digest('hex');
    await fault?.('verified'); lock.assert(); temp = join(source, '.receipt-' + randomUUID());
    writeFileSync(temp, JSON.stringify({ proof: body, mac }), { flag: 'wx', mode: 0o600 }); sync(temp);
    renameSync(temp, join(source, 'backup-receipt.json')); temp = undefined; sync(source, true);
    return { verified: true, files: snapshot.manifest.files.length, messages: snapshot.manifest.databases['archive.sqlite'].counts.messages };
  } finally { if (temp) rmSync(temp); auth?.close(); lock.release(); }
}
export function preflight(dataDir: string) {
  const source = privatePath(dataDir);
  // Read-only preflight never claims/removes a lock; normal startup recovers an orphan safely.
  if (existsSync(join(source, 'service.lock'))) throw Error('Pare o serviço e aguarde encerramento antes do preflight');
  const archive = openDb(join(source, 'archive.sqlite')); let auth: Database.Database | undefined;
  try { auth = openDb(join(source, 'auth.sqlite')); evidence(archive); evidence(auth); if (!auth.prepare('SELECT id FROM web_owner WHERE id=1').get()) throw Error('Configure owner-set por stdin antes do piloto'); checkSpace(source, 0n); assertCollectorReady(source, auth); }
  finally { archive.close(); auth?.close(); }
  return { ready: true, accountValidated: false };
}
export async function restoreSnapshot({ snapshotDir, destination, fault }: { snapshotDir: string; destination: string; fault?: Fault }) {
  const { manifest } = validateSnapshot(snapshotDir), dest = privatePath(destination, false);
  if (dest.startsWith(resolve(snapshotDir) + '/')) throw Error('Restore deve ficar fora do snapshot');
  checkSpace(dirname(dest), manifest.files.reduce((n, f) => n + BigInt(f.size), 0n));
  const { staging } = stage(dest);
  try {
    for (const f of manifest.files) { checkSpace(dirname(dest), BigInt(f.size)); const digest = fileDigest(join(resolve(snapshotDir), f.path), join(staging, f.path)); if (digest.size !== f.size || digest.sha256 !== f.sha256) throw Error('Cópia divergente'); await fault?.('file'); }
    fileDigest(join(resolve(snapshotDir), 'manifest.json'), join(staging, 'manifest.json'));
    validateSnapshot(staging);
    writeFileSync(join(staging, 'restored.json'), JSON.stringify({ offlineOnly: true }), { mode: 0o600, flag: 'wx' }); sync(join(staging, 'restored.json'));
    await fault?.('verified'); publish(staging, dest);
    return { files: manifest.files.length, messages: manifest.databases['archive.sqlite'].counts.messages };
  } finally { if (existsSync(staging)) rmSync(staging, { recursive: true }); }
}

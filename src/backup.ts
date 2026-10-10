import Database from 'better-sqlite3';
import { constants, openSync, closeSync, fstatSync, readSync, writeSync, fsyncSync, chmodSync, lstatSync, realpathSync, existsSync, mkdirSync, readdirSync, rmSync, renameSync, readFileSync, writeFileSync, statfsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { acquireServiceLock } from './whatsapp.js';

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const allowed = new RegExp(`^(archive\\.sqlite|auth\\.sqlite|media/${uuid}\\.bin|media/${uuid}\\.${uuid}\\.manifest)$`);
type File = { path: string; size: number; sha256: string };
type Evidence = { schema: number; counts: Record<string, number>; schemaHash: string };
type Manifest = { version: 1; profile: string; createdAt: string; databases: Record<string, Evidence>; files: File[] };
type Fault = (point: string) => void | Promise<void>;

function privatePath(input: string, existing = true) {
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
    const stat = fstatSync(fd); if (!stat.isFile() || stat.nlink !== 1 || !Number.isSafeInteger(stat.size)) throw Error('Arquivo privado inválido');
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
    const archive = openDb(join(source, 'archive.sqlite')), auth = openDb(join(source, 'auth.sqlite')); databases.push(archive, auth);
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
      await databases[index].backup(join(staging, name), { progress: () => { lock.assert(); checkSpace(dirname(dest), 0n); return 100; } }); chmodSync(join(staging, name), 0o600); sync(join(staging, name)); manifest.files.push({ path: name, ...fileDigest(join(staging, name)) }); await fault?.('database');
    }
    for (const file of paths) { checkSpace(dirname(dest), BigInt(file.size)); const copy = fileDigest(join(source, file.path), join(staging, file.path)); if (JSON.stringify(copy) !== JSON.stringify({ size: file.size, sha256: file.sha256 })) throw Error('Cópia divergente'); manifest.files.push(file); await fault?.('file'); }
    writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600, flag: 'wx' }); sync(join(staging, 'manifest.json'));
    validateSnapshot(staging); await fault?.('verified'); lock.assert(); publish(staging, dest); staging = undefined;
    return { files: manifest.files.length, messages: manifest.databases['archive.sqlite'].counts.messages };
  } finally { for (const db of databases) db.close(); if (staging) rmSync(staging, { recursive: true }); lock.release(); }
}
export function validateSnapshot(snapshotDir: string): { manifest: Manifest; digest: string } {
  const dir = privatePath(snapshotDir), text = readPrivate(join(dir, 'manifest.json')), m = JSON.parse(text) as Manifest;
  if (m.version !== 1 || !/^[0-9a-f]{64}$/.test(m.profile) || !Number.isFinite(Date.parse(m.createdAt)) || !Array.isArray(m.files) || m.files.length < 2 || !m.databases || !m.databases['archive.sqlite'] || !m.databases['auth.sqlite']) throw Error('Manifest inválido');
  if (realpathSync(join(dir, 'media')) !== join(dir, 'media')) throw Error('Diretório de mídia inválido');
  const names = new Set<string>();
  for (const f of m.files) {
    if (!f || typeof f.path !== 'string' || !allowed.test(f.path) || names.has(f.path) || !Number.isSafeInteger(f.size) || f.size < 0 || !/^[0-9a-f]{64}$/.test(f.sha256)) throw Error('Manifest inválido'); names.add(f.path);
    const got = fileDigest(join(dir, f.path)); if (got.size !== f.size || got.sha256 !== f.sha256) throw Error('Snapshot divergente');
  }
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
export async function restoreSnapshot({ snapshotDir, destination, fault }: { snapshotDir: string; destination: string; fault?: Fault }) {
  const { manifest } = validateSnapshot(snapshotDir), dest = privatePath(destination, false);
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

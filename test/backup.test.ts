import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
import { startMediaWorker } from '../src/media.js';
const modulePath = '../src/backup.js';
async function load() { const m = await import(modulePath).catch(() => null); assert.ok(m?.createSnapshot && m?.restoreSnapshot, 'snapshot consistente e restore devem existir'); return m; }
function setup(t: { after(fn: () => unknown): void }) {
  const base = mkdtempSync(join(tmpdir(), 'zap-backup-')), dataDir = join(base, 'source'), destination = join(base, 'snapshot');
  t.after(() => rmSync(base, { recursive: true })); return { base, dataDir, destination };
}
export async function seed(dataDir: string, count = 4) {
  const s = createService({ dataDir });
  createAuthState(s.authDb, { newProfile: true }).state.keys.set({ session: { synthetic: Buffer.from('private key fixture') } });
  s.archiveDb.pragma('journal_mode=WAL'); s.authDb.pragma('journal_mode=WAL');
  const bytes = Buffer.from('original de fixture'), types = ['imageMessage','audioMessage','videoMessage','documentMessage'];
  for (let i = 0; i < count; i++) s.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'm' + i, fromMe: false }, messageTimestamp: 1700000000, message: { [types[i % 4]]: { url: 'https://mmg.whatsapp.net/file', mediaKey: Buffer.alloc(32), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest(), caption: 'texto verificável' } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dataDir, 'media'), downloadOriginal: async () => Readable.from([bytes]) });
  await worker.drain(); await worker.stop(); const messages = s.archive.listConversations().conversations.flatMap(c => s.archive.readConversation(c.id)!.messages);
  await s.close(); return { bytes, messages };
}
test('snapshot restaura WAL, sessão e quatro originais offline com proveniência', async t => {
  const m = await load(), f = setup(t), seeded = await seed(f.dataDir);
  await m.createSnapshot(f); const restored = join(f.base, 'restore'); await m.restoreSnapshot({ snapshotDir: f.destination, destination: restored });
  const s = createService({ dataDir: restored });
  try {
    assert.deepEqual(s.archive.listConversations().conversations.flatMap(c => s.archive.readConversation(c.id)!.messages), seeded.messages);
    assert.equal(s.archive.getCoverage().uniqueMessages, 4);
    assert.deepEqual((await createAuthState(s.authDb).state.keys.get('session', ['synthetic'])).synthetic, Buffer.from('private key fixture'));
    for (const row of s.archiveDb.prepare("SELECT id FROM attachments WHERE state='available'").all() as { id: string }[]) assert.deepEqual(readFileSync(join(restored, 'media', row.id + '.bin')), seeded.bytes);
    assert.equal(statSync(restored).mode & 0o777, 0o700); assert.equal(statSync(join(f.destination, 'auth.sqlite')).mode & 0o777, 0o600);
  } finally { await s.close(); }
});
test('backup rejeita writer ativo, corrupção e paths hostis preservando fonte e destino', async t => {
  const m = await load(), f = setup(t); await seed(f.dataDir, 1);
  const s = createService({ dataDir: f.dataDir }); await assert.rejects(m.createSnapshot(f), /ativo|Pare/); await s.close();
  await m.createSnapshot(f); const manifest = readFileSync(join(f.destination, 'manifest.json'));
  await assert.rejects(m.createSnapshot(f), /existe|vazio/); assert.deepEqual(readFileSync(join(f.destination, 'manifest.json')), manifest);
  const restored = join(f.base, 'restore'); await m.restoreSnapshot({ snapshotDir: f.destination, destination: restored });
  await assert.rejects(m.restoreSnapshot({ snapshotDir: f.destination, destination: restored }), /existe|vazio/);
  writeFileSync(join(f.destination, 'archive.sqlite'), 'corrupt'); await assert.rejects(m.restoreSnapshot({ snapshotDir: f.destination, destination: join(f.base, 'bad') })); assert.equal(existsSync(join(f.base, 'bad')), false);
  const link = join(f.base, 'link'); symlinkSync(f.dataDir, link); await assert.rejects(m.createSnapshot({ dataDir: link, destination: join(f.base, 'evil') }));
});
test('snapshot vazio e unitário são restauráveis; manifest traversal e symlink falham fechados', async t => {
  const m = await load();
  for (const count of [0, 1]) {
    const f = setup(t); await seed(f.dataDir, count); await m.createSnapshot(f);
    await m.restoreSnapshot({ snapshotDir: f.destination, destination: join(f.base, 'restore') });
    const original = readFileSync(join(f.destination, 'manifest.json'), 'utf8'), manifest = JSON.parse(original);
    manifest.files[0].path = '../../outside'; writeFileSync(join(f.destination, 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(m.restoreSnapshot({ snapshotDir: f.destination, destination: join(f.base, 'bad') }));
    writeFileSync(join(f.destination, 'manifest.json'), original); rmSync(join(f.destination, 'auth.sqlite')); symlinkSync(join(f.dataDir, 'auth.sqlite'), join(f.destination, 'auth.sqlite'));
    await assert.rejects(m.restoreSnapshot({ snapshotDir: f.destination, destination: join(f.base, 'bad2') }));
  }
});
test('falha ENOSPC/SQL não publica cópia nem altera snapshot anterior', async t => {
  const m = await load(), f = setup(t); await seed(f.dataDir, 1); await m.createSnapshot(f); const original = readFileSync(join(f.destination, 'manifest.json'));
  await assert.rejects(m.createSnapshot({ dataDir: f.dataDir, destination: join(f.base, 'failed'), fault: () => { throw Object.assign(Error('synthetic'), { code: 'ENOSPC' }); } }));
  assert.equal(existsSync(join(f.base, 'failed')), false); assert.deepEqual(readFileSync(join(f.destination, 'manifest.json')), original);
  const db = new Database(join(f.dataDir, 'archive.sqlite')); db.pragma('foreign_keys=OFF'); db.prepare("INSERT INTO origins VALUES ('bad','missing','{}')").run(); db.close();
  await assert.rejects(m.createSnapshot({ dataDir: f.dataDir, destination: join(f.base, 'badSQL') })); assert.equal(existsSync(join(f.base, 'badSQL')), false);
});

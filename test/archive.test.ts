import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { createService } from '../src/main.js';
import { openArchive } from '../src/archive.js';

export const item = (id: string, extra = {}) => ({ key: { remoteJid: '1@s.whatsapp.net', id, fromMe: false }, messageTimestamp: 1700000000, message: { conversation: 'Olá 🧪' }, ...extra });
export function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-archive-'));
  const service = createService({ dataDir: dir });
  t.after(() => { service.close(); rmSync(dir, { recursive: true }); });
  // The optional call permits a behavioral RED against the existing tracer.
  return { ...service, archive: (service as any).archive, dir };
}

test('FULL conserva todos os itens, iguais no tempo, replay e vazio', t => {
  const s = fixture(t);
  const messages = Array.from({ length: 130 }, (_, i) => item(String(i)));
  s.archive?.ingestHistory({ messages, isLatest: true });
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 130);
  const refs = s.archiveDb.prepare('SELECT reference FROM messages ORDER BY reference').all();
  s.archive.ingestUpsert({ type: 'append', messages });
  s.archive.ingestUpsert({ type: 'notify', messages: [] });
  assert.deepEqual(s.archiveDb.prepare('SELECT reference FROM messages ORDER BY reference').all(), refs);
  assert.equal(s.archive.getCoverage().batches.at(-1).received, 0);
});

test('PN/LID tardio conserva referências, origens, homônimos e chaves de grupo', t => {
  const s = fixture(t), a = s.archive;
  a?.ingestUpsert({ type: 'notify', messages: [item('a')] });
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 1);
  const ref = a.readStoredMessage(item('a').key).reference;
  a.ingestUpsert({ type: 'append', messages: [item('a', { key: { remoteJid: '9@lid', remoteJidAlt: '1@s.whatsapp.net', id: 'a', fromMe: false } })] });
  assert.equal(a.readStoredMessage({ remoteJid: '9@lid', id: 'a', fromMe: false }).reference, ref);
  a.ingestContacts([{ id: '1@s.whatsapp.net', name: 'José' }, { id: '2@s.whatsapp.net', name: 'José' }, { id: '3@s.whatsapp.net', name: 'José' }]);
  a.ingestUpsert({ type: 'notify', messages: ['1', '2'].map(participant => item('same', { key: { remoteJid: 'g@g.us', participant, fromMe: false, id: 'same' } })).concat([item('same', { key: { remoteJid: 'g@g.us', participant: '1', fromMe: true, id: 'same' } })]) });
  assert.equal(a.listConversations().conversations.length, 4);
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 4);
});

test('histórico rc14 usa participante explícito do envelope para grupo e edição', t => {
  const s = fixture(t), a = s.archive, key = { remoteJid: 'g@g.us', id: 'same', fromMe: false };
  a.ingestHistory({ messages: ['alice@s.whatsapp.net', 'bob@s.whatsapp.net'].map(participant => item('same', { key, participant })) });
  assert.equal(a.getCoverage().uniqueMessages, 2, 'mesmo ID de autores diferentes não deve ser fundido');
  const target = { ...key, participant: 'alice@s.whatsapp.net' };
  assert.equal(a.readStoredMessage(target)?.author, target.participant);
  a.ingestHistory({ messages: [item('edit', { key: { ...key, id: 'edit' }, participant: target.participant, message: { protocolMessage: { type: 14, key: { ...target, fromMe: true }, timestampMs: 1700000020000, editedMessage: { conversation: 'editado' } } } })] });
  assert.equal(a.readStoredMessage(target)?.text, 'editado');
  assert.equal(a.readStoredMessage({ ...key, participant: 'bob@s.whatsapp.net' })?.text, 'Olá 🧪');
  assert.equal(a.getCoverage().batches.at(-1).failed, 0);
});

test('replay do envelope enriquece registro legado sem trocar referência ou mídia', t => {
  const s = fixture(t), a = s.archive;
  const key = { remoteJid: 'g@g.us', id: 'legacy', fromMe: false }, participant = 'alice@s.whatsapp.net';
  const message = item('legacy', { key, participant, message: { imageMessage: { url: 'https://mmg.whatsapp.net/file', mediaKey: Buffer.alloc(32) } } });
  a.ingestHistory({ messages: [message] });
  const row = s.archiveDb.prepare('SELECT reference FROM messages').get() as { reference: string };
  const attachments = s.archiveDb.prepare('SELECT id FROM attachments').all();
  s.archiveDb.prepare('UPDATE origins SET origin=?,key_json=? WHERE reference=?').run(JSON.stringify([key.remoteJid,key.id,key.fromMe,null]),JSON.stringify({ ...key, participant: null }),row.reference);
  s.archiveDb.prepare('UPDATE messages SET logical_key=?,author=NULL WHERE reference=?').run(JSON.stringify([key.remoteJid,key.id,key.fromMe,null]),row.reference);
  a.ingestHistory({ messages: [message, message] });
  assert.equal(a.getCoverage().uniqueMessages, 1);
  assert.equal(a.readStoredMessage({ ...key, participant })?.reference, row.reference);
  assert.equal(a.readStoredMessage({ ...key, participant })?.author, participant);
  assert.deepEqual(s.archiveDb.prepare('SELECT id FROM attachments').all(), attachments);
  assert.deepEqual(s.archiveDb.pragma('foreign_key_check'), []);
});

test('ausências, Long, buffer privado e citação não fabricam original', t => {
  const s = fixture(t), a = s.archive;
  a?.ingestHistory({ messages: [item('long', { messageTimestamp: { low: 1700000000, high: 0, unsigned: true }, message: { extendedTextMessage: { text: 'á <script>', contextInfo: { stanzaId: 'missing', participant: '2@s.whatsapp.net', quotedMessage: { conversation: 'Citação' } } } }, binary: Buffer.from([255, 0]) }), { key: { remoteJid: '1@s.whatsapp.net', id: 'unknown' } }, {}] });
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 3);
  const m = a.readStoredMessage({ remoteJid: '1@s.whatsapp.net', id: 'long', fromMe: false });
  assert.equal(m.originalTimestamp, '2023-11-14T22:13:20.000Z');
  assert.equal(m.quote.reference, null);
  assert.equal(m.quote.text, 'Citação');
  const missing = a.readStoredMessage({ remoteJid: '1@s.whatsapp.net', id: 'unknown' });
  assert.equal(missing.originalTimestamp, null); assert.equal(missing.fromMe, null);
  assert.equal(a.readPrivateMessage(item('long').key).binary.toString('hex'), 'ff00');
  assert.equal(JSON.stringify(m).includes('binary'), false);
  a.ingestHistory({ messages: [item('invalid', { messageTimestamp: { low: -1, high: 2147483647, unsigned: true } })] });
  assert.equal(a.readStoredMessage(item('invalid').key).originalTimestamp, null);
});

test('falha SQL desfaz mensagem, revisão, origem e job, sem confirmação', t => {
  const s = fixture(t), a = s.archive;
  s.archiveDb.exec("CREATE TRIGGER fail_message BEFORE INSERT ON messages BEGIN SELECT RAISE(ABORT, 'private fault'); END");
  a?.ingestHistory({ messages: [item('fault', { message: { imageMessage: { caption: 'teste', mediaKey: Buffer.from('segredo'), url: 'https://private' } } })] });
  assert.equal(a?.getCoverage().batches.at(-1).failed, 1);
  for (const table of ['messages', 'revisions', 'origins', 'attachments', 'media_jobs']) assert.equal((s.archiveDb.prepare(`SELECT count(*) AS n FROM ${table}`).get() as any).n, 0);
  assert.equal(JSON.stringify(a.getCoverage()).includes('private fault'), false);
  s.archiveDb.exec('DROP TRIGGER fail_message');
  a.ingestHistory({ messages: [item('fault')] });
  assert.equal(a.getCoverage().uniqueMessages, 1);
  assert.deepEqual(s.archiveDb.pragma('foreign_key_check'), []);
  assert.equal(s.archiveDb.pragma('integrity_check', { simple: true }), 'ok');
});

test('migração v2 conserva UUID, referência e texto existentes', t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-migration-'));
  const db = new Database(join(dir, 'archive.sqlite'));
  db.exec("CREATE TABLE conversations(id TEXT PRIMARY KEY,name TEXT,source_id TEXT); CREATE UNIQUE INDEX conversation_source ON conversations(source_id); CREATE TABLE messages(reference TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id),text TEXT NOT NULL,original_timestamp TEXT NOT NULL); CREATE INDEX message_window ON messages(conversation_id,original_timestamp,reference); PRAGMA user_version=2; INSERT INTO conversations VALUES('old-uuid','nome','source'); INSERT INTO messages VALUES('old-ref','old-uuid','texto','2020-01-01T00:00:00.000Z')"); db.close();
  const s = createService({ dataDir: dir }); t.after(() => { s.close(); rmSync(dir, { recursive: true }); });
  assert.equal(s.archiveDb.pragma('user_version', { simple: true }), 6);
  assert.deepEqual(s.archiveDb.prepare('SELECT reference,conversation_id,text FROM messages').get(), { reference: 'old-ref', conversation_id: 'old-uuid', text: 'texto' });
});

test('migração v5 conserva attachments/jobs e falha transacional preserva o banco anterior', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-migration-v5-'));
  t.after(() => rmSync(dir, { recursive: true }));
  const service = createService({ dataDir: dir });
  service.archive.ingestHistory({ messages: [item('v5', { message: { imageMessage: { url: 'https://mmg.whatsapp.net/file', mediaKey: Buffer.alloc(32) } } })] });
  const id = service.archive.readStoredMessage(item('v5').key)!.attachments[0]!.id;
  service.archiveDb.prepare("UPDATE media_jobs SET state='downloading',generation='old-generation',lease_until=12345,attempts=2 WHERE attachment_id=?").run(id);
  service.archiveDb.prepare("UPDATE attachments SET state='downloading',size=123,sha256='digest' WHERE id=?").run(id);
  await service.close();
  const db = new Database(join(dir, 'archive.sqlite'));
  db.pragma('foreign_keys=OFF');
  db.exec(`CREATE TABLE attachments_v5(id TEXT PRIMARY KEY,reference TEXT NOT NULL REFERENCES messages(reference),revision_id INTEGER NOT NULL REFERENCES revisions(id),type TEXT NOT NULL,name TEXT,mime_type TEXT,state TEXT NOT NULL,descriptor BLOB,reason TEXT,size INTEGER,sha256 TEXT,source_hash_verified INTEGER NOT NULL DEFAULT 0,UNIQUE(reference,revision_id));
    INSERT INTO attachments_v5 SELECT id,reference,revision_id,type,name,mime_type,state,descriptor,reason,size,sha256,source_hash_verified FROM attachments;
    DROP TABLE attachments; ALTER TABLE attachments_v5 RENAME TO attachments; PRAGMA user_version=5;`);
  const attachments = db.prepare('SELECT * FROM attachments').all(), jobs = db.prepare('SELECT * FROM media_jobs').all();
  db.exec('CREATE TABLE attachments_v6(injected TEXT)'); db.close();
  assert.throws(() => openArchive(dir), /already exists/);
  const failed = new Database(join(dir, 'archive.sqlite'));
  assert.equal(failed.pragma('user_version', { simple: true }), 5);
  assert.deepEqual(failed.prepare('SELECT * FROM attachments').all(), attachments);
  assert.deepEqual(failed.prepare('SELECT * FROM media_jobs').all(), jobs);
  failed.exec('DROP TABLE attachments_v6'); failed.close();
  const archive = openArchive(dir);
  try {
    assert.equal(archive.db.pragma('user_version', { simple: true }), 6);
    assert.equal(archive.db.pragma('foreign_keys', { simple: true }), 1);
    assert.deepEqual(archive.db.prepare('SELECT * FROM attachments').all(), attachments.map(a => ({ ...a as object, source_key: null })));
    assert.deepEqual(archive.db.prepare('SELECT * FROM media_jobs').all(), jobs);
    assert.deepEqual(archive.db.pragma('foreign_key_check'), []);
  } finally { archive.close(); }
});

import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { createService } from '../src/main.js';

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
  assert.equal(s.archiveDb.pragma('user_version', { simple: true }), 3);
  assert.deepEqual(s.archiveDb.prepare('SELECT reference,conversation_id,text FROM messages').get(), { reference: 'old-ref', conversation_id: 'old-uuid', text: 'texto' });
});

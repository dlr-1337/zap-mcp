import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../src/main.js';
const key = { remoteJid: '1@s.whatsapp.net', id: 'a', fromMe: false };
function fixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-revision-')); const s = createService({ dataDir: dir });
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); }); return { ...s, archive: (s as any).archive };
}
test('edit antes do original e replay antigo não regridem; revoke retém histórico', t => {
  const s = fixture(t), a = s.archive;
  a?.ingestUpdates([{ key, update: { message: { conversation: 'editado 🧪' }, messageTimestamp: 1700000020 } }]);
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 1);
  a.ingestHistory({ messages: [{ key, messageTimestamp: 1700000000, message: { conversation: 'original' } }] });
  assert.equal(a.readStoredMessage(key).text, 'editado 🧪');
  a.ingestUpdates([{ key, update: { message: null } }]);
  a.ingestUpdates([{ key, update: { message: null } }]);
  a.ingestHistory({ messages: [{ key, messageTimestamp: 1700000000, message: { conversation: 'original' } }] });
  const m = a.readStoredMessage(key); assert.equal(m.revoked, true); assert.equal(m.text, null);
  assert.equal(m.originalTimestamp, '2023-11-14T22:13:20.000Z');
  assert.equal(m.revisions.length, 3); assert.ok(m.revisions.some((r: any) => r.text === 'original'));
});
test('edições sem relógio confiável conservam conflito explícito', t => {
  const s = fixture(t), a = s.archive;
  a?.ingestUpsert({ type: 'notify', messages: [{ key, message: { conversation: 'original' } }] });
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 1);
  a.ingestUpdates([{ key, update: { message: { conversation: 'primeira' } } }, { key, update: { message: { conversation: 'segunda' } } }]);
  const m = a.readStoredMessage(key); assert.equal(m.orderUncertain, true); assert.equal(m.text, null); assert.equal(m.revisions.length, 3);
});
test('viewOnce bloqueado antes de normalizar, incluindo quote, key e mídia', t => {
  const s = fixture(t), a = s.archive;
  const bodies = [ { viewOnceMessage: { message: { imageMessage: { caption: 'PROIBIDO', mediaKey: Buffer.from('SECRET'), url: 'https://private' } } } }, { ephemeralMessage: { message: { viewOnceMessageV2: { message: { conversation: 'PROIBIDO' } } } } }, { viewOnceMessageV2Extension: { message: { conversation: 'PROIBIDO' } } }, { imageMessage: { viewOnce: true, caption: 'PROIBIDO' } } ];
  a?.ingestHistory({ messages: bodies.map((message, i) => ({ key: { ...key, id: String(i) }, message })) });
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 4);
  a.ingestHistory({ messages: [{ key: { ...key, id: 'key', isViewOnce: true }, message: { conversation: 'PROIBIDO' } }, { key: { ...key, id: 'quoted' }, message: { extendedTextMessage: { text: 'permitido', contextInfo: { quotedMessage: bodies[0], stanzaId: '0' } } } }] });
  for (const id of ['0', '1', '2', '3', 'key']) { assert.equal(a.readStoredMessage({ ...key, id }).text, null); assert.equal(a.readPrivateMessage({ ...key, id }), undefined); }
  const rows = s.archiveDb.prepare('SELECT * FROM revisions').all(); assert.equal(JSON.stringify(rows).includes('PROIBIDO'), false); assert.equal(JSON.stringify(rows).includes('SECRET'), false);
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM media_jobs').get() as any).n, 0);
  assert.equal(a.readStoredMessage({ ...key, id: 'quoted' }).quote.restricted, true);
});
test('temporária permitida conserva texto, expiração e update parcial desconhecido', t => {
  const s = fixture(t), a = s.archive;
  a?.ingestHistory({ messages: [{ key, messageTimestamp: 1700000000, message: { ephemeralMessage: { message: { extendedTextMessage: { text: 'temporária', contextInfo: { expiration: 60 } } } } } }] });
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM messages').get() as any).n, 1);
  a.ingestUpdates([{ key, update: { status: 3 } }]);
  const m = a.readStoredMessage(key); assert.equal(m.text, 'temporária'); assert.equal(m.expirationSeconds, 60);
});

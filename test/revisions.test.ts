import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../src/main.js';
import { proto, makeEventBuffer, type WAMessage } from '@whiskeysockets/baileys';
import processMessage from '@whiskeysockets/baileys/lib/Utils/process-message.js';
const key = { remoteJid: '1@s.whatsapp.net', id: 'a', fromMe: false };
function fixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-revision-')); const s = createService({ dataDir: dir });
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); }); return { ...s, archive: (s as any).archive };
}
async function protocolEvents(archive: ReturnType<typeof createService>['archive'], message: proto.IWebMessageInfo) {
  const wire = proto.WebMessageInfo.decode(proto.WebMessageInfo.encode(message).finish()) as WAMessage;
  const logger = { debug() {}, trace() {}, warn() {}, error() {}, info() {}, child() { return this; } };
  const ev = makeEventBuffer(logger as any), events: string[] = [];
  ev.on('messages.upsert', e => { events.push('upsert'); archive.ingestUpsert(e); });
  ev.on('messages.update', e => { events.push('update'); archive.ingestUpdates(e); });
  ev.buffer();
  try {
    ev.emit('messages.upsert', { messages: [wire], type: 'notify' });
    await processMessage(wire, { ev, creds: { me: { id: 'owner@s.whatsapp.net' } }, options: {}, shouldProcessHistoryMsg: false } as any);
  } finally { ev.flush(); }
  assert.deepEqual(events.sort(), ['update', 'upsert'], 'rc14 entrega os dois eventos reais');
}
test('rc14 upsert/update da mesma edição conserva uma alteração e precisão recebida', async t => {
  const s = fixture(t), a = s.archive;
  for (const ms of [1700000010000, 1700000010123]) {
    const target = { ...key, id: String(ms) };
    a.ingestUpsert({ type: 'notify', messages: [{ key: target, messageTimestamp: 1700000000, message: { conversation: 'antes' } }] });
    const edit = { key: { ...target, id: 'envelope-' + ms }, messageTimestamp: 1700000010,
      message: { protocolMessage: { type: 14, key: target, timestampMs: ms, editedMessage: { conversation: 'depois' } } } };
    await protocolEvents(a, edit); await protocolEvents(a, edit);
    const m = a.readStoredMessage(target)!;
    assert.equal(m.text, 'depois'); assert.equal(m.orderUncertain, false); assert.equal(m.revisions.length, 2);
    assert.equal(m.revisions.find((r: any) => r.kind === 'edit')!.sourceTimestamp, new Date(ms).toISOString());
    assert.deepEqual(a.readPrivateMessage(target)!.message, { conversation: 'depois' });
  }
  assert.equal(a.getCoverage().uniqueMessages, 2);
  assert.equal(a.getCoverage().batches.filter((b: any) => b.kind === 'update').length, 4, 'origens dos eventos continuam registradas');
});
test('update antes do protocolo conserva precisão; dois instantes precisos não são colapsados', t => {
  const s = fixture(t), a = s.archive;
  a.ingestUpdates([{ key, update: { message: { editedMessage: { message: { conversation: 'depois' } } }, messageTimestamp: 1700000010 } }]);
  const edit = (ms: number, text = 'depois') => ({ key: { ...key, id: 'envelope-' + ms }, message: { protocolMessage: { type: 14, key, timestampMs: ms, editedMessage: { conversation: text } } } });
  a.ingestHistory({ messages: [edit(1700000010123)] });
  assert.equal(a.readStoredMessage(key).revisions.length, 1);
  assert.equal(a.readStoredMessage(key).revisions[0].sourceTimestamp, '2023-11-14T22:13:30.123Z');
  a.ingestHistory({ messages: [edit(1700000010456), edit(1700000010123)] });
  assert.equal(a.readStoredMessage(key).revisions.length, 2);
  assert.equal(a.readStoredMessage(key).orderUncertain, false);
  a.ingestHistory({ messages: [edit(1700000010456, 'conflito real')] });
  assert.equal(a.readStoredMessage(key).orderUncertain, true);
  assert.equal(a.readStoredMessage(key).text, null);
});
test('protocolos rc14 usam perspectiva do envelope em recebidas, próprias e grupos, inclusive histórico', async t => {
  const s = fixture(t), a = s.archive;
  const cases = [
    { remoteJid: 'contact@s.whatsapp.net', fromMe: false },
    { remoteJid: 'contact@s.whatsapp.net', fromMe: true },
    { remoteJid: 'group@g.us', fromMe: false, participant: 'alice@s.whatsapp.net' },
    { remoteJid: 'group@g.us', fromMe: true, participant: 'owner@s.whatsapp.net' }
  ];
  for (const [i, perspective] of cases.entries()) for (const historical of [false, true]) {
    const target = { ...perspective, id: `${i}-${historical}` };
    a.ingestHistory({ messages: [{ key: target, messageTimestamp: 1700000000, message: { conversation: 'antes' } }] });
    const other = { ...target, participant: 'bob@s.whatsapp.net' };
    if (perspective.remoteJid.endsWith('@g.us')) a.ingestHistory({ messages: [{ key: other, message: { conversation: 'outra autoria' } }] });
    const protocolKey = { ...target, remoteJid: 'owner@s.whatsapp.net', fromMe: true, participant: 'bob@s.whatsapp.net' };
    const envelope = (type: number) => ({ key: { ...target, id: 'envelope-' + type + target.id }, messageTimestamp: 1700000010,
      message: { protocolMessage: { type, key: protocolKey, ...(type === 14 ? { timestampMs: 1700000010123, editedMessage: { conversation: 'depois' } } : {}) } } });
    const before = a.getCoverage().uniqueMessages;
    const dispatch = async (type: number) => { if (historical) a.ingestHistory({ messages: [proto.WebMessageInfo.decode(proto.WebMessageInfo.encode(envelope(type)).finish())] }); else await protocolEvents(a, envelope(type)); };
    await dispatch(14);
    const edited = a.readStoredMessage(target);
    assert.equal(edited.text, 'depois'); assert.equal(edited.fromMe, perspective.fromMe);
    assert.equal(edited.author, perspective.participant ?? (perspective.fromMe ? null : perspective.remoteJid));
    assert.equal(edited.revisions.length, 2); assert.equal(a.getCoverage().uniqueMessages, before);
    assert.equal(a.readStoredMessage(protocolKey), null, 'chave interna não cria mensagem fantasma');
    await dispatch(0);
    assert.equal(a.readStoredMessage(target).revoked, true); assert.equal(a.readStoredMessage(target).revisions.length, 3);
    assert.equal(a.getCoverage().uniqueMessages, before);
    if (perspective.remoteJid.endsWith('@g.us')) { assert.equal(a.readStoredMessage(other).text, 'outra autoria'); assert.equal(a.readStoredMessage(other).revoked, false); }
  }
});
test('protocolo sem alvo e alteração de grupo sem participante ficam falhos sem inventar identidade', t => {
  const s = fixture(t), a = s.archive;
  a.ingestHistory({ messages: [
    { key: { ...key, id: 'envelope' }, message: { protocolMessage: { type: 14, key: {}, editedMessage: { conversation: 'inválida' } } } },
    { key: { remoteJid: 'group@g.us', id: 'envelope', fromMe: false }, message: { protocolMessage: { type: 0, key: { id: 'target', participant: 'alice@s.whatsapp.net' } } } }
  ] });
  a.ingestUpdates([{ key: { remoteJid: 'group@g.us', id: 'target', fromMe: false }, update: { message: null } }]);
  assert.equal(a.getCoverage().uniqueMessages, 0);
  assert.equal(a.getCoverage().batches.reduce((n: number, b: any) => n + b.failed, 0), 3);
});
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

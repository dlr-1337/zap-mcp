import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../src/main.js';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { startMediaWorker } from '../src/media.js';
import { proto, makeEventBuffer, type WAMessage } from '@whiskeysockets/baileys';
import processMessage from '@whiskeysockets/baileys/lib/Utils/process-message.js';
const key = { remoteJid: '1@s.whatsapp.net', id: 'a', fromMe: false };
function fixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-revision-')); const s = createService({ dataDir: dir });
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); }); return { ...s, dir, archive: (s as any).archive };
}
test('originais no mesmo relógio com contexto de envelope diferente conservam texto e todas as revisões', t => {
  const { archive: a } = fixture(t);
  for (const [i, body] of [
    { conversation: 'texto recebido' },
    { extendedTextMessage: { text: 'texto recebido', contextInfo: { stanzaId: 'quote', participant: '2@s.whatsapp.net', quotedMessage: { conversation: 'citação recebida' }, expiration: 60 } } }
  ].entries()) {
    const target = { ...key, id: 'replay-text-' + i };
    const original = { key: target, messageTimestamp: 1700000000, message: { ...body, messageContextInfo: { messageSecret: Buffer.alloc(32, 1) } } };
    a.ingestHistory({ messages: [original] });
    const before = a.readStoredMessage(target);
    const captured = a.db.prepare('SELECT * FROM revisions WHERE reference=?').all(before.reference);
    assert.equal(before.orderUncertain, false); assert.equal(before.text, 'texto recebido');
    const replay = { ...original, message: { messageContextInfo: { threadId: Buffer.alloc(32, 2), messageSecret: Buffer.alloc(32, 3) }, ...body } };
    a.ingestUpsert({ type: 'append', messages: [replay] });
    const message = a.readStoredMessage(target);
    assert.equal(message.reference, before.reference); assert.equal(message.revisions.length, 2);
    assert.deepEqual(a.db.prepare('SELECT * FROM revisions WHERE reference=? ORDER BY id LIMIT 1').all(before.reference), captured);
    assert.equal(new Set(message.revisions.map((r: any) => r.sourceTimestamp)).size, 1);
    assert.deepEqual(a.db.prepare('SELECT DISTINCT evidence FROM revisions WHERE reference=?').all(before.reference), [{ evidence: JSON.stringify({ type: i ? 'extendedTextMessage' : 'conversation', text: 'texto recebido', restricted: false, quote: i ? { id: 'quote', author: '2@s.whatsapp.net', remoteJid: null, text: 'citação recebida', restricted: false, reference: null } : null, expirationSeconds: i ? 60 : null }) }]);
    assert.equal(message.orderUncertain, false, 'contexto do envelope não muda o corpo capturado');
    assert.equal(message.type, i ? 'extendedTextMessage' : 'conversation'); assert.equal(message.text, 'texto recebido');
    assert.deepEqual(a.readPrivateMessage(target)!.message, replay.message);
  }
});
test('replay original conserva referência, anexo disponível, bytes, revisão e job existentes', async t => {
  const { archive: a, dir } = fixture(t), bytes = Buffer.from('original sintético');
  for (const type of ['imageMessage', 'audioMessage']) {
    const target = { ...key, id: 'replay-' + type }, node = { url: 'https://mmg.whatsapp.net/original', mediaKey: Buffer.alloc(32, 1), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest(), caption: 'legenda recebida' };
    const original = { key: target, messageTimestamp: 1700000000, message: { [type]: node } };
    a.ingestHistory({ messages: [original] });
    const before = a.readStoredMessage(target), id = before.attachments[0].id;
    const worker = startMediaWorker({ archive: a, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) });
    await worker.drain(); await worker.stop();
    assert.equal(a.getAttachment(id)!.state, 'available');
    const revision = a.db.prepare('SELECT * FROM revisions WHERE reference=?').all(before.reference);
    const attachment = a.db.prepare('SELECT * FROM attachments WHERE id=?').get(id);
    const job = a.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(id);
    a.ingestUpsert({ type: 'append', messages: [{ ...original, message: { messageContextInfo: { messageSecret: Buffer.alloc(32, 2) }, [type]: Object.fromEntries(Object.entries(node).reverse()) } }] });
    const message = a.readStoredMessage(target);
    assert.equal(message.reference, before.reference); assert.equal(message.revisions.length, 2); assert.equal(message.attachments.length, 2);
    assert.deepEqual(a.db.prepare('SELECT * FROM revisions WHERE reference=? ORDER BY id LIMIT 1').all(before.reference), revision);
    assert.deepEqual(a.db.prepare('SELECT * FROM attachments WHERE id=?').get(id), attachment);
    assert.deepEqual(a.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(id), job);
    assert.deepEqual(readFileSync(join(dir, 'media', id + '.bin')), bytes);
    assert.equal(new Set(message.attachments.map((item: any) => item.id)).size, 2);
    assert.equal(message.attachments.every((item: any) => item.reference === before.reference), true);
    assert.equal(a.db.prepare('SELECT count(*) AS n FROM media_jobs WHERE attachment_id IN (SELECT id FROM attachments WHERE reference=?)').get(before.reference).n, 2);
    assert.equal(message.orderUncertain, false); assert.equal(message.type, type); assert.equal(message.text, 'legenda recebida');
    assert.deepEqual(a.readPrivateMessage(target)!.message[type], node);
    assert.deepEqual(a.db.pragma('foreign_key_check'), []);
  }
});
test('originais no mesmo relógio com corpo ou mídia diferentes mantêm conflito real', t => {
  const { archive: a } = fixture(t);
  const media = { caption: 'mesma legenda', url: 'https://mmg.whatsapp.net/original', mediaKey: Buffer.alloc(32, 1), fileSha256: Buffer.alloc(32, 2) };
  for (const [i, bodies] of [
    [{ conversation: 'primeiro corpo' }, { conversation: 'segundo corpo' }],
    [{ imageMessage: media }, { imageMessage: { ...media, fileSha256: Buffer.alloc(32, 3) } }]
  ].entries()) {
    const target = { ...key, id: 'conflict-' + i };
    a.ingestHistory({ messages: bodies.map(message => ({ key: target, messageTimestamp: 1700000000, message })) });
    const message = a.readStoredMessage(target);
    assert.equal(message.revisions.length, 2); assert.equal(message.orderUncertain, true); assert.equal(message.text, null);
    assert.equal(a.readPrivateMessage(target), undefined); assert.equal(message.attachments.length, i ? 2 : 0);
    if (i) assert.equal(new Set(a.db.prepare('SELECT evidence FROM revisions WHERE reference=?').all(message.reference).map((r: any) => r.evidence)).size, 1, 'mesma legenda não prova o mesmo original');
    a.ingestHistory({ messages: [{ key: target, messageTimestamp: 1700000001, message: { conversation: 'posterior' } }] });
    assert.equal(a.readStoredMessage(target).orderUncertain, false); assert.equal(a.readStoredMessage(target).text, 'posterior', 'relógio posterior continua prevalecendo');
  }
});
test('equivalência de envelope não elimina incerteza sem relógio confiável nem em edições', t => {
  const { archive: a } = fixture(t);
  for (const [i, kind] of ['original', 'edit'].entries()) {
    const target = { ...key, id: 'no-clock-' + i };
    const variants = [{ conversation: 'mesmo corpo' }, { conversation: 'mesmo corpo', messageContextInfo: { messageSecret: Buffer.alloc(32, 1) } }];
    if (kind === 'original') a.ingestHistory({ messages: variants.map(message => ({ key: target, message })) });
    else a.ingestUpdates(variants.map(message => ({ key: target, update: { message } })));
    const message = a.readStoredMessage(target);
    assert.equal(message.orderUncertain, true); assert.equal(message.text, null); assert.equal(message.revisions.length, 2);
    assert.equal(a.readPrivateMessage(target), undefined);
  }
});
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

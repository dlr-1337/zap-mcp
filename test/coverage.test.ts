import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { serialize, deserialize } from 'node:v8';
import { createService } from '../src/main.js';

test('HTTP cobertura distingue ausência, commits, intervalo original, replay e falhas', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-coverage-')); const s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  assert.equal((await fetch(base + '/api/status')).status, 401);
  const password = 'teste privado sintético'; await s.setPassword(password);
  const challenge = await fetch(base + '/api/session'); const { csrfToken } = await challenge.json();
  const login = await fetch(base + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken }) });
  const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0] };
  const read = async () => (await (await fetch(base + '/api/status', { headers })).json()).coverage;
  const empty = await read();
  assert.deepEqual(empty?.interval, { oldest: null, newest: null });
  assert.equal(empty.lastIngestion, null); assert.equal(empty.uniqueMessages, 0);
  const a = s.archive as any;
  a.ingestHistory({ messages: [], isLatest: true, syncType: 2 });
  const key = { remoteJid: '1@s.whatsapp.net', id: 'm', fromMe: false };
  const message = { key, messageTimestamp: 1700000000, message: { conversation: 'original' } };
  a.ingestHistory({ messages: [message], isLatest: true, syncType: 2 });
  a.ingestUpsert({ type: 'notify', messages: [message, { key: { ...key, id: 'unknown' } }] });
  a.ingestUpdates([{ key, update: { message: { conversation: 'editado' }, messageTimestamp: 1800000000 } }]);
  a.ingestHistoryStatus({ syncType: 2, status: 'complete', explicit: false });
  a.ingestHistoryStatus({ syncType: 2, status: 'complete', explicit: false });
  let c = await read();
  assert.deepEqual(c.interval, { oldest: '2023-11-14T22:13:20.000Z', newest: '2023-11-14T22:13:20.000Z' });
  assert.equal(c.uniqueMessages, 2); assert.equal(c.completeAccount, false); assert.ok(c.lastIngestion);
  assert.equal(c.batches[0].received, 0); assert.equal(c.batches[0].confirmed, 0);
  assert.equal(c.historyStatuses.length, 1); assert.equal(c.historyStatuses[0].explicit, false);
  const before = c.lastIngestion;
  s.archiveDb.exec("CREATE TRIGGER fail_message BEFORE INSERT ON messages BEGIN SELECT RAISE(ABORT,'sensitive/path'); END");
  a.ingestUpsert({ type: 'append', messages: [{ ...message, key: { ...key, id: 'bad' } }] });
  a.ingestHistoryStatus({ syncType: 2, status: 'complete', explicit: true });
  c = await read(); assert.equal(c.batches.at(-1).failed, 1); assert.equal(c.lastIngestion, before); assert.equal(JSON.stringify(c).includes('sensitive/path'), false);
  const list = await (await fetch(base + '/api/conversations', { headers })).json();
  const rows = await (await fetch(base + '/api/conversations/' + list.conversations[0].id + '/messages', { headers })).json();
  assert.equal(rows.messages[0].originalTimestamp, null); assert.equal(rows.messages[1].text, 'editado');
  assert.equal(rows.messages[1].key.id, 'm'); assert.equal(JSON.stringify(rows).includes('payload'), false);
});

test('watchdog 120s não confirma pendências; retomada usa recibo durável sanitizado', t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-resume-')); let s = createService({ dataDir: dir });
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); });
  const received = '2020-01-01T00:00:00.000Z';
  s.archiveDb.prepare('INSERT INTO batches(id,kind,received,received_at,metadata) VALUES(?,?,?,?,?)').run('interrupted', 'history', 1, received, '{}');
  s.archiveDb.prepare('INSERT INTO batch_items(batch_id,position,payload) VALUES(?,?,?)').run('interrupted', 0, serialize({ key: { id: 'a', remoteJid: '1@s.whatsapp.net' }, message: { conversation: 'durável' } }));
  const before = s.archive.getCoverage() as any;
  assert.equal(before.batches[0].stalled, true); assert.equal(before.batches[0].confirmed, 0); assert.equal(before.lastIngestion, null);
  s.close(); s = createService({ dataDir: dir });
  const after = s.archive.getCoverage() as any;
  assert.equal(after.batches[0].pending, 0); assert.equal(after.batches[0].confirmed, 1); assert.equal(after.uniqueMessages, 1);
});

test('alias tardio redireciona ambas referências e edições antigas não substituem nova', t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-alias-')); const s = createService({ dataDir: dir });
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); });
  const a = s.archive, pn = { remoteJid: '1@s.whatsapp.net', id: 'a', fromMe: false }, lid = { ...pn, remoteJid: '9@lid' };
  a.ingestHistory({ messages: [pn, lid].map(key => ({ key, messageTimestamp: 1700000000, message: { conversation: 'original' } })) });
  const refs = [a.readStoredMessage(pn)!.reference, a.readStoredMessage(lid)!.reference];
  a.ingestContacts({ lid: '9@lid', pn: '1@s.whatsapp.net' });
  assert.equal((a.getCoverage() as any).uniqueMessages, 1);
  for (const ref of refs) assert.equal(a.readStoredMessage(ref)!.reference, refs[0]);
  assert.equal(a.readStoredMessage(pn)!.orderUncertain, false);
  a.ingestUpdates([{ key: lid, update: { message: { conversation: 'nova' }, messageTimestamp: 1700000030 } }, { key: pn, update: { message: { conversation: 'velha' }, messageTimestamp: 1700000020 } }]);
  assert.equal(a.readStoredMessage(pn)!.text, 'nova');
});

test('recibos privados também excluem viewOnce de mensagem e citação', t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-receipt-')); const s = createService({ dataDir: dir });
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); });
  const secret = 'NUNCA PERSISTIR';
  s.archive.ingestHistory({ messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'a', isViewOnce: true }, message: { conversation: secret } }, { key: { remoteJid: '1@s.whatsapp.net', id: 'b' }, message: { extendedTextMessage: { text: 'normal', contextInfo: { quotedMessage: { viewOnceMessage: { message: { conversation: secret } } } } } } }] });
  for (const row of s.archiveDb.prepare('SELECT payload FROM batch_items UNION ALL SELECT payload FROM revisions WHERE payload IS NOT NULL').all() as { payload: Buffer }[]) assert.equal(JSON.stringify(deserialize(row.payload)).includes(secret), false);
});

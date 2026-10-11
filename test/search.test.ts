import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { openArchive } from '../src/archive.js';
import * as archiveModule from '../src/archive.js';
import { createHmac } from 'node:crypto';

export async function searchFixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-search-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`, password = 'senha sintética';
  await s.setPassword(password);
  const login = async () => {
    const c = await fetch(base + '/api/session'), d = await c.json();
    const r = await fetch(base + '/login', { method: 'POST', headers: { Cookie: c.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken: d.csrfToken }) });
    assert.equal(r.status, 200); return { Cookie: r.headers.get('set-cookie')!.split(';')[0] };
  };
  const headers = await login();
  const read = async (query = '') => { const r = await fetch(base + '/api/search' + query, { headers }); assert.equal(r.status, 200); return r.json(); };
  return { s, dir, base, headers, login, read };
}
const key = { remoteJid: '1@s.whatsapp.net', id: 'a', fromMe: false };

test('busca HTTP encontra termo literal em evidência congelada', async t => {
  const { s, read } = await searchFixture(t);
  const original = { key, privateEnvelope: 'PRIVATE_SENTINEL_NEVER_RETURN', messageTimestamp: 1700000000, message: { documentMessage: { caption: 'Orçamento café OR', fileName: 'proposta.pdf', mediaKey: Buffer.alloc(32), url: 'https://private/PRIVATE_SENTINEL_NEVER_RETURN' } } };
  s.archive.ingestHistory({ chats: [{ id: key.remoteJid, name: 'Homônimo' }], messages: [original] });
  s.archive.ingestUpsert({ type: 'append', messages: [original] });
  s.archive.ingestUpdates([{ key, update: { message: { conversation: 'contrato novo' }, messageTimestamp: 1700000020 } }]);
  const page = await read('?q=' + encodeURIComponent('"cafe" proposta OR'));
  assert.equal(page.messages.length, 1); assert.equal(page.messages[0].text, 'contrato novo');
  assert.equal(page.messages[0].matchingRevisions.length, 1);
  assert.equal(page.messages[0].matchingRevisions[0].historical, true);
  assert.equal(page.messages[0].matchingRevisions[0].kind, 'original');
  assert.equal(page.messages[0].matchingRevisions[0].revisionId, page.messages[0].attachments[0].revisionId);
  assert.match(page.messages[0].matchingRevisions[0].fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(page.messages[0].originalTimestamp, '2023-11-14T22:13:20.000Z');
  assert.doesNotMatch(JSON.stringify(page), /PRIVATE_SENTINEL|descriptor|payload|mediaKey|https:\/\//);
  assert.equal((await read('?q=orcamento%20novo')).messages.length, 0, 'não combina versões');
  s.archive.ingestUpdates([{ key, update: { message: null } }]);
  assert.equal((await read('?q=cafe')).messages[0].revoked, true);
  s.archive.ingestHistory({ messages: [{ key: { ...key, isViewOnce: true }, message: { conversation: 'proibido' } }] });
  assert.equal((await read('?q=cafe')).messages.length, 0, 'restrição elimina índice histórico');
});

test('mais de100 empates preservam sequência e DTOs após retroativo edição e merge', async t => {
  const { s, read } = await searchFixture(t);
  const messages = Array.from({ length: 105 }, (_, i) => ({ key: { ...key, remoteJid: 'other@lid', id: 'm' + i }, messageTimestamp: 1700000000, message: { conversation: 'encontrável' } }));
  s.archive.ingestHistory({ messages });
  s.archive.ingestHistory({ messages: [{ key: { ...key, id: 'unknown' }, message: { conversation: 'encontrável' } }] });
  const expected = (await read('?q=encontravel&limit=100')).messages;
  const first = await read('?q=encontravel&limit=50');
  assert.deepEqual(first.messages, expected.slice(0, 50));
  s.archive.ingestHistory({ messages: [{ key: { ...key, id: 'retro' }, messageTimestamp: 1699999999, message: { conversation: 'encontrável' } }] });
  s.archive.ingestUpdates([{ key: messages[0].key, update: { message: { conversation: 'mudou' }, messageTimestamp: 1700000010 } }]);
  s.archive.ingestContacts({ lid: 'other@lid', pn: key.remoteJid, name: 'mudou identidade' });
  let page = first, all = [...page.messages];
  while (page.nextCursor) { const next = await read('?q=encontravel&limit=50&cursor=' + encodeURIComponent(page.nextCursor)); assert.deepEqual(next, await read('?q=encontravel&limit=50&cursor=' + encodeURIComponent(page.nextCursor))); all.push(...next.messages); page = next; }
  assert.equal(all.length, 106); assert.equal(new Set(all.map(m => m.reference)).size, 106);
  assert.deepEqual(all.slice(0, 100), expected);
  assert.equal(all.at(-1).originalTimestamp, null);
  assert.deepEqual(all.slice(0, 105).map(m => m.reference), all.slice(0, 105).map(m => m.reference).sort().reverse());
  assert.notEqual((await read('?q=encontravel')).snapshotId, first.snapshotId);
});

test('baseline6 reabre derivados sem alterar entidades nem blobs', t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-baseline-')); t.after(() => rmSync(dir, { recursive: true }));
  let a = openArchive(dir); a.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { conversation: 'baseline café' } }] });
  const entities = ['messages', 'origins', 'revisions', 'attachments', 'batches'].map(name => a.db.prepare('SELECT * FROM ' + name).all());
  a.db.exec('DROP TABLE IF EXISTS query_items; DROP TABLE IF EXISTS query_snapshots; DROP TABLE IF EXISTS search_fts'); a.close();
  a = openArchive(dir);
  assert.equal(a.db.pragma('user_version', { simple: true }), 6);
  assert.deepEqual(['messages', 'origins', 'revisions', 'attachments', 'batches'].map(name => a.db.prepare('SELECT * FROM ' + name).all()), entities);
  assert.ok(a.db.prepare("SELECT name FROM sqlite_master WHERE name='search_fts'").get()); a.close();
});

test('dias inclusivos respeitam23h e25h', async t => {
  const { s, read } = await searchFixture(t);
  for (const [day, start, end, hours] of [['2018-11-04', '2018-11-04T03:00:00.000Z', '2018-11-05T02:00:00.000Z', 23], ['2019-02-16', '2019-02-16T02:00:00.000Z', '2019-02-17T03:00:00.000Z', 25]] as const) {
    for (const [i, ms] of [Date.parse(start) - 1, Date.parse(start), Date.parse(end) - 1, Date.parse(end)].entries()) s.writeMessage({ reference: day + '-' + i, conversationId: day + '@lid', conversationName: day, text: 'data', originalTimestamp: new Date(ms).toISOString() });
    const data = await read('?from=' + day + '&to=' + day);
    assert.deepEqual(data.messages.map((m: any) => m.reference).sort(), [day + '-1', day + '-2']);
    assert.equal(data.effectiveFilters.startUtc, start); assert.equal(data.effectiveFilters.endUtc, end); assert.equal(data.effectiveFilters.zone, 'America/Sao_Paulo');
    assert.equal((Date.parse(end) - Date.parse(start)) / 3600000, hours);
  }
  const parsePeriod = (archiveModule as any).parsePeriod; assert.equal(typeof parsePeriod, 'function');
  assert.equal(parsePeriod('2018-11-04', '2018-11-04').startUtc, '2018-11-04T03:00:00.000Z');
});

test('calendário estrito limites abertos original null e Date.max não viram ingestão', async t => {
  const { s, read, base, headers } = await searchFixture(t);
  s.archive.ingestHistory({ messages: [{ key, message: { conversation: 'sem relógio' } }, { key: { ...key, id: 'max' }, messageTimestamp: 8640000000000n, message: { conversation: 'Date max' } }, { key: { ...key, id: 'overflow' }, messageTimestamp: 8640000000001n, message: { conversation: 'overflow' } }] });
  assert.equal((await read()).messages.length, 3);
  const open = await read('?from=2018-11-04&to='); assert.equal(open.messages.length, 1); assert.equal(open.messages[0].originalTimestamp, '+275760-09-13T00:00:00.000Z');
  assert.match(open.effectiveFilters.dateUnknownPolicy, /exclu/);
  assert.equal((await read('?from=&to=2018-11-04')).messages.length, 0);
  assert.equal((await read('?from=&to=')).messages.filter((m: any) => m.originalTimestamp === null).length, 2);
  assert.equal((await read('?q=sem')).messages[0].originalTimestamp, null);
  for (const q of ['from=2018-11-05&to=2018-11-04', 'from=2026-02-30', 'to=2026-13-01', 'from=0000-01-01', 'from=٢٠٢٦-01-01', 'from=+002026-01-01', 'from=2026-1-01', 'from[]=2026-01-01', 'from=2026-01-01&from=2026-01-02']) assert.equal((await fetch(base + '/api/search?' + q, { headers })).status, 400, q);
  const parsePeriod = (archiveModule as any).parsePeriod;
  for (const value of [[], {}, 123, '2026-02-30', '0000-01-01']) assert.throws(() => parsePeriod(value, undefined));
  assert.equal(parsePeriod(null, '').startUtc, null); assert.ok(parsePeriod('0001-01-01', '9999-12-31').endUtc);
});

test('busca privada valida auth cursores limites termos literais homônimos e sentinelas', async t => {
  const { s, read, base, headers, login } = await searchFixture(t);
  const secret = 'PRIVATE_SENTINEL_NEVER_RETURN';
  s.archive.ingestHistory({ chats: [{ id: key.remoteJid, subject: 'Homônimo' }, { id: '2@g.us', subject: 'Homônimo' }], messages: [{ key, messageTimestamp: 123, privateEnvelope: secret, message: { documentMessage: { caption: 'café OR שלום <script>window.EXECUTED=1</script>', fileName: '../nome.pdf', mediaKey: Buffer.alloc(32), url: 'https://private/' + secret } } }, { key: { ...key, id: 'b' }, message: { conversation: 'café' } }] });
  const candidates = await (await fetch(base + '/api/conversations?q=Homônimo', { headers })).json();
  assert.equal(candidates.conversations.length, 2); assert.equal(new Set(candidates.conversations.map((c: any) => c.id)).size, 2);
  const first = await read('?q=cafe&limit=1'); assert.equal(first.messages.length, 1); assert.ok(first.nextCursor);
  assert.equal((await read('?q=' + encodeURIComponent('cafe OR'))).messages.length, 1);
  assert.equal((await read('?q=' + encodeURIComponent('cafe\u0301'))).messages.length, 2);
  assert.equal((await read('?q=' + encodeURIComponent('" OR 1=1 --'))).messages.length, 1, 'OR e 1 são termos presentes em uma evidência, não operadores que retornam todas');
  assert.doesNotMatch(JSON.stringify(first), /PRIVATE_SENTINEL|descriptor|payload|mediaKey|privateEnvelope|https:\/\//);
  const other = await login();
  assert.equal((await fetch(base + '/api/search?q=cafe&limit=1&cursor=' + encodeURIComponent(first.nextCursor), { headers: other })).status, 400);
  const paths = ['/api/search', '/api/conversations?q=Homônimo'];
  for (const cookie of ['', 'zap.sid=', 'zap.sid=invalid']) for (const path of paths) for (const method of ['GET', 'HEAD']) {
    const r = await fetch(base + path, { method, headers: { Cookie: cookie } }); assert.equal(r.status, 401); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.doesNotMatch(await r.text(), /café|Homônimo|PRIVATE_SENTINEL/);
  }
  const [body] = first.nextCursor.split('.'), parts = JSON.parse(Buffer.from(body, 'base64url').toString());
  const signingKey = (s.authDb.prepare("SELECT value FROM web_config WHERE key='signing-secret'").get() as any).value;
  for (const p of [[...parts.slice(0, 4), '-1'], [...parts.slice(0, 4), '9007199254740992'], [parts[0], parts[1], parts[2], 'before', parts[4]]]) {
    const b = Buffer.from(JSON.stringify(p)).toString('base64url'), cursor = b + '.' + createHmac('sha256', signingKey).update(b).digest('base64url');
    assert.equal((await fetch(base + '/api/search?q=cafe&cursor=' + cursor, { headers })).status, 400);
  }
  for (const query of ['limit=0', 'limit=101', 'limit=1.1', 'limit=9007199254740992', 'limit[]=1', 'limit=1&limit=2', 'q=one&q=two', 'extra=1', 'q=' + encodeURIComponent('!!!'), 'q=' + 'a'.repeat(2001), 'q=' + Array(26).fill('a').join('%20'), 'cursor=' + 'x'.repeat(1025), 'cursor=' + encodeURIComponent(first.nextCursor + 'x'), 'q=other&cursor=' + first.nextCursor]) assert.equal((await fetch(base + '/api/search?' + query, { headers })).status, 400, query.slice(0, 100));
  assert.equal((await fetch(base + '/api/search?conversationId=absent', { headers })).status, 404);
  for (const query of ['limit=1&limit=2', 'q=a&q=b', 'unknown=1']) assert.equal((await fetch(base + '/api/conversations?' + query, { headers })).status, 400);
  s.archiveDb.prepare('UPDATE query_snapshots SET expires_at=0 WHERE id=?').run(first.snapshotId);
  assert.equal((await fetch(base + '/api/search?q=cafe&cursor=' + first.nextCursor, { headers })).status, 410);
  s.authDb.exec('UPDATE web_sessions SET touched_at=0');
  for (const path of paths) for (const method of ['GET', 'HEAD']) assert.equal((await fetch(base + path, { method, headers })).status, 401);
  const fresh = await login(), session = await (await fetch(base + '/api/session', { headers: fresh })).json();
  await fetch(base + '/logout', { method: 'POST', headers: { ...fresh, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken: session.csrfToken }) });
  for (const path of paths) assert.equal((await fetch(base + path, { headers: fresh })).status, 401);
});

test('recortes recusam excesso sem truncar nem remover recortes válidos', async t => {
  const { s, base, headers, read } = await searchFixture(t);
  const id = s.writeMessage({ reference: 'single', conversationId: 'synthetic@lid', conversationName: null, text: 'single', originalTimestamp: '2026-01-01T00:00:00.000Z' });
  const first = await read(); for (let i = 1; i < 20; i++) await read();
  assert.equal((await fetch(base + '/api/search', { headers })).status, 429);
  assert.ok(s.archiveDb.prepare('SELECT id FROM query_snapshots WHERE id=?').get(first.snapshotId));
  s.archiveDb.exec('UPDATE query_snapshots SET expires_at=0'); assert.equal((await read()).messages.length, 1);
  const insert = s.archiveDb.prepare('INSERT INTO messages(reference,conversation_id,text) VALUES(?,?,?)');
  s.archiveDb.transaction(() => { for (let i = 0; i < 50000; i++) insert.run('bulk-' + i, id, 'bulk'); })();
  assert.equal((await fetch(base + '/api/search', { headers })).status, 413);
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM query_snapshots').get() as any).n, 1);
  s.archiveDb.prepare("DELETE FROM messages WHERE reference LIKE 'bulk-%'").run();
  s.archiveDb.prepare('UPDATE messages SET text=? WHERE reference=?').run('x'.repeat(64 * 1024 * 1024), 'single');
  assert.equal((await fetch(base + '/api/search', { headers })).status, 413);
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM query_snapshots').get() as any).n, 1);
});

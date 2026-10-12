import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { openArchive } from '../src/archive.js';
import { createHmac } from 'node:crypto';

async function contextFixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-context-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; await s.setPassword('sintética');
  const login = async () => {
    const r = await fetch(base + '/api/session'), session = await r.json();
    const logged = await fetch(base + '/login', { method: 'POST', headers: { Cookie: r.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'sintética', csrfToken: session.csrfToken }) });
    assert.equal(logged.status, 200); return { Cookie: logged.headers.get('set-cookie')!.split(';')[0] };
  };
  const headers = await login();
  const read = async (reference: string, query = '') => {
    // Synchronous seeds can outlive keep-alive; let expired socket timers run before reusing the pool.
    await setImmediate();
    const r = await fetch(base + '/api/context/' + reference + query, { headers }); assert.equal(r.status, 200); return r.json();
  };
  return { s, base, headers, login, read };
}
const key = { remoteJid: '1@lid', id: 'm0', fromMe: false };

test('resultado distante abre âncora congelada e vizinhas nos dois sentidos', async t => {
  const { s, read, base, headers } = await contextFixture(t);
  const messages = Array.from({ length: 181 }, (_, i) => ({ key: { ...key, id: 'm' + i }, messageTimestamp: 1700000000 + i, message: { conversation: 'mensagem ' + i } }));
  s.archive.ingestHistory({ messages });
  const ref = s.archive.readStoredMessage(messages[80].key)!.reference;
  const page = await read(ref); assert.equal(page.anchorReference, ref); assert.equal(page.messages.length, 51);
  assert.deepEqual(page.messages.map((m: any) => m.text), Array.from({ length: 51 }, (_, i) => 'mensagem ' + (55 + i)));
  s.archive.ingestHistory({ messages: [{ key: { ...key, id: 'retro' }, messageTimestamp: 1700000001, message: { conversation: 'retroativo' } }] });
  s.archive.ingestUpdates([{ key: messages[0].key, update: { message: { conversation: 'alterada' }, messageTimestamp: 1700000999 } }]);
  const all = [...page.messages];
  for (const direction of ['before', 'after']) {
    let cursor = direction === 'before' ? page.previousCursor : page.nextCursor;
    while (cursor) { const query = '?direction=' + direction + '&cursor=' + encodeURIComponent(cursor); const next = await read(ref, query); assert.deepEqual(next, await read(ref, query)); all.push(...next.messages); cursor = direction === 'before' ? next.previousCursor : next.nextCursor; }
  }
  assert.equal(all.length, 181); assert.equal(new Set(all.map(m => m.reference)).size, 181); assert.ok(all.some(m => m.text === 'mensagem 0')); assert.ok(!all.some(m => m.text === 'alterada' || m.text === 'retroativo'));
  assert.equal((await fetch(base + '/api/context/00000000-0000-0000-0000-000000000000', { headers })).status, 404);
});

test('contexto conserva correspondência histórica e resolve redirect recebido', async t => {
  const { s, read, base, headers } = await contextFixture(t);
  const a = { key, messageTimestamp: 123, message: { documentMessage: { caption: 'orçamento anterior', fileName: 'proposta.pdf', mediaKey: Buffer.alloc(32), url: 'https://private/PRIVATE_SENTINEL' } } };
  s.archive.ingestHistory({ messages: [a] });
  const source = await (await fetch(base + '/api/search?q=orcamento', { headers })).json(), old = source.messages[0].reference;
  s.archive.ingestHistory({ messages: [{ ...a, key: { ...key, remoteJid: '1@s.whatsapp.net' } }] });
  s.archive.ingestContacts({ lid: '1@lid', pn: '1@s.whatsapp.net' });
  s.archive.ingestUpdates([{ key, update: { message: { conversation: 'texto atual' }, messageTimestamp: 124 } }]);
  const page = await read(old, '?sourceSnapshotId=' + source.snapshotId);
  assert.equal(page.requestedReference, old); assert.equal(page.anchorReference, s.archive.readStoredMessage(key)!.reference);
  assert.equal(page.matchedEvidence[0].text, 'orçamento anterior'); assert.equal(page.matchedEvidence[0].historical, true);
  assert.equal(page.messages.find((m: any) => m.reference === page.anchorReference).text, 'texto atual');
  assert.ok(page.messages[0].attachments.length); assert.ok(page.messages[0].revisions.length);
  assert.doesNotMatch(JSON.stringify(page), /PRIVATE_SENTINEL|mediaKey|descriptor|payload|https:\/\//);
  for (const cookie of ['', 'zap.sid=invalid']) for (const method of ['GET', 'HEAD']) assert.equal((await fetch(base + '/api/context/' + old, { method, headers: { Cookie: cookie } })).status, 401, 'redirect antigo não evita autenticação');
});

test('expiração e reset eliminam snapshots privados além de recusar sessão velha', async t => {
  const { s, read, base, headers, login } = await contextFixture(t);
  s.archive.ingestHistory({ messages: [{ key, messageTimestamp: 123, message: { conversation: 'privado' } }] });
  const ref = s.archive.readStoredMessage(key)!.reference, page = await read(ref);
  const other = await login();
  assert.equal((await fetch(base + '/api/context/' + ref + '?sourceSnapshotId=' + page.snapshotId, { headers })).status, 400, 'contexto não é snapshot de busca');
  assert.equal((await fetch(base + '/api/context/' + ref + '?sourceSnapshotId=' + page.snapshotId, { headers: other })).status, 410, 'outra sessão não revela snapshot');
  s.authDb.exec('UPDATE web_sessions SET touched_at=0');
  assert.equal((await fetch(base + '/api/context/' + ref, { headers })).status, 401);
  assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM query_snapshots WHERE id=?').get(page.snapshotId) as any).n, 0, 'expiração purga derivados da sessão');
  const fresh = await login(); const r = await fetch(base + '/api/context/' + ref, { headers: fresh }); assert.equal(r.status, 200);
  await s.setPassword('nova sintética'); assert.equal((s.archiveDb.prepare('SELECT count(*) AS n FROM query_snapshots').get() as any).n, 0, 'reset purga todos recortes');
});

test('contexto valida escopo direção limites bordas empates desconhecidos e restart', async t => {
  const { s, read, base, headers, login } = await contextFixture(t);
  const messages = Array.from({ length: 106 }, (_, i) => ({ key: { ...key, id: 'same' + i }, messageTimestamp: 123, message: { conversation: 'empate' } }));
  s.archive.ingestHistory({ messages: [...messages, { key: { ...key, id: 'unknown' }, message: { conversation: 'sem relógio' } }] });
  const ordered = s.archiveDb.prepare('SELECT reference FROM messages ORDER BY original_ms(original_timestamp) IS NULL, original_ms(original_timestamp), reference COLLATE BINARY').all() as { reference: string }[];
  const first = await read(ordered[0].reference); assert.equal(first.previousCursor, null); assert.equal(first.messages.length, 26);
  assert.deepEqual(first.messages.map((m: any) => m.reference), ordered.slice(0, 26).map(m => m.reference));
  const last = await read(ordered.at(-1)!.reference); assert.equal(last.nextCursor, null); assert.equal(last.messages.at(-1).originalTimestamp, null);
  const cursor = first.nextCursor, ref = first.requestedReference, other = await login();
  for (const [query, status] of [['?direction=before&cursor=' + cursor, 400], ['?direction=after&cursor=' + cursor + 'x', 400], ['?direction=after', 400], ['?limit=0', 400], ['?limit=101', 400], ['?limit=1.5', 400], ['?limit=1&limit=2', 400], ['?direction[]=after', 400], ['?cursor=' + 'x'.repeat(1025), 400], ['?unknown=1', 400]] as const) assert.equal((await fetch(base + '/api/context/' + ref + query, { headers })).status, status, query);
  assert.equal((await fetch(base + '/api/context/' + ref + '?direction=after&cursor=' + cursor, { headers: other })).status, 400);
  const parts = JSON.parse(Buffer.from(cursor.split('.')[0], 'base64url').toString()), secret = (s.authDb.prepare("SELECT value FROM web_config WHERE key='signing-secret'").get() as any).value;
  for (const value of ['-1', '9007199254740992', '99999']) { const body = Buffer.from(JSON.stringify([...parts.slice(0, 4), value])).toString('base64url'), signed = body + '.' + createHmac('sha256', secret).update(body).digest('base64url'); assert.equal((await fetch(base + '/api/context/' + ref + '?direction=after&cursor=' + signed, { headers })).status, 400); }
  assert.equal((await fetch(base + '/api/context/' + last.requestedReference + '?direction=after&cursor=' + cursor, { headers })).status, 400);
  for (const invalid of ['%E2%80%AE', '..%2Fsecret', '%2Fetc%2Fpasswd']) assert.ok([400, 404].includes((await fetch(base + '/api/context/' + invalid, { headers })).status));
  const search = await (await fetch(base + '/api/search?q=empate', { headers })).json();
  const absentInSearch = ordered.at(-1)!.reference;
  assert.equal((await fetch(base + '/api/context/' + absentInSearch + '?sourceSnapshotId=' + search.snapshotId, { headers })).status, 400);
  s.archiveDb.prepare('UPDATE query_snapshots SET expires_at=0 WHERE id=?').run(first.snapshotId); assert.equal((await fetch(base + '/api/context/' + ref + '?direction=after&cursor=' + cursor, { headers })).status, 410);
  s.archive.ingestHistory({ messages: [{ key: { ...key, remoteJid: 'single@lid', id: 'one' }, message: { conversation: 'única' } }] });
  const one = await read(s.archive.readStoredMessage({ ...key, remoteJid: 'single@lid', id: 'one' })!.reference); assert.equal(one.messages.length, 1); assert.equal(one.previousCursor, null); assert.equal(one.nextCursor, null);
  const dir = mkdtempSync(join(tmpdir(), 'zap-context-restart-')); t.after(() => rmSync(dir, { recursive: true }));
  let archive = openArchive(dir); archive.ingestHistory({ messages: [messages[0]] }); const restartRef = archive.readStoredMessage(messages[0].key)!.reference;
  const saved = archive.openContext(restartRef, 'session'); archive.close(); archive = openArchive(dir);
  assert.throws(() => archive.readContextPage({ reference: restartRef, session: 'session', snapshotId: saved.snapshotId, ordinal: 0 }), /expirou/); assert.ok(archive.readStoredMessage(restartRef)); archive.close();
});

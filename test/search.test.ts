import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { openArchive } from '../src/archive.js';

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

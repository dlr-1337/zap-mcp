import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';

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
  const read = async (reference: string, query = '') => { const r = await fetch(base + '/api/context/' + reference + query, { headers }); assert.equal(r.status, 200); return r.json(); };
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
});

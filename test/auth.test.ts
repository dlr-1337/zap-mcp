import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import { createService } from '../src/main.js';

const password = 'senha sintética 🧪 com espaço ';
async function start(dataDir: string) {
  const service = createService({ dataDir });
  const server = service.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { ...service, base, async stop() { server.close(); await once(server, 'close'); service.close(); } };
}
async function form(base: string, cookie = '') {
  const response = await fetch(base + '/api/session', { headers: { Cookie: cookie } });
  const body = await response.json() as { csrfToken: string };
  return { token: body.csrfToken, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? cookie };
}
async function login(base: string, value = password, cookie = '') {
  const challenge = await form(base, cookie);
  const response = await fetch(base + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: challenge.cookie },
    body: JSON.stringify({ password: value, csrfToken: challenge.token })
  });
  return { response, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? challenge.cookie, oldCookie: challenge.cookie };
}

test('pilha Node24 importa Baileys, QR e SQLite transação/FTS5', async () => {
  assert.equal(process.versions.node.split('.')[0], '24');
  const baileys = await import('@whiskeysockets/baileys');
  assert.equal(typeof baileys.makeWASocket, 'function');
  assert.equal(typeof baileys.downloadContentFromMessage, 'function');
  assert.match(await QRCode.toDataURL('qr-sintetico-sem-conta'), /^data:image\/png;base64,/);
  const db = new Database(':memory:');
  try {
    db.exec('CREATE VIRTUAL TABLE fts USING fts5(text)');
    db.transaction(() => db.prepare('INSERT INTO fts(text) VALUES (?)').run('Olá'))();
    assert.throws(db.transaction(() => { db.prepare('INSERT INTO fts(text) VALUES (?)').run('rollback'); throw Error('fault'); }));
    assert.deepEqual(db.prepare('SELECT text FROM fts').all(), [{ text: 'Olá' }]);
  } finally { db.close(); }
});

test('autentica e reabre mensagem persistida', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-tracer-'));
  let service = await start(dir);
  try {
    assert.equal((await fetch(service.base + '/api/conversations')).status, 401, 'leitor anônimo deve ser recusado');
    await service.setPassword(password);
    const message = { reference: 'm-tracer', conversationId: 'c-tracer', conversationName: 'Conversa sintética', text: 'Orçamento sintético <script>alert(1)</script>', originalTimestamp: '2026-10-09T23:59:58.000Z' };
    service.writeMessage(message);
    const auth = await login(service.base);
    assert.equal(auth.response.status, 200);
    assert.notEqual(auth.cookie, auth.oldCookie);
    assert.match(auth.response.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(auth.response.headers.get('set-cookie')!, /SameSite=Strict/);
    const read = await fetch(service.base + '/api/conversations/c-tracer/messages', { headers: { Cookie: auth.cookie } });
    assert.equal(read.status, 200);
    const before = await read.json();
    assert.equal(before.messages[0].reference, message.reference);
    assert.equal(before.messages[0].text, message.text);
    assert.equal(before.messages[0].originalTimestamp, message.originalTimestamp);
    await service.stop();
    service = await start(dir);
    const after = await fetch(service.base + '/api/conversations/c-tracer/messages', { headers: { Cookie: auth.cookie } });
    assert.equal(after.status, 200);
    assert.deepEqual(await after.json(), before);
    assert.equal(statSync(dir).mode & 0o777, 0o700);
    for (const name of ['archive.sqlite', 'auth.sqlite']) assert.equal(statSync(join(dir, name)).mode & 0o777, 0o600);
    assert.equal((await fetch(service.base + '/auth.sqlite')).status, 404);
    assert.equal((await fetch(service.base + '/ingest', { method: 'POST' })).status, 404);
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

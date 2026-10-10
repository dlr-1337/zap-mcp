import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { spawnSync } from 'node:child_process';
import { get } from 'node:http';
import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import { createService } from '../src/main.js';
import { SQLiteStore } from '../src/auth.js';

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

test('logout duplo revoga sessão sem tocar acervo', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-logout-')); const service = await start(dir);
  try {
    await service.setPassword(password);
    service.writeMessage({ reference: 'm', conversationId: 'c', conversationName: null, text: 'preservar', originalTimestamp: '2026-10-10T00:00:00.000Z' });
    const auth = await login(service.base); const challenge = await form(service.base, auth.cookie);
    const request = () => fetch(service.base + '/logout', { method: 'POST', headers: { Cookie: auth.cookie, Origin: service.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken: challenge.token }) });
    const result = await request(); assert.equal(result.status, 200, 'logout deve destruir a sessão');
    assert.match(result.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/);
    assert.equal((await request()).status, 403);
    const reads = await Promise.all(Array.from({ length: 4 }, () => fetch(service.base + '/api/conversations/c/messages', { headers: { Cookie: auth.cookie } })));
    assert.ok(reads.every(r => r.status === 401));
    assert.equal((service.archiveDb.prepare('SELECT text FROM messages').get() as { text: string }).text, 'preservar');
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

test('login concorrente e cinco tentativas por janela são limitados', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-limits-')); let service = await start(dir);
  try {
    await service.setPassword(password);
    const challenges = await Promise.all(Array.from({ length: 6 }, () => form(service.base)));
    const results = await Promise.all(challenges.map(c => fetch(service.base + '/login', { method: 'POST', headers: { Cookie: c.cookie, Origin: service.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken: c.token }) })));
    assert.ok(results.filter(r => r.status === 200).length <= 2, 'no máximo duas derivações simultâneas');
    assert.ok(results.some(r => r.status === 429));
    for (const response of results.filter(r => r.status === 429)) assert.ok(Number(response.headers.get('Retry-After')) > 0);
    await service.stop(); service = await start(dir);
    for (let n = 0; n < 6; n++) {
      const r = await login(service.base, 'errada');
      if (n === 5) assert.equal(r.response.status, 429, 'janela persiste após restart');
    }
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

test('reset revoga IDs e preserva acervo e auth WhatsApp; Unicode exato', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-reset-')); const service = await start(dir);
  try {
    await service.setPassword(password);
    service.authDb.exec('CREATE TABLE whatsapp_fixture(value TEXT); INSERT INTO whatsapp_fixture VALUES (\'synthetic-state\')');
    service.writeMessage({ reference: 'm-reset', conversationId: 'c-reset', conversationName: null, text: 'intacto', originalTimestamp: '2026-10-10T00:00:00.000Z' });
    const before = service.archiveDb.prepare('SELECT * FROM messages').all();
    const first = await login(service.base); const second = await login(service.base, password, first.cookie);
    assert.equal(second.response.status, 200); assert.notEqual(second.cookie, first.cookie);
    assert.equal((await fetch(service.base + '/api/status', { headers: { Cookie: first.cookie } })).status, 401);
    await service.setPassword('é exato ');
    assert.equal((await fetch(service.base + '/api/status', { headers: { Cookie: second.cookie } })).status, 401);
    assert.equal((await login(service.base, 'e\u0301 exato ')).response.status, 401);
    assert.equal((await login(service.base, 'é exato')).response.status, 401);
    assert.equal((await login(service.base, 'é exato ')).response.status, 200);
    await assert.rejects(service.setPassword(''));
    assert.deepEqual(service.archiveDb.prepare('SELECT * FROM messages').all(), before);
    assert.deepEqual(service.authDb.prepare('SELECT * FROM whatsapp_fixture').all(), [{ value: 'synthetic-state' }]);
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

test('TTL idle/absoluto, Origin e CSRF são impostos pelo servidor', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-expiry-')); const service = await start(dir);
  try {
    await service.setPassword(password);
    const c = await form(service.base);
    for (const origin of ['', 'https://evil.example']) {
      const r = await fetch(service.base + '/login', { method: 'POST', headers: { Cookie: c.cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken: c.token }) }); assert.equal(r.status, 403);
    }
    const noToken = await fetch(service.base + '/login', { method: 'POST', headers: { Cookie: c.cookie, Origin: service.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); assert.equal(noToken.status, 403);
    const huge = await fetch(service.base + '/login', { method: 'POST', headers: { Origin: service.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'x'.repeat(5000) }) }); assert.equal(huge.status, 413);
    const auth = await login(service.base);
    service.authDb.prepare('UPDATE web_sessions SET touched_at = ?').run(Date.now() - 30 * 60_000);
    assert.equal((await fetch(service.base + '/api/status', { headers: { Cookie: auth.cookie } })).status, 401);
    const absolute = await login(service.base);
    const row = service.authDb.prepare("SELECT id, data FROM web_sessions WHERE json_extract(data, '$.owner') = 1").get() as { id: string; data: string };
    const data = JSON.parse(row.data); data.authenticatedAt = Date.now() - 8 * 60 * 60_000;
    service.authDb.prepare('UPDATE web_sessions SET data = ? WHERE id = ?').run(JSON.stringify(data), row.id);
    assert.equal((await fetch(service.base + '/api/status', { headers: { Cookie: absolute.cookie } })).status, 401);
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

test('revogação resiste a save tardio e reset durante login; logout falho não anuncia sucesso', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-races-')); const service = await start(dir);
  try {
    await service.setPassword(password);
    const auth = await login(service.base); const c = await form(service.base, auth.cookie);
    const row = service.authDb.prepare("SELECT id, data FROM web_sessions WHERE json_extract(data, '$.owner') = 1").get() as { id: string; data: string };
    service.authDb.exec("CREATE TRIGGER fail_logout BEFORE DELETE ON web_sessions BEGIN SELECT RAISE(ABORT, 'synthetic fault'); END");
    const logout = () => fetch(service.base + '/logout', { method: 'POST', headers: { Cookie: auth.cookie, Origin: service.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrfToken: c.token }) });
    assert.equal((await logout()).status, 500);
    service.authDb.exec('DROP TRIGGER fail_logout');
    assert.equal((await logout()).status, 200);
    const store = new SQLiteStore(service.authDb);
    await new Promise<void>((ok, fail) => store.set(row.id, JSON.parse(row.data), error => error ? fail(error) : ok()));
    assert.equal((await fetch(service.base + '/api/status', { headers: { Cookie: auth.cookie } })).status, 401);
    const challenge = await form(service.base);
    const reset = service.setPassword('nova senha');
    const request = fetch(service.base + '/login', { method: 'POST', headers: { Cookie: challenge.cookie, Origin: service.base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken: challenge.token }) });
    await reset; const late = await request;
    if (late.status === 200) assert.equal((await fetch(service.base + '/api/status', { headers: { Cookie: late.headers.get('set-cookie')!.split(';')[0] } })).status, 401);
    else assert.equal(late.status, 401);
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

test('owner-set exige serviço exclusivo e stdin; Host externo é recusado', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-owner-cli-')); let service = await start(dir);
  try {
    assert.throws(() => createService({ dataDir: dir }), /ativo/);
    const busy = spawnSync(process.execPath, ['dist/src/main.js', 'owner-set'], { env: { ...process.env, ZAP_DATA_DIR: dir }, input: 'sintética-cli\n', encoding: 'utf8' });
    assert.notEqual(busy.status, 0); assert.ok(!busy.stderr.includes('sintética-cli'));
    const externalHost = await new Promise<number | undefined>((ok, fail) => get(service.base + '/api/session', { headers: { Host: 'evil.example' } }, response => { response.resume(); ok(response.statusCode); }).on('error', fail));
    assert.equal(externalHost, 403);
    await service.stop();
    const set = spawnSync(process.execPath, ['dist/src/main.js', 'owner-set'], { env: { ...process.env, ZAP_DATA_DIR: dir }, input: 'sintética-cli\n', encoding: 'utf8' });
    assert.equal(set.status, 0); assert.equal(set.stdout, ''); assert.equal(set.stderr, '');
    service = await start(dir); assert.equal((await login(service.base, 'sintética-cli')).response.status, 200);
  } finally { await service.stop(); rmSync(dir, { recursive: true }); }
});

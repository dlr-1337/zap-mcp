import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';

const operationPath = '../src/operation.js';
async function operations() { const m = await import(operationPath).catch(() => null); assert.ok(m?.shutdownService, 'shutdown bounded must exist'); return m; }

test('close é idempotente e conserva owner sessão SQL e trava', async t => {
  const dataDir = mkdtempSync(join(tmpdir(), 'zap-operation-')); t.after(() => rmSync(dataDir, { recursive: true }));
  const s = createService({ dataDir }); createAuthState(s.authDb, { newProfile: true }); await s.setPassword('senha privada sintética');
  const owner = s.authDb.prepare('SELECT * FROM web_owner').all(), profile = s.authDb.prepare('SELECT * FROM whatsapp_profile').all();
  await s.close(); await assert.doesNotReject(async () => { await s.close(); });
  const next = createService({ dataDir }); assert.deepEqual(next.authDb.prepare('SELECT * FROM web_owner').all(), owner); assert.deepEqual(next.authDb.prepare('SELECT * FROM whatsapp_profile').all(), profile); await next.close();
  assert.equal(existsSync(join(dataDir, 'service.lock')), false);
});

test('shutdown aborta SSE aberto drena antes do fechamento e é limitado', async t => {
  const m = await operations(), controller = new AbortController(); let drains = 0;
  const server = createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('data: fixture\n\n'); }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const r = await fetch(`http://127.0.0.1:${(server.address() as any).port}`); await r.body!.getReader().read();
  const close = () => { drains++; assert.equal(controller.signal.aborted, true); return Promise.resolve(); };
  await m.shutdownService({ server, close, controller, timeoutMs: 1000 }); assert.equal(drains, 1); assert.equal(server.listening, false);
});

test('deadline deixa writer e trava intactos e aborta recursos', async t => {
  const m = await operations(), controller = new AbortController(); let finished = false;
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  await assert.rejects(m.shutdownService({ server, controller, timeoutMs: 1000, close: () => new Promise<void>(() => { finished = false; }) }), /prazo/);
  assert.equal(finished, false); assert.equal(controller.signal.aborted, true);
});

test('coletor inválido preserva consulta com diagnóstico privado', async t => {
  const dataDir = mkdtempSync(join(tmpdir(), 'zap-operation-')); t.after(() => rmSync(dataDir, { recursive: true }));
  const s = createService({ dataDir }); t.after(() => s.close());
  assert.equal(typeof (s as any).enableCollector, 'function', 'collector failure must keep archive available');
  await (s as any).enableCollector();
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise<void>(r => server.close(() => r())));
  assert.equal((await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/session`)).status, 200);
  assert.equal(s.archive.getCoverage().uniqueMessages, 0);
});

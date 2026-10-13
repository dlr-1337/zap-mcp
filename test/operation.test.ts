import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { createService, bindHost } from '../src/main.js';
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
  const dataDir = mkdtempSync(join(tmpdir(), 'zap-operation-'));
  const s = createService({ dataDir });
  assert.equal(typeof (s as any).enableCollector, 'function', 'collector failure must keep archive available');
  await (s as any).enableCollector();
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(async () => { await mShutdown(server, s); rmSync(dataDir, { recursive: true }); });
  assert.equal((await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/session`)).status, 200);
  assert.equal(s.archive.getCoverage().uniqueMessages, 0);
});
async function mShutdown(server: import('node:http').Server, s: ReturnType<typeof createService>) { const m = await operations(); await m.shutdownService({ server, close: () => s.close() }); }

test('bind Docker exige origem HTTPS canônica e peers IP explícitos', () => {
  assert.equal(bindHost(undefined, { mode: 'local' }), '127.0.0.1');
  assert.throws(() => bindHost('0.0.0.0', { mode: 'local' }));
  assert.throws(() => bindHost('0.0.0.0', { mode: 'proxy', publicOrigin: 'https://user:pass@example.test', trustedProxyPeers: ['127.0.0.1'] }));
  assert.equal(bindHost('0.0.0.0', { mode: 'proxy', publicOrigin: 'https://example.test', trustedProxyPeers: ['172.18.0.2'] }), '0.0.0.0');
});

test('SIGTERM duplo encerra CLI com conexão incompleta e reabre perfil intacto', async t => {
  const dataDir = mkdtempSync(join(tmpdir(), 'zap-signals-'));
  const s = createService({ dataDir }); createAuthState(s.authDb, { newProfile: true }); await s.setPassword('senha de reinício sintética');
  s.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'restart', fromMe: false }, messageTimestamp: 1700000000, message: { conversation: 'persistido' } }] });
  const before = s.authDb.prepare('SELECT * FROM web_owner').all(), session = s.authDb.prepare('SELECT * FROM whatsapp_profile').all(); await s.close();
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = (probe.address() as any).port; await new Promise<void>(r => probe.close(() => r()));
  const child = spawn(process.execPath, ['dist/src/main.js', 'serve', '--collect'], { env: { ...process.env, ZAP_DATA_DIR: dataDir, ZAP_PORT: String(port), ZAP_SHUTDOWN_MS: '1000' }, stdio: 'ignore' });
  t.after(() => { child.kill('SIGKILL'); rmSync(dataDir, { recursive: true }); });
  for (let i = 0; ; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/session`)).status === 200) break; } catch {} if (i === 100) throw Error('CLI não iniciou'); await new Promise(r => setTimeout(r, 20)); }
  const socket = connect(port, '127.0.0.1'); socket.on('error', () => {}); await once(socket, 'connect'); socket.write('POST /login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 999\r\n');
  const exit = once(child, 'exit'); child.kill('SIGTERM'); child.kill('SIGTERM'); const [code] = await Promise.race([exit, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(Error('shutdown preso')), 2500); timer.unref(); })]); socket.destroy(); assert.equal(code, 0);
  const next = createService({ dataDir }); try { assert.deepEqual(next.authDb.prepare('SELECT * FROM web_owner').all(), before); assert.deepEqual(next.authDb.prepare('SELECT * FROM whatsapp_profile').all(), session); assert.equal(next.archive.getCoverage().uniqueMessages, 1); } finally { await next.close(); }
});

import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer, request as httpsRequest } from 'node:https';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createService } from '../src/main.js';
import { startMediaWorker } from '../src/media.js';
import { createTransport, transportFromEnv } from '../src/transport.js';
import { rotateMcpToken } from '../src/mcp.js';
import Database from 'better-sqlite3';
import yauzl from 'yauzl';

const hostname = 'archive.example.test', password = 'senha somente da fixture';
type Reply = { status: number; headers: IncomingHttpHeaders; bytes: Buffer; json(): any };
async function fixture(t: TestContext, peers = ['127.0.0.1'], native = false, bytes = Buffer.from('ffd8ff' + '01'.repeat(512), 'hex')) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-transport-'));
  const cert = join(dir, 'cert.pem'), key = join(dir, 'key.pem');
  const publicName = native ? 'localhost' : hostname;
  const ssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${publicName}`, '-addext', `subjectAltName=DNS:${publicName}`], { stdio: 'ignore' });
  assert.equal(ssl.status, 0);
  let backendPort = 0, origin = '';
  let onUpstream: (() => void) | undefined;
  const proxy = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
    if (native) { s.app(req, res); return; }
    // A real TLS terminator overwrites client forwarding rather than appending it.
    const headers: IncomingHttpHeaders = { ...req.headers, host: new URL(origin).host, 'x-forwarded-proto': 'https' };
    delete headers['forwarded']; delete headers['x-forwarded-host']; delete headers['x-forwarded-for'];
    const upstream = httpRequest({ hostname: '127.0.0.1', port: backendPort, path: req.url, method: req.method, headers }, answer => {
      onUpstream?.(); res.writeHead(answer.statusCode!, answer.headers); answer.on('error', () => res.destroy()); answer.pipe(res); res.on('close', () => answer.destroy());
    });
    upstream.on('error', () => res.destroy()); req.pipe(upstream);
  });
  proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
  origin = `https://${publicName}:${(proxy.address() as AddressInfo).port}`;
  const transport = { mode: 'proxy' as const, publicOrigin: origin, trustedProxyPeers: peers };
  const s = createService({ dataDir: join(dir, 'data'), transport: native ? { mode: 'local' } : transport });
  const backend = s.app.listen(0, '127.0.0.1'); await once(backend, 'listening'); backendPort = (backend.address() as AddressInfo).port;
  t.after(async () => { proxy.closeAllConnections(); backend.closeAllConnections(); await Promise.all([new Promise<void>(ok => proxy.close(() => ok())), new Promise<void>(ok => backend.close(() => ok()))]); await s.close(); rmSync(dir, { recursive: true }); });
  await s.setPassword(password);
  const messageKey = { remoteJid: '1@s.whatsapp.net', id: 'fixture', fromMe: false };
  s.archive.ingestHistory({ messages: [{ key: messageKey, messageTimestamp: 1700000000, message: { imageMessage: { mimetype: 'image/jpeg', url: 'https://mmg.whatsapp.net/synthetic', mediaKey: Buffer.alloc(32), fileLength: bytes.length } } }] });
  const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dir, 'data', 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  const stored = s.archive.readStoredMessage(messageKey)!, id = stored.attachments[0]!.id;
  const call = (path: string, options: { method?: string; headers?: Record<string, string>; body?: unknown; ca?: Buffer; servername?: string } = {}) => new Promise<Reply>((ok, fail) => {
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const req = httpsRequest({ hostname: '127.0.0.1', port: (proxy.address() as AddressInfo).port, servername: options.servername ?? publicName, ca: options.ca ?? readFileSync(cert), path, method: options.method ?? 'GET', headers: { Host: new URL(origin).host, ...(body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } }, res => {
      const chunks: Buffer[] = []; res.on('data', c => chunks.push(c)); res.on('error', fail); res.on('end', () => { const bytes = Buffer.concat(chunks); ok({ status: res.statusCode!, headers: res.headers, bytes, json: () => JSON.parse(bytes.toString()) }); });
    }); req.on('error', fail); req.end(body);
  });
  const direct = (headers: string[]) => new Promise<Reply>((ok, fail) => {
    const req = httpRequest({ hostname: '127.0.0.1', port: backendPort, path: '/api/session', headers }, res => { const chunks: Buffer[] = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const bytes = Buffer.concat(chunks); ok({ status: res.statusCode!, headers: res.headers, bytes, json: () => JSON.parse(bytes.toString()) }); }); }); req.on('error', fail); req.end();
  });
  const login = async () => {
    const challenge = await call('/api/session'); assert.equal(challenge.status, 200, 'proxy HTTPS deve permitir challenge');
    const r = await call('/login', { method: 'POST', headers: { Origin: origin, Cookie: challenge.headers['set-cookie']![0].split(';')[0] }, body: { password, csrfToken: challenge.json().csrfToken } });
    assert.equal(r.status, 200, 'Origin HTTPS deve permitir login'); assert.match(r.headers['set-cookie']![0], /; Secure/);
    return r.headers['set-cookie']![0].split(';')[0];
  };
  return { s, dir, origin, call, direct, login, bytes, id, stored, setUpstreamHook: (hook: () => void) => { onUpstream = hook; } };
}

test('proxy TLS permite login Secure e original íntegro na mesma origem', async t => {
  const f = await fixture(t), owner = f.s.authDb.prepare('SELECT * FROM web_owner').all();
  const cookie = await f.login();
  for (const path of ['/api/status', '/api/qr', '/api/conversations', '/api/attachments/' + f.id, '/api/exports/period']) assert.equal((await f.call(path)).status, 401, path);
  const original = await f.call('/api/attachments/' + f.id, { headers: { Cookie: cookie } }); assert.equal(original.status, 200); assert.deepEqual(original.bytes, f.bytes);
  assert.equal(createHash('sha256').update(original.bytes).digest('hex'), createHash('sha256').update(f.bytes).digest('hex'));
  assert.deepEqual(f.s.authDb.prepare('SELECT * FROM web_owner').all(), owner);
  assert.equal((await f.call('/api/status', { headers: { Cookie: cookie } })).json().collectorEnabled, false);
});

test('backend exige peer conhecido e cabeçalhos canônicos únicos', async t => {
  const f = await fixture(t), host = new URL(f.origin).host;
  for (const headers of [
    ['Host', host], ['Host', host, 'X-Forwarded-Proto', 'http'], ['Host', 'hostile.example', 'X-Forwarded-Proto', 'https'],
    ['Host', host, 'X-Forwarded-Proto', 'https,http'], ['Host', host, 'X-Forwarded-Proto', 'https', 'X-Forwarded-Proto', 'https'],
    ['Host', host, 'Host', host, 'X-Forwarded-Proto', 'https'], ['Host', host, 'X-Forwarded-Proto', 'https', 'Forwarded', 'proto=https'],
    ['Host', host, 'X-Forwarded-Proto', 'https', 'X-Forwarded-Host', 'hostile.example'],
    ['Host', host, 'X-Forwarded-Proto', 'https', 'Origin', 'https://hostile.example'],
    ['Host', host, 'X-Forwarded-Proto', 'https', 'Origin', f.origin, 'Origin', f.origin]
  ]) { const r = await f.direct(headers); assert.equal(r.status, 403, JSON.stringify(headers)); assert.equal(r.headers['set-cookie'], undefined); assert.equal(r.bytes.includes('csrfToken'), false); }
  const untrusted = await fixture(t, ['127.0.0.2']); assert.equal((await untrusted.call('/api/session')).status, 403);
});

test('TLS recusa hostname divergente e CA falsa', async t => {
  const f = await fixture(t); await assert.rejects(f.call('/api/session', { servername: 'hostile.example' }), /Hostname\/IP|altnames/);
  await assert.rejects(f.call('/api/session', { ca: Buffer.alloc(0) }), /self-signed|certificate/);
});

test('configuração incompleta ou ambígua falha antes de abrir perfil', () => {
  assert.deepEqual(transportFromEnv({}), { mode: 'local' });
  for (const publicOrigin of ['http://archive.example.test', 'https://u:p@archive.example.test', 'https://archive.example.test/', 'https://archive.example.test/path', 'https://archive.example.test/?q=1', 'https://archive.example.test/#x', 'https://archive.example.test:443', ' https://archive.example.test']) {
    assert.throws(() => transportFromEnv({ ZAP_PUBLIC_ORIGIN: publicOrigin, ZAP_TRUSTED_PROXY_PEERS: '127.0.0.1' }));
  }
  for (const peers of ['', '*', 'loopback', '127.0.0.0/8', '127.0.0.1,', '127.0.0.1, 127.0.0.2', '127.0.0.1,::ffff:127.0.0.1']) assert.throws(() => transportFromEnv({ ZAP_PUBLIC_ORIGIN: 'https://archive.example.test', ZAP_TRUSTED_PROXY_PEERS: peers }));
  assert.throws(() => transportFromEnv({ ZAP_PUBLIC_ORIGIN: 'https://archive.example.test' }));
  assert.throws(() => transportFromEnv({ ZAP_TRUSTED_PROXY_PEERS: '127.0.0.1' }));
  const proxy = createTransport({ mode: 'proxy', publicOrigin: 'https://archive.example.test', trustedProxyPeers: ['127.0.0.1'] });
  assert.equal(proxy.trustProxy('::ffff:127.0.0.1', 0), true); assert.equal(proxy.trustProxy('127.0.0.1', 1), false);
  const dir = join(tmpdir(), 'zap-invalid-' + Date.now());
  const cli = spawnSync(process.execPath, ['dist/src/main.js', 'serve'], { encoding: 'utf8', env: { ...process.env, ZAP_DATA_DIR: dir, ZAP_PUBLIC_ORIGIN: 'http://invalid.example', ZAP_TRUSTED_PROXY_PEERS: '127.0.0.1' } });
  assert.equal(cli.status, 1); assert.equal(cli.stdout, ''); assert.equal(cli.stderr.includes('http://invalid.example'), false);
  assert.throws(() => readFileSync(join(dir, 'auth.sqlite')));
});

test('modo local recusa forwarding e preserva HTTP e TLS nativo', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-local-')), s = createService({ dataDir: dir });
  const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(ok => server.close(() => ok())); await s.close(); rmSync(dir, { recursive: true }); });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  assert.equal((await fetch(origin + '/api/session')).status, 200);
  for (const headers of [{ 'X-Forwarded-Proto': 'https' }, { Forwarded: 'proto=https' }, { 'X-Forwarded-For': '127.0.0.1' }] as Record<string, string>[]) assert.equal((await fetch(origin + '/api/session', { headers })).status, 403);
  const native = await fixture(t, ['127.0.0.1'], true), cookie = await native.login();
  assert.equal((await native.call('/api/status', { headers: { Cookie: cookie } })).status, 200);
});

test('revogação durante stream TLS interrompe bytes mantendo original', async t => {
  const f = await fixture(t, ['127.0.0.1'], false, Buffer.alloc(8 * 1024 * 1024, 1));
  rotateMcpToken(f.s.authDb, join(f.dir, 'token'));
  const token = readFileSync(join(f.dir, 'token'), 'utf8').trim(); let rotated = false;
  f.setUpstreamHook(() => { if (!rotated) { rotated = true; rotateMcpToken(f.s.authDb, join(f.dir, 'rotated')); } });
  await assert.rejects(f.call('/mcp/attachments/' + f.id, { headers: { Authorization: 'Bearer ' + token } }));
  assert.equal(rotated, true); assert.deepEqual(readFileSync(join(f.dir, 'data', 'media', f.id + '.bin')), f.bytes);
});

test('MCP negocia e publica somente URL canônica HTTPS atrás do proxy', async t => {
  const f = await fixture(t); rotateMcpToken(f.s.authDb, join(f.dir, 'token'));
  const token = readFileSync(join(f.dir, 'token'), 'utf8').trim(), headers = { Authorization: 'Bearer ' + token, Accept: 'application/json, text/event-stream', Origin: f.origin };
  const rpc = async (method: string, params: unknown) => {
    const r = await f.call('/mcp', { method: 'POST', headers, body: { jsonrpc: '2.0', id: 1, method, params } });
    assert.equal(r.status, 200, 'MCP com Origin canônica deve negociar por HTTPS');
    const raw = r.bytes.toString(); return JSON.parse(raw.startsWith('event:') ? raw.split('data: ')[1].split('\n')[0] : raw);
  };
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'synthetic-transport', version: '1' } }); assert.equal(init.result.protocolVersion, '2025-06-18');
  const attachment = await rpc('tools/call', { name: 'get_attachment', arguments: { attachmentId: f.id, preference: 'download' } });
  assert.equal(attachment.result.structuredContent.downloadUrl, f.origin + '/mcp/attachments/' + f.id);
  const original = await f.call('/mcp/attachments/' + f.id, { headers }); assert.equal(original.status, 200); assert.deepEqual(original.bytes, f.bytes);
  const head = await f.call('/mcp/attachments/' + f.id, { method: 'HEAD', headers }); assert.equal(head.status, 200); assert.equal(Number(head.headers['content-length']), f.bytes.length); assert.equal(head.bytes.length, 0);
  const range = await f.call('/mcp/attachments/' + f.id, { headers: { ...headers, Range: 'bytes=2-12' } }); assert.equal(range.status, 206); assert.deepEqual(range.bytes, f.bytes.subarray(2, 13));
  const cookie = await f.login();
  for (const path of ['/mcp', '/mcp/attachments/' + f.id]) for (const bad of [{}, { Cookie: cookie }, { Authorization: 'Bearer invalid' }] as Record<string, string>[]) assert.equal((await f.call(path, { method: path === '/mcp' ? 'POST' : 'GET', headers: bad, body: path === '/mcp' ? {} : undefined })).status, 401);
  assert.equal((await f.call('/mcp/attachments/' + f.id, { headers: { ...headers, Origin: 'https://hostile.example' } })).status, 403);
  assert.equal((await f.call('/mcp/attachments/' + f.id, { headers: { Authorization: headers.Authorization } })).status, 200, 'cliente bearer sem Origin');
  assert.equal((await f.call('/api/attachments/' + f.id, { headers })).status, 401, 'bearer não autentica web');
  rotateMcpToken(f.s.authDb, join(f.dir, 'rotated-token'));
  assert.equal((await f.call('/mcp/attachments/' + f.id, { headers })).status, 401);
  assert.equal((await f.call('/api/status', { headers: { Cookie: cookie } })).status, 200, 'rotação MCP preserva owner');
});

test('CSRF, ZIP, Range e logout Secure preservam fronteira web HTTPS', async t => {
  const f = await fixture(t), cookie = await f.login(), headers = { Cookie: cookie, Origin: f.origin };
  const csrfToken = (await f.call('/api/session', { headers })).json().csrfToken;
  const selection = { conversationId: f.stored.conversationId, from: '', to: '', csrfToken };
  for (const path of ['/login', '/logout', '/api/exports']) {
    assert.equal((await f.call(path, { method: 'POST', headers, body: { ...selection, password, csrfToken: 'invalid' } })).status, 403);
    assert.equal((await f.call(path, { method: 'POST', headers: { Cookie: cookie, Origin: 'https://hostile.example' }, body: selection })).status, 403);
    assert.equal((await f.call(path, { method: 'POST', headers: { Cookie: cookie }, body: selection })).status, 403);
  }
  const db = new Database(join(f.dir, 'data', 'exports', 'jobs.sqlite'), { readonly: true });
  assert.equal((db.prepare('SELECT count(*) AS n FROM jobs').get() as { n: number }).n, 0); db.close();
  const job = await f.call('/api/exports', { method: 'POST', headers, body: selection }); assert.equal(job.status, 202); const jobId = job.json().jobId;
  let state = '';
  for (let i = 0; i < 100; i++) { state = (await f.call('/api/exports/' + jobId, { headers })).json().state; if (state !== 'preparing') break; await new Promise(ok => setTimeout(ok, 5)); }
  assert.equal(state, 'ready');
  const zip = await f.call('/api/exports/' + jobId + '/download', { headers }); assert.equal(zip.status, 200); assert.match(zip.headers['content-type']!, /application\/zip/);
  const z = await new Promise<yauzl.ZipFile>((ok, fail) => yauzl.fromBuffer(zip.bytes, { lazyEntries: true, validateEntrySizes: true }, (e, file) => e ? fail(e) : ok(file!)));
  const files: Buffer[] = [];
  await new Promise<void>((ok, fail) => { z.on('error', fail); z.on('end', ok); z.on('entry', entry => { z.openReadStream(entry, (error, stream) => { if (error) { fail(error); return; } const chunks: Buffer[] = []; stream!.on('data', c => chunks.push(c)); stream!.on('error', fail); stream!.on('end', () => { files.push(Buffer.concat(chunks)); z.readEntry(); }); }); }); z.readEntry(); });
  assert.ok(files.some(bytes => bytes.equals(f.bytes)), 'ZIP contém original recebido');
  assert.equal((await f.call('/api/exports/' + jobId + '/download')).status, 401);
  const range = await f.call('/api/attachments/' + f.id, { headers: { ...headers, Range: 'bytes=2-12' } }); assert.equal(range.status, 206); assert.deepEqual(range.bytes, f.bytes.subarray(2, 13));
  const logout = await f.call('/logout', { method: 'POST', headers, body: { csrfToken } }); assert.equal(logout.status, 200); assert.match(logout.headers['set-cookie']![0], /; Secure/); assert.match(logout.headers['set-cookie']![0], /Expires=Thu, 01 Jan 1970/);
  assert.equal((await f.call('/api/status', { headers: { Cookie: cookie } })).status, 401);
  const expired = await f.login(); f.s.authDb.prepare('UPDATE web_sessions SET touched_at=0').run(); assert.equal((await f.call('/api/status', { headers: { Cookie: expired } })).status, 401);
});

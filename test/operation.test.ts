import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
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

async function operationFixture(t: { after(fn: () => unknown): void }) {
  const base = mkdtempSync(join(tmpdir(), 'zap-coordination-')), dataDir = join(base, 'source'), operationDir = join(base, 'operations'); mkdirSync(operationDir, { mode: 0o700 });
  t.after(() => rmSync(base, { recursive: true })); const s = createService({ dataDir }); createAuthState(s.authDb, { newProfile: true }); await s.setPassword('senha backup fixture'); await s.close();
  const events: string[] = []; let running = true;
  const controller = { async stop() { events.push('stop'); running = false; }, async start(mode: string) { events.push('start:' + mode); running = true; }, async inspect() { return { running, autostart: false, pid: running ? process.pid : 0, startTime: running ? 'fixture' : null, machineId: 'fixture', profileProcesses: running ? 1 : 0, mode: 'offline' }; } };
  return { base, config: { dataDir, operationDir, destination: join(base, 'snapshot'), priorMode: 'offline', priorRelease: 'fixture', supervisor: { kind: 'systemd', name: 'fixture.service', dataDir, machineId: '0'.repeat(32) } }, controller, events };
}

test('snapshot coordenado retoma antes da rede e serializa operações', async t => {
  const m = await operations(), f = await operationFixture(t); assert.equal(typeof m.coordinatedSnapshot, 'function', 'stop snapshot resume must exist');
  await m.coordinatedSnapshot(f.config, { controller: f.controller, fault: async (stage: string) => { if (stage === 'stopped') await assert.rejects(m.coordinatedSnapshot(f.config, { controller: f.controller }), /ativo|operação/); }, transfer: async () => { f.events.push('network'); assert.equal((await f.controller.inspect()).running, true); } });
  assert.deepEqual(f.events, ['stop', 'start:offline', 'network']); assert.equal(existsSync(join(f.config.destination, 'manifest.json')), true);
});

test('snapshot falho ou stop ambíguo retoma consulta sem publicar backup', async t => {
  const m = await operations(), f = await operationFixture(t); assert.equal(typeof m.coordinatedSnapshot, 'function', 'snapshot failures must resume');
  await assert.rejects(m.coordinatedSnapshot(f.config, { controller: f.controller, fault: (stage: string) => { if (stage === 'stopped') throw Object.assign(Error('ENOSPC'), { code: 'ENOSPC' }); } }), /ENOSPC/);
  assert.equal((await f.controller.inspect()).running, true); assert.equal(existsSync(f.config.destination), false);
  const broken = { ...f.controller, async stop() { throw Error('stop denied'); } };
  await assert.rejects(m.coordinatedSnapshot(f.config, { controller: broken }), /stop denied/); assert.equal(existsSync(f.config.destination), false);
});

test('SIGKILL em cada estágio de snapshot exige recovery com mutex órfão', async t => {
  const m = await operations();
  for (const point of ['intended', 'stopped', 'snapshotted', 'resumed']) {
    const f = await operationFixture(t), state = join(f.base, 'state.json'); writeFileSync(state, 'true', { mode: 0o600 });
    const source = `import{coordinatedSnapshot}from'./dist/src/operation.js';import{readFileSync,writeFileSync}from'node:fs';const config=JSON.parse(process.env.CONFIG);const path=process.env.STATE;const controller={async stop(){writeFileSync(path,'false')},async start(){writeFileSync(path,'true')},async inspect(){const running=JSON.parse(readFileSync(path));return{running,autostart:false,pid:running?process.pid:0,startTime:null,machineId:'fixture',profileProcesses:running?1:0,mode:'offline'}}};await coordinatedSnapshot(config,{controller,fault:async p=>{if(p===process.env.POINT){console.log('ready');await new Promise(()=>{setInterval(()=>{},1000)})}}});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, CONFIG: JSON.stringify(f.config), POINT: point, STATE: state }, stdio: ['ignore', 'pipe', 'pipe'] }); t.after(() => child.kill('SIGKILL'));
    await new Promise<void>((accept, reject) => { const timer = setTimeout(() => reject(Error('crash fixture timeout')), 5000); child.stdout.on('data', b => { if (String(b).includes('ready')) { clearTimeout(timer); accept(); } }); child.once('exit', c => { clearTimeout(timer); reject(Error('crash fixture exited ' + c)); }); });
    const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit;
    const controller = { ...f.controller, async start(mode: string) { await f.controller.start(mode); writeFileSync(state, 'true'); }, async inspect() { const running = JSON.parse(readFileSync(state, 'utf8')); return { ...(await f.controller.inspect()), running, pid: running ? process.pid : 0, profileProcesses: running ? 1 : 0 }; } };
    await assert.rejects(m.coordinatedSnapshot(f.config, { controller }), /interrompida/);
    assert.equal((await m.recoverOperation(f.config, { controller })).recovered, true); assert.equal(readFileSync(state, 'utf8'), 'true');
    const reopened = createService({ dataDir: f.config.dataDir }); assert.equal((reopened.authDb.prepare('SELECT count(*) n FROM web_owner').get() as { n: number }).n, 1); await reopened.close();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:https';
import { createServer as portProbe } from 'node:net';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
import { startMediaWorker } from '../src/media.js';
import { createSnapshot, restoreSnapshot } from '../src/backup.js';
import { promoteProfile, assertPromotionAuthorization } from '../src/promotion.js';
import { assertSupervisorFacts } from '../src/operation.js';

const driver = '../../scripts/phase4-deploy.mjs';
async function load() {
  const module = await import(driver).catch(() => null);
  assert.equal(typeof module?.selfTest, 'function', 'release offline HTTPS/update/recovery deve existir');
  return module;
}
test('release offline HTTPS troca código e recupera falha sem perder registros recentes', async () => {
  const m = await load(), result = await m.selfTest();
  assert.equal(result.passed, true);
  for (const fact of ['tls', 'login', 'original', 'owner', 'session', 'persistentData', 'recentRecord', 'rollback', 'restart', 'offline', 'faultBeforeSwap', 'faultAfterSwap']) assert.equal(result[fact], true, fact);
});
test('preflight ausente bloqueia antes de stop e não aceita readiness salvo', async t => {
  const m = await load(), dir = mkdtempSync(join(tmpdir(), 'zap-deploy-gate-'));
  t.after(() => rmSync(dir, { recursive: true }));
  let stopped = false;
  await assert.rejects(m.runDeployment('update', { configFile: '', evidenceDir: dir, controller: { stop: async () => { stopped = true; } } }), /configuration|environment|config/i);
  assert.equal(stopped, false);
});
test('helper conta PID único e recusa root, PID isolado, portas públicas e bind divergente', async () => {
  const path = '../../ops/zap-container-control.mjs', m = await import(path).catch(() => null);
  assert.equal(typeof m?.inspectContainers, 'function', 'helper restrito e fatos deduplicados devem existir');
  const config = { uid: 12001, machineId: 'a'.repeat(32), dataDir: '/srv/private/zap', appLabel: 'fixture', releases: ['b'.repeat(40)] };
  const container = { Id: 'c'.repeat(64), Name: '/fixture-current', Config: { User: '12001:12001', Cmd: ['node', 'dist/src/main.js', 'serve'], Env: ['ZAP_DATA_DIR=' + config.dataDir], Labels: { 'zap.archive': 'fixture', 'zap.release': 'b'.repeat(40) } }, HostConfig: { PidMode: 'host', Privileged: false, RestartPolicy: { Name: 'no' }, PortBindings: {}, Binds: [] }, Mounts: [{ Source: config.dataDir, Destination: config.dataDir, RW: true }], State: { Running: true, Status: 'running', Pid: 412, StartedAt: 'now' } };
  assert.equal(m.inspectContainers(config, [container], [412]).profileProcesses, 1);
  assert.throws(() => m.inspectContainers(config, [container], [412, 413]));
  for (const mutate of [
    (c: any) => { c.Config.User = '0'; },
    (c: any) => { c.HostConfig.PidMode = ''; },
    (c: any) => { c.HostConfig.PortBindings = { '3000/tcp': [{ HostPort: '3000' }] }; },
    (c: any) => { c.Mounts[0].Destination = '/other'; },
    (c: any) => { c.Mounts.push({ Source: '/var/run/docker.sock', Destination: '/var/run/docker.sock', RW: true }); }
  ]) { const altered = structuredClone(container); mutate(altered); assert.throws(() => m.inspectContainers(config, [altered], [412])); }
  assert.throws(() => m.inspectContainers(config, [container, { ...structuredClone(container), Id: 'd'.repeat(64), State: { ...container.State, Pid: 413 } }], [412, 413]));
});

test('falha no backup ou gate atual impede qualquer troca de código', async t => {
  const m = await load(), dir = mkdtempSync(join(tmpdir(), 'zap-deploy-before-stop-')); t.after(() => rmSync(dir, { recursive: true }));
  let mutations = 0;
  const controller = { inspect: async () => ({ running: true, profileProcesses: 1, mode: 'offline' }), stop: async () => { mutations++; }, activate: async () => { mutations++; } };
  for (const missing of ['ready', 'backup']) {
    const options = { controller, ready: async () => { if (missing === 'ready') throw Error('live gate absent'); }, backup: async () => { if (missing === 'backup') throw Error('independent backup absent'); } };
    await assert.rejects(m.swapRelease({ operationDir: dir }, options), /absent/); assert.equal(mutations, 0);
  }
});

async function recoveryFixture(t: { after(fn: () => unknown): void }, stage = 'stopped', listener = true, originalSize = 0, unavailableChallenges = 0) {
  const m = await load(), base = mkdtempSync(join(tmpdir(), 'zap-deploy-recovery-'));
  const operationDir = join(base, 'operations'), evidenceDir = join(base, 'evidence'), dataDir = join(base, 'data');
  for (const p of [operationDir, evidenceDir]) mkdirSync(p, { mode: 0o700 });
  const original = createService({ dataDir }); createAuthState(original.authDb, { newProfile: true }); await original.setPassword('fixture recovery password');
  original.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'recent', fromMe: false }, messageTimestamp: 1700000000, message: { conversation: 'recent record survives code recovery' } }] });
  if (originalSize) {
    const chunk = Buffer.alloc(64 * 1024, 0x61), hash = createHash('sha256');
    function* bytes() { for (let remaining = originalSize; remaining > 0; remaining -= chunk.length) yield chunk.subarray(0, Math.min(remaining, chunk.length)); }
    for (const part of bytes()) hash.update(part);
    original.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'large', fromMe: false }, messageTimestamp: 1700000000, message: { documentMessage: { url: 'https://mmg.whatsapp.net/fixture', mediaKey: Buffer.alloc(32), fileLength: originalSize, fileSha256: hash.digest(), fileName: 'large.bin' } } }] });
    const worker = startMediaWorker({ archive: original.archive, mediaDir: join(dataDir, 'media'), downloadOriginal: async () => Readable.from(bytes()) }); await worker.drain(); await worker.stop();
  }
  await original.close();
  const baseline = m.profileState(dataDir), probe = portProbe(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = (probe.address() as any).port; await new Promise<void>(yes => probe.close(() => yes()));
  const origin = 'https://localhost:' + port, cert = join(base, 'cert'), key = join(base, 'key');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
  const A = 'a'.repeat(40), B = 'b'.repeat(40), machineId = 'a'.repeat(32), helperPath = '/usr/local/libexec/fixture';
  const file = (name: string, value: unknown) => { const path = join(base, name); writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value), { mode: 0o600 }); return path; };
  const identityFile = file('identity', 'synthetic'), knownHostsFile = file('known', 'synthetic');
  const target = { kind: 'ssh', host: 'fixture.invalid', user: 'owner', machineId, dataDir, appRoot: '/srv/releases/fixture', nodePath: '/usr/bin/node', helperPath, snapshotDir: join(base, 'snapshot'), promotionConfigFile: join(base, 'promotion'), identityFile, knownHostsFile };
  const env = { evidenceDir, target: Object.fromEntries(Object.entries(target).filter(([k]) => !['helperPath', 'snapshotDir', 'promotionConfigFile'].includes(k))), persistentVolume: { path: dataDir, releaseRoot: '/srv/releases' }, supervisor: { kind: 'docker', name: 'fixture', helperPath }, publicOrigin: origin };
  const config = { version: 1, target, operationDir, environmentFile: file('environment.json', env), pullConfigFile: join(base, 'missing-backup-config'), ownerPasswordFile: file('password', 'fixture recovery password'), priorRelease: A, candidateRelease: B, archiveSchema: baseline.databases['archive.sqlite'].schema, authSchema: baseline.databases['auth.sqlite'].schema, publicOrigin: origin };
  const binding = createHash('sha256').update(JSON.stringify([machineId, dataDir, target.appRoot, helperPath])).digest('hex');
  const journal = { version: 1, kind: 'release', stage, targetBinding: binding, archiveSchema: config.archiveSchema, authSchema: config.authSchema, priorRelease: A, candidateRelease: B, priorMode: 'collect', startedAt: new Date().toISOString() };
  const journalPath = join(operationDir, 'deploy-journal.json'); writeFileSync(journalPath, JSON.stringify(journal), { mode: 0o600 });
  const actions: string[] = [], challenges: number[] = []; let running = false, active: string | null = null, server: ReturnType<typeof createServer> | undefined, service: ReturnType<typeof createService> | undefined;
  const stop = async () => { if (server) { server.closeAllConnections(); await new Promise<void>(yes => server!.close(() => yes())); server = undefined; } if (service) { await service.close(); service = undefined; } running = false; active = null; };
  t.after(async () => { await stop(); rmSync(base, { recursive: true }); });
  const facts = () => ({ running, pid: running ? process.pid : 0, startTime: running ? 'fixture' : null, profileProcesses: running ? 1 : 0, mode: 'offline', autostart: false, machineId, profilePathHash: createHash('sha256').update(dataDir).digest('hex'), release: active, preparedReleases: [{ release: A, mode: 'offline' }] });
  const runner = async (_program: string, argv: string[]) => {
    assert.ok(argv.includes('StrictHostKeyChecking=yes')); const encoded = argv.at(-1)!.match(/Buffer.from\("([A-Za-z0-9+/=]+)"/)![1], script = Buffer.from(encoded, 'base64').toString();
    const task = script.match(/\}\)\("(control|state)",(\{.*\})\)\.then/);
    if (!task) return { stdout: JSON.stringify({ machineId, os: 'linux', node: 'v24.21.0', fts: true, privateData: true, supervisor: facts(), volume: { private: true, path: dataDir, mount: JSON.stringify({ filesystems: [{ fstype: 'ext4', options: 'rw' }] }) } }) };
    if (task[1] === 'state') return { stdout: JSON.stringify(m.profileState(dataDir)) };
    const input = JSON.parse(task[2]); actions.push(input.action);
    if (input.action === 'stop') await stop();
    if (input.action === 'start') {
      assert.equal(input.release, A); assert.equal(input.mode, 'offline'); running = true; active = input.release;
      if (listener) {
        service = createService({ dataDir, transport: { mode: 'proxy', publicOrigin: origin, trustedProxyPeers: ['127.0.0.1'] } });
        server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
          if (req.url === '/api/session') { const status = challenges.length < unavailableChallenges ? 503 : 200; challenges.push(status); if (status === 503) { res.writeHead(status); res.end(); return; } }
          req.headers['x-forwarded-proto'] = 'https'; service!.app(req, res);
        }); server.listen(port, '127.0.0.1'); await once(server, 'listening');
      }
    }
    return { stdout: JSON.stringify(facts()) };
  };
  return { m, config, configFile: file('driver.json', config), runner, ca: readFileSync(cert), actions, baseline, journal, journalPath, dataDir, challenges, startupTimeoutMs: listener ? 2000 : 50 };
}

test('recover retoma listener ausente e journal stopped sem exigir HTTPS/backup prévios', async t => {
  for (const stage of ['stopped', 'swapped']) {
    const f = await recoveryFixture(t, stage);
    writeFileSync(f.config.pullConfigFile, '{}', { mode: 0o600 }); // backup file exists but has no successful copy
    const result = await f.m.runDeployment('recover', f);
    assert.equal(result.validated, true); assert.deepEqual(f.m.profileState(f.dataDir), f.baseline);
    assert.ok(f.actions.includes('start')); assert.equal(JSON.parse(readFileSync(f.journalPath, 'utf8')).stage, 'recovered-offline');
  }
});

test('recover aguarda challenge HTTPS depois de 503 transitório durante boot', async t => {
  const f = await recoveryFixture(t, 'stopped', true, 0, 3);
  assert.equal((await f.m.runDeployment('recover', f)).validated, true);
  assert.deepEqual(f.challenges, [503, 503, 503, 200]);
  assert.deepEqual(f.m.profileState(f.dataDir), f.baseline);
});

test('HTTPS aguarda listener atrasado sem repetir respostas de autenticação nem erro TLS', async t => {
  const f = await recoveryFixture(t, 'stopped', false), port = Number(new URL(f.config.publicOrigin).port);
  const service = createService({ dataDir: f.dataDir, transport: { mode: 'proxy', publicOrigin: f.config.publicOrigin, trustedProxyPeers: ['127.0.0.1'] } });
  let forcedStatus = 0, requests = 0, connections = 0, resetChallenge = true;
  const server = createServer({ key: readFileSync(join(f.dataDir, '..', 'key')), cert: f.ca }, (req, res) => {
    requests++; if (resetChallenge && req.url === '/api/session') { resetChallenge = false; req.socket.destroy(); return; } if (forcedStatus) { res.writeHead(forcedStatus); res.end(); return; } req.headers['x-forwarded-proto'] = 'https'; service.app(req, res);
  }); server.on('connection', () => connections++);
  const timer = setTimeout(() => server.listen(port, '127.0.0.1'), 60);
  try {
    assert.equal(await f.m.verifyHttps(f.config.publicOrigin, 'fixture recovery password', [], f.ca, { startupTimeoutMs: 2000 }), true);
    for (const status of [401, 403, 302]) { forcedStatus = status; const before = requests; await assert.rejects(f.m.verifyHttps(f.config.publicOrigin, 'fixture recovery password', [], f.ca, { startupTimeoutMs: 1000 })); assert.equal(requests - before, 1); }
    forcedStatus = 0;
    for (const [origin, ca] of [[f.config.publicOrigin, undefined], ['https://127.0.0.1:' + port, f.ca]] as const) {
      const before = connections; await assert.rejects(f.m.verifyHttps(origin, 'fixture recovery password', [], ca, { startupTimeoutMs: 1000 }), /certificate|cert|hostname|IP/i); assert.equal(connections - before, 1);
    }
  } finally { clearTimeout(timer); if (server.listening) { server.closeAllConnections(); await new Promise<void>(yes => server.close(() => yes())); } await service.close(); }
});

test('HTTPS startup tem deadline total quando proxy mantém 503 ou challenge nunca termina', async t => {
  const f = await recoveryFixture(t, 'stopped', false); let hanging = false;
  const server = createServer({ key: readFileSync(join(f.dataDir, '..', 'key')), cert: f.ca }, (_req, res) => { res.writeHead(hanging ? 200 : 503); if (!hanging) res.end(); else res.flushHeaders(); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const origin = 'https://localhost:' + (server.address() as any).port;
    await assert.rejects(f.m.verifyHttps(origin, 'fixture', [], f.ca, { startupTimeoutMs: 50 }), /startup_timeout/);
    hanging = true; await assert.rejects(f.m.verifyHttps(origin, 'fixture', [], f.ca, { startupTimeoutMs: 50 }), /startup_timeout/);
  } finally { server.closeAllConnections(); await new Promise<void>(yes => server.close(() => yes())); }
});

test('HTTPS verifica original acima de 32 MiB por stream e rejeita tamanho/hash divergente', async t => {
  const f = await recoveryFixture(t, 'stopped', true, 33 * 1024 * 1024 + 17);
  assert.equal(f.baseline.originals.length, 1);
  assert.equal((await f.m.runDeployment('recover', f)).validated, true);
  assert.equal(typeof f.m.verifyHttps, 'function');
  const file = f.baseline.originals[0];
  await assert.rejects(f.m.verifyHttps(f.config.publicOrigin, 'fixture recovery password', [{ ...file, size: file.size - 1 }], f.ca));
  await assert.rejects(f.m.verifyHttps(f.config.publicOrigin, 'fixture recovery password', [{ ...file, size: file.size + 1 }], f.ca));
  await assert.rejects(f.m.verifyHttps(f.config.publicOrigin, 'fixture recovery password', [{ ...file, sha256: '0'.repeat(64) }], f.ca));
});

test('probe HTTP streaming limita bytes e prazo absoluto mesmo com atividade contínua', async t => {
  const f = await recoveryFixture(t, 'stopped', false), m = f.m;
  assert.equal(typeof m.tlsCall, 'function');
  const dir = join(f.dataDir, '..'), server = createServer({ key: readFileSync(join(dir, 'key')), cert: f.ca }, (_req, res) => {
    res.writeHead(200); const timer = setInterval(() => res.write('a'), 5); res.on('close', () => clearInterval(timer));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(yes => server.close(() => yes())); });
  const origin = 'https://localhost:' + (server.address() as any).port;
  await assert.rejects(m.tlsCall(origin, '/', { ca: f.ca, expectedBytes: 1, timeoutMs: 1000 }), /probe_limit/);
  await assert.rejects(m.tlsCall(origin, '/', { ca: f.ca, expectedBytes: 1000, timeoutMs: 40 }), /probe_timeout/);
});

test('rotação explícita após promoção muda somente owner do destino parado', async t => {
  const m = await load(), base = mkdtempSync(join(tmpdir(), 'zap-deploy-owner-')); t.after(() => rmSync(base, { recursive: true }));
  const source = join(base, 'source'), dataDir = join(base, 'target'), snapshotDir = join(base, 'snapshot'), operationDir = join(base, 'operations'); mkdirSync(operationDir, { mode: 0o700 });
  const service = createService({ dataDir: source });
  createAuthState(service.authDb, { newProfile: true }).state.keys.set({ session: { fixture: Buffer.from('WA session stays original') } }); await service.setPassword('original owner fixture'); await service.close();
  const sourceBefore = m.profileState(source); await createSnapshot({ dataDir: source, destination: snapshotDir }); await restoreSnapshot({ snapshotDir, destination: dataDir });
  const machineId = '0'.repeat(32), supervisor = { kind: 'systemd', name: 'fixture.service', dataDir, machineId }, facts = { running: false, autostart: false, pid: 0, startTime: null, profileProcesses: 0, mode: 'offline', machineId };
  const controller = { async inspect() { return { ...facts }; } }, config = { dataDir, operationDir, destination: snapshotDir, snapshotDir, verificationDir: join(base, 'verified'), priorMode: 'offline', priorRelease: 'fixture', supervisor, source: { ...supervisor, dataDir: source } };
  assert.equal(typeof m.rotateRestoredOwner, 'function');
  const targetBefore = m.profileState(dataDir);
  await assert.rejects(m.rotateRestoredOwner(config, 'new owner fixture', { controller, sourceController: controller }), /promoção|promotion/i);
  assert.deepEqual(m.profileState(dataDir), targetBefore);
  await promoteProfile(config as any, { sourceController: controller as any, targetController: controller as any });
  facts.autostart = true; await assert.rejects(m.rotateRestoredOwner(config, 'new owner fixture', { controller, sourceController: controller })); facts.autostart = false;
  assert.deepEqual(m.profileState(dataDir), targetBefore);
  await m.rotateRestoredOwner(config, 'new owner fixture', { controller, sourceController: controller });
  const targetAfter = m.profileState(dataDir); assert.notEqual(targetAfter.databases['auth.sqlite'].web_owner, sourceBefore.databases['auth.sqlite'].web_owner);
  targetAfter.databases['auth.sqlite'].web_owner = targetBefore.databases['auth.sqlite'].web_owner;
  assert.deepEqual(targetAfter, targetBefore); assert.deepEqual(m.profileState(source), sourceBefore);
  const key = join(base, 'key'), cert = join(base, 'cert');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
  let restored: ReturnType<typeof createService> | undefined;
  const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => { req.headers['x-forwarded-proto'] = 'https'; restored!.app(req, res); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const origin = 'https://localhost:' + (server.address() as any).port;
  try {
    restored = createService({ dataDir, transport: { mode: 'proxy', publicOrigin: origin, trustedProxyPeers: ['127.0.0.1'] } });
    assert.doesNotThrow(() => assertPromotionAuthorization(dataDir, restored!.authDb));
    await m.verifyHttps(origin, 'new owner fixture', [], readFileSync(cert));
    await assert.rejects(m.verifyHttps(origin, 'original owner fixture', [], readFileSync(cert)));
  } finally { server.closeAllConnections(); await new Promise<void>(yes => server.close(() => yes())); await restored?.close(); }
});

test('recover registra validação HTTPS falha depois de retomar código offline', async t => {
  const f = await recoveryFixture(t, 'stopped', false);
  await assert.rejects(f.m.runDeployment('recover', f), /recovery_validation_failed/);
  assert.ok(f.actions.includes('start')); assert.deepEqual(f.m.profileState(f.dataDir), f.baseline);
  assert.equal(JSON.parse(readFileSync(f.journalPath, 'utf8')).stage, 'recovery-validation-failed');
});

test('recover recusa journal de outro target e schema incompatível antes de stop', async t => {
  for (const field of ['targetBinding', 'archiveSchema', 'authSchema', 'priorRelease']) {
    const f = await recoveryFixture(t); (f.journal as any)[field] = 'f'.repeat(field === 'priorRelease' ? 40 : 64); writeFileSync(f.journalPath, JSON.stringify(f.journal));
    await assert.rejects(f.m.runDeployment('recover', f)); assert.ok(!f.actions.includes('stop')); assert.ok(!f.actions.includes('start'));
  }
});

test('deployment recusa helper de outro volume e fatos PID divergentes antes de stop', async t => {
  for (const mutate of [
    (f: any) => { f.profilePathHash = 'f'.repeat(64); },
    (f: any) => { f.machineId = 'f'.repeat(32); },
    (f: any) => { f.pid = 91; },
    (f: any) => { f.profileProcesses = 1; },
    (f: any) => { f.running = true; f.release = null; }
  ]) {
    const f = await recoveryFixture(t); const runner = async (program: string, argv: string[]) => {
      const result = await f.runner(program, argv), value = JSON.parse(result.stdout);
      if (value.preparedReleases) mutate(value); return { stdout: JSON.stringify(value) };
    };
    await assert.rejects(f.m.runDeployment('recover', { ...f, runner })); assert.ok(!f.actions.includes('stop')); assert.ok(!f.actions.includes('start'));
    assert.deepEqual(f.m.profileState(f.dataDir), f.baseline);
  }
});

test('driver exige mesmas referências de host volume runtime e helper que inventário', async t => {
  for (const key of ['dataDir', 'appRoot', 'nodePath', 'user', 'helperPath', 'volume']) {
    const f = await recoveryFixture(t), env = JSON.parse(readFileSync(f.config.environmentFile, 'utf8'));
    if (key === 'helperPath') env.supervisor.helperPath = '/usr/local/libexec/other';
    else if (key === 'volume') env.persistentVolume.path = '/srv/private/other';
    else env.target[key] = key === 'user' ? 'other' : '/srv/private/other';
    writeFileSync(f.config.environmentFile, JSON.stringify(env)); let probes = 0;
    await assert.rejects(f.m.runDeployment('recover', { ...f, runner: async (program: string, args: string[]) => { probes++; return f.runner(program, args); } }));
    assert.equal(probes, 0, key); assert.deepEqual(f.actions, []);
  }
});

function helperFixture(running = true) {
  const config = { uid: 12001, machineId: 'a'.repeat(32), dataDir: '/srv/private/profile-b', appLabel: 'fixture', releases: ['b'.repeat(40)], proxy: { name: 'proxy', network: 'proxy-net', expectedPeer: '172.18.0.2', publicOrigin: 'https://fixture.invalid' } };
  const labels: Record<string, string> = { 'zap.archive': config.appLabel, 'zap.release': config.releases[0], 'traefik.http.routers.zap.rule': 'Host(`fixture.invalid`)', 'traefik.http.routers.zap.middlewares': 'zap-forwarding' };
  const header = 'traefik.http.middlewares.zap-forwarding.headers.customrequestheaders.';
  for (const name of ['Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Port', 'X-Forwarded-Server', 'X-Real-IP']) labels[header + name] = '';
  labels[header + 'X-Forwarded-Proto'] = 'https';
  const container: any = { Id: 'c'.repeat(64), Name: '/fixture', Config: { User: '12001:12001', Cmd: ['node', 'dist/src/main.js', 'serve'], Env: ['ZAP_DATA_DIR=' + config.dataDir, 'ZAP_BIND_HOST=0.0.0.0', 'ZAP_PUBLIC_ORIGIN=' + config.proxy.publicOrigin, 'ZAP_TRUSTED_PROXY_PEERS=' + config.proxy.expectedPeer], Labels: labels }, HostConfig: { PidMode: 'host', Privileged: false, RestartPolicy: { Name: 'no' }, PortBindings: {} }, Mounts: [{ Type: 'bind', Source: config.dataDir, Destination: config.dataDir, RW: true }, { Type: 'bind', Source: '/etc/machine-id', Destination: '/etc/machine-id', RW: false }, { Type: 'bind', Source: '/srv/private/operations', Destination: '/srv/private/operations', RW: false }, { Type: 'bind', Source: '/srv/private/snapshots', Destination: '/srv/private/snapshots', RW: false }], NetworkSettings: { Networks: { [config.proxy.network]: {} } }, State: { Running: running, Status: running ? 'running' : 'exited', Pid: running ? 412 : 0, StartedAt: 'fixture' } };
  const mutations: string[] = [], reads: string[] = [];
  const runner = async (_file: string, args: string[]) => {
    if (args[0] === 'ps') { reads.push('ps'); return { stdout: container.Id }; }
    if (args[0] === 'inspect') { reads.push('inspect'); return { stdout: JSON.stringify([container]) }; }
    mutations.push(args[0]);
    if (args[0] === 'start') { container.State.Running = true; container.State.Status = 'running'; container.State.Pid = 412; }
    if (args[0] === 'stop') { container.State.Running = false; container.State.Status = 'exited'; container.State.Pid = 0; }
    if (args[0] === 'update') container.HostConfig.RestartPolicy.Name = args[1] === '--restart=no' ? 'no' : 'on-failure';
    return { stdout: '' };
  };
  return { config, container, runner, mutations, reads };
}

test('CR-05 Env A e mounts A/B nunca anunciam perfil B nem autorizam controles', async () => {
  const path = '../../ops/zap-container-control.mjs', m = await import(path);
  for (const action of ['inspect-runtime', 'inspect', 'stop', 'start']) {
    const f = helperFixture(action !== 'start');
    f.container.Config.Env[0] = 'ZAP_DATA_DIR=/srv/private/profile-a';
    f.container.Mounts.push({ Type: 'bind', Source: '/srv/private/profile-a', Destination: '/srv/private/profile-a', RW: true });
    await assert.rejects(async () => { const facts = await m.control(f.config, action, f.config.releases[0], 'offline', { runner: f.runner }); assertSupervisorFacts(f.config, facts); });
    assert.deepEqual(f.mutations, [], action + ' deve recusar antes de mutação');
  }
});

test('CR-05 invariantes estáticas Env bind origem peers são impostas em todas ações', async () => {
  const path = '../../ops/zap-container-control.mjs', m = await import(path);
  for (const mutate of [
    (c: any) => { delete c.Config.Env; },
    (c: any) => { c.Config.Env.shift(); },
    (c: any) => { c.Config.Env.push(c.Config.Env[0]); },
    (c: any) => { c.Config.Env.push('ZAP_DATA_DIR=/srv/private/profile-a'); },
    (c: any) => { c.Config.Env.push('ZAP_DATA_DIR'); },
    (c: any) => { c.Config.Env[0] += '/./'; },
    (c: any) => { c.Mounts.push({ Type: 'bind', Source: '/srv/private/profile-a', Destination: '/srv/private/profile-a', RW: true }); },
    (c: any) => { c.Mounts.push(structuredClone(c.Mounts[0])); },
    (c: any) => { c.Mounts.push({ Type: 'bind', Source: '/srv/private/profile-a', Destination: '/srv/private/profile-b/media', RW: false }); },
    (c: any) => { c.Config.Env[1] = 'ZAP_BIND_HOST=127.0.0.1'; },
    (c: any) => { c.Config.Env.splice(1, 1); },
    (c: any) => { c.Config.Env[2] = 'ZAP_PUBLIC_ORIGIN=https://other.invalid'; },
    (c: any) => { c.Config.Env.splice(2, 1); },
    (c: any) => { c.Config.Env.push(c.Config.Env[2]); },
    (c: any) => { c.Config.Env[3] = 'ZAP_TRUSTED_PROXY_PEERS=172.18.0.3'; },
    (c: any) => { c.Config.Env.splice(3, 1); },
    (c: any) => { c.Config.Env.push(c.Config.Env[3]); },
    (c: any) => { c.Config.Labels['traefik.http.routers.zap.rule'] = 'Host(`other.invalid`)'; }
  ]) for (const action of ['inspect-runtime', 'inspect', 'stop', 'start']) {
    const f = helperFixture(action !== 'start'); mutate(f.container);
    await assert.rejects(m.control(f.config, action, f.config.releases[0], 'offline', { runner: f.runner })); assert.deepEqual(f.mutations, [], action);
  }
});

test('CR-05 recovery mantém bind e Env válidos quando somente proxy está indisponível', async () => {
  const path = '../../ops/zap-container-control.mjs', m = await import(path);
  const f = helperFixture(false);
  f.container.Mounts.push({ Type: 'tmpfs', Source: '', Destination: '/tmp', RW: true });
  await assert.rejects(m.control(f.config, 'inspect', undefined, undefined, { runner: f.runner }), /AssertionError|assert/);
  const before = await m.control(f.config, 'inspect-runtime', undefined, undefined, { runner: f.runner }); assertSupervisorFacts(f.config, before); assert.equal(before.running, false);
  const started = await m.control(f.config, 'start', f.config.releases[0], 'offline', { runner: f.runner }); assertSupervisorFacts(f.config, started); assert.equal(started.running, true);
  const active = await m.control(f.config, 'inspect-runtime', undefined, undefined, { runner: f.runner }); assertSupervisorFacts(f.config, active);
  const stopped = await m.control(f.config, 'stop', undefined, undefined, { runner: f.runner }); assertSupervisorFacts(f.config, stopped); assert.equal(stopped.running, false);
  assert.deepEqual(f.mutations, ['start', 'update', 'update', 'stop']); assert.ok(f.reads.length >= 10);
});

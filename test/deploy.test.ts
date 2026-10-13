import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir, homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
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
import { acquireServiceLock } from '../src/whatsapp.js';

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

test('rotação explícita após promoção aceita auth acima de 256 KiB e muda somente owner do destino parado', async t => {
  const m = await load(), base = mkdtempSync(join(tmpdir(), 'zap-deploy-owner-')); t.after(() => rmSync(base, { recursive: true }));
  const source = join(base, 'source'), dataDir = join(base, 'target'), snapshotDir = join(base, 'snapshot'), operationDir = join(base, 'operations'); mkdirSync(operationDir, { mode: 0o700 });
  const service = createService({ dataDir: source });
  createAuthState(service.authDb, { newProfile: true }).state.keys.set({ session: { fixture: Buffer.alloc(400 * 1024, 0x61) } }); await service.setPassword('original owner fixture'); await service.close();
  assert.ok(statSync(join(source, 'auth.sqlite')).size > 262144);
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

test('SSH multiplex aplica configuração efetiva privada e recusa controle inseguro', async t => {
  const f = await recoveryFixture(t); assert.equal(typeof f.m.sshArguments, 'function');
  const effective = (config: unknown) => Object.fromEntries(execFileSync('/usr/bin/ssh', ['-G', ...f.m.sshArguments(config, 'true')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\n').map(line => { const first = line.indexOf(' '); return [line.slice(0, first), line.slice(first + 1)]; }));
  const parsed = effective(f.config), path = parsed.controlpath;
  assert.equal(parsed.controlmaster, 'auto'); assert.equal(parsed.controlpersist, '60'); assert.equal(parsed.clearallforwardings, 'yes'); assert.equal(parsed.batchmode, 'yes'); assert.equal(parsed.stricthostkeychecking, 'true');
  assert.equal(parsed.userknownhostsfile, f.config.target.knownHostsFile); assert.ok(path.startsWith(f.config.operationDir + '/'));
  assert.notEqual(effective({ ...f.config, target: { ...f.config.target, host: 'other.invalid' } }).controlpath, path);
  chmodSync(f.config.operationDir, 0o755); assert.throws(() => f.m.sshArguments(f.config, 'true')); chmodSync(f.config.operationDir, 0o700);
  symlinkSync(f.config.ownerPasswordFile, path); assert.throws(() => f.m.sshArguments(f.config, 'true')); rmSync(path);
  symlinkSync(join(f.config.operationDir, 'missing'), path); assert.throws(() => f.m.sshArguments(f.config, 'true')); rmSync(path);
  writeFileSync(path, 'not a socket', { mode: 0o600 }); assert.throws(() => f.m.sshArguments(f.config, 'true')); rmSync(path);
  const socket = portProbe(); socket.listen(path); await once(socket, 'listening');
  try {
    chmodSync(path, 0o644); assert.throws(() => f.m.sshArguments(f.config, 'true')); chmodSync(path, 0o600);
    if (process.getuid!() === 0 || spawnSync('/usr/bin/sudo', ['-n', 'true'], { stdio: 'ignore' }).status === 0) {
      const root = process.getuid!() === 0; execFileSync(root ? '/usr/bin/chown' : '/usr/bin/sudo', root ? ['65534', path] : ['-n', '/usr/bin/chown', '65534', path], { stdio: 'ignore' });
      assert.throws(() => f.m.sshArguments(f.config, 'true'));
    }
  } finally { await new Promise<void>(yes => socket.close(() => yes())); }
  const long = join(f.config.operationDir, 'long-control-'.repeat(8)); mkdirSync(long, { mode: 0o700 }); assert.throws(() => f.m.sshArguments({ ...f.config, operationDir: long }, 'true'));
});

function sshFixtureDiagnostic(logs: string, base: string) {
  const lines = logs.split(/\r?\n/).filter(line => /Server listening|User .*not allowed|Authentication refused|Could not open|Failed publickey|Accepted publickey|PAM:|error:|fatal:/i.test(line));
  return lines.slice(-12).map(line => line.replaceAll(base, '<fixture>').replace(/SHA256:[A-Za-z0-9+/=]+/g, '<fingerprint>').replace(/[A-Za-z0-9+/=]{80,}/g, '<encoded>').slice(0, 300)).join('\n') || 'No SSH server diagnostic recorded';
}

test('diagnóstico de fixture SSH conserva causa sem paths privados nem comandos ou chaves', () => {
  const base = '/private/fixture', key = 'A'.repeat(120), command = 'B'.repeat(200), diagnostic = sshFixtureDiagnostic(['User runner not allowed because account is locked', 'Could not open ' + base + '/authorized: Permission denied', 'error: encoded ' + command, 'Accepted publickey for runner SHA256:somefingerprint', 'ssh-ed25519 ' + key].join('\n'), base);
  assert.match(diagnostic, /account is locked/); assert.match(diagnostic, /<fixture>\/authorized/);
  for (const value of [base, key, command, 'somefingerprint']) assert.ok(!diagnostic.includes(value));
});

function rpcFixture(t: { after(fn: () => unknown): void }) {
  const base = mkdtempSync(join(tmpdir(), 'zap-rpc-deadline-')), operationDir = join(base, 'ops'); mkdirSync(operationDir, { mode: 0o700 });
  t.after(() => rmSync(base, { recursive: true }));
  const privateInput = (name: string) => { const path = join(base, name); writeFileSync(path, 'fixture', { mode: 0o600 }); return path; };
  return { base, config: { operationDir, target: { host: 'fixture.invalid', user: 'owner', nodePath: process.execPath, dataDir: join(base, 'data'), appRoot: '/srv/releases/fixture', helperPath: '/usr/local/libexec/fixture', identityFile: privateInput('key'), knownHostsFile: privateInput('known') } } };
}
test('RPC promove com orçamento de quinze minutos sem ampliar os demais comandos', async t => {
  const m = await load(), { config } = rpcFixture(t);
  for (const task of ['promote', 'restore', 'state', 'control', 'preparation', 'fence', 'rotate-owner']) {
    let options: any;
    const runner = async (program: string, argv: string[], received: any) => {
      assert.equal(program, '/usr/bin/ssh'); assert.ok(argv.includes('StrictHostKeyChecking=yes')); options = received;
      return { stdout: '{"observed":true}' };
    };
    assert.deepEqual(await m.rpc(config, task, {}, undefined, runner), { observed: true });
    assert.equal(options.timeout, task === 'promote' ? 900000 : 90000);
    assert.equal(options.killSignal, 'SIGKILL'); assert.equal(options.shell, false); assert.equal(options.maxBuffer, 8 * 1024 * 1024);
  }
});
test('deadline do RPC deixa resultado remoto indeterminado sem retry nem alterar journal', { timeout: 5000 }, async t => {
  const m = await load(), { base, config } = rpcFixture(t), committed = join(base, 'remote-committed');
  const journal = join(config.operationDir, 'deploy-journal.json'), before = Buffer.from('{"stage":"restored"}'); writeFileSync(journal, before, { mode: 0o600 });
  let attempts = 0, remote: ReturnType<typeof spawn> | undefined, ended: Promise<any> | undefined;
  const expired = Object.assign(Error('RPC deadline expired'), { killed: true, signal: 'SIGKILL' });
  const runner = async () => {
    attempts++;
    remote = spawn(process.execPath, ['-e', 'setTimeout(()=>require("node:fs").writeFileSync(process.argv[1],"committed",{mode:384}),100)', committed], { stdio: 'ignore' });
    t.after(() => { if (remote?.exitCode === null) remote.kill('SIGKILL'); }); ended = once(remote, 'exit');
    await once(remote, 'spawn'); throw expired;
  };
  await assert.rejects(m.rpc(config, 'promote', {}, undefined, runner), error => error === expired);
  assert.equal(attempts, 1); assert.deepEqual(readFileSync(journal), before);
  assert.deepEqual(await ended, [0, null]); assert.equal(readFileSync(committed, 'utf8'), 'committed');
  assert.deepEqual(readFileSync(journal), before, 'falha local não permite declarar cancelamento ou sucesso remoto');
});

test('RPCs JSON e binários reutilizam conexão OpenSSH real e fecham master privado', async t => {
  const m = await load(); for (const name of ['sshArguments', 'rpc', 'closeSshMaster']) assert.equal(typeof m[name], 'function');
  const sshd = ['/usr/bin/sshd', '/usr/sbin/sshd'].find(existsSync), root = process.getuid!() === 0;
  if (!sshd || !root && spawnSync('/usr/bin/sudo', ['-n', 'true'], { stdio: 'ignore' }).status !== 0) { t.skip('OpenSSH server isolado requer sshd e privilégio disponível'); return; }
  const state = join(homedir(), '.local/state'); mkdirSync(state, { recursive: true, mode: 0o700 });
  const base = mkdtempSync(join(state, 'zap-ssh-test-')), operationDir = join(base, 'ops'), dataDir = join(base, 'data'), appRoot = join(base, 'app');
  for (const dir of [operationDir, dataDir, appRoot, join(appRoot, 'dist')]) mkdirSync(dir, { mode: 0o700 });
  writeFileSync(join(appRoot, 'package.json'), '{"type":"module"}', { mode: 0o600 });
  symlinkSync(join(process.cwd(), 'node_modules'), join(appRoot, 'node_modules')); symlinkSync(join(process.cwd(), 'dist/src'), join(appRoot, 'dist/src'));
  const key = join(base, 'client'), hostKey = join(base, 'host'); for (const path of [key, hostKey]) execFileSync('/usr/bin/ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path], { stdio: 'ignore' });
  const authorized = join(base, 'authorized'); writeFileSync(authorized, readFileSync(key + '.pub'), { mode: 0o600 });
  const probe = portProbe(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = (probe.address() as any).port; await new Promise<void>(yes => probe.close(() => yes()));
  const known = join(base, 'known'); writeFileSync(known, '[127.0.0.1]:' + port + ' ' + readFileSync(hostKey + '.pub', 'utf8'), { mode: 0o600 });
  const configPath = join(base, 'sshd.conf'), pidFile = join(base, 'sshd.pid'), user = userInfo().username;
  writeFileSync(configPath, ['Port ' + port, 'ListenAddress 127.0.0.1', 'HostKey ' + hostKey, 'PidFile ' + pidFile, 'AuthorizedKeysFile ' + authorized, 'PubkeyAuthentication yes', 'PasswordAuthentication no', 'KbdInteractiveAuthentication no', 'UsePAM ' + (process.env.CI === 'true' ? 'yes' : 'no'), 'AllowUsers ' + user, 'PermitRootLogin ' + (root ? 'prohibit-password' : 'no'), 'AllowTcpForwarding no', 'AllowAgentForwarding no', 'X11Forwarding no', 'StrictModes yes', 'LogLevel VERBOSE'].join('\n') + '\n', { mode: 0o600 });
  const daemon = spawn(root ? sshd : '/usr/bin/sudo', root ? ['-D', '-e', '-f', configPath] : ['-n', sshd, '-D', '-e', '-f', configPath], { stdio: ['ignore', 'ignore', 'pipe'] }); let logs = '';
  daemon.stderr.on('data', bytes => logs += bytes);
  const config = { operationDir, target: { host: '127.0.0.1', user, port, identityFile: key, knownHostsFile: known, nodePath: process.execPath, machineId: readFileSync('/etc/machine-id', 'utf8').trim(), dataDir, appRoot, helperPath: '/usr/local/libexec/fixture', snapshotDir: join(base, 'snapshot'), promotionConfigFile: join(base, 'promotion') } };
  let lock: ReturnType<typeof acquireServiceLock> | undefined;
  try {
    await new Promise<void>((yes, no) => { const timer = setTimeout(() => no(Error('sshd startup timeout: ' + logs)), 5000); daemon.stderr.on('data', () => { if (logs.includes('Server listening on')) { clearTimeout(timer); yes(); } }); daemon.once('exit', () => { clearTimeout(timer); no(Error('sshd exited: ' + logs)); }); });
    lock = acquireServiceLock(operationDir);
    assert.equal((await m.rpc(config, 'receive', { destination: config.target.snapshotDir, name: null })).created, true);
    const content = Buffer.alloc(128 * 1024, 0x61), destination = join(config.target.snapshotDir, 'manifest.json');
    await m.rpc(config, 'receive', { destination: config.target.snapshotDir, name: 'manifest.json' }, Readable.from([content])); assert.deepEqual(readFileSync(destination), content);
    await assert.rejects(m.rpc(config, 'receive', { destination: config.target.snapshotDir, name: 'manifest.json' }, Readable.from([Buffer.from('overwrite rejected')]))); assert.deepEqual(readFileSync(destination), content);
    assert.equal((logs.match(/Accepted publickey for /g) ?? []).length, 1);
    const argv = m.sshArguments(config, 'true'), controlPath = argv.find((arg: string) => arg.startsWith('ControlPath=')).slice('ControlPath='.length); assert.equal(existsSync(controlPath), true);
    await m.closeSshMaster(config); assert.equal(existsSync(controlPath), false);
  } catch (error) {
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code ?? error.name : 'unknown';
    throw Error('isolated SSH fixture failed (' + code + ')\n' + sshFixtureDiagnostic(logs, base));
  } finally {
    try { await m.closeSshMaster(config); } finally {
      lock?.release();
      if (daemon.exitCode === null && daemon.signalCode === null && existsSync(pidFile)) {
        const ended = once(daemon, 'exit'), read = (path: string) => root ? readFileSync(path, 'utf8') : execFileSync('/usr/bin/sudo', ['-n', '/usr/bin/cat', path], { encoding: 'utf8' }), pid = read(pidFile).trim();
        assert.match(pid, /^[1-9]\d*$/); assert.ok(read('/proc/' + pid + '/cmdline').includes(configPath), 'isolated daemon PID must match its private config');
        execFileSync(root ? '/usr/bin/kill' : '/usr/bin/sudo', root ? ['-TERM', pid] : ['-n', '/usr/bin/kill', '-TERM', pid], { stdio: 'ignore' }); await ended;
      }
      else if (daemon.exitCode === null) { daemon.kill(); await once(daemon, 'exit'); }
      rmSync(base, { recursive: true });
    }
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

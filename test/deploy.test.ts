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
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
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

async function recoveryFixture(t: { after(fn: () => unknown): void }, stage = 'stopped', listener = true) {
  const m = await load(), base = mkdtempSync(join(tmpdir(), 'zap-deploy-recovery-'));
  const operationDir = join(base, 'operations'), evidenceDir = join(base, 'evidence'), dataDir = join(base, 'data');
  for (const p of [operationDir, evidenceDir]) mkdirSync(p, { mode: 0o700 });
  const original = createService({ dataDir }); createAuthState(original.authDb, { newProfile: true }); await original.setPassword('fixture recovery password');
  original.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'recent', fromMe: false }, messageTimestamp: 1700000000, message: { conversation: 'recent record survives code recovery' } }] }); await original.close();
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
  const actions: string[] = []; let running = false, active: string | null = null, server: ReturnType<typeof createServer> | undefined, service: ReturnType<typeof createService> | undefined;
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
        server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => { req.headers['x-forwarded-proto'] = 'https'; service!.app(req, res); }); server.listen(port, '127.0.0.1'); await once(server, 'listening');
      }
    }
    return { stdout: JSON.stringify(facts()) };
  };
  return { m, config, configFile: file('driver.json', config), runner, ca: readFileSync(cert), actions, baseline, journal, journalPath, dataDir };
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

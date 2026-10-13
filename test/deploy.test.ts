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
  const container = { Id: 'c'.repeat(64), Name: '/fixture-current', Config: { User: '12001:12001', Cmd: ['node', 'dist/src/main.js', 'serve'], Labels: { 'zap.archive': 'fixture', 'zap.release': 'b'.repeat(40) } }, HostConfig: { PidMode: 'host', Privileged: false, RestartPolicy: { Name: 'no' }, PortBindings: {}, Binds: [] }, Mounts: [{ Source: config.dataDir, Destination: config.dataDir, RW: true }], State: { Running: true, Status: 'running', Pid: 412, StartedAt: 'now' } };
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

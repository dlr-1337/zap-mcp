import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

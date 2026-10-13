#!/usr/bin/node
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, realpathSync, readdirSync, statSync, openSync, closeSync, writeFileSync, fsyncSync, renameSync, unlinkSync, constants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
const exec = promisify(execFile);
const bootUnit = 'zap-mcp-runtime.service', bootDirectory = '/etc/zap-mcp-control', bootPath = bootDirectory + '/boot-state.json';

export function inspectContainers(config, containers, procPids = []) {
  assert.ok(config.bootUnit === undefined || config.bootUnit === bootUnit, 'boot_unit_scope');
  assert.ok(Number.isInteger(config.uid) && config.uid > 0 && /^[a-f0-9]{32}$/.test(config.machineId));
  assert.match(config.dataDir, /^\/[A-Za-z0-9_./-]+$/); assert.ok(!config.dataDir.split('/').includes('..'));
  assert.equal(config.dataDir, resolve(config.dataDir));
  assert.ok(typeof config.appLabel === 'string' && config.appLabel.length < 129 && Array.isArray(config.releases) && config.releases.every(r => /^[a-f0-9]{40}$/.test(r)));
  const owned = containers.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel);
  assert.ok(owned.length && owned.length <= 8, 'container_inventory');
  const active = [], pids = new Set(procPids);
  for (const c of containers) {
    const mounted = c.Mounts?.some(m => m.Source === config.dataDir && m.RW === true);
    if (!owned.includes(c)) { assert.ok(!mounted || !c.State?.Running, 'foreign_writer'); continue; }
    assert.ok(mounted && c.Mounts.filter(m => m.Source === config.dataDir && m.Destination === config.dataDir && m.RW === true).length === 1);
    assert.ok(!c.Mounts.some(m => /docker\.sock$/.test(m.Source) || m.Source === '/'));
    // Extra private writers or nested mounts would make the announced profile/binary view ambiguous.
    for (const mount of c.Mounts) {
      if (mount.Source === config.dataDir && mount.Destination === config.dataDir && mount.RW === true) continue;
      assert.ok(mount.Destination !== config.dataDir && !mount.Destination.startsWith(config.dataDir + '/'));
      assert.ok(mount.RW === false || mount.Type === 'tmpfs' && mount.Destination === '/tmp', 'extra_writable_mount');
    }
    const env = c.Config.Env;
    assert.ok(Array.isArray(env) && env.every(value => typeof value === 'string'), 'app_environment');
    const configured = (name, expected) => { const values = env.filter(value => value.split('=', 1)[0] === name); assert.equal(values.length, 1, 'app_environment_unique'); assert.equal(values[0], name + '=' + expected, 'app_environment_mismatch'); };
    configured('ZAP_DATA_DIR', config.dataDir);
    // These are static app invariants; only live proxy health is optional during recovery.
    if (config.proxy) {
      assert.match(config.proxy.name, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/); assert.match(config.proxy.network, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/);
      assert.ok(isIP(config.proxy.expectedPeer)); assert.ok(c.NetworkSettings?.Networks?.[config.proxy.network]);
      configured('ZAP_BIND_HOST', '0.0.0.0'); configured('ZAP_TRUSTED_PROXY_PEERS', config.proxy.expectedPeer);
      const origin = new URL(config.proxy.publicOrigin); assert.equal(origin.protocol, 'https:'); assert.equal(origin.origin, config.proxy.publicOrigin);
      configured('ZAP_PUBLIC_ORIGIN', origin.origin);
      const router = config.proxy.router ?? 'zap', middleware = config.proxy.middleware ?? 'zap-forwarding';
      assert.match(router, /^[A-Za-z0-9_-]+$/); assert.match(middleware, /^[A-Za-z0-9_-]+$/);
      const labels = c.Config.Labels; assert.equal(labels['traefik.http.routers.' + router + '.rule'], 'Host(`' + origin.host + '`)');
      assert.equal(labels['traefik.http.routers.' + router + '.middlewares'], middleware);
      const header = 'traefik.http.middlewares.' + middleware + '.headers.customrequestheaders.';
      for (const name of ['Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Port', 'X-Forwarded-Server', 'X-Real-IP']) assert.equal(labels[header + name], '');
      assert.equal(labels[header + 'X-Forwarded-Proto'], 'https');
    }
    assert.equal(c.Config.User, `${config.uid}:${config.uid}`);
    assert.equal(c.HostConfig.PidMode, 'host'); assert.equal(c.HostConfig.Privileged, false);
    assert.ok(!Object.values(c.HostConfig.PortBindings ?? {}).some(v => v?.length));
    assert.ok(config.releases.includes(c.Config.Labels['zap.release']));
    assert.deepEqual(c.Config.Cmd?.slice(0, 3), ['node', 'dist/src/main.js', 'serve']);
    assert.ok(c.Config.Cmd.length === 3 || c.Config.Cmd.length === 4 && c.Config.Cmd[3] === '--collect');
    assert.ok(['running', 'exited', 'created'].includes(c.State.Status));
    if (c.State.Running) { assert.ok(Number.isInteger(c.State.Pid) && c.State.Pid > 0); active.push(c); pids.add(c.State.Pid); }
  }
  assert.ok(active.length <= 1 && pids.size <= 1, 'multiple_writers');
  const c = active[0];
  return { running: !!c, autostart: owned.some(c => c.HostConfig.RestartPolicy.Name !== 'no'), pid: c?.State.Pid ?? 0, startTime: c?.State.StartedAt ?? null, machineId: config.machineId, profilePathHash: createHash('sha256').update(resolve(config.dataDir)).digest('hex'), profileProcesses: pids.size, mode: c?.Config.Cmd.includes('--collect') ? 'collect' : 'offline', release: c?.Config.Labels['zap.release'] ?? null };
}
function rootFile(path, mode) {
  const s = lstatSync(path); assert.ok(realpathSync(path) === resolve(path) && !s.isSymbolicLink() && s.uid === 0 && (s.mode & 0o777) === mode);
  assert.ok(mode === 0o700 ? s.isDirectory() : s.isFile() && s.nlink === 1 && s.size <= 262144);
}
const rootBootState = {
  read() { rootFile(bootDirectory, 0o700); rootFile(bootPath, 0o600); return JSON.parse(readFileSync(bootPath, 'utf8')); },
  prepare() {
    rootFile(bootDirectory, 0o700);
    try { rootFile(bootPath, 0o600); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  },
  write(state) {
    this.prepare();
    const temporary = bootDirectory + '/.boot-state-' + randomUUID(), fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
      try { writeFileSync(fd, JSON.stringify(state) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
      rootFile(temporary, 0o600); renameSync(temporary, bootPath);
      const directory = openSync(bootDirectory, constants.O_RDONLY | constants.O_DIRECTORY); try { fsyncSync(directory); } finally { closeSync(directory); }
      rootFile(bootPath, 0o600);
    } finally { try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  }
};
export async function control(config, action, release, mode, { runner = exec, procPids = [], bootState = rootBootState } = {}) {
  assert.ok(['inspect', 'inspect-runtime', 'stop', 'start', 'start-boot'].includes(action));
  assert.ok(config.bootUnit === undefined || config.bootUnit === bootUnit, 'boot_unit_scope');
  const systemctl = async args => (await runner('/usr/bin/systemctl', args, { shell: false, timeout: 70_000, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024, env: { PATH: '/usr/bin:/bin', HOME: '/root', LANG: 'C' } })).stdout;
  const bootStatus = async () => {
    if (!config.bootUnit) return { enabled: false, busy: false, mainPID: 0 };
    const state = Object.fromEntries((await systemctl(['show', '--property=UnitFileState,ActiveState,MainPID,Job', '--', bootUnit])).trim().split('\n').map(line => line.split('=')));
    assert.ok(['enabled', 'enabled-runtime', 'disabled', 'masked', 'masked-runtime'].includes(state.UnitFileState), 'boot_unit_state');
    assert.ok(['active', 'inactive', 'failed', 'activating', 'deactivating', 'reloading', 'maintenance', 'refreshing'].includes(state.ActiveState), 'boot_active_state');
    const mainPID = Number(state.MainPID); assert.ok(Number.isSafeInteger(mainPID) && mainPID >= 0 && typeof state.Job === 'string', 'boot_job_state');
    return { enabled: state.UnitFileState === 'enabled' || state.UnitFileState === 'enabled-runtime', busy: mainPID > 0 || state.Job !== '' && state.Job !== '0' || ['activating', 'deactivating', 'reloading', 'refreshing'].includes(state.ActiveState), mainPID };
  };
  const ownBootCaller = mainPID => {
    if (!mainPID) return false;
    let pid = process.pid;
    for (let depth = 0; pid > 0 && depth < 16; depth++) {
      let stat; try { stat = readFileSync('/proc/' + pid + '/stat', 'utf8'); } catch { return false; }
      if (pid === mainPID) return true;
      const parent = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
      if (!Number.isSafeInteger(parent) || parent < 0 || parent === pid) return false; pid = parent;
    }
    return false;
  };
  const run = async args => (await runner('/usr/bin/docker', args, { shell: false, timeout: 70_000, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024, env: { PATH: '/usr/bin:/bin', HOME: '/root', LANG: 'C' } })).stdout;
  const inventory = async () => {
    const ids = (await run(['ps', '--all', '--quiet'])).trim().split('\n').filter(Boolean);
    assert.ok(ids.length <= 1000 && ids.every(id => /^[a-f0-9]{12,64}$/.test(id)));
    return ids.length ? JSON.parse(await run(['inspect', '--type=container', ...ids])) : [];
  };
  const processes = () => typeof procPids === 'function' ? procPids() : procPids;
  let all, facts, boot, ownBoot = false;
  const refresh = async (stopped = false) => {
    all = await inventory(); facts = inspectContainers(config, all, typeof procPids === 'function' ? processes() : stopped ? [] : procPids); boot = await bootStatus();
    facts.autostart = boot.enabled || boot.busy && !(ownBoot && ownBootCaller(boot.mainPID)) || facts.autostart;
  };
  const candidates = () => all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel && c.Config.Labels['zap.release'] === release && c.Config.Cmd.includes('--collect') === (mode === 'collect'));
  const stopOwned = async () => {
    await refresh(); assert.ok(!boot.busy || ownBoot && ownBootCaller(boot.mainPID), 'boot_job_busy');
    if (config.bootUnit) await systemctl(['disable', '--', bootUnit]);
    for (const c of all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel)) {
      await run(['update', '--restart=no', c.Id]); if (c.State.Running) await run(['stop', '--time', '60', c.Id]);
    }
    await refresh(true); assert.ok(!facts.running && !facts.autostart && facts.profileProcesses === 0);
  };
  await refresh();
  if (action === 'start-boot') {
    assert.equal(config.bootUnit, bootUnit, 'boot_unit_missing');
    const state = await bootState.read();
    assert.ok(state && typeof state === 'object' && Object.keys(state).sort().join(',') === 'machineId,mode,profilePathHash,release,version', 'boot_state_shape');
    assert.equal(state.version, 1); assert.equal(state.machineId, facts.machineId); assert.equal(state.profilePathHash, facts.profilePathHash);
    assert.ok(config.releases.includes(state.release) && ['offline', 'collect'].includes(state.mode), 'boot_state_scope');
    release = state.release; mode = state.mode; assert.equal(candidates().length, 1, 'prepared_release_missing');
    assert.ok(!boot.busy || ownBootCaller(boot.mainPID), 'boot_job_busy'); ownBoot = true;
    // A daemon restart retains Docker's policy; clear only our own triggers before the normal start gate.
    await stopOwned();
  }
  if (action === 'inspect' || action === 'inspect-runtime') {
    if (config.proxy && action === 'inspect') {
      assert.match(config.proxy.name, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/); assert.match(config.proxy.network, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/);
      const proxy = all.filter(c => c.Name === '/' + config.proxy.name); assert.equal(proxy.length, 1); assert.equal(proxy[0].State.Running, true);
      const peer = proxy[0].NetworkSettings?.Networks?.[config.proxy.network]?.IPAddress;
      assert.equal(peer, config.proxy.expectedPeer);
      const version = (await run(['exec', proxy[0].Id, 'traefik', 'version'])).trim().split('\n')[0]; assert.match(version, /^Version:\s+[0-9.]+$/);
      facts.proxy = { version, peer, verified: true };
    }
    facts.preparedReleases = all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel).map(c => ({ release: c.Config.Labels['zap.release'], mode: c.Config.Cmd.includes('--collect') ? 'collect' : 'offline' }));
    return facts;
  }
  if (action === 'stop') {
    await stopOwned();
  } else {
    assert.ok(!facts.running && facts.profileProcesses === 0 && !facts.autostart);
    assert.ok(config.releases.includes(release) && ['offline', 'collect'].includes(mode));
    const selected = candidates(); assert.equal(selected.length, 1, 'prepared_release_missing');
    if (config.bootUnit) await bootState.prepare?.();
    await run(['start', selected[0].Id]);
    // Docker supports bounded count, not a five-minute window/delay. Three restarts then offline failure.
    await run(['update', '--restart=on-failure:3', selected[0].Id]);
  }
  await refresh(action === 'stop');
  assert.ok(action === 'stop' ? !facts.running && !facts.autostart && facts.profileProcesses === 0 : facts.running && facts.release === release && facts.mode === mode);
  if (['start', 'start-boot'].includes(action) && config.bootUnit) {
    await bootState.write({ version: 1, machineId: facts.machineId, profilePathHash: facts.profilePathHash, release: facts.release, mode: facts.mode });
    await systemctl(['enable', '--', bootUnit]);
    assert.equal((await bootStatus()).enabled, true); facts.autostart = true;
  }
  return facts;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.getuid(), 0); rootFile('/etc/zap-mcp-control', 0o700);
    rootFile('/etc/zap-mcp-control/config.json', 0o600);
    rootFile(fileURLToPath(import.meta.url), 0o755);
    let ancestor = dirname(fileURLToPath(import.meta.url));
    while (ancestor !== '/') { const s = lstatSync(ancestor); assert.ok(s.uid === 0 && !(s.mode & 0o022) && !s.isSymbolicLink()); ancestor = dirname(ancestor); }
    const config = JSON.parse(readFileSync('/etc/zap-mcp-control/config.json', 'utf8'));
    assert.equal(readFileSync('/etc/machine-id', 'utf8').trim(), config.machineId);
    assert.equal(Number(process.env.SUDO_UID), config.uid);
    const action = process.argv[2]; assert.equal(process.argv.length, action === 'start' ? 5 : 3);
    const processes = () => { const pids = [];
    for (const p of readdirSync('/proc').filter(p => /^\d+$/.test(p))) {
      try {
        if (statSync('/proc/' + p).uid !== config.uid) continue;
        const args = readFileSync('/proc/' + p + '/cmdline', 'utf8').split('\0');
        if (args.includes('serve') && args.some(a => a.endsWith('dist/src/main.js')) && readFileSync('/proc/' + p + '/environ', 'utf8').split('\0').includes('ZAP_DATA_DIR=' + config.dataDir)) pids.push(Number(p));
      } catch (error) { assert.ok(['ENOENT', 'ESRCH'].includes(error.code), 'process_ambiguous'); }
    } return pids; };
    const facts = await control(config, action, process.argv[3], process.argv[4], { procPids: processes });
    process.stdout.write(JSON.stringify(facts));
  } catch { process.stderr.write('container_control_blocked\n'); process.exitCode = 1; }
}

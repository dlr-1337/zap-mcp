#!/usr/bin/node
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, realpathSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
const exec = promisify(execFile);

export function inspectContainers(config, containers, procPids = []) {
  assert.ok(Number.isInteger(config.uid) && config.uid > 0 && /^[a-f0-9]{32}$/.test(config.machineId));
  assert.match(config.dataDir, /^\/[A-Za-z0-9_./-]+$/); assert.ok(!config.dataDir.split('/').includes('..'));
  assert.ok(typeof config.appLabel === 'string' && config.appLabel.length < 129 && Array.isArray(config.releases) && config.releases.every(r => /^[a-f0-9]{40}$/.test(r)));
  const owned = containers.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel);
  assert.ok(owned.length && owned.length <= 8, 'container_inventory');
  const active = [], pids = new Set(procPids);
  for (const c of containers) {
    const mounted = c.Mounts?.some(m => m.Source === config.dataDir && m.RW === true);
    if (!owned.includes(c)) { assert.ok(!mounted || !c.State?.Running, 'foreign_writer'); continue; }
    assert.ok(mounted && c.Mounts.some(m => m.Source === config.dataDir && m.Destination === config.dataDir && m.RW));
    assert.ok(!c.Mounts.some(m => /docker\.sock$/.test(m.Source) || m.Source === '/'));
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
export async function control(config, action, release, mode, { runner = exec, procPids = [] } = {}) {
  assert.ok(['inspect', 'inspect-runtime', 'stop', 'start'].includes(action));
  const run = async args => (await runner('/usr/bin/docker', args, { shell: false, timeout: 70_000, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024, env: { PATH: '/usr/bin:/bin', HOME: '/root', LANG: 'C' } })).stdout;
  const inventory = async () => {
    const ids = (await run(['ps', '--all', '--quiet'])).trim().split('\n').filter(Boolean);
    assert.ok(ids.length <= 1000 && ids.every(id => /^[a-f0-9]{12,64}$/.test(id)));
    return ids.length ? JSON.parse(await run(['inspect', '--type=container', ...ids])) : [];
  };
  const processes = () => typeof procPids === 'function' ? procPids() : procPids;
  let all = await inventory(), facts = inspectContainers(config, all, processes());
  if (action === 'inspect' || action === 'inspect-runtime') {
    if (config.proxy && action === 'inspect') {
      assert.match(config.proxy.name, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/); assert.match(config.proxy.network, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/);
      const proxy = all.filter(c => c.Name === '/' + config.proxy.name); assert.equal(proxy.length, 1); assert.equal(proxy[0].State.Running, true);
      const peer = proxy[0].NetworkSettings?.Networks?.[config.proxy.network]?.IPAddress;
      assert.equal(peer, config.proxy.expectedPeer);
      for (const c of all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel)) {
        assert.ok(c.NetworkSettings?.Networks?.[config.proxy.network]);
        const env = c.Config.Env ?? []; assert.ok(env.includes('ZAP_TRUSTED_PROXY_PEERS=' + peer)); assert.ok(env.includes('ZAP_DATA_DIR=' + config.dataDir));
        const origin = new URL(config.proxy.publicOrigin); assert.equal(origin.protocol, 'https:'); assert.equal(origin.origin, config.proxy.publicOrigin); assert.ok(env.includes('ZAP_PUBLIC_ORIGIN=' + origin.origin));
        const router = config.proxy.router ?? 'zap', middleware = config.proxy.middleware ?? 'zap-forwarding';
        assert.match(router, /^[A-Za-z0-9_-]+$/); assert.match(middleware, /^[A-Za-z0-9_-]+$/);
        const labels = c.Config.Labels; assert.equal(labels['traefik.http.routers.' + router + '.rule'], 'Host(`' + origin.host + '`)');
        assert.equal(labels['traefik.http.routers.' + router + '.middlewares'], middleware);
        const header = 'traefik.http.middlewares.' + middleware + '.headers.customrequestheaders.';
        for (const name of ['Forwarded', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Port', 'X-Forwarded-Server', 'X-Real-IP']) assert.equal(labels[header + name], '');
        assert.equal(labels[header + 'X-Forwarded-Proto'], 'https');
      }
      const version = (await run(['exec', proxy[0].Id, 'traefik', 'version'])).trim().split('\n')[0]; assert.match(version, /^Version:\s+[0-9.]+$/);
      facts.proxy = { version, peer, verified: true };
    }
    facts.preparedReleases = all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel).map(c => ({ release: c.Config.Labels['zap.release'], mode: c.Config.Cmd.includes('--collect') ? 'collect' : 'offline' }));
    return facts;
  }
  if (action === 'stop') {
    for (const c of all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel)) {
      await run(['update', '--restart=no', c.Id]);
      if (c.State.Running) await run(['stop', '--time', '60', c.Id]);
    }
  } else {
    assert.ok(!facts.running && facts.profileProcesses === 0 && !facts.autostart);
    assert.ok(config.releases.includes(release) && ['offline', 'collect'].includes(mode));
    const candidates = all.filter(c => c.Config?.Labels?.['zap.archive'] === config.appLabel && c.Config.Labels['zap.release'] === release && c.Config.Cmd.includes('--collect') === (mode === 'collect'));
    assert.equal(candidates.length, 1, 'prepared_release_missing');
    await run(['start', candidates[0].Id]);
    // Docker supports bounded count, not a five-minute window/delay. Three restarts then offline failure.
    await run(['update', '--restart=on-failure:3', candidates[0].Id]);
  }
  all = await inventory(); facts = inspectContainers(config, all, typeof procPids === 'function' ? processes() : action === 'stop' ? [] : procPids);
  assert.ok(action === 'stop' ? !facts.running && !facts.autostart && facts.profileProcesses === 0 : facts.running && facts.release === release && facts.mode === mode);
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

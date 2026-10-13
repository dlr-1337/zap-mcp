import { accessSync, constants, lstatSync, realpathSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { request } from 'node:https';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const runFile = promisify(execFile);
const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
export const dependencyNames = ['source', 'target', 'publicOrigin', 'proxy', 'supervisor', 'persistentVolume', 'offsite', 'recoveryKeyReference'];
const reasons = new Set(['configuration_missing', 'configuration_invalid', 'probe_failed', 'identity_mismatch', 'runtime_unsupported', 'facts_incomplete', 'capacity_insufficient', 'key_not_independent', 'fresh_probe_required', 'observed']);
const inside = (path, parent) => path === parent || path.startsWith(parent + sep);
function requirePrivate(path, directory = false) {
  assert.ok(isAbsolute(path)); const st = lstatSync(path), canonical = realpathSync(path);
  assert.ok(!inside(canonical, root) && canonical === resolve(path) && !st.isSymbolicLink());
  assert.ok(directory ? st.isDirectory() : st.isFile());
  assert.equal(st.mode & 0o777, directory ? 0o700 : 0o600);
  assert.equal(st.uid, process.getuid()); return canonical;
}
function safePath(path) { assert.ok(typeof path === 'string' && /^\/[A-Za-z0-9_./-]+$/.test(path) && !path.split('/').includes('..')); return path; }
function safeHost(host) { assert.ok(typeof host === 'string' && /^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/.test(host)); return host; }
export function validateConfig(config) {
  assert.ok(config && typeof config === 'object' && !Array.isArray(config));
  assert.ok(Object.keys(config).every(k => [...dependencyNames, 'evidenceDir', 'capacity'].includes(k)));
  requirePrivate(config.evidenceDir, true);
  for (const key of ['source', 'target', 'offsite']) {
    const host = config[key]; if (!host) continue;
    assert.ok(host.kind === 'local' && key === 'source' || host.kind === 'ssh');
    assert.ok(typeof host.machineId === 'string' && /^[a-f0-9]{32}$/.test(host.machineId));
    if (host.kind === 'ssh') {
      safeHost(host.host); assert.match(host.user, /^[a-z_][a-z0-9_-]{0,31}$/);
      requirePrivate(host.knownHostsFile); requirePrivate(host.identityFile);
      assert.ok(Number.isInteger(host.port ?? 22) && (host.port ?? 22) > 0 && (host.port ?? 22) <= 65535);
    }
    if (key !== 'offsite') { safePath(host.dataDir); safePath(host.appRoot); }
  }
  if (config.publicOrigin) { const u = new URL(config.publicOrigin); assert.ok(u.protocol === 'https:' && u.origin === config.publicOrigin && !u.username && !u.password); }
  if (config.proxy) { assert.ok(['nginx', 'caddy'].includes(config.proxy.kind)); safePath(config.proxy.configFile); assert.ok(typeof config.proxy.expectedConfigDigest === 'string' && /^[a-f0-9]{64}$/.test(config.proxy.expectedConfigDigest)); }
  if (config.supervisor) { assert.equal(config.supervisor.kind, 'systemd'); assert.match(config.supervisor.unit, /^[A-Za-z0-9_.@-]+\.service$/); }
  if (config.persistentVolume) { safePath(config.persistentVolume.path); safePath(config.persistentVolume.releaseRoot); }
  return config;
}

// This function is serialized into a fixed node probe; it never imports application startup.
async function hostProbe(scope) {
  const fs = await import('node:fs/promises'), cp = await import('node:child_process'), util = await import('node:util');
  const exec = util.promisify(cp.execFile), os = await import('node:os'), path = await import('node:path');
  const out = { machineId: (await fs.readFile('/etc/machine-id', 'utf8')).trim(), os: os.platform(), node: process.version };
  const sub = async (command, argv, env) => (await exec(command, argv, { timeout: 8000, killSignal: 'SIGKILL', maxBuffer: 65536, shell: false, env })).stdout;
  if (scope.dataDir) {
    const st = await fs.lstat(scope.dataDir), canonical = await fs.realpath(scope.dataDir);
    out.privateData = st.isDirectory() && !st.isSymbolicLink() && canonical === scope.dataDir && (st.mode & 0o777) === 0o700 && st.uid === process.getuid();
    out.processes = [];
    for (const pid of (await fs.readdir('/proc')).filter(p => /^\d+$/.test(p))) {
      try {
        const argv = (await fs.readFile('/proc/' + pid + '/cmdline', 'utf8')).split('\0');
        if (argv.some(a => a === path.join(scope.appRoot, 'dist/src/main.js')) || argv.includes('dist/src/main.js') && await fs.readlink('/proc/' + pid + '/cwd') === scope.appRoot) {
          out.processes.push({ pid: Number(pid), collect: argv.includes('--collect') });
        }
      } catch { /* process exited or inaccessible */ }
    }
    const { createRequire } = await import('node:module'), req = createRequire(path.join(scope.appRoot, 'package.json'));
    const Database = req('better-sqlite3'), db = new Database(':memory:');
    try { db.exec('CREATE VIRTUAL TABLE probe USING fts5(text)'); out.sqlite = db.prepare('SELECT sqlite_version() AS version').get().version; out.fts = true; } finally { db.close(); }
  }
  if (scope.supervisor) {
    const text = await sub('systemctl', ['show', scope.supervisor.unit, '--no-pager', '--property=LoadState,ActiveState,UnitFileState,MainPID,User']);
    out.supervisor = Object.fromEntries(text.trim().split('\n').map(line => line.split('=')));
    out.supervisor.version = (await sub('systemctl', ['--version'])).split('\n')[0];
  }
  if (scope.proxy) {
    const crypto = await import('node:crypto');
    const file = await fs.readFile(scope.proxy.configFile);
    out.proxy = { digest: crypto.createHash('sha256').update(file).digest('hex') };
    // nginx reports its version on stderr; execFile still captures it privately.
    const result = await exec(scope.proxy.kind, scope.proxy.kind === 'nginx' ? ['-v'] : ['version'], { timeout: 8000, killSignal: 'SIGKILL', maxBuffer: 65536, shell: false });
    out.proxy.version = (result.stdout || result.stderr).trim();
  }
  if (scope.volume) {
    const st = await fs.lstat(scope.volume.path), canonical = await fs.realpath(scope.volume.path), disk = await fs.statfs(canonical, { bigint: true });
    out.volume = { path: canonical, private: st.isDirectory() && !st.isSymbolicLink() && canonical === scope.volume.path && (st.mode & 0o777) === 0o700 && st.uid === process.getuid(), availableBytes: String(disk.bavail * disk.bsize), availableInodes: String(disk.ffree), mount: await sub('findmnt', ['--json', '--target', canonical, '--output', 'TARGET,SOURCE,FSTYPE,OPTIONS']) };
  }
  return out;
}

export function probeCommand(host, scope) {
  const code = '(' + hostProbe.toString() + ')(' + JSON.stringify(scope) + ').then(r=>process.stdout.write(JSON.stringify(r))).catch(()=>process.exitCode=1)';
  if (host.kind === 'local') return [process.execPath, ['-e', code]];
  safeHost(host.host);
  // SSH invokes a remote shell: only a constant expression plus base64 reaches it.
  const encoded = Buffer.from(code).toString('base64');
  return ['ssh', ['-F', '/dev/null', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UpdateHostKeys=no', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=8', '-o', 'ConnectionAttempts=1', '-o', 'UserKnownHostsFile=' + host.knownHostsFile, '-i', host.identityFile, '-p', String(host.port ?? 22), '-l', host.user, '--', host.host, "node -e 'eval(Buffer.from(\"" + encoded + "\",\"base64\").toString())'"]];
}
export async function probeHost(host, scope, { signal, runner = runFile } = {}) {
  const [command, argv] = probeCommand(host, scope);
  const { stdout } = await runner(command, argv, { timeout: 10000, killSignal: 'SIGKILL', maxBuffer: 262144, shell: false, signal });
  const facts = JSON.parse(stdout); assert.equal(facts.machineId, host.machineId); return facts;
}
async function tlsProbe(origin, signal) {
  return new Promise((yes, no) => {
    const req = request(origin + '/api/session', { method: 'HEAD', rejectUnauthorized: true, signal }, res => {
      const ok = req.socket.authorized && [200, 401, 403, 405].includes(res.statusCode); res.destroy(); yes({ verified: ok });
    });
    const timer = setTimeout(() => req.destroy(Error('timeout')), 10000);
    req.once('close', () => clearTimeout(timer)); req.once('error', no); req.end();
  });
}
function item(status, reason, evidence) { return { status, reason, ...(evidence === undefined ? {} : { evidence }) }; }
export function publicReceipt(receipt) {
  return { version: 1, status: receipt.status === 'ready' ? 'ready' : 'blocked', dependencies: Object.fromEntries(dependencyNames.map(key => {
    const d = receipt.dependencies?.[key]; return [key, { status: ['observed', 'missing', 'unverified'].includes(d?.status) ? d.status : 'unverified', reason: reasons.has(d?.reason) ? d.reason : 'facts_incomplete' }];
  })) };
}
function save(receipt, dir) {
  const temporary = join(dir, '.environment-' + randomUUID());
  try { writeFileSync(temporary, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); renameSync(temporary, join(dir, 'environment.json')); }
  finally { try { unlinkSync(temporary); } catch {} }
}
export async function discover({ configFile = process.env.ZAP_OPERATION_CONFIG_FILE, evidenceDir, signal } = {}) {
  let config, invalid = false;
  if (configFile) { try { requirePrivate(configFile); config = validateConfig(JSON.parse(readFileSync(configFile, 'utf8'))); } catch { invalid = true; } }
  const dir = config?.evidenceDir ?? evidenceDir ?? mkdtempSync(join(tmpdir(), 'zap-operation-'));
  requirePrivate(dir, true);
  const receipt = { version: 1, runId: randomUUID(), observedAt: new Date().toISOString(), status: 'blocked', dependencies: Object.fromEntries(dependencyNames.map(key => [key, item('missing', invalid ? 'configuration_invalid' : 'configuration_missing')])) };
  if (config) {
    for (const key of ['source', 'target']) if (config[key]) {
      try {
        const facts = await probeHost(config[key], { dataDir: config[key].dataDir, appRoot: config[key].appRoot, ...(key === 'target' ? { supervisor: config.supervisor, proxy: config.proxy, volume: config.persistentVolume } : {}) }, { signal });
        receipt.dependencies[key] = item(facts.os === 'linux' && facts.node === 'v24.21.0' && facts.fts && facts.privateData ? 'observed' : 'unverified', 'runtime_unsupported', facts);
        if (receipt.dependencies[key].status === 'observed') receipt.dependencies[key].reason = 'observed';
        if (key === 'target') {
          if (config.supervisor) receipt.dependencies.supervisor = item(facts.supervisor?.LoadState === 'loaded' && facts.supervisor?.UnitFileState === 'enabled' && facts.supervisor?.ActiveState === 'active' ? 'observed' : 'unverified', 'facts_incomplete', facts.supervisor);
          if (config.proxy) receipt.dependencies.proxy = item(facts.proxy?.digest === config.proxy.expectedConfigDigest && !!facts.proxy.version ? 'observed' : 'unverified', 'facts_incomplete', facts.proxy);
          if (config.persistentVolume) receipt.dependencies.persistentVolume = item('unverified', 'facts_incomplete', facts.volume);
        }
      } catch { receipt.dependencies[key] = item('unverified', 'probe_failed'); }
    }
    if (config.publicOrigin) {
      try { const facts = await tlsProbe(config.publicOrigin, signal); receipt.dependencies.publicOrigin = item(facts.verified ? 'observed' : 'unverified', 'facts_incomplete', facts); }
      catch { receipt.dependencies.publicOrigin = item('unverified', 'probe_failed'); }
    }
  }
  save(receipt, dir); return receipt;
}
export async function assertReady(options = {}) {
  // Always re-probe. Saved JSON is never a source of authorization.
  const receipt = await discover(options);
  assert.equal(receipt.status, 'ready', 'environment_blocked');
  assert.ok(Date.now() - Date.parse(receipt.observedAt) <= 15 * 60 * 1000); return receipt;
}
export async function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-self-'));
  const r = await discover({ evidenceDir: dir, configFile: undefined }); assert.equal(r.status, 'blocked');
  assert.equal(publicReceipt({ ...r, private: 'sensitive' }).private, undefined);
  return { passed: true };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.umask(0o077);
  try {
    assert.ok(process.argv.length === 4 && process.argv[2] === '--mode');
    const mode = process.argv[3]; assert.ok(['discover', 'assert-ready', 'self-test'].includes(mode));
    const result = mode === 'self-test' ? await selfTest() : publicReceipt(await (mode === 'discover' ? discover() : assertReady()));
    console.log(JSON.stringify(result));
  } catch { console.log(JSON.stringify({ status: 'blocked', error: 'environment_verification_failed' })); process.exitCode = 1; }
}

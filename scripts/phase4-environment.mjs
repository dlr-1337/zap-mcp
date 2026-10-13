import { lstatSync, realpathSync, readFileSync, writeFileSync, mkdtempSync, renameSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { request } from 'node:https';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { assertSupervisorFacts } from '../dist/src/operation.js';

const runFile = promisify(execFile);
const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
export const dependencyNames = ['source', 'target', 'publicOrigin', 'proxy', 'supervisor', 'persistentVolume', 'offsite', 'recoveryKeyReference'];
const reasons = new Set(['configuration_missing', 'configuration_invalid', 'probe_failed', 'identity_mismatch', 'runtime_unsupported', 'facts_incomplete', 'capacity_insufficient', 'key_not_independent', 'target_offsite_access_unverified', 'recovery_decryption_unverified', 'fresh_probe_required', 'observed']);
const inside = (path, parent) => path === parent || path.startsWith(parent + sep);
function requirePrivate(path, directory = false) {
  assert.ok(isAbsolute(path)); const st = lstatSync(path), canonical = realpathSync(path);
  assert.ok(!inside(canonical, root) && canonical === resolve(path) && !st.isSymbolicLink());
  assert.ok(directory ? st.isDirectory() : st.isFile());
  if (!directory) assert.ok(st.size <= 262144);
  assert.equal(st.mode & 0o777, directory ? 0o700 : 0o600);
  assert.equal(st.uid, process.getuid()); return canonical;
}
function safePath(path) { assert.ok(typeof path === 'string' && /^\/[A-Za-z0-9_./-]+$/.test(path) && !path.split('/').includes('..')); return path; }
function localPath(path) { assert.ok(typeof path === 'string' && /^\/[A-Za-z0-9_./ -]+$/.test(path) && path === resolve(path)); return path; }
function safeHost(host) { assert.ok(typeof host === 'string' && /^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/.test(host)); return host; }
export function validateConfig(config) {
  assert.ok(config && typeof config === 'object' && !Array.isArray(config));
  assert.ok(Object.keys(config).every(k => [...dependencyNames, 'evidenceDir', 'capacity'].includes(k)));
  requirePrivate(config.evidenceDir, true);
  for (const key of ['source', 'target', 'offsite']) {
    const host = config[key]; if (!host) continue;
    assert.ok(Object.keys(host).every(k => ['kind', 'machineId', 'host', 'user', 'port', 'dataDir', 'appRoot', 'knownHostsFile', 'identityFile', 'storagePath', 'configFile', 'nodePath'].includes(k)));
    assert.ok(host.kind === 'local' && ['source', 'offsite'].includes(key) || host.kind === 'ssh');
    assert.ok(typeof host.machineId === 'string' && /^[a-f0-9]{32}$/.test(host.machineId));
    if (host.kind === 'ssh') {
      safeHost(host.host); assert.match(host.user, /^[a-z_][a-z0-9_-]{0,31}$/);
      if (host.nodePath) safePath(host.nodePath);
      requirePrivate(host.knownHostsFile); requirePrivate(host.identityFile);
      assert.ok(Number.isInteger(host.port ?? 22) && (host.port ?? 22) > 0 && (host.port ?? 22) <= 65535);
    }
    if (key !== 'offsite') { const checkPath = host.kind === 'local' ? localPath : safePath; checkPath(host.dataDir); checkPath(host.appRoot); assert.ok(!inside(host.dataDir, host.appRoot)); }
  }
  if (config.publicOrigin) { const u = new URL(config.publicOrigin); assert.ok(u.protocol === 'https:' && u.origin === config.publicOrigin && !u.username && !u.password); }
  if (config.proxy) { assert.ok(['nginx', 'caddy', 'traefik'].includes(config.proxy.kind)); safePath(config.proxy.configFile); assert.ok(typeof config.proxy.expectedConfigDigest === 'string' && /^[a-f0-9]{64}$/.test(config.proxy.expectedConfigDigest)); }
  if (config.supervisor) { assert.ok(['systemd', 'docker'].includes(config.supervisor.kind)); if (config.supervisor.kind === 'systemd') assert.match(config.supervisor.unit, /^[A-Za-z0-9_.@-]+\.service$/); else { assert.match(config.supervisor.helperPath, /^\/usr\/local\/libexec\/[A-Za-z0-9_.-]+$/); assert.match(config.supervisor.name, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/); } }
  if (config.persistentVolume) { safePath(config.persistentVolume.path); safePath(config.persistentVolume.releaseRoot); }
  if (config.target && config.persistentVolume) assert.equal(config.target.dataDir, config.persistentVolume.path);
  for (const host of [config.source, config.target].filter(Boolean)) { assert.equal(host.dataDir, resolve(host.dataDir)); assert.equal(host.appRoot, resolve(host.appRoot)); }
  if (config.offsite) { safePath(config.offsite.storagePath); if (config.offsite.kind === 'local') requirePrivate(config.offsite.configFile); }
  if (config.recoveryKeyReference) { safePath(config.recoveryKeyReference.path); assert.ok(config.recoveryKeyReference.host === 'offsite'); }
  if (config.capacity) assert.ok(Object.values(config.capacity).every(v => Number.isSafeInteger(v) && v >= 0));
  return config;
}

export function capacityRequired({ archiveBytes, archiveFiles, queueZipBytes, queueZipFiles, availableBytes, availableInodes }) {
  for (const value of [archiveBytes, archiveFiles, queueZipBytes, queueZipFiles, availableBytes, availableInodes]) assert.ok(Number.isSafeInteger(value) && value >= 0);
  const payload = archiveBytes * 5 + queueZipBytes, reserve = Math.max(256 * 1024 * 1024, Math.ceil(payload * 0.05));
  const requiredBytes = payload + reserve, requiredInodes = archiveFiles * 5 + queueZipFiles + 32;
  assert.ok(Number.isSafeInteger(requiredBytes) && Number.isSafeInteger(requiredInodes));
  return { requiredBytes, requiredInodes, reserve, sufficient: availableBytes >= requiredBytes && availableInodes >= requiredInodes };
}
export function offsiteIndependent(offsite, target) {
  return !!(offsite && target && offsite.kind === 'ssh' && offsite.ownerAccess === true && offsite.machineId !== target.machineId);
}

// This function is serialized into a fixed node probe; it never imports application startup.
async function hostProbe(scope) {
  const deadline = setTimeout(() => process.exit(1), 20000); deadline.unref();
  const fs = await import('node:fs/promises'), cp = await import('node:child_process'), util = await import('node:util');
  const exec = util.promisify(cp.execFile), os = await import('node:os'), path = await import('node:path');
  const out = { machineId: (await fs.readFile('/etc/machine-id', 'utf8')).trim(), os: os.platform(), node: process.version };
  const sub = async (command, argv, env) => (await exec(command, argv, { timeout: 8000, killSignal: 'SIGKILL', maxBuffer: 65536, shell: false, env })).stdout;
  if (scope.dataDir) {
    const st = await fs.lstat(scope.dataDir), canonical = await fs.realpath(scope.dataDir);
    out.privateData = st.isDirectory() && !st.isSymbolicLink() && canonical === scope.dataDir && (st.mode & 0o777) === 0o700 && st.uid === process.getuid();
    let bytes = 0, files = 0, scanned = 0;
    const measure = async dir => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        if (++scanned > 100000) throw Error('inventory_limit');
        const name = path.join(dir, entry.name), meta = await fs.lstat(name);
        if (meta.isSymbolicLink() || !meta.isFile() && !meta.isDirectory()) throw Error('inventory_type');
        if (meta.isDirectory()) await measure(name); else { bytes += meta.size; files++; }
      }
    };
    await measure(scope.dataDir); out.archive = { bytes, files, measuredAt: new Date().toISOString() };
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
    try {
      const auth = new Database(path.join(scope.dataDir, 'auth.sqlite'), { readonly: true });
      try { const crypto = await import('node:crypto'); const row = auth.prepare('SELECT creds FROM whatsapp_profile WHERE id=1').get(); const pub = row && JSON.parse(row.creds).signedIdentityKey?.public; if (pub?.type === 'Buffer' && Buffer.from(pub.data, 'base64').length === 32) out.profile = crypto.createHash('sha256').update(Buffer.from(pub.data, 'base64')).digest('hex'); } finally { auth.close(); }
    } catch { /* empty target preparation has no account yet */ }
  }
  if (scope.supervisor) {
    if (scope.supervisor.kind === 'docker') {
      const facts = JSON.parse(await sub('/usr/bin/sudo', ['-n', scope.supervisor.helperPath, scope.recovery ? 'inspect-runtime' : 'inspect']));
      const { pathToFileURL } = await import('node:url');
      const operation = await import(pathToFileURL(path.join(scope.appRoot, 'dist/src/operation.js')).href);
      operation.assertSupervisorFacts({ machineId: out.machineId, dataDir: scope.dataDir }, facts);
      out.supervisor = facts; out.supervisor.version = 'bounded-docker-helper';
    } else {
    const text = await sub('systemctl', ['show', scope.supervisor.unit, '--no-pager', '--property=LoadState,ActiveState,UnitFileState,MainPID,User']);
    out.supervisor = Object.fromEntries(text.trim().split('\n').map(line => line.split('=')));
    out.supervisor.version = (await sub('systemctl', ['--version'])).split('\n')[0];
    }
  }
  if (scope.proxy) {
    const crypto = await import('node:crypto');
    if ((await fs.stat(scope.proxy.configFile)).size > 262144) throw Error('proxy_limit');
    const file = await fs.readFile(scope.proxy.configFile);
    out.proxy = { digest: crypto.createHash('sha256').update(file).digest('hex') };
    // nginx reports its version on stderr; execFile still captures it privately.
    if (scope.proxy.kind === 'traefik') {
      // The root-owned helper checks the existing proxy container/network and returns only version/peer.
      const current = scope.supervisor?.kind === 'docker' && out.supervisor?.proxy;
      const facts = current?.verified === true && current.version && current.peer ? out.supervisor : JSON.parse(await sub('/usr/bin/sudo', ['-n', scope.supervisor.helperPath, 'inspect']));
      const { pathToFileURL } = await import('node:url');
      const operation = await import(pathToFileURL(path.join(scope.appRoot, 'dist/src/operation.js')).href);
      operation.assertSupervisorFacts({ machineId: out.machineId, dataDir: scope.dataDir }, facts);
      out.proxy.version = facts.proxy?.version; out.proxy.peer = facts.proxy?.peer; out.proxy.verified = facts.proxy?.verified === true;
    } else { const result = await exec(scope.proxy.kind, scope.proxy.kind === 'nginx' ? ['-v'] : ['version'], { timeout: 8000, killSignal: 'SIGKILL', maxBuffer: 65536, shell: false }); out.proxy.version = (result.stdout || result.stderr).trim(); }
  }
  if (scope.volume) {
    const st = await fs.lstat(scope.volume.path), canonical = await fs.realpath(scope.volume.path), disk = await fs.statfs(canonical, { bigint: true });
    out.volume = { path: canonical, private: st.isDirectory() && !st.isSymbolicLink() && canonical === scope.volume.path && (st.mode & 0o777) === 0o700 && st.uid === process.getuid(), availableBytes: String(disk.bavail * disk.bsize), availableInodes: String(disk.ffree), mount: await sub('findmnt', ['--json', '--target', canonical, '--output', 'TARGET,SOURCE,FSTYPE,OPTIONS']) };
  }
  if (scope.recoveryKey) {
    const key = await fs.lstat(scope.recoveryKey.path);
    out.keyAccessible = key.isFile() && !key.isSymbolicLink() && (key.mode & 0o777) === 0o600 && key.uid === process.getuid();
    await fs.access(scope.recoveryKey.path, 4); // metadata/access only, never read a key.
  }
  return out;
}

export function probeCommand(host, scope) {
  const code = '(' + hostProbe.toString() + ')(' + JSON.stringify(scope) + ').then(r=>process.stdout.write(JSON.stringify(r))).catch(()=>process.exitCode=1)';
  if (host.kind === 'local') return [process.execPath, ['-e', code]];
  safeHost(host.host);
  // SSH invokes a remote shell: only a constant expression plus base64 reaches it.
  const encoded = Buffer.from(code).toString('base64');
  const node = host.nodePath ? safePath(host.nodePath) : 'node';
  return ['ssh', ['-F', '/dev/null', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UpdateHostKeys=no', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=8', '-o', 'ConnectionAttempts=1', '-o', 'UserKnownHostsFile=' + host.knownHostsFile, '-i', host.identityFile, '-p', String(host.port ?? 22), '-l', host.user, '--', host.host, node + " -e 'eval(Buffer.from(\"" + encoded + "\",\"base64\").toString())'"]];
}
export async function probeHost(host, scope, { signal, runner = runFile } = {}) {
  const [command, argv] = probeCommand(host, scope);
  const { stdout } = await runner(command, argv, { timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 262144, shell: false, signal });
  const facts = JSON.parse(stdout); assert.equal(facts.machineId, host.machineId);
  if (scope.supervisor?.kind === 'docker') assertSupervisorFacts({ machineId: host.machineId, dataDir: scope.dataDir }, facts.supervisor);
  return facts;
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
    for (const key of dependencyNames) if (config[key]) receipt.dependencies[key] = item('unverified', 'facts_incomplete');
    for (const key of ['source', 'target']) if (config[key]) {
      try {
        const facts = await probeHost(config[key], { dataDir: config[key].dataDir, appRoot: config[key].appRoot, ...(key === 'target' ? { supervisor: config.supervisor, proxy: config.proxy, volume: config.persistentVolume } : {}) }, { signal });
        receipt.dependencies[key] = item(facts.os === 'linux' && facts.node === 'v24.21.0' && facts.fts && facts.privateData ? 'observed' : 'unverified', 'runtime_unsupported', facts);
        if (receipt.dependencies[key].status === 'observed') receipt.dependencies[key].reason = 'observed';
        if (key === 'target') {
          if (config.supervisor) { const ok = config.supervisor.kind === 'docker' ? facts.supervisor?.machineId === config.target.machineId && (facts.supervisor.running && facts.supervisor.profileProcesses === 1 || !facts.supervisor.running && facts.supervisor.profileProcesses === 0 && !facts.supervisor.autostart) : facts.supervisor?.LoadState === 'loaded' && facts.supervisor?.UnitFileState === 'enabled' && facts.supervisor?.ActiveState === 'active' && facts.supervisor?.User === config.target.user && facts.processes.some(p => String(p.pid) === facts.supervisor.MainPID); receipt.dependencies.supervisor = item(ok ? 'observed' : 'unverified', 'facts_incomplete', facts.supervisor); }
          if (config.proxy) receipt.dependencies.proxy = item(facts.proxy?.digest === config.proxy.expectedConfigDigest && !!facts.proxy.version && (config.proxy.kind !== 'traefik' || facts.proxy.verified) ? 'observed' : 'unverified', 'facts_incomplete', facts.proxy);
          if (config.persistentVolume) {
            const archive = receipt.dependencies.source.evidence?.archive, volume = facts.volume;
            let capacity;
            try { capacity = capacityRequired({ archiveBytes: archive.bytes, archiveFiles: archive.files, queueZipBytes: config.capacity.queueZipBytes, queueZipFiles: config.capacity.queueZipFiles, availableBytes: Number(volume.availableBytes), availableInodes: Number(volume.availableInodes) }); } catch {}
            const outside = volume && !inside(volume.path, config.persistentVolume.releaseRoot) && !inside(volume.path, config.target.appRoot);
            const mount = volume && JSON.parse(volume.mount).filesystems?.[0];
            const persistent = mount && !['tmpfs', 'ramfs', 'overlay'].includes(mount.fstype) && !mount.options.split(',').includes('ro');
            receipt.dependencies.persistentVolume = item(capacity?.sufficient && volume.private && outside && persistent ? 'observed' : 'unverified', capacity && !capacity.sufficient ? 'capacity_insufficient' : 'facts_incomplete', { ...volume, capacity });
          }
        }
      } catch { receipt.dependencies[key] = item('unverified', 'probe_failed'); }
    }
    if (config.publicOrigin) {
      try { const facts = await tlsProbe(config.publicOrigin, signal); receipt.dependencies.publicOrigin = item(facts.verified ? 'observed' : 'unverified', 'facts_incomplete', facts); }
      catch { receipt.dependencies.publicOrigin = item('unverified', 'probe_failed'); }
    }
    if (config.offsite?.kind === 'local') {
      try {
        const machineId = readFileSync('/etc/machine-id', 'utf8').trim(); assert.equal(machineId, config.offsite.machineId); assert.notEqual(machineId, config.target.machineId);
        requirePrivate(config.offsite.storagePath, true); requirePrivate(config.recoveryKeyReference.path);
        const { readOffsiteConfig, recoverOffsiteCopy } = await import('../dist/src/offsite.js');
        const pull = readOffsiteConfig(config.offsite.configFile); assert.equal(pull.role, 'pull'); assert.equal(pull.identityFile, config.recoveryKeyReference.path); assert.equal(pull.destinationDir, config.offsite.storagePath);
        const statePath = join(pull.operationDir, 'offsite-state.json'); requirePrivate(statePath);
        const state = JSON.parse(readFileSync(statePath, 'utf8')), id = state.lastVerifiedSuccess?.operationId;
        assert.ok(id && state.result === 'success');
        const work = mkdtempSync(join(config.offsite.storagePath, '.environment-readback-'));
        try {
          const recovered = await recoverOffsiteCopy(pull, id, join(work, 'verified'));
          const { validateSnapshot } = await import('../dist/src/backup.js');
          assert.equal(validateSnapshot(recovered.snapshotDir).manifest.profile, receipt.dependencies.source.evidence?.profile);
          assert.ok(Date.now() - Date.parse(recovered.receipt.snapshotCreatedAt) <= 86400000);
          receipt.dependencies.offsite = item('observed', 'observed', { recovered: true, observedAt: new Date().toISOString(), snapshotCreatedAt: recovered.receipt.snapshotCreatedAt });
          receipt.dependencies.recoveryKeyReference = item('observed', 'observed', { independentlyAccessible: true, decryptedActualCopy: true });
        } finally { rmSync(work, { recursive: true }); }
      } catch { receipt.dependencies.offsite = item('unverified', 'target_offsite_access_unverified'); receipt.dependencies.recoveryKeyReference = item('unverified', 'recovery_decryption_unverified'); }
    } else if (config.offsite) {
      try {
        const facts = await probeHost(config.offsite, { volume: { path: config.offsite.storagePath }, recoveryKey: config.recoveryKeyReference }, { signal });
        const independent = offsiteIndependent({ ...config.offsite, ownerAccess: true }, config.target);
        receipt.dependencies.offsite = item('unverified', independent ? 'target_offsite_access_unverified' : 'key_not_independent', facts);
        if (config.recoveryKeyReference) receipt.dependencies.recoveryKeyReference = item('unverified', independent && facts.keyAccessible ? 'recovery_decryption_unverified' : 'key_not_independent', { independentlyAccessible: independent && facts.keyAccessible });
        // Host access and readable key metadata do not prove the encryption tool or recovery.
        // The adapter is chosen only after its existing backend/version is inventoried.
      } catch { receipt.dependencies.offsite = item('unverified', 'probe_failed'); }
    }
  }
  for (const dependency of Object.values(receipt.dependencies)) if (dependency.status === 'observed') dependency.reason = 'observed';
  receipt.status = Object.values(receipt.dependencies).every(d => d.status === 'observed') ? 'ready' : 'blocked';
  save(receipt, dir); return receipt;
}
export async function assertReady(options = {}) {
  // Always re-probe. Saved JSON is never a source of authorization.
  const receipt = await discover(options);
  assert.equal(receipt.status, 'ready', 'environment_blocked');
  assert.ok(Date.now() - Date.parse(receipt.observedAt) <= 15 * 60 * 1000); return receipt;
}
export async function assertRecoveryReady({ configFile, signal, runner } = {}) {
  requirePrivate(configFile);
  const stored = JSON.parse(readFileSync(configFile, 'utf8'));
  // Recovery needs this host/profile/runtime, not a working HTTP listener or last successful backup.
  const config = validateConfig({ evidenceDir: stored.evidenceDir, target: stored.target, supervisor: stored.supervisor, persistentVolume: stored.persistentVolume });
  assert.ok(config.target && config.supervisor?.kind === 'docker' && config.persistentVolume);
  const facts = await probeHost(config.target, { dataDir: config.target.dataDir, appRoot: config.target.appRoot, supervisor: config.supervisor, volume: config.persistentVolume, recovery: true }, { signal, runner });
  assert.ok(facts.os === 'linux' && facts.node === 'v24.21.0' && facts.fts && facts.privateData && facts.volume?.private && facts.volume.path === config.target.dataDir, 'recovery_environment_blocked');
  const mount = JSON.parse(facts.volume.mount).filesystems?.[0];
  assert.ok(mount && !['tmpfs', 'ramfs', 'overlay'].includes(mount.fstype) && !mount.options.split(',').includes('ro'));
  return facts;
}
export async function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-self-'));
  try {
    const r = await discover({ evidenceDir: dir, configFile: '' }); assert.equal(r.status, 'blocked');
    const hostile = 'synthetic-secret/host?hash=credential';
    r.dependencies.source = { status: 'unverified', reason: hostile, evidence: hostile };
    assert.ok(!JSON.stringify(publicReceipt({ ...r, private: hostile })).includes(hostile));
    assert.equal(capacityRequired({ archiveBytes: 1, archiveFiles: 1, queueZipBytes: 1, queueZipFiles: 1, availableBytes: 1, availableInodes: 1 }).sufficient, false);
    assert.equal(offsiteIndependent({ kind: 'local', machineId: 'a', ownerAccess: true }, { machineId: 'b' }), false);
    await assert.rejects(assertReady({ evidenceDir: dir, configFile: '' }));
    return { passed: true };
  } finally { rmSync(dir, { recursive: true, force: true }); }
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

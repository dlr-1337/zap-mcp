import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, symlinkSync, readFileSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const modulePath = '../../scripts/phase4-environment.mjs';
// Missing implementation is an explicit behavior failure, never an import/fixture crash.
const api: any = existsSync(new URL(modulePath, import.meta.url)) ? await import(modulePath) : { discover: async () => ({ status: 'unimplemented' }) };

test('configuração ausente produz inventário blocked privado completo', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const receipt = await api.discover({ evidenceDir: dir });
  assert.equal(receipt.status, 'blocked');
  assert.deepEqual(Object.keys(receipt.dependencies), ['source', 'target', 'publicOrigin', 'proxy', 'supervisor', 'persistentVolume', 'offsite', 'recoveryKeyReference']);
  assert.ok(Object.values(receipt.dependencies).every((v: any) => v.status === 'missing' && v.reason));
  assert.equal(statSync(dir).mode & 0o777, 0o700);
  assert.equal(statSync(join(dir, 'environment.json')).mode & 0o777, 0o600);
  assert.equal(JSON.parse(readFileSync(join(dir, 'environment.json'), 'utf8')).version, 1);
});

test('identidade divergente, timeout e JSON incompleto não comprovam acesso', async () => {
  const host = { kind: 'local', machineId: 'a'.repeat(32) };
  await assert.rejects(api.probeHost(host, {}, { runner: async () => ({ stdout: JSON.stringify({ machineId: 'b'.repeat(32) }) }) }));
  await assert.rejects(api.probeHost(host, {}, { runner: async (_: any, __: any, options: any) => {
    assert.equal(options.shell, false); assert.equal(options.timeout, 10000); assert.equal(options.killSignal, 'SIGKILL'); throw Error('timeout');
  } }));
  await assert.rejects(api.probeHost(host, {}, { runner: async () => ({ stdout: '{}' }) }));
});

test('SSH usa identidade conhecida, sem aceitar chaves ou executar argv livres', () => {
  const [cmd, argv] = api.probeCommand({ kind: 'ssh', host: 'fixture.invalid', user: 'owner', identityFile: '/private/id', knownHostsFile: '/private/known' }, {});
  assert.equal(cmd, 'ssh'); assert.ok(argv.includes('BatchMode=yes')); assert.ok(argv.includes('StrictHostKeyChecking=yes'));
  assert.ok(argv.includes('UpdateHostKeys=no')); assert.ok(argv.includes('/dev/null'));
  assert.ok(!argv.includes('accept-new')); assert.match(argv.at(-1), /^node -e 'eval\(Buffer.from\("[A-Za-z0-9+/=]+","base64"\)\.toString\(\)\)'$/);
  assert.throws(() => api.probeCommand({ kind: 'ssh', host: '-oProxyCommand=bad' }, {}));
});

test('fonte local aceita caminho canônico com espaços sem aceitar path remoto inseguro', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-space-')); t.after(() => rmSync(dir, { recursive: true }));
  const source = { kind: 'local', machineId: 'a'.repeat(32), dataDir: '/home/owner/private archive', appRoot: '/home/owner/project 2' };
  assert.doesNotThrow(() => api.validateConfig({ evidenceDir: dir, source }));
  for (const appRoot of ['/home/owner/project 2/../other', '/home/owner/project 2/./', '/home/owner/project 2\n', '/home/owner/project $(id)', 'relative/project']) assert.throws(() => api.validateConfig({ evidenceDir: dir, source: { ...source, appRoot } }));
  const key = join(dir, 'identity'), known = join(dir, 'known'); for (const path of [key, known]) writeFileSync(path, 'fixture', { mode: 0o600 });
  const remote = { ...source, kind: 'ssh', host: 'fixture.invalid', user: 'owner', identityFile: key, knownHostsFile: known };
  assert.throws(() => api.validateConfig({ evidenceDir: dir, source: remote }));
  assert.throws(() => api.probeCommand({ ...remote, nodePath: '/home/owner/node 24' }, {}));
});

test('reserva exige acervo, cinco cópias, fila ZIP e inodes atuais', () => {
  const capacity = api.capacityRequired?.({ archiveBytes: 1000, archiveFiles: 8, queueZipBytes: 200, queueZipFiles: 2, availableBytes: 300_000_000, availableInodes: 100 });
  assert.equal(capacity?.sufficient, true);
  assert.equal(capacity.requiredBytes, 5000 + 200 + 256 * 1024 * 1024);
  assert.equal(api.capacityRequired({ archiveBytes: 1000, archiveFiles: 8, queueZipBytes: 200, queueZipFiles: 2, availableBytes: 100, availableInodes: 100 }).sufficient, false);
  assert.equal(api.capacityRequired({ archiveBytes: 1000, archiveFiles: 8, queueZipBytes: 200, queueZipFiles: 2, availableBytes: 300_000_000, availableInodes: 1 }).sufficient, false);
  assert.throws(() => api.capacityRequired({ archiveBytes: -1 }));
});

test('allowlist pública remove valores hostis e receipt replay não autoriza ready', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-replay-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const sentinel = 'synthetic-secret-host/path?hash=password';
  const receipt = { status: 'ready', version: 1, observedAt: '2000-01-01T00:00:00Z', private: sentinel, dependencies: { source: { status: 'observed', reason: sentinel, evidence: sentinel } } };
  assert.ok(!JSON.stringify(api.publicReceipt(receipt)).includes(sentinel));
  writeFileSync(join(dir, 'environment.json'), JSON.stringify(receipt), { mode: 0o600 });
  await assert.rejects(api.assertReady({ evidenceDir: dir, configFile: undefined }), /environment_blocked/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'environment.json'), 'utf8')).status, 'blocked');
});

test('chave apenas na VPS ou acesso dependente do notebook permanece unverified', () => {
  assert.equal(api.offsiteIndependent?.({ machineId: 'target', ownerAccess: true }, { machineId: 'target' }), false);
  assert.equal(api.offsiteIndependent({ machineId: 'external', kind: 'local', ownerAccess: true }, { machineId: 'target' }), false);
  assert.equal(api.offsiteIndependent({ machineId: 'external', kind: 'ssh', ownerAccess: true }, { machineId: 'target' }), true);
});

test('configuração exposta ou embutida em checkout é blocked e não inicia probe', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-config-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'config.json');
  writeFileSync(file, JSON.stringify({ evidenceDir: dir, target: { host: 'synthetic-secret-host' } }), { mode: 0o644 });
  const receipt = await api.discover({ configFile: file, evidenceDir: dir });
  assert.equal(receipt.status, 'blocked');
  assert.ok(Object.values(receipt.dependencies).every((v: any) => v.reason === 'configuration_invalid'));
  assert.ok(!JSON.stringify(api.publicReceipt(receipt)).includes('synthetic-secret-host'));
  assert.throws(() => api.validateConfig({ evidenceDir: process.cwd() }));
});

test('Docker Traefik e pull local exigem config privada e cópia real decriptável', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-topology-')); t.after(() => rmSync(dir, { recursive: true }));
  const pullFile = join(dir, 'pull.json'), key = join(dir, 'identity');
  writeFileSync(pullFile, JSON.stringify({ role: 'pull', operationDir: dir, destinationDir: dir, identityFile: key, maxBytes: 1024, reserveBytes: 0 }), { mode: 0o600 });
  writeFileSync(key, 'invalid fixture key', { mode: 0o600 });
  const config = { evidenceDir: dir, proxy: { kind: 'traefik', configFile: '/private/proxy.json', expectedConfigDigest: 'a'.repeat(64) }, supervisor: { kind: 'docker', name: 'fixture', helperPath: '/usr/local/libexec/zap-container-control' }, offsite: { kind: 'local', machineId: 'a'.repeat(32), storagePath: dir, configFile: pullFile }, recoveryKeyReference: { host: 'offsite', path: key } };
  assert.doesNotThrow(() => api.validateConfig(config));
  const file = join(dir, 'config.json'); writeFileSync(file, JSON.stringify(config), { mode: 0o600 });
  const result = await api.discover({ configFile: file });
  assert.equal(result.status, 'blocked'); assert.equal(result.dependencies.offsite.status, 'unverified'); assert.equal(result.dependencies.recoveryKeyReference.status, 'unverified');
  assert.throws(() => api.validateConfig({ ...config, supervisor: { ...config.supervisor, helperPath: '/tmp/untrusted' } }));
});

test('inventário confere hash canônico do helper e recusa PID/contagem inconsistentes', async () => {
  const dataDir = '/srv/private/fixture', host = { kind: 'local', machineId: 'a'.repeat(32) }, scope = { dataDir, appRoot: '/srv/releases/fixture', supervisor: { kind: 'docker', helperPath: '/usr/local/libexec/fixture' } };
  const facts = { running: true, autostart: false, pid: 123, startTime: 'fixture', machineId: host.machineId, profilePathHash: createHash('sha256').update(dataDir).digest('hex'), profileProcesses: 1, mode: 'offline', release: 'b'.repeat(40) };
  const runner = (supervisor: any) => async () => ({ stdout: JSON.stringify({ machineId: host.machineId, supervisor }) });
  await assert.doesNotReject(api.probeHost(host, scope, { runner: runner(facts) }));
  for (const mutation of [{ profilePathHash: 'f'.repeat(64) }, { pid: 0 }, { profileProcesses: 0 }, { mode: 'invalid' }, { release: null }]) await assert.rejects(api.probeHost(host, scope, { runner: runner({ ...facts, ...mutation }) }));
  await assert.rejects(api.probeHost(host, { ...scope, dataDir: dataDir + '/./' }, { runner: runner(facts) }));
});

async function serializedHelperProbe(t: { after(fn: () => unknown): void }, firstProxy: unknown, secondProxy: unknown, calls: number, recovery = false, wrongBinding = false) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-environment-helper-')); t.after(() => rmSync(dir, { recursive: true }));
  const appRoot = join(dir, 'app'), dataDir = join(dir, 'data'), configFile = join(dir, 'proxy.json');
  for (const path of [appRoot, dataDir, join(appRoot, 'dist')]) mkdirSync(path, { mode: 0o700 });
  writeFileSync(join(appRoot, 'package.json'), '{"type":"module"}', { mode: 0o600 }); writeFileSync(configFile, 'fixture proxy settings', { mode: 0o600 });
  symlinkSync(join(process.cwd(), 'node_modules'), join(appRoot, 'node_modules')); symlinkSync(join(process.cwd(), 'dist/src'), join(appRoot, 'dist/src'));
  const machineId = readFileSync('/etc/machine-id', 'utf8').trim(), helperPath = '/usr/local/libexec/fixture';
  const facts = { running: false, autostart: false, pid: 0, startTime: null, machineId, profilePathHash: wrongBinding ? 'f'.repeat(64) : createHash('sha256').update(dataDir).digest('hex'), profileProcesses: 0, mode: 'offline', release: null };
  const scope = { dataDir, appRoot, supervisor: { kind: 'docker', helperPath }, ...(recovery ? { recovery: true } : { proxy: { kind: 'traefik', configFile } }) };
  const [, argv] = api.probeCommand({ kind: 'local', machineId }, scope);
  const source = `
    import assert from 'node:assert/strict'; import { mock } from 'node:test'; import { promisify } from 'node:util';
    let calls=0; const helper=()=>{}, replies=${JSON.stringify([firstProxy, secondProxy])};
    helper[promisify.custom]=async(program,argv,options)=>{
      assert.equal(program,'/usr/bin/sudo'); assert.deepEqual(argv,['-n','/usr/local/libexec/fixture',${JSON.stringify(recovery ? 'inspect-runtime' : 'inspect')}]);
      assert.equal(options.timeout,8000); assert.equal(options.shell,false); calls++;
      const facts=${JSON.stringify(facts)}; if(replies[calls-1]!==null) facts.proxy=replies[calls-1]; return {stdout:JSON.stringify(facts),stderr:''};
    };
    mock.module('node:child_process',{exports:{...await import('node:child_process'),execFile:helper}});
    await eval(${JSON.stringify(argv[1])}); assert.equal(calls,${calls},'helper inspections must be bounded to fresh observations');
  `;
  const child = spawn(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = ''; child.stdout.on('data', bytes => stdout += bytes); child.stderr.on('data', bytes => stderr += bytes);
  const [code] = await once(child, 'exit'); return { code, stdout, stderr, configFile };
}

test('probe serializado reutiliza única inspeção válida Docker para proxy Traefik', async t => {
  const proxy = { verified: true, version: 'v3.6.25', peer: '172.18.0.2' }, result = await serializedHelperProbe(t, proxy, proxy, 1);
  assert.equal(result.code, 0, result.stderr);
  const facts = JSON.parse(result.stdout); assert.equal(facts.supervisor.version, 'bounded-docker-helper');
  assert.deepEqual(facts.proxy, { ...proxy, digest: createHash('sha256').update('fixture proxy settings').digest('hex') });
});

test('probe serializado exige nova inspeção para proxy ausente incompleto ou não verificado', async t => {
  const valid = { verified: true, version: 'v3.6.25', peer: '172.18.0.2' };
  for (const proxy of [null, { ...valid, verified: false }, { verified: true }]) {
    const result = await serializedHelperProbe(t, proxy, valid, 2); assert.equal(result.code, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout).proxy, { ...valid, digest: createHash('sha256').update('fixture proxy settings').digest('hex') });
  }
  const invalid = { ...valid, verified: false }, result = await serializedHelperProbe(t, invalid, invalid, 2);
  assert.equal(result.code, 0, result.stderr); assert.equal(JSON.parse(result.stdout).proxy.verified, false);
});

test('probe serializado recovery dispensa proxy e vínculo estático inválido continua recusado', async t => {
  const recovered = await serializedHelperProbe(t, null, null, 1, true); assert.equal(recovered.code, 0, recovered.stderr); assert.equal(JSON.parse(recovered.stdout).proxy, undefined);
  const invalid = await serializedHelperProbe(t, { verified: true, version: 'v3.6.25', peer: '172.18.0.2' }, null, 1, false, true);
  assert.equal(invalid.code, 1); assert.equal(invalid.stdout, '');
});

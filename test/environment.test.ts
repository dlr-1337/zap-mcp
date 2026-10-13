import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

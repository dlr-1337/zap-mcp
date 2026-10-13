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

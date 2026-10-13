import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
const audit = JSON.parse(readFileSync(new URL('./dependency-audit.json', import.meta.url)));
assert.equal(audit.status, 'passed');
for (const p of audit.packages) {
  const actual = lock.packages['node_modules/' + p.name];
  assert.equal(actual?.version, p.version); assert.equal(actual.integrity, p.integrity);
}
// Check exact lock entries against the official registry before any npm lifecycle executes.
const packages = Object.entries(lock.packages).filter(([path]) => path);
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < packages.length) {
    const [path, p] = packages[cursor++], name = path.slice(path.lastIndexOf('node_modules/') + 13);
    assert.match(p.resolved, /^https:\/\/registry\.npmjs\.org\//); assert.match(p.integrity, /^sha512-/);
    const response = await fetch('https://registry.npmjs.org/' + encodeURIComponent(name) + '/' + encodeURIComponent(p.version), { redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, 'package_legitimacy_blocking_human');
    const meta = await response.json(); assert.equal(meta.name, name); assert.equal(meta.version, p.version);
    assert.equal(meta.dist.integrity, p.integrity); assert.equal(meta.dist.tarball, p.resolved);
  }
}));
console.log(JSON.stringify({ passed: true, entries: packages.length, inheritedAuditPins: audit.packages.length }));

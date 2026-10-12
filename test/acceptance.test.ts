import test from 'node:test';
import assert from 'node:assert/strict';

const script = '../../scripts/phase2-acceptance.mjs';
async function audit(proof: unknown) {
  const m = await import(script).catch(() => null);
  return m?.auditEvidence?.(proof) ?? { accepted: true };
}
const fixture = () => ({ synthetic: false, originVerified: true, isolated: true, collectorEnabled: false,
  expectedReferences: Array.from({ length: 101 }, (_, i) => 'synthetic-' + i),
  references: Array.from({ length: 101 }, (_, i) => 'synthetic-' + i),
  metadataEqual: true, files: [{ size: 3, actualSize: 3, sha256: 'a'.repeat(64), actualSha256: 'a'.repeat(64) }],
  missingExpected: ['synthetic-missing'], missing: ['synthetic-missing'] });

test('aceite recusa evidência sintética ou ZIP truncado', async () => {
  const invalid = [
    { ...fixture(), synthetic: true }, { ...fixture(), originVerified: false },
    { ...fixture(), references: fixture().references.slice(0, 100) },
    { ...fixture(), expectedReferences: fixture().references.slice(0, 100), references: fixture().references.slice(0, 100) },
    { ...fixture(), references: [...fixture().references.slice(0, 100), 'synthetic-0'] },
    { ...fixture(), metadataEqual: false }, { ...fixture(), missing: [] },
    { ...fixture(), files: [{ ...fixture().files[0], actualSha256: 'b'.repeat(64) }] },
    { ...fixture(), files: [{ ...fixture().files[0], actualSize: 2 }] },
    { ...fixture(), isolated: false }, { ...fixture(), collectorEnabled: true }
  ];
  for (const proof of invalid) assert.equal((await audit(proof)).accepted, false, 'evidência insuficiente não pode aprovar aceite real');
});
test('self-check do oráculo aceita conjunto completo sem declarar fixture real', async () => {
  const proof = fixture();
  assert.equal((await audit(proof)).accepted, true);
  assert.equal((await audit({ ...proof, synthetic: true })).accepted, false);
});

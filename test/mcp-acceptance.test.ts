import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// Dynamic loading makes a missing verifier an assertion failure, not a test-load error.
const modulePath = '../../scripts/phase3-acceptance.mjs';
const acceptance = await import(modulePath).catch(() => null);
const audit = (proof: any, live?: any) => acceptance?.auditEvidence(proof, live);
function control(t: { after(fn: () => void): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-acceptance-')); t.after(() => rmSync(dir, { recursive: true }));
  const startedAt = Date.now() - 100, runId = randomUUID(), bytes = Buffer.from('synthetic verifier control');
  const files = [0, 1].map(i => { const path = join(dir, 'received-' + i); writeFileSync(path, bytes, { mode: 0o600 }); return { path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; });
  const names = ['find_conversations', 'search_messages', 'search_messages', 'get_context', 'get_context', 'get_context', 'get_attachment', 'get_attachment'];
  const calls = names.map((name, i) => ({ id: i, name, at: Date.now(), completed: true, correlated: true }));
  const live = { runId, startedAt, endedAt: Date.now() + 100, process: { pid: 123, code: 0, installed: true, version: 'codex-cli 0.162.1' }, calls, files,
    negotiation: { client: 'codex-mcp-client', requested: '2025-06-18', selected: '2025-06-18', correlated: true }, tls: { verified: true, hostname: 'localhost', untrustedRejected: true },
    oracle: { sql: true, site: true, bytes: true, searchPages: 2, contextBefore: true, contextAfter: true, fields: true, filters: true, coverage: true }, configPreserved: true };
  const proof = { runId, status: 'passed', synthetic: false, sourceVerified: true, offline: true, collectorEnabled: false };
  return { proof, live };
}
test('aceite rejeita replay JSON antigo sem processo Codex atual', t => {
  const { proof } = control(t); assert.deepEqual(audit(proof), { accepted: false });
});
test('aceite exige processo, protocolo, TLS, quatro ferramentas e oráculos independentes', t => {
  const { proof, live } = control(t); assert.deepEqual(audit(proof, live), { accepted: true });
  for (const change of [(p: any, l: any) => p.synthetic = true, (p: any, l: any) => p.sourceVerified = false, (p: any, l: any) => p.runId = randomUUID(),
    (p: any, l: any) => l.process.installed = false, (p: any, l: any) => l.process.code = 1, (p: any, l: any) => l.negotiation.selected = null,
    (p: any, l: any) => l.tls.verified = false, (p: any, l: any) => l.tls.untrustedRejected = false, (p: any, l: any) => l.calls[0].correlated = false,
    (p: any, l: any) => l.calls.pop(), (p: any, l: any) => l.oracle.sql = false, (p: any, l: any) => l.oracle.site = false,
    (p: any, l: any) => l.oracle.searchPages = 1, (p: any, l: any) => l.oracle.contextBefore = false, (p: any, l: any) => l.oracle.fields = false,
    (p: any, l: any) => l.configPreserved = false, (p: any, l: any) => p.collectorEnabled = true]) {
    const p = structuredClone(proof), l = structuredClone(live); change(p, l); assert.deepEqual(audit(p, l), { accepted: false });
  }
});
test('arquivo ausente, parcial, corrupto ou antigo nunca conta como entrega', t => {
  const { proof, live } = control(t);
  const missing = structuredClone(live); missing.files[0].path += '-missing'; assert.deepEqual(audit(proof, missing), { accepted: false });
  const stale = structuredClone(live); stale.startedAt = Date.now() + 1000; assert.deepEqual(audit(proof, stale), { accepted: false });
  writeFileSync(live.files[0].path, 'partial', { mode: 0o600 }); assert.deepEqual(audit(proof, live), { accepted: false });
  writeFileSync(live.files[0].path, Buffer.alloc(live.files[0].size, 9), { mode: 0o600 }); assert.deepEqual(audit(proof, live), { accepted: false });
});
test('recibo público usa whitelist e não vaza sentinelas privadas', t => {
  const { proof, live } = control(t); const output = acceptance?.publicReceipt({ ...proof, token: 'PRIVATE_SENTINEL', text: 'PRIVATE_SENTINEL', path: 'PRIVATE_SENTINEL' }, live);
  assert.ok(output); assert.equal(JSON.stringify(output).includes('PRIVATE_SENTINEL'), false); assert.equal(output.accepted, true);
});

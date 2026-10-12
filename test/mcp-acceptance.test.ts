import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, appendFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// Dynamic loading makes a missing verifier an assertion failure, not a test-load error.
const modulePath = '../../scripts/phase3-acceptance.mjs';
const acceptance = await import(modulePath).catch(() => null);
const source = readFileSync(new URL(modulePath, import.meta.url), 'utf8');
const audit = (proof: any, live?: any) => acceptance?.auditEvidence(proof, live);
const liveCopy = (live: any) => Object.assign(acceptance?.beginRun?.() ?? {}, structuredClone(live));
function control(t: { after(fn: () => void): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-acceptance-')); t.after(() => rmSync(dir, { recursive: true }));
  const startedAt = Date.now() - 100, runId = randomUUID(), bytes = Buffer.from('synthetic verifier control');
  const files = [0, 1].map(i => { const path = join(dir, 'received-' + i); writeFileSync(path, bytes, { mode: 0o600 }); return { path, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; });
  const names = ['find_conversations', 'search_messages', 'search_messages', 'get_context', 'get_context', 'get_context', 'get_attachment', 'get_attachment'];
  const calls = names.map((name, i) => ({ id: i, name, at: Date.now(), completed: true, correlated: true }));
  const live = Object.assign(acceptance?.beginRun?.() ?? {}, { runId, startedAt, endedAt: Date.now() + 100, process: { pid: 123, code: 0, installed: true, version: 'codex-cli 0.162.1' }, calls, files,
    negotiation: { client: 'codex-mcp-client', requested: '2025-06-18', selected: '2025-06-18', correlated: true }, tls: { verified: true, hostname: 'localhost', untrustedRejected: true },
    oracle: { sql: true, site: true, bytes: true, searchPages: 2, contextBefore: true, contextAfter: true, fields: true, filters: true, coverage: true }, configPreserved: true });
  const proof = { runId, status: 'passed', synthetic: false, sourceVerified: true, offline: true, collectorEnabled: false };
  return { proof, live };
}
test('aceite rejeita replay JSON antigo sem processo Codex atual', t => {
  const { proof, live } = control(t); assert.deepEqual(audit(proof), { accepted: false });
  assert.deepEqual(audit(proof, JSON.parse(JSON.stringify(live))), { accepted: false }, 'serialized live evidence cannot recreate a current run');
});
test('aceite exige processo, protocolo, TLS, quatro ferramentas e oráculos independentes', t => {
  const { proof, live } = control(t); assert.deepEqual(audit(proof, live), { accepted: true });
  for (const change of [(p: any, l: any) => p.synthetic = true, (p: any, l: any) => p.sourceVerified = false, (p: any, l: any) => p.runId = randomUUID(),
    (p: any, l: any) => l.process.installed = false, (p: any, l: any) => l.process.code = 1, (p: any, l: any) => l.negotiation.selected = null,
    (p: any, l: any) => l.tls.verified = false, (p: any, l: any) => l.tls.untrustedRejected = false, (p: any, l: any) => l.calls[0].correlated = false,
    (p: any, l: any) => l.calls.pop(), (p: any, l: any) => l.oracle.sql = false, (p: any, l: any) => l.oracle.site = false,
    (p: any, l: any) => l.oracle.searchPages = 1, (p: any, l: any) => l.oracle.contextBefore = false, (p: any, l: any) => l.oracle.fields = false,
    (p: any, l: any) => l.configPreserved = false, (p: any, l: any) => p.collectorEnabled = true]) {
    const p = structuredClone(proof), l = liveCopy(live); change(p, l); assert.deepEqual(audit(p, l), { accepted: false });
  }
});
test('arquivo ausente, parcial, corrupto ou antigo nunca conta como entrega', t => {
  const { proof, live } = control(t);
  const missing = liveCopy(live); missing.files[0].path += '-missing'; assert.deepEqual(audit(proof, missing), { accepted: false });
  const stale = liveCopy(live); stale.startedAt = Date.now() + 1000; assert.deepEqual(audit(proof, stale), { accepted: false });
  writeFileSync(live.files[0].path, 'partial', { mode: 0o600 }); assert.deepEqual(audit(proof, live), { accepted: false });
  writeFileSync(live.files[0].path, Buffer.alloc(live.files[0].size, 9), { mode: 0o600 }); assert.deepEqual(audit(proof, live), { accepted: false });
});
test('recibo público usa whitelist e não vaza sentinelas privadas', t => {
  const { proof, live } = control(t); live.oracle.privateText = 'PRIVATE_SENTINEL'; const output = acceptance?.publicReceipt({ ...proof, token: 'PRIVATE_SENTINEL', text: 'PRIVATE_SENTINEL', path: 'PRIVATE_SENTINEL' }, live);
  assert.ok(output); assert.equal(JSON.stringify(output).includes('PRIVATE_SENTINEL'), false); assert.equal(output.accepted, true);
});

test('WR-01 timeout espera close e encerra filho e descendente que ignoram TERM', { timeout: 10000 }, async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-timeout-')); t.after(() => rmSync(dir, { recursive: true }));
  let child: ChildProcess | undefined, closed = false, descendant = 0, budget: (() => void) | undefined;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let markReady!: () => void;
  const ready = new Promise<void>(resolve => markReady = resolve);
  const trackedSpawn: typeof spawn = ((...args: Parameters<typeof spawn>) => {
    child = spawn(...args); child.on('close', () => closed = true);
    child.stdout!.on('data', chunk => { const match = /READY:(\d+)/.exec(String(chunk)); if (match) { descendant = Number(match[1]); markReady(); } });
    return child;
  }) as typeof spawn;
  const clock = (fn: () => void, ms: number) => {
    if (ms === 240000) { budget = fn; return undefined; }
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); return timer;
  };
  const clear = (timer: ReturnType<typeof setTimeout>) => { timers.delete(timer); clearTimeout(timer); };
  // Execute the current function body; only its budget clock and spawn observation are controlled.
  const body = source.slice(source.indexOf('function runCodex('), source.indexOf('\nfunction http('));
  const run = new Function('spawn', 'writeFileSync', 'appendFileSync', 'setTimeout', 'clearTimeout', body + ';return runCodex;')(trackedSpawn, writeFileSync, appendFileSync, clock, clear);
  const fixture = `const {spawn}=require('node:child_process');process.on('SIGTERM',()=>process.stderr.write('TERM_IGNORED\\n'));const c=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});console.log('CHILD_READY');setInterval(()=>{},1000)"],{stdio:['ignore','pipe','inherit']});c.stdout.once('data',()=>console.log('READY:'+c.pid));setInterval(()=>{},1000);`;
  try {
    const pending = run(process.execPath, ['-e', fixture], process.env, dir, join(dir, 'transcript'), '');
    await ready; assert.ok(budget); budget(); await assert.rejects(pending, /budget exceeded/);
    assert.equal(closed, true, 'Promise rejected before child close');
    assert.match(readFileSync(join(dir, 'transcript'), 'utf8'), /TERM_IGNORED/, 'child really ignored TERM');
    assert.equal(timers.size, 0, 'shutdown timers must be cleared');
    assert.throws(() => process.kill(child!.pid!, 0), /ESRCH/, 'child must no longer exist');
    const status = (() => { try { return readFileSync('/proc/' + descendant + '/stat', 'utf8').split(' ')[2]; } catch { return null; } })();
    assert.ok(status === null || status === 'Z', 'descendant must not remain running with inherited pipes');
  } finally {
    for (const timer of timers) clearTimeout(timer);
    if (child && !closed) {
      const done = once(child, 'close');
      try { process.kill(-child.pid!, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      try { process.kill(descendant, 'SIGKILL'); } catch {}
      await done;
    }
  }
});

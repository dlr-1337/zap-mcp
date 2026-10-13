import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
import { createSnapshot, restoreSnapshot, assertCollectorReady, verifyBackup } from '../src/backup.js';

const modulePath = '../src/promotion.js';
async function promotion() { const m = await import(modulePath).catch(() => null); assert.ok(m?.promoteProfile, 'transactional promotion must exist'); return m; }
async function fixture(t: { after(fn: () => unknown): void }) {
  const base = mkdtempSync(join(tmpdir(), 'zap-promotion-')), source = join(base, 'source'), dataDir = join(base, 'target'), snapshotDir = join(base, 'snapshot'), operationDir = join(base, 'operation'); mkdirSync(operationDir, { mode: 0o700 });
  t.after(() => rmSync(base, { recursive: true })); const s = createService({ dataDir: source }); createAuthState(s.authDb, { newProfile: true }); await s.setPassword('senha original fixture'); const owner = s.authDb.prepare('SELECT * FROM web_owner').all(); await s.close();
  await createSnapshot({ dataDir: source, destination: snapshotDir }); await restoreSnapshot({ snapshotDir, destination: dataDir });
  const supervisor = { kind: 'systemd', name: 'fixture.service', dataDir, machineId: '0'.repeat(32) };
  const facts = { running: false, autostart: false, pid: 0, startTime: null, machineId: '0'.repeat(32), profileProcesses: 0, mode: 'offline' };
  const controller = { async stop() {}, async start() {}, async inspect() { return { ...facts }; } };
  return { base, source, owner, facts, controller, config: { dataDir, operationDir, destination: snapshotDir, snapshotDir, verificationDir: join(base, 'verified'), priorMode: 'offline', priorRelease: 'fixture', supervisor, source: { ...supervisor, dataDir: source } } };
}

test('promoção exige fence novo e preserva marker owner e perfil', async t => {
  const m = await promotion(), f = await fixture(t);
  const result = await m.promoteProfile(f.config, { sourceController: f.controller, targetController: f.controller }); assert.equal(result.authorized, true);
  assert.equal(existsSync(join(f.config.dataDir, 'restored.json')), true);
  const s = createService({ dataDir: f.config.dataDir }); try { assert.deepEqual(s.authDb.prepare('SELECT * FROM web_owner').all(), f.owner); assert.doesNotThrow(() => assertCollectorReady(f.config.dataDir, s.authDb)); assert.ok(await m.authorizePromotedCollector(f.config.dataDir, s.authDb, f.controller)); f.facts.running = true; await assert.rejects(m.authorizePromotedCollector(f.config.dataDir, s.authDb, f.controller), /ativa|fence/); } finally { await s.close(); }
});

test('fonte viva autostart ou destino ocupado emite zero autorizações', async t => {
  const m = await promotion();
  for (const kind of ['running', 'autostart', 'target']) {
    const f = await fixture(t); const unsafe = { ...f.controller, async inspect() { return { ...f.facts, running: kind !== 'autostart', autostart: kind === 'autostart' }; } };
    await assert.rejects(m.promoteProfile(f.config, { sourceController: kind === 'target' ? f.controller : unsafe, targetController: kind === 'target' ? unsafe : f.controller }));
    assert.equal(existsSync(join(f.config.dataDir, 'promotion.json')), false);
  }
});

test('remover marker e verificar clone não dispensa promoção', async t => {
  const f = await fixture(t); rmSync(join(f.config.dataDir, 'restored.json'));
  await assert.rejects(verifyBackup({ dataDir: f.config.dataDir, snapshotDir: f.config.snapshotDir, destination: join(f.base, 'forged') }), /restaurad|offline/);
  const s = createService({ dataDir: f.config.dataDir }); try { assert.throws(() => assertCollectorReady(f.config.dataDir, s.authDb)); } finally { await s.close(); }
});

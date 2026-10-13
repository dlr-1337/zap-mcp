import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
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

test('fence muda antes do commit e receipt adulterado replay ou path copiado bloqueiam', async t => {
  const m = await promotion(), f = await fixture(t); let probes = 0;
  const sourceController = { ...f.controller, async inspect() { probes++; return { ...f.facts, running: probes >= 2 }; } };
  await assert.rejects(m.promoteProfile(f.config, { sourceController, targetController: f.controller }));
  f.config.verificationDir = join(f.base, 'verified-again'); await m.promoteProfile(f.config, { sourceController: f.controller, targetController: f.controller });
  const path = join(f.config.dataDir, 'promotion.json'), receipt = readFileSync(path); const altered = JSON.parse(receipt.toString()); altered.mac = '0'.repeat(64); writeFileSync(path, JSON.stringify(altered));
  const s = createService({ dataDir: f.config.dataDir }); try { assert.throws(() => assertCollectorReady(f.config.dataDir, s.authDb), /adulterada/); writeFileSync(path, receipt); await m.revokePromotion(f.config, f.controller); assert.throws(() => assertCollectorReady(f.config.dataDir, s.authDb), /revogada|comprometida/); } finally { await s.close(); }
  const clone = join(f.base, 'clone'); await restoreSnapshot({ snapshotDir: f.config.snapshotDir, destination: clone }); writeFileSync(join(clone, 'promotion.json'), receipt, { mode: 0o600 }); const copy = createService({ dataDir: clone }); try { assert.throws(() => assertCollectorReady(clone, copy.authDb), /path/); } finally { await copy.close(); }
});

test('controle positivo abre um socket real gated e permit não pode ser reutilizado', async t => {
  const m = await promotion(), f = await fixture(t); await m.promoteProfile(f.config, { sourceController: f.controller, targetController: f.controller });
  const source = `import{mock}from'node:test';import{EventEmitter}from'node:events';import assert from'node:assert/strict';const b=await import('@whiskeysockets/baileys');const exports=Object.fromEntries(Object.entries(b).filter(([k])=>k!=='default'));let sockets=0;mock.module('@whiskeysockets/baileys',{namedExports:{...exports,makeWASocket:()=>{sockets++;return{ev:new EventEmitter(),end(){}}}},defaultExport:b.default});const{createService}=await import('./dist/src/main.js');const{authorizePromotedCollector}=await import('./dist/src/promotion.js');const s=createService({dataDir:process.env.TARGET});assert.throws(()=>s.startCollector());assert.equal(sockets,0);const controller={async inspect(){return{running:false,autostart:false,pid:0,startTime:null,profileProcesses:0,mode:'offline',machineId:'0'.repeat(32)}}};const permit=await authorizePromotedCollector(process.env.TARGET,s.authDb,controller);s.startCollector({promotionPermit:permit});assert.equal(sockets,1);assert.throws(()=>s.startCollector({promotionPermit:permit}));await s.close();console.log('one gated socket');`;
  const child = spawn(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', source], { env: { ...process.env, TARGET: f.config.dataDir }, stdio: ['ignore', 'pipe', 'pipe'] }); let out = '', error = ''; child.stdout.on('data', b => out += b); child.stderr.on('data', b => error += b); assert.equal((await once(child, 'exit'))[0], 0, error); assert.match(out, /one gated socket/);
});

test('SIGKILL em estágios de promoção mantém source parada e target offline por padrão', async t => {
  const m = await promotion();
  for (const point of ['intended', 'fenced', 'verified', 'publishing', 'published', 'committed']) {
    const f = await fixture(t);
    const source = `import{promoteProfile}from'./dist/src/promotion.js';const config=JSON.parse(process.env.CONFIG);const controller={async stop(){},async start(){throw Error('source must never resume')},async inspect(){return{running:false,autostart:false,pid:0,startTime:null,profileProcesses:0,mode:'offline',machineId:'0'.repeat(32)}}};await promoteProfile(config,{sourceController:controller,targetController:controller,fault:async p=>{if(p===process.env.POINT){console.log('ready');await new Promise(()=>{setInterval(()=>{},1000)})}}});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, CONFIG: JSON.stringify(f.config), POINT: point }, stdio: ['ignore', 'pipe', 'pipe'] }); t.after(() => child.kill('SIGKILL'));
    let error = ''; child.stderr.on('data', b => error += b); await new Promise<void>((accept, reject) => { const timer = setTimeout(() => reject(Error('promotion crash timeout ' + error)), 5000); child.stdout.on('data', b => { if (String(b).includes('ready')) { clearTimeout(timer); accept(); } }); child.once('exit', c => { clearTimeout(timer); reject(Error('promotion exited ' + c + error)); }); });
    const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit;
    const s = createService({ dataDir: f.config.dataDir }); try { assert.throws(() => s.startCollector()); assert.deepEqual(s.authDb.prepare('SELECT * FROM web_owner').all(), f.owner); if (point !== 'committed') await assert.rejects(m.authorizePromotedCollector(f.config.dataDir, s.authDb, f.controller)); else assert.ok(await m.authorizePromotedCollector(f.config.dataDir, s.authDb, f.controller)); } finally { await s.close(); }
    assert.equal(existsSync(join(f.config.dataDir, 'restored.json')), true);
  }
});

test('snapshot alterado, origem inacessível e payload modificado recusam autorização', async t => {
  const m = await promotion(), f = await fixture(t); await m.promoteProfile(f.config, { sourceController: f.controller, targetController: f.controller });
  const s = createService({ dataDir: f.config.dataDir });
  try {
    await assert.rejects(m.authorizePromotedCollector(f.config.dataDir, s.authDb, { ...f.controller, async inspect() { throw Error('source unavailable'); } }), /unavailable/);
    const manifestPath = join(f.config.snapshotDir, 'manifest.json'), manifest = readFileSync(manifestPath), changed = JSON.parse(manifest.toString()); changed.createdAt = new Date(0).toISOString(); writeFileSync(manifestPath, JSON.stringify(changed)); assert.throws(() => assertCollectorReady(f.config.dataDir, s.authDb), /divergente/); writeFileSync(manifestPath, manifest);
    const receiptPath = join(f.config.dataDir, 'promotion.json'), receipt = JSON.parse(readFileSync(receiptPath, 'utf8')), proof = JSON.parse(receipt.proof); proof.operationId = '1'.repeat(36); receipt.proof = JSON.stringify(proof); writeFileSync(receiptPath, JSON.stringify(receipt)); assert.throws(() => assertCollectorReady(f.config.dataDir, s.authDb));
  } finally { await s.close(); }
});

test('revogação persistida da source impede coletor mesmo com recibo válido', async t => {
  const f = await fixture(t); await verifyBackup({ dataDir: f.source, snapshotDir: f.config.snapshotDir, destination: join(f.base, 'source-check') });
  const s = createService({ dataDir: f.source }); try { s.authDb.prepare('INSERT INTO web_config(key,value) VALUES(?,?)').run('collector-fenced', JSON.stringify({ version: 1, generation: 'fixture' })); assert.throws(() => assertCollectorReady(f.source, s.authDb), /cercada|fenced/); } finally { await s.close(); }
});

test('handoff durável permite reboot do target sem notebook e bloqueia source e clones', async t => {
  const m = await promotion(), f = await fixture(t), sourceOps = join(f.base, 'source-ops'); mkdirSync(sourceOps, { mode: 0o700 });
  const targetDataDir = join(f.base, 'durable-target'), machineId = readFileSync('/etc/machine-id', 'utf8').trim();
  const fence = await m.createSourceFence({ ...f.config, dataDir: f.source, operationDir: sourceOps, supervisor: f.config.source, targetDataDir, targetMachineId: machineId }, f.controller);
  const snapshotDir = join(f.base, 'durable-snapshot'); await createSnapshot({ dataDir: f.source, destination: snapshotDir }); await restoreSnapshot({ snapshotDir, destination: targetDataDir });
  const config = { ...f.config, dataDir: targetDataDir, snapshotDir, destination: snapshotDir, verificationDir: join(f.base, 'durable-verify'), supervisor: { ...f.config.supervisor, dataDir: targetDataDir, machineId }, source: { ...f.config.source, ssh: { host: 'unreachable.example', user: 'fixture', identityFile: '/does-not-exist', knownHostsFile: '/does-not-exist' } }, sourceFenceFile: fence.fenceFile, sourceFencePublicKey: fence.publicKey };
  await m.promoteProfile(config, { targetController: f.controller });
  const source = createService({ dataDir: f.source }); try { assert.deepEqual(source.authDb.prepare('SELECT * FROM web_owner').all(), f.owner); assert.throws(() => assertCollectorReady(f.source, source.authDb), /cercada/); } finally { await source.close(); }
  const script = `import{mock}from'node:test';import{EventEmitter}from'node:events';import assert from'node:assert/strict';const b=await import('@whiskeysockets/baileys');const exports=Object.fromEntries(Object.entries(b).filter(([k])=>k!=='default'));let sockets=0;mock.module('@whiskeysockets/baileys',{namedExports:{...exports,makeWASocket:()=>{sockets++;return{ev:new EventEmitter(),end(){}}}},defaultExport:b.default});const{createService}=await import('./dist/src/main.js');for(let i=0;i<2;i++){const s=createService({dataDir:process.env.TARGET});assert.equal(await s.enableCollector(),true);assert.equal(sockets,i+1);assert.throws(()=>s.startCollector());await s.close()}console.log('independent restart');`;
  const child = spawn(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', script], { env: { ...process.env, TARGET: targetDataDir }, stdio: ['ignore', 'pipe', 'pipe'] }); let error = ''; child.stderr.on('data', b => error += b); assert.equal((await once(child, 'exit'))[0], 0, error);
  const cloneDir = join(f.base, 'durable-clone'); await restoreSnapshot({ snapshotDir, destination: cloneDir }); writeFileSync(join(cloneDir, 'promotion.json'), readFileSync(join(targetDataDir, 'promotion.json')), { mode: 0o600 }); const clone = createService({ dataDir: cloneDir }); try { assert.throws(() => assertCollectorReady(cloneDir, clone.authDb), /path/); } finally { await clone.close(); }
  const altered = JSON.parse(readFileSync(fence.fenceFile, 'utf8')); altered.signature = 'A'.repeat(86); writeFileSync(fence.fenceFile, JSON.stringify(altered)); config.verificationDir = join(f.base, 'wrong-fence'); await assert.rejects(m.promoteProfile(config, { targetController: f.controller }), /adulterado/);
});

test('SIGKILL no fence persistido permite retomar emissão sem religar source', async t => {
  const m = await promotion();
  for (const point of ['key', 'source-fenced', 'published', 'committed']) {
    const f = await fixture(t), sourceOps = join(f.base, 'source-ops'); mkdirSync(sourceOps, { mode: 0o700 }); const config = { ...f.config, dataDir: f.source, operationDir: sourceOps, supervisor: f.config.source, targetDataDir: join(f.base, 'future-target'), targetMachineId: readFileSync('/etc/machine-id', 'utf8').trim() };
    const script = `import{createSourceFence}from'./dist/src/promotion.js';const controller={async inspect(){return{running:false,autostart:false,pid:0,startTime:null,profileProcesses:0,mode:'offline',machineId:'0'.repeat(32)}}};await createSourceFence(JSON.parse(process.env.CONFIG),controller,async p=>{if(p===process.env.POINT){console.log('ready');await new Promise(()=>{setInterval(()=>{},1000)})}});`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, CONFIG: JSON.stringify(config), POINT: point }, stdio: ['ignore', 'pipe', 'pipe'] }); t.after(() => child.kill('SIGKILL'));
    await new Promise<void>((accept, reject) => { const timer = setTimeout(() => reject(Error('source fence timeout')), 5000); child.stdout.on('data', b => { if (String(b).includes('ready')) { clearTimeout(timer); accept(); } }); child.once('exit', c => { clearTimeout(timer); reject(Error('source fence exited ' + c)); }); }); const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit;
    assert.equal((await m.createSourceFence(config, f.controller)).fenced, true);
    const source = createService({ dataDir: f.source }); try { assert.deepEqual(source.authDb.prepare('SELECT * FROM web_owner').all(), f.owner); assert.throws(() => assertCollectorReady(f.source, source.authDb), /cercada/); } finally { await source.close(); }
  }
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, symlinkSync, existsSync, readdirSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn, execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer, request as tlsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import Database from 'better-sqlite3';
import { createService } from '../dist/src/main.js';
import { createAuthState } from '../dist/src/whatsapp.js';
import { startMediaWorker } from '../dist/src/media.js';
import { privateFile, readPrivateJson, atomicPrivateJson, acquireOperation, newJournal, createSupervisor, assertQuiet, assertSupervisorFacts, coordinatedSnapshot } from '../dist/src/operation.js';
import { createSnapshot, validateSnapshot } from '../dist/src/backup.js';
import { createSourceFence } from '../dist/src/promotion.js';
import { readOffsiteConfig, runOffsiteBackup, produceOffsiteCopy, acknowledgeOffsiteCopy } from '../dist/src/offsite.js';
import { assertReady, assertRecoveryReady } from './phase4-environment.mjs';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), exec = promisify(execFile);
const digest = value => createHash('sha256').update(value).digest('hex');
const absolute = value => { assert.ok(typeof value === 'string' && /^\/[A-Za-z0-9_./-]+$/.test(value) && !value.split('/').includes('..')); return value; };
const commit = value => { assert.match(value, /^[a-f0-9]{40}$/); return value; };
const targetBinding = config => digest(JSON.stringify([config.target.machineId, resolve(config.target.dataDir), resolve(config.target.appRoot), config.target.helperPath]));

// Shared by the SSH probe and local fixture, always read-only; personal values stay in private evidence.
export function profileState(dataDir) {
  const crypto = createHash, result = { databases: {}, originals: [] };
  for (const name of ['archive.sqlite', 'auth.sqlite']) {
    const db = new Database(join(dataDir, name), { readonly: true });
    try {
      assert.equal(db.pragma('integrity_check', { simple: true }), 'ok'); assert.equal(db.pragma('foreign_key_check').length, 0);
      const schema = db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
      result.databases[name] = { schema: crypto('sha256').update(JSON.stringify(schema)).digest('hex') };
      for (const table of name === 'auth.sqlite' ? ['web_owner', 'whatsapp_profile', 'whatsapp_keys'] : ['messages', 'origins', 'attachments']) {
        const rows = db.prepare('SELECT * FROM "' + table + '" ORDER BY rowid').all();
        result.databases[name][table] = crypto('sha256').update(JSON.stringify(rows)).digest('hex');
      }
      if (name === 'archive.sqlite') for (const item of db.prepare("SELECT id,size,sha256 FROM attachments WHERE state='available' ORDER BY id").all()) {
        const bytes = readFileSync(join(dataDir, 'media', item.id + '.bin'));
        assert.equal(bytes.length, item.size); assert.equal(crypto('sha256').update(bytes).digest('hex'), item.sha256); result.originals.push(item);
      }
    } finally { db.close(); }
  }
  return result;
}

export async function swapRelease(config, { controller, ready, backup, state = () => profileState(config.dataDir), fault, journalDir = config.operationDir } = {}) {
  // All preconditions are live effects, never a boolean or a persisted readiness JSON.
  await ready(); await backup(); await ready();
  const previous = await controller.inspect(); assert.ok(previous.running && previous.profileProcesses === 1);
  const journal = { version: 1, kind: 'release', targetBinding: config.targetBinding, archiveSchema: config.archiveSchema, authSchema: config.authSchema, priorRelease: previous.release ?? config.priorRelease, candidateRelease: config.candidateRelease, priorMode: previous.mode, stage: 'prepared', startedAt: new Date().toISOString() };
  const stage = async value => { journal.stage = value; atomicPrivateJson(join(journalDir, 'deploy-journal.json'), journal); await fault?.(value); };
  await stage('prepared');
  let baseline;
  try {
    await controller.stop(); assertQuiet(await controller.inspect(), true); baseline = await state(); await stage('stopped');
    assert.equal(baseline.databases['archive.sqlite'].schema, config.archiveSchema);
    assert.equal(baseline.databases['auth.sqlite'].schema, config.authSchema);
    await fault?.('before-swap'); await controller.activate(config.candidateRelease, 'offline'); await stage('swapped');
    assert.deepEqual(await state(), baseline, 'candidate changed persistent archive/session/originals');
    await config.verify(); await stage('verified');
    if (previous.mode === 'collect') { await controller.stop(); assertQuiet(await controller.inspect(), true); await controller.activate(config.candidateRelease, 'collect'); }
    await stage('committed'); return { updated: true, mode: previous.mode };
  } catch (error) {
    // Roll back only code, and only with the same current schema. Never restore the pre-update database.
    try {
      await controller.stop(); assertQuiet(await controller.inspect(), true);
      const current = await state();
      assert.equal(current.databases['archive.sqlite'].schema, config.archiveSchema); assert.equal(current.databases['auth.sqlite'].schema, config.authSchema);
      await controller.activate(journal.priorRelease, 'offline');
      if (baseline) assert.deepEqual(await state(), baseline);
      journal.stage = 'recovered-offline'; atomicPrivateJson(join(journalDir, 'deploy-journal.json'), journal);
    } catch { journal.stage = 'blocked-offline'; atomicPrivateJson(join(journalDir, 'deploy-journal.json'), journal); throw Error('release_recovery_required'); }
    throw error;
  }
}

function tlsCall(origin, path, { ca, password, cookie, csrfToken, method = 'GET', body, headers = {} } = {}) {
  return new Promise((accept, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = tlsRequest(origin + path, { ca, rejectUnauthorized: true, method, headers: { ...(payload ? { 'Content-Type': 'application/json' } : {}), ...headers, ...(cookie ? { Cookie: cookie } : {}) } }, res => {
      const bytes = []; let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size > 32 * 1024 * 1024) res.destroy(Error('probe_limit')); else bytes.push(chunk); });
      res.on('error', reject); res.on('end', () => accept({ status: res.statusCode, headers: res.headers, bytes: Buffer.concat(bytes) }));
    }); req.on('error', reject); req.setTimeout(15000, () => req.destroy(Error('probe_timeout'))); req.end(payload);
  });
}
async function verifyHttps(origin, password, originals, ca) {
  const challenge = await tlsCall(origin, '/api/session', { ca }); assert.equal(challenge.status, 200);
  const cookie = challenge.headers['set-cookie'][0].split(';')[0], csrf = JSON.parse(challenge.bytes).csrfToken;
  const login = await tlsCall(origin, '/login', { ca, cookie, method: 'POST', headers: { Origin: origin }, body: { password, csrfToken: csrf } });
  assert.equal(login.status, 200); assert.match(login.headers['set-cookie'][0], /; Secure/);
  const ownerCookie = login.headers['set-cookie'][0].split(';')[0];
  const status = await tlsCall(origin, '/api/status', { ca, cookie: ownerCookie }); assert.equal(status.status, 200); assert.equal(JSON.parse(status.bytes).collectorEnabled, false);
  for (const file of originals) {
    const path = '/api/attachments/' + file.id;
    assert.equal((await tlsCall(origin, path, { ca })).status, 401);
    const response = await tlsCall(origin, path, { ca, cookie: ownerCookie }); assert.equal(response.status, 200); assert.equal(response.bytes.length, file.size); assert.equal(digest(response.bytes), file.sha256);
    if (file.size) assert.equal((await tlsCall(origin, path, { ca, cookie: ownerCookie, headers: { Range: 'bytes=0-0' } })).status, 206);
  }
  return true;
}

// Only fixed task names and allowlisted paths reach the remote process; no shell command from config.
async function remoteTask(task, input) {
  const fs = await import('node:fs'), path = await import('node:path'), url = await import('node:url'), cp = await import('node:child_process'), util = await import('node:util');
  const operation = await import(url.pathToFileURL(path.join(input.appRoot, 'dist/src/operation.js')).href);
  const backup = await import(url.pathToFileURL(path.join(input.appRoot, 'dist/src/backup.js')).href);
  if (task === 'state') {
    const mod = await import(url.pathToFileURL(path.join(input.appRoot, 'scripts/phase4-deploy.mjs')).href); return mod.profileState(input.dataDir);
  }
  if (task === 'preparation') {
    operation.privateFile(input.dataDir, true);
    if (input.migration) {
      const c = operation.readPrivateJson(input.promotionConfigFile);
      if (c.dataDir !== input.dataDir || c.snapshotDir !== input.snapshotDir || c.sourceFencePublicKey !== input.publicKey || fs.readdirSync(input.dataDir).length) throw Error('target_preparation_incomplete');
      operation.privateFile(path.dirname(c.sourceFenceFile), true);
      operation.validateOperationConfig(c);
    }
    return { prepared: true };
  }
  if (task === 'control') {
    const args = [input.helperPath, input.action, ...(input.action === 'start' ? [input.release, input.mode] : [])];
    const result = await util.promisify(cp.execFile)('/usr/bin/sudo', ['-n', ...args], { timeout: 75_000, maxBuffer: 4096, shell: false }); return JSON.parse(result.stdout);
  }
  if (task === 'receive') {
    assertRemotePath(input.destination);
    if (input.name === null) { fs.mkdirSync(input.destination, { mode: 0o700 }); fs.mkdirSync(path.join(input.destination, 'media'), { mode: 0o700 }); return { created: true }; }
    if (!['manifest.json', 'archive.sqlite', 'auth.sqlite'].includes(input.name) && !/^media\/[0-9a-f-]{36}(?:\.bin|\.[0-9a-f-]{36}\.manifest)$/.test(input.name)) throw Error('file_rejected');
    operation.privateFile(input.destination, true);
    const { pipeline } = await import('node:stream/promises');
    await pipeline(process.stdin, fs.createWriteStream(path.join(input.destination, input.name), { flags: 'wx', mode: 0o600 })); return { received: true };
  }
  if (task === 'restore') {
    backup.validateSnapshot(input.snapshotDir); operation.privateFile(input.dataDir, true);
    if (fs.readdirSync(input.dataDir).length) throw Error('target_not_empty');
    fs.rmdirSync(input.dataDir); await backup.restoreSnapshot({ snapshotDir: input.snapshotDir, destination: input.dataDir }); return { restored: true };
  }
  if (task === 'promote') {
    const c = operation.readPrivateJson(input.promotionConfigFile); if (c.dataDir !== input.dataDir || c.snapshotDir !== input.snapshotDir) throw Error('promotion_config_mismatch');
    const promotion = await import(url.pathToFileURL(path.join(input.appRoot, 'dist/src/promotion.js')).href); await promotion.promoteProfile(c); return { promoted: true };
  }
  if (task === 'fence') {
    const c = operation.readPrivateJson(input.promotionConfigFile);
    if (c.sourceFencePublicKey !== input.publicKey || c.dataDir !== input.dataDir || c.snapshotDir !== input.snapshotDir) throw Error('source_anchor_mismatch');
    operation.atomicPrivateJson(c.sourceFenceFile, input.signedFence); return { pinned: true };
  }
  throw Error('task_rejected');
  function assertRemotePath(value) { if (!/^\/[A-Za-z0-9_./-]+$/.test(value) || value.split('/').includes('..')) throw Error('path_rejected'); }
}
function validateConfig(config, recovery = false) {
  assert.equal(config.version, 1); privateFile(config.operationDir, true); privateFile(config.environmentFile); if (!recovery) privateFile(config.pullConfigFile); privateFile(config.ownerPasswordFile);
  const r = config.target; for (const p of ['dataDir', 'appRoot', 'nodePath', 'helperPath', 'snapshotDir', 'promotionConfigFile']) absolute(r[p]);
  assert.match(r.helperPath, /^\/usr\/local\/libexec\/[A-Za-z0-9_.-]+$/);
  assert.match(r.host, /^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/); assert.match(r.user, /^[a-z_][a-z0-9_-]*$/); privateFile(r.identityFile); privateFile(r.knownHostsFile);
  assert.ok(Number.isInteger(r.port ?? 22) && (r.port ?? 22) > 0 && (r.port ?? 22) <= 65535);
  commit(config.priorRelease); commit(config.candidateRelease); assert.match(config.archiveSchema, /^[a-f0-9]{64}$/); assert.match(config.authSchema, /^[a-f0-9]{64}$/);
  const env = readPrivateJson(config.environmentFile); assert.equal(env.target.host, r.host); assert.equal(env.target.machineId, r.machineId); assert.equal(env.persistentVolume.path, r.dataDir);
  assert.equal(env.target.kind, 'ssh'); assert.equal(env.supervisor.kind, 'docker'); assert.equal(env.supervisor.helperPath, r.helperPath);
  for (const key of ['dataDir', 'appRoot', 'nodePath', 'user', 'identityFile', 'knownHostsFile']) assert.equal(env.target[key], r[key]);
  assert.equal(env.target.port ?? 22, r.port ?? 22); assert.match(r.machineId, /^[a-f0-9]{32}$/);
  assert.equal(r.dataDir, resolve(r.dataDir)); assert.equal(r.appRoot, resolve(r.appRoot));
  assert.equal(env.publicOrigin, config.publicOrigin); assert.equal(new URL(config.publicOrigin).origin, config.publicOrigin);
  return config;
}
async function rpc(config, task, extra = {}, input, runner = exec) {
  const r = config.target, payload = { ...r, ...extra }, source = '(' + remoteTask.toString() + ')(' + JSON.stringify(task) + ',' + JSON.stringify(payload) + ').then(r=>process.stdout.write(JSON.stringify(r))).catch(()=>process.exitCode=1)';
  const command = r.nodePath + " -e 'eval(Buffer.from(\"" + Buffer.from(source).toString('base64') + "\",\"base64\").toString())'";
  const argv = ['-F', '/dev/null', '-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UpdateHostKeys=no', '-o', 'ClearAllForwardings=yes', '-o', 'IdentitiesOnly=yes', '-o', 'UserKnownHostsFile=' + r.knownHostsFile, '-i', r.identityFile, '-p', String(r.port ?? 22), '-l', r.user, '--', r.host, command];
  if (!input) return JSON.parse((await runner('/usr/bin/ssh', argv, { timeout: 90_000, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024, shell: false })).stdout);
  const child = spawn('/usr/bin/ssh', argv, { stdio: ['pipe', 'pipe', 'ignore'], signal: AbortSignal.timeout(120_000), killSignal: 'SIGKILL' });
  const { pipeline } = await import('node:stream/promises'); const done = new Promise((yes, no) => { child.on('error', no); child.on('exit', code => code === 0 ? yes() : no(Error('transfer_failed'))); });
  child.stdout.resume(); await Promise.all([pipeline(input, child.stdin), done]); return { received: true };
}
export async function runDeployment(mode, { configFile = process.env.ZAP_OPERATION_CONFIG_FILE, runner = exec, ca } = {}) {
  assert.ok(['preflight', 'migrate', 'update', 'recover'].includes(mode));
  assert.ok(configFile, 'configuration_missing'); const config = validateConfig(readPrivateJson(configFile), mode === 'recover'); config.targetBinding = targetBinding(config);
  const ready = () => assertReady({ configFile: config.environmentFile });
  if (mode === 'recover') await assertRecoveryReady({ configFile: config.environmentFile, runner });
  else await ready(); // full gates remain mandatory before migrate/update
  const call = (task, extra = {}, input) => rpc(config, task, extra, input, runner);
  const checkedControl = async extra => { const facts = await call('control', extra); assertSupervisorFacts(config.target, facts); return facts; };
  const controller = {
    inspect: () => checkedControl({ action: mode === 'recover' ? 'inspect-runtime' : 'inspect' }),
    stop: async () => { await controller.inspect(); const facts = await checkedControl({ action: 'stop' }); assertQuiet(facts, true); },
    activate: async (release, mode) => { const before = await controller.inspect(); assertQuiet(before, true); commit(release); assert.ok(before.preparedReleases?.some(p => p.release === release && p.mode === mode), 'prepared_release_missing'); const facts = await checkedControl({ action: 'start', release, mode }); assert.ok(facts.running && facts.release === release && facts.mode === mode, 'started_release_mismatch'); }
  };
  const facts = await controller.inspect();
  if (mode !== 'recover') for (const release of [config.priorRelease, config.candidateRelease]) assert.ok(facts.preparedReleases?.some(p => p.release === release && p.mode === 'offline'), 'prepared_release_missing');
  if (mode === 'preflight') { return { ready: true, operationalAcceptance: false }; }
  const lock = (await import('../dist/src/whatsapp.js')).acquireServiceLock(config.operationDir);
  try {
    const journalPath = join(config.operationDir, 'deploy-journal.json');
    if (mode === 'recover') {
      const journal = readPrivateJson(journalPath); assert.equal(journal.version, 1); assert.equal(journal.kind, 'release');
      assert.equal(journal.targetBinding, config.targetBinding); assert.equal(journal.archiveSchema, config.archiveSchema); assert.equal(journal.authSchema, config.authSchema);
      assert.ok(['prepared', 'stopped', 'swapped', 'verified', 'committed', 'recovered-offline', 'blocked-offline', 'recovery-validation-failed'].includes(journal.stage));
      commit(journal.priorRelease); assert.equal(journal.candidateRelease, config.candidateRelease);
      assert.ok(facts.preparedReleases?.some(p => p.release === journal.priorRelease && p.mode === 'offline'), 'prepared_release_missing');
      const schemas = state => { assert.equal(state.databases['archive.sqlite'].schema, config.archiveSchema); assert.equal(state.databases['auth.sqlite'].schema, config.authSchema); };
      schemas(await call('state')); // reject incompatibility before stopping a surviving service
      await controller.stop(); assertQuiet(await controller.inspect(), true);
      const baseline = await call('state'); schemas(baseline);
      await controller.activate(journal.priorRelease, 'offline'); journal.stage = 'recovered-offline'; atomicPrivateJson(journalPath, journal);
      try { assert.deepEqual(await call('state'), baseline); await verifyHttps(config.publicOrigin, readFileSync(config.ownerPasswordFile, 'utf8').replace(/\n$/, ''), baseline.originals, ca); }
      catch { journal.stage = 'recovery-validation-failed'; atomicPrivateJson(journalPath, journal); throw Error('recovery_validation_failed'); }
      return { recovered: true, mode: 'offline', validated: true };
    }
    if (existsSync(journalPath)) assert.ok(['committed', 'recovered-offline', 'migration-offline'].includes(readPrivateJson(journalPath).stage), 'deploy_recovery_required');
    const pull = readOffsiteConfig(config.pullConfigFile); assert.equal(pull.role, 'pull');
    assert.notEqual(resolve(pull.operationDir), resolve(config.operationDir));
    assert.equal(pull.remote?.host, config.target.host); assert.equal(pull.remote?.user, config.target.user);
    assert.equal(pull.remote?.dataDir, config.target.dataDir); assert.equal(pull.remote?.mainPath, join(config.target.appRoot, 'dist/src/main.js')); assert.equal(pull.remote?.nodePath, config.target.nodePath);
    const password = readFileSync(config.ownerPasswordFile, 'utf8').replace(/\n$/, '');
    if (mode === 'update') return await swapRelease({ ...config, verify: async () => { const state = await rpc(config, 'state'); await verifyHttps(config.publicOrigin, password, state.originals); } }, { controller, ready, backup: () => runOffsiteBackup(pull), state: () => rpc(config, 'state') });
    // Migration is initiated on the notebook; source is local and recovery key never leaves it.
    const source = readPrivateJson(privateFile(config.sourceConfigFile)); assert.equal(source.role, 'source');
    const sourceController = createSupervisor(source.supervisor); assert.equal(source.supervisor.kind, 'systemd'); assert.equal(source.supervisor.user, true);
    const localAdapter = {
      putNew: async (id, output) => { const copy = await produceOffsiteCopy(source, id); const { pipeline } = await import('node:stream/promises'); const fs = await import('node:fs'); await pipeline(createReadStream(copy.file), fs.createWriteStream(output, { flags: 'wx', mode: 0o600 })); },
      getById: async (id, output) => { const { pipeline } = await import('node:stream/promises'); const fs = await import('node:fs'); await pipeline(createReadStream(join(pull.destinationDir, id + '.age')), fs.createWriteStream(output, { flags: 'wx', mode: 0o600 })); },
      acknowledge: receipt => acknowledgeOffsiteCopy(source, receipt)
    };
    const signer = readPrivateJson(join(source.operationDir, 'source-fence-key.json')); assert.equal(signer.publicKey, config.sourceFencePublicKey);
    await rpc(config, 'preparation', { migration: true, publicKey: config.sourceFencePublicKey });
    await runOffsiteBackup(pull, { adapter: localAdapter }); await ready();
    await controller.stop(); assertQuiet(await controller.inspect(), true);
    atomicPrivateJson(journalPath, { version: 1, kind: 'migration', stage: 'target-offline', startedAt: new Date().toISOString() });
    await exec('/usr/bin/systemctl', ['--user', 'disable', source.supervisor.name], { timeout: 15000, maxBuffer: 4096 });
    await sourceController.stop(); assertQuiet(await sourceController.inspect(), true);
    const fence = await createSourceFence({ ...source, targetDataDir: config.target.dataDir, targetMachineId: config.target.machineId }, sourceController);
    assertQuiet(await sourceController.inspect(), true);
    const snapshot = source.destination + '-final-' + Date.now(); await createSnapshot({ dataDir: source.dataDir, destination: snapshot }); const verified = validateSnapshot(snapshot);
    atomicPrivateJson(journalPath, { version: 1, kind: 'migration', stage: 'source-fenced', snapshot, startedAt: new Date().toISOString() });
    await rpc(config, 'receive', { destination: config.target.snapshotDir, name: null });
    for (const item of [...verified.manifest.files, { path: 'manifest.json' }]) await rpc(config, 'receive', { destination: config.target.snapshotDir, name: item.path }, createReadStream(join(snapshot, item.path)));
    assert.equal(fence.publicKey, config.sourceFencePublicKey);
    await rpc(config, 'fence', { publicKey: fence.publicKey, signedFence: readPrivateJson(fence.fenceFile) });
    await rpc(config, 'restore'); await rpc(config, 'promote');
    await controller.activate(config.candidateRelease, 'offline'); const state = await rpc(config, 'state'); await verifyHttps(config.publicOrigin, password, state.originals);
    await runOffsiteBackup(pull); // actual VPS -> notebook copy and current decrypt/readback ACK
    atomicPrivateJson(journalPath, { version: 1, kind: 'migration', stage: 'migration-offline', snapshot, startedAt: new Date().toISOString() });
    return { migrated: true, mode: 'offline', collectorRequiresSeparateValidityCheck: true };
  } finally { lock.release(); }
}

export async function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'zap-deploy-self-')); process.umask(0o077);
  const dataDir = join(dir, 'persistent'), operationDir = join(dir, 'operations'); mkdirSync(operationDir, { mode: 0o700 });
  let child, backendPort = 0, activeRelease = 'a'.repeat(40), proxy;
  const password = 'senha exclusiva da fixture', bytes = Buffer.from('original fixture persistente');
  const cert = join(dir, 'cert.pem'), key = join(dir, 'key.pem');
  const ssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' }); assert.equal(ssl.status, 0);
  const releases = new Map();
  try {
    for (const release of ['a'.repeat(40), 'b'.repeat(40)]) {
      const path = join(dir, 'release-' + release); mkdirSync(join(path, 'dist'), { recursive: true });
      cpSync(join(root, 'dist/src'), join(path, 'dist/src'), { recursive: true }); cpSync(join(root, 'public'), join(path, 'public'), { recursive: true }); cpSync(join(root, 'package.json'), join(path, 'package.json'));
      symlinkSync(dirname(dirname(createRequire(import.meta.url).resolve('express/package.json'))), join(path, 'node_modules')); releases.set(release, path);
    }
    const s = createService({ dataDir }); await s.setPassword(password); createAuthState(s.authDb, { newProfile: true }).state.keys.set({ session: { fixture: Buffer.from('session must remain') } });
    s.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'old', fromMe: false }, messageTimestamp: 1700000000, message: { documentMessage: { url: 'https://mmg.whatsapp.net/fixture', mediaKey: Buffer.alloc(32), fileLength: bytes.length, fileSha256: createHash('sha256').update(bytes).digest(), fileName: 'fixture.txt' } } }] });
    const worker = startMediaWorker({ archive: s.archive, mediaDir: join(dataDir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop(); await s.close();
    const baseline = profileState(dataDir);
    proxy = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
      const headers = { ...req.headers, host: new URL(origin).host, 'x-forwarded-proto': 'https' };
      for (const name of ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-port', 'x-forwarded-server', 'x-real-ip']) delete headers[name];
      const upstream = httpRequest({ hostname: '127.0.0.1', port: backendPort, method: req.method, path: req.url, headers }, answer => { res.writeHead(answer.statusCode, answer.headers); answer.pipe(res); }); upstream.on('error', () => res.destroy()); req.pipe(upstream);
    }); proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening'); const origin = 'https://localhost:' + proxy.address().port, ca = readFileSync(cert);
    const stop = async () => { if (!child) return; const current = child; const ended = once(current, 'exit'); current.kill('SIGTERM'); await ended; child = undefined; };
    const start = async release => {
      assert.ok(!child); activeRelease = release;
      const portProbe = (await import('node:net')).createServer(); portProbe.listen(0, '127.0.0.1'); await once(portProbe, 'listening'); backendPort = portProbe.address().port; await new Promise(ok => portProbe.close(ok));
      child = spawn(process.execPath, ['dist/src/main.js', 'serve'], { cwd: releases.get(release), stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: dir, ZAP_DATA_DIR: dataDir, ZAP_PORT: String(backendPort), ZAP_PUBLIC_ORIGIN: origin, ZAP_TRUSTED_PROXY_PEERS: '127.0.0.1' } });
      child.stdout.resume(); child.stderr.resume(); let listening = false;
      for (let attempt = 0; attempt < 200 && !listening; attempt++) { assert.equal(child.exitCode, null); listening = await tlsCall(origin, '/api/session', { ca }).then(r => r.status === 200, () => false); if (!listening) await new Promise(ok => setTimeout(ok, 20)); }
      assert.ok(listening, 'fixture_startup');
    };
    const controller = { inspect: async () => ({ running: !!child, autostart: false, pid: child?.pid ?? 0, profileProcesses: child ? 1 : 0, mode: 'offline', release: child ? activeRelease : null }), stop, start: (_, _signal, release) => start(release ?? activeRelease), activate: start };
    await start(activeRelease); await verifyHttps(origin, password, baseline.originals, ca);
    let n = 0; const snapshotConfig = { dataDir, operationDir, destination: join(dir, 'snapshot-' + n++), priorMode: 'offline', priorRelease: activeRelease, supervisor: { kind: 'systemd', name: 'fixture.service', dataDir, machineId: 'a'.repeat(32) } };
    const backup = async () => { snapshotConfig.destination = join(dir, 'snapshot-' + n++); await coordinatedSnapshot(snapshotConfig, { controller }); validateSnapshot(snapshotConfig.destination); };
    await backup(); await stop();
    const current = createService({ dataDir }); current.archive.ingestUpsert({ type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'after-backup', fromMe: false }, messageTimestamp: 1700000100, message: { conversation: 'registro recebido depois do backup' } }] }); await current.close(); await start(activeRelease);
    const recent = profileState(dataDir), config = { dataDir, operationDir, priorRelease: 'a'.repeat(40), candidateRelease: 'b'.repeat(40), archiveSchema: recent.databases['archive.sqlite'].schema, authSchema: recent.databases['auth.sqlite'].schema, verify: () => verifyHttps(origin, password, recent.originals, ca) };
    await swapRelease(config, { controller, ready: async () => {}, backup }); assert.equal(activeRelease, config.candidateRelease); assert.deepEqual(profileState(dataDir), recent);
    await backup(); assert.equal(activeRelease, config.candidateRelease, 'backup after update preserves the observed release');
    for (const stage of ['before-swap', 'swapped']) {
      const beforeRelease = activeRelease;
      await assert.rejects(swapRelease(config, { controller, ready: async () => {}, backup, fault: value => { if (value === stage) throw Error('injected release failure'); } }), /injected/);
      assert.equal(activeRelease, beforeRelease); assert.deepEqual(profileState(dataDir), recent); await verifyHttps(origin, password, recent.originals, ca);
    }
    await stop(); await start(activeRelease); assert.deepEqual(profileState(dataDir), recent);
    await verifyHttps(origin, password, recent.originals, ca); await stop();
    return { passed: true, synthetic: true, operationalAcceptance: false, tls: true, login: true, original: true, owner: true, session: true, persistentData: true, recentRecord: true, rollback: true, restart: true, offline: true, faultBeforeSwap: true, faultAfterSwap: true };
  } finally { if (child) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; } if (proxy) { proxy.closeAllConnections(); await new Promise(ok => proxy.close(ok)); } rmSync(dir, { recursive: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.umask(0o077);
  try { assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--mode'); const mode = process.argv[3]; const result = mode === 'self-test' ? await selfTest() : await runDeployment(mode); console.log(JSON.stringify(result)); }
  catch { console.log(JSON.stringify({ status: 'blocked', error: 'deployment_verification_failed', operationalAcceptance: false })); process.exitCode = 1; }
}

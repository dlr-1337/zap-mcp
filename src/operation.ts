import type { Server } from 'node:http';
import { readFileSync, writeFileSync, openSync, closeSync, fsyncSync, renameSync, existsSync, lstatSync, realpathSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { acquireServiceLock } from './whatsapp.js';
import { createSnapshot, validateSnapshot, preflight } from './backup.js';

const shutdowns = new WeakMap<Server, Promise<void>>();
export function shutdownService({ server, close, controller = new AbortController(), timeoutMs = 30_000 }: { server: Server; close(): void | Promise<void>; controller?: AbortController; timeoutMs?: number }) {
  const existing = shutdowns.get(server); if (existing) return existing;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) throw Error('Prazo de shutdown inválido');
  const work = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); server.closeAllConnections(); reject(Error('Shutdown excedeu prazo; recovery obrigatório')); }, timeoutMs); });
    const http = new Promise<void>((resolve, reject) => server.close(error => error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()));
    controller.abort(); server.closeAllConnections();
    try { await Promise.race([Promise.all([Promise.resolve().then(close), http]), deadline]); }
    finally { clearTimeout(timer); }
  })();
  shutdowns.set(server, work); return work;
}

export type Mode = 'offline' | 'collect';
export type SupervisorConfig = { kind: 'systemd' | 'docker'; name: string; offlineName?: string; helperPath?: string; release?: string; user?: boolean; dataDir: string; machineId: string; ssh?: { host: string; user: string; port?: number; identityFile: string; knownHostsFile: string } };
export type SupervisorFacts = { running: boolean; autostart: boolean; pid: number; startTime: string | null; machineId: string; profileProcesses: number; mode: Mode; release?: string | null };
type HelperSupervisorFacts = SupervisorFacts & { profilePathHash: string; release: string | null; preparedReleases?: { release: string; mode: Mode }[] };
export function assertSupervisorFacts(config: Pick<SupervisorConfig, 'machineId' | 'dataDir'>, input: unknown): asserts input is HelperSupervisorFacts {
  if (!input || typeof input !== 'object') throw Error('Fatos de supervisor inválidos');
  const facts = input as HelperSupervisorFacts;
  if (config.dataDir !== resolve(config.dataDir) || facts.machineId !== config.machineId || facts.profilePathHash !== createHash('sha256').update(resolve(config.dataDir)).digest('hex') || typeof facts.running !== 'boolean' || typeof facts.autostart !== 'boolean' || !Number.isSafeInteger(facts.pid) || facts.pid < 0 || !Number.isInteger(facts.profileProcesses) || !['offline', 'collect'].includes(facts.mode)) throw Error('Helper de outro perfil ou fatos inválidos');
  if (facts.running ? facts.pid <= 0 || facts.profileProcesses !== 1 || typeof facts.startTime !== 'string' || !facts.startTime || !/^[a-f0-9]{40}$/.test(facts.release ?? '') : facts.pid !== 0 || facts.profileProcesses !== 0 || facts.startTime !== null || facts.release !== null) throw Error('PID, release ou exclusividade divergentes');
  if (facts.preparedReleases !== undefined) {
    if (!Array.isArray(facts.preparedReleases) || !facts.preparedReleases.length || facts.preparedReleases.length > 8 || facts.preparedReleases.some(p => !p || !/^[a-f0-9]{40}$/.test(p.release) || !['offline', 'collect'].includes(p.mode)) || new Set(facts.preparedReleases.map(p => p.release + ':' + p.mode)).size !== facts.preparedReleases.length) throw Error('Releases preparadas ambíguas');
    if (facts.running && !facts.preparedReleases.some(p => p.release === facts.release && p.mode === facts.mode)) throw Error('Release ativa não preparada');
  }
}
export type Controller = { stop(signal?: AbortSignal): Promise<void>; start(mode: Mode, signal?: AbortSignal, release?: string): Promise<void>; inspect(signal?: AbortSignal): Promise<SupervisorFacts> };
export type OperationConfig = { dataDir: string; operationDir: string; destination: string; priorMode: Mode; priorRelease: string; supervisor: SupervisorConfig };
export type Journal = { version: 1; operationId: string; kind: 'backup' | 'update' | 'handoff' | 'promotion'; source: string; priorMode: Mode; priorRelease: string; stage: string; destination: string; startedAt: string; resumedMode?: Mode; diagnostic?: string };
export function privateFile(path: string, directory = false, maxBytes = 262144) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw Error('Limite de arquivo privado inválido');
  const canonical = resolve(path), root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  const stat = lstatSync(path);
  if (canonical === root || canonical.startsWith(root + '/') || realpathSync(path) !== canonical || stat.isSymbolicLink() || stat.uid !== process.getuid!() || stat.mode & 0o077 || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1 || stat.size > maxBytes)) throw Error('Configuração operacional privada inválida');
  return canonical;
}
export function readPrivateJson(path: string): any { privateFile(path); return JSON.parse(readFileSync(path, 'utf8')); }
export function atomicPrivateJson(path: string, value: unknown) {
  privateFile(dirname(path), true); if (existsSync(path)) privateFile(path);
  const temp = join(dirname(path), '.operation-' + randomUUID());
  writeFileSync(temp, JSON.stringify(value), { flag: 'wx', mode: 0o600 });
  const fd = openSync(temp, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp, path); const dir = openSync(dirname(path), 'r'); try { fsyncSync(dir); } finally { closeSync(dir); }
}
export function readOperationConfig(path: string): OperationConfig {
  const config = readPrivateJson(path); validateOperationConfig(config); return config;
}
export function validateOperationConfig(config: OperationConfig) {
  privateFile(config.dataDir, true); privateFile(config.operationDir, true);
  if (resolve(config.operationDir).startsWith(resolve(config.dataDir) + '/') || resolve(config.operationDir) === resolve(config.dataDir) || !['offline', 'collect'].includes(config.priorMode) || typeof config.priorRelease !== 'string' || !config.priorRelease || config.priorRelease.length > 200 || typeof config.destination !== 'string') throw Error('Operação inválida');
  if (resolve(config.supervisor.dataDir) !== resolve(config.dataDir)) throw Error('Supervisor de outro perfil');
}
export function acquireOperation(config: OperationConfig, recover = false) {
  validateOperationConfig(config); const lock = acquireServiceLock(config.operationDir), path = join(config.operationDir, 'journal.json');
  try {
    const prior = existsSync(path) ? readPrivateJson(path) as Journal : undefined;
    if (prior && (prior.version !== 1 || prior.source !== resolve(config.dataDir) || !['offline', 'collect'].includes(prior.priorMode) || !/^[0-9a-f-]{36}$/.test(prior.operationId))) throw Error('Journal inválido ou de outro perfil');
    if (prior && !['completed', 'recovered', 'committed', 'revoked'].includes(prior.stage) && !recover) throw Error('Operação interrompida; execute operation-recover');
    return { lock, prior, save(journal: Journal) { lock.assert(); atomicPrivateJson(path, journal); }, release() { lock.release(); } };
  } catch (error) { lock.release(); throw error; }
}
export function newJournal(config: OperationConfig, kind: Journal['kind']): Journal { return { version: 1, operationId: randomUUID(), kind, source: resolve(config.dataDir), destination: resolve(config.destination), priorMode: config.priorMode, priorRelease: config.priorRelease, stage: 'intended', startedAt: new Date().toISOString() }; }

// This fixed probe is also executed remotely; no session or environment values leave it.
async function supervisorProbe(config: SupervisorConfig): Promise<SupervisorFacts> {
  const fs = await import('node:fs'), cp = await import('node:child_process'), util = await import('node:util');
  const run = util.promisify(cp.execFile);
  const machineId = fs.readFileSync('/etc/machine-id', 'utf8').trim(); if (machineId !== config.machineId) throw Error('Host inesperado');
  const names = [...new Set([config.name, config.offlineName ?? config.name])]; let running = false, autostart = false, pid = 0, mode: Mode = 'offline', startTime: string | null = null;
  for (const name of names) {
    if (config.kind === 'systemd') {
      const { stdout } = await run('/usr/bin/systemctl', [...(config.user ? ['--user'] : []), 'show', name, '--no-pager', '--property=LoadState,ActiveState,UnitFileState,MainPID'], { timeout: 8000, maxBuffer: 65536 });
      const values = Object.fromEntries(stdout.trim().split('\n').map(l => l.split('=')));
      if (values.LoadState !== 'loaded' || !['active', 'inactive', 'failed'].includes(values.ActiveState) || !/^\d+$/.test(values.MainPID)) throw Error('Supervisor ambíguo');
      autostart ||= !['disabled', 'masked'].includes(values.UnitFileState);
      if (values.ActiveState === 'active' || values.MainPID !== '0') { if (running) throw Error('Dois serviços ativos'); running = true; pid = Number(values.MainPID); mode = name === config.offlineName ? 'offline' : 'collect'; }
    } else {
      const { stdout } = await run('/usr/bin/docker', ['inspect', '--type=container', name], { timeout: 8000, maxBuffer: 262144 }); const [value] = JSON.parse(stdout);
      if (!value?.State || !value.HostConfig?.RestartPolicy || !['running', 'exited', 'created'].includes(value.State.Status) || !Array.isArray(value.Mounts) || !value.Mounts.some((m: any) => m.Source === config.dataDir && m.RW === true)) throw Error('Container ambíguo ou volume divergente');
      autostart ||= value.HostConfig.RestartPolicy.Name !== 'no';
      if (value.State.Running) { if (running) throw Error('Dois containers ativos'); running = true; pid = value.State.Pid; startTime = value.State.StartedAt; mode = value.Config.Cmd?.includes('--collect') ? 'collect' : 'offline'; }
    }
  }
  let profileProcesses = 0;
  for (const entry of fs.readdirSync('/proc').filter(p => /^\d+$/.test(p))) {
    try {
      if (fs.statSync('/proc/' + entry).uid !== process.getuid!()) continue;
      const argv = fs.readFileSync('/proc/' + entry + '/cmdline', 'utf8').split('\0');
      if (!argv.includes('serve') || !argv.some(a => a === 'dist/src/main.js' || a.endsWith('/dist/src/main.js'))) continue;
      const env = fs.readFileSync('/proc/' + entry + '/environ', 'utf8').split('\0');
      if (env.includes('ZAP_DATA_DIR=' + config.dataDir)) profileProcesses++;
    } catch (error) { if (!['ENOENT', 'ESRCH'].includes((error as NodeJS.ErrnoException).code ?? '')) throw Error('Processo ambíguo'); }
  }
  if (config.kind === 'docker') {
    const { stdout: listed } = await run('/usr/bin/docker', ['ps', '--all', '--quiet'], { timeout: 8000, maxBuffer: 65536 }); const ids = listed.trim().split('\n').filter(Boolean);
    if (ids.some(id => !/^[a-f0-9]{12,64}$/.test(id)) || ids.length > 1000) throw Error('Inventário de containers ambíguo');
    if (ids.length) { const { stdout } = await run('/usr/bin/docker', ['inspect', '--type=container', ...ids], { timeout: 8000, maxBuffer: 262144 }); for (const container of JSON.parse(stdout)) if (container.State?.Running && container.Mounts?.some((m: any) => m.Source === config.dataDir && m.RW === true)) profileProcesses++; }
  }
  if (pid && !startTime) { const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8'); startTime = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]; }
  return { running, autostart, pid, startTime, machineId, profileProcesses, mode };
}
type SupervisorRunner = (file: string, args: string[], options: { signal?: AbortSignal; timeout: number; killSignal: 'SIGKILL'; maxBuffer: number; shell: false }) => Promise<{ stdout: string }>;
export function createSupervisor(config: SupervisorConfig, { runner = promisify(execFile) }: { runner?: SupervisorRunner } = {}): Controller {
  const naming = config.kind === 'systemd' ? /^[A-Za-z0-9_.@-]+\.service$/ : /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
  if (!['systemd', 'docker'].includes(config.kind) || !naming.test(config.name) || config.offlineName && !naming.test(config.offlineName) || !/^[a-f0-9]{32}$/.test(config.machineId) || !/^\/[A-Za-z0-9_./ -]+$/.test(config.dataDir) || config.dataDir.split('/').includes('..')) throw Error('Supervisor inválido');
  const remote = config.ssh;
  if (config.helperPath && (config.kind !== 'docker' || !/^\/usr\/local\/libexec\/[A-Za-z0-9_.-]+$/.test(config.helperPath) || !/^[a-f0-9]{40}$/.test(config.release ?? ''))) throw Error('Helper de supervisor inválido');
  if (remote) {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/.test(remote.host) || !/^[a-z_][a-z0-9_-]{0,31}$/.test(remote.user) || !Number.isInteger(remote.port ?? 22) || (remote.port ?? 22) < 1 || (remote.port ?? 22) > 65535) throw Error('SSH inválido');
    privateFile(remote.identityFile); privateFile(remote.knownHostsFile);
  }
  const run = async (file: string, args: string[], signal?: AbortSignal) => {
    const timeout = config.helperPath ? 75_000 : 10_000;
    if (!remote) return (await runner(file, args, { signal, timeout, killSignal: 'SIGKILL', maxBuffer: 262144, shell: false })).stdout;
    const source = `const{promisify}=require('node:util');const{execFile}=require('node:child_process');promisify(execFile)(${JSON.stringify(file)},${JSON.stringify(args)},{timeout:${timeout - 1000},killSignal:'SIGKILL',maxBuffer:262144,shell:false}).then(r=>process.stdout.write(r.stdout)).catch(()=>process.exit(1));`;
    return remoteNode(source, signal, timeout);
  };
  const remoteNode = async (source: string, signal?: AbortSignal, timeout = 10_000) => {
    const encoded = Buffer.from(source).toString('base64');
    return (await runner('/usr/bin/ssh', ['-F', '/dev/null', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UpdateHostKeys=no', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=8', '-o', 'ConnectionAttempts=1', '-o', 'UserKnownHostsFile=' + remote!.knownHostsFile, '-i', remote!.identityFile, '-p', String(remote!.port ?? 22), '-l', remote!.user, '--', remote!.host, `node -e 'eval(Buffer.from("${encoded}","base64").toString())'`], { signal, timeout, killSignal: 'SIGKILL', maxBuffer: 262144, shell: false })).stdout;
  };
  return {
    async stop(signal) { await this.inspect(signal); if (config.helperPath) { await run('/usr/bin/sudo', ['-n', config.helperPath, 'stop'], signal); return; } for (const name of [...new Set([config.name, config.offlineName ?? config.name])]) await run(config.kind === 'systemd' ? '/usr/bin/systemctl' : '/usr/bin/docker', config.kind === 'systemd' ? [...(config.user ? ['--user'] : []), 'stop', name] : ['stop', '--time', '30', name], signal); },
    async start(mode, signal, release = config.release) { const prior = await this.inspect(signal); if (prior.running && (prior.mode !== mode || config.helperPath && prior.release !== release)) throw Error('Modo ou release de serviço já ativo divergente'); if (config.helperPath) { if (!/^[a-f0-9]{40}$/.test(release ?? '')) throw Error('Release inválida'); if (prior.running) return; await run('/usr/bin/sudo', ['-n', config.helperPath, 'start', release!, mode], signal); } else { const name = mode === 'offline' ? config.offlineName : config.name; if (!name) throw Error('Supervisor de consulta offline não configurado'); await run(config.kind === 'systemd' ? '/usr/bin/systemctl' : '/usr/bin/docker', [...(config.kind === 'systemd' && config.user ? ['--user'] : []), 'start', name], signal); } const facts = await this.inspect(signal); if (!facts.running || facts.mode !== mode || config.helperPath && facts.release !== release) throw Error('Modo ou release retomado divergente'); },
    async inspect(signal) { if (config.helperPath) { const facts = JSON.parse(await run('/usr/bin/sudo', ['-n', config.helperPath, 'inspect'], signal)); assertSupervisorFacts(config, facts); return facts; } if (!remote) return supervisorProbe(config); const source = `(${supervisorProbe.toString()})(${JSON.stringify(config)}).then(v=>console.log(JSON.stringify(v))).catch(()=>process.exit(1));`; return JSON.parse(await remoteNode(source, signal)); }
  };
}
export function assertQuiet(facts: SupervisorFacts, fenced = false) { if (facts.running || facts.pid !== 0 || facts.profileProcesses !== 0 || fenced && facts.autostart) throw Error('Origem ativa, autostart ou estado ambíguo'); }
async function resume(config: OperationConfig, controller: Controller, journal: Journal) {
  let mode = journal.priorMode;
  if (mode === 'collect') { try { preflight(config.dataDir); } catch { mode = 'offline'; journal.diagnostic = 'Coleta não autorizada; retomada offline'; } }
  try { await controller.start(mode, undefined, journal.priorRelease); }
  catch { if (mode === 'offline') throw Error('Falha ao retomar consulta'); mode = 'offline'; journal.diagnostic = 'Coleta falhou; retomada offline'; await controller.stop(); await controller.start(mode, undefined, journal.priorRelease); }
  const facts = await controller.inspect();
  if (!facts.running || facts.release !== undefined && facts.release !== journal.priorRelease) throw Error('Release retomada divergente');
  journal.resumedMode = mode;
}
export async function coordinatedSnapshot(config: OperationConfig, { controller = createSupervisor(config.supervisor), kind = 'backup', fault, transfer }: { controller?: Controller; kind?: 'backup' | 'update'; fault?: (stage: string) => unknown; transfer?: (snapshot: string) => Promise<void> } = {}) {
  const operation = acquireOperation(config), journal = newJournal(config, kind), signal = AbortSignal.timeout(60_000); const started = Date.now(); let snapshotReady = false, failed: unknown;
  const stage = async (name: string) => { journal.stage = name; operation.save(journal); await fault?.(name); };
  try { operation.save(journal);
  const prior = await controller.inspect(signal); journal.priorMode = prior.running ? prior.mode : 'offline';
  if (prior.running && prior.release !== undefined) { if (!/^[a-f0-9]{40}$/.test(prior.release ?? '')) throw Error('Release observada inválida'); journal.priorRelease = prior.release!; }
  operation.save(journal);
  try {
    await fault?.('intended'); await controller.stop(signal); assertQuiet(await controller.inspect(signal)); await stage('stopped');
    signal.throwIfAborted(); await createSnapshot({ dataDir: config.dataDir, destination: config.destination, signal }); signal.throwIfAborted(); validateSnapshot(config.destination); snapshotReady = true; await stage('snapshotted');
  } catch (error) { failed = error; }
  finally {
    try { await resume(config, controller, journal); await stage('resumed'); }
    catch { failed = Error('Retomada falhou; execute operation-recover'); journal.stage = 'resume-failed'; operation.save(journal); }
    if (failed && journal.stage !== 'resume-failed') { journal.stage = 'recovered'; journal.diagnostic ??= 'Snapshot recusado; serviço retomado'; operation.save(journal); }
  }
  if (failed) throw failed;
  if (!snapshotReady) throw Error('Snapshot indisponível');
  const downtimeMs = Date.now() - started;
  await transfer?.(config.destination); journal.stage = 'completed'; operation.save(journal); return { snapshotReady: true, downtimeMs, durationMs: Date.now() - started, resumedMode: journal.resumedMode };
  } finally { operation.release(); }
}
export async function recoverOperation(config: OperationConfig, { controller = createSupervisor(config.supervisor) }: { controller?: Controller } = {}) {
  const operation = acquireOperation(config, true), journal = operation.prior;
  try {
    if (!journal) throw Error('Journal ausente');
    if (['promotion', 'handoff'].includes(journal.kind)) { assertQuiet(await controller.inspect(), true); return { recovered: false, mode: 'offline', reason: 'Handoff exige reconciliação explícita; origem permanece parada' }; }
    const facts = await controller.inspect();
    if (!facts.running) { assertQuiet(facts); await resume(config, controller, journal); }
    else if (facts.release !== undefined && facts.release !== journal.priorRelease) throw Error('Release ativa diverge do journal');
    else if (facts.mode === 'collect' && journal.priorMode !== 'collect' || facts.profileProcesses > 1) throw Error('Recuperação ambígua');
    journal.stage = 'recovered'; operation.save(journal); return { recovered: true, mode: journal.resumedMode ?? facts.mode };
  } finally { operation.release(); }
}

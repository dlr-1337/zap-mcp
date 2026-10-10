import { BufferJSON, initAuthCreds, proto, makeWASocket, Browsers, type AuthenticationState, type SignalDataSet, type SignalDataTypeMap, type BaileysEventMap, type BaileysEventEmitter, type SocketConfig } from '@whiskeysockets/baileys';
import type Database from 'better-sqlite3';
import { mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, lstatSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Archive } from './archive.js';
import QRCode from 'qrcode';

function processStart(pid: number) {
  const stat = readFileSync(`/proc/${pid}/stat`, 'utf8'); return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
}
type Owner = { pid: number; bootId: string; startTime: string; token: string };
export function acquireServiceLock(dataDir: string) {
  const dir = resolve(dataDir), path = join(dir, 'service.lock');
  const owner: Owner = { pid: process.pid, bootId: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), startTime: processStart(process.pid), token: randomUUID() };
  const readOwner = (): Owner => {
    if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory() || lstatSync(join(path, 'owner.json')).isSymbolicLink()) throw Error('Trava inválida');
    const o = JSON.parse(readFileSync(join(path, 'owner.json'), 'utf8')) as Owner;
    if (!Number.isSafeInteger(o.pid) || o.pid <= 0 || typeof o.bootId !== 'string' || !o.bootId || typeof o.startTime !== 'string' || !/^\d+$/.test(o.startTime) || typeof o.token !== 'string' || !o.token) throw Error('Trava inválida'); return o;
  };
  try { mkdirSync(path, { mode: 0o700 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    let previous: Owner; try { previous = readOwner(); } catch { throw Error('Serviço já ativo ou trava incompleta'); }
    let orphan = previous.bootId !== owner.bootId;
    if (!orphan) {
      try { orphan = processStart(previous.pid) !== previous.startTime; }
      catch (probe) { if ((probe as NodeJS.ErrnoException).code !== 'ENOENT') throw Error('Trava ambígua: não foi possível conferir processo'); orphan = true; }
    }
    if (!orphan) throw Error('Serviço já ativo');
    // A recovery claim prevents competing stale-lock removals from deleting a new owner.
    try { mkdirSync(join(path, 'recovery'), { mode: 0o700 }); } catch { throw Error('Trava em recuperação; tente novamente'); }
    if (readOwner().token !== previous.token) throw Error('Trava mudou durante recuperação');
    const abandoned = join(dir, `service.lock.orphan-${owner.token}`);
    renameSync(path, abandoned);
    try { mkdirSync(path, { mode: 0o700 }); } finally { rmSync(abandoned, { recursive: true }); }
  }
  try { writeFileSync(join(path, 'owner.json'), JSON.stringify(owner), { flag: 'wx', mode: 0o600 }); }
  catch (error) { rmSync(path, { recursive: true }); throw error; }
  let active = true, collecting = false;
  return {
    dir,
    assert() { if (!active || readOwner().token !== owner.token) throw Error('Exclusividade perdida'); },
    claimCollector() { this.assert(); if (collecting) throw Error('Coletor já ativo'); collecting = true; },
    releaseCollector() { collecting = false; },
    release() { if (!active) return; this.assert(); if (collecting) throw Error('Pare e drene o coletor antes de liberar a trava'); rmSync(path, { recursive: true }); active = false; }
  };
}
export type ServiceLock = ReturnType<typeof acquireServiceLock>;

export function createAuthState(db: Database.Database, { newProfile = false, onFailure = () => {} }: { newProfile?: boolean; onFailure?: () => void } = {}) {
  db.pragma('foreign_keys = ON'); db.pragma('secure_delete = ON'); db.pragma('synchronous = FULL');
  db.transaction(() => db.exec('CREATE TABLE IF NOT EXISTS whatsapp_profile(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,creds TEXT NOT NULL); CREATE TABLE IF NOT EXISTS whatsapp_keys(category TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(category,id))'))();
  if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw Error('Sessão corrompida');
  const row = db.prepare('SELECT version,creds FROM whatsapp_profile WHERE id=1').get() as { version: number; creds: string } | undefined;
  let creds: AuthenticationState['creds'];
  if (!row) {
    if (!newProfile || (db.prepare('SELECT count(*) AS n FROM whatsapp_keys').get() as { n: number }).n) throw Error('Perfil ausente; criação de perfil novo deve ser explícita');
    creds = initAuthCreds(); db.prepare('INSERT INTO whatsapp_profile VALUES(1,1,?)').run(JSON.stringify(creds, BufferJSON.replacer));
  } else {
    try {
      if (row.version !== 1) throw Error(); creds = JSON.parse(row.creds, BufferJSON.reviver);
      for (const key of [creds.noiseKey, creds.pairingEphemeralKeyPair, creds.signedIdentityKey, creds.signedPreKey?.keyPair]) if (!(key?.public instanceof Uint8Array) || key.public.length !== 32 || !(key.private instanceof Uint8Array) || key.private.length !== 32) throw Error();
      if (typeof creds.registered !== 'boolean' || typeof creds.advSecretKey !== 'string' || !creds.advSecretKey || !Number.isSafeInteger(creds.registrationId) || !Array.isArray(creds.processedHistoryMessages)) throw Error();
    } catch { throw Error('Sessão inválida ou corrompida; preservar perfil para diagnóstico privado'); }
  }
  const set = db.transaction((data: SignalDataSet) => {
    for (const [category, entries] of Object.entries(data)) for (const [id, value] of Object.entries(entries ?? {})) {
      if (value === null) db.prepare('DELETE FROM whatsapp_keys WHERE category=? AND id=?').run(category, id);
      else db.prepare('INSERT INTO whatsapp_keys VALUES(?,?,?) ON CONFLICT(category,id) DO UPDATE SET value=excluded.value').run(category, id, JSON.stringify(value, BufferJSON.replacer));
    }
  });
  const state: AuthenticationState = { creds, keys: {
    get<T extends keyof SignalDataTypeMap>(category: T, ids: string[]) {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      try {
        for (const id of ids) {
          const row = db.prepare('SELECT value FROM whatsapp_keys WHERE category=? AND id=?').get(category, id) as { value: string } | undefined;
          if (!row) continue; let value = JSON.parse(row.value, BufferJSON.reviver);
          if (category === 'app-state-sync-key') value = proto.Message.AppStateSyncKeyData.fromObject(value);
          result[id] = value;
        }
      } catch { onFailure(); throw Error('Falha ao ler sessão persistida'); } return result;
    },
    set(data) { try { set(data); } catch { onFailure(); throw Error('Falha ao persistir sessão; coleta suspensa'); } }
  } };
  return { state, saveCreds(update: Partial<AuthenticationState['creds']> = {}) {
    try { const next = { ...state.creds, ...update }; db.prepare('UPDATE whatsapp_profile SET creds=? WHERE id=1').run(JSON.stringify(next, BufferJSON.replacer)); Object.assign(state.creds, next); }
    catch { onFailure(); throw Error('Falha ao persistir credenciais; coleta suspensa'); }
  } };
}

type Socket = { ev: BaileysEventEmitter; end(error: Error | undefined): void };
export type SocketFactory = (config: Parameters<typeof makeWASocket>[0]) => Socket;
export type CollectorState = 'awaiting-pairing' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'invalid-session';
export type Clock = { now(): number; setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout>; clearTimeout(id: ReturnType<typeof setTimeout>): void; random(): number };
const realClock: Clock = { now: Date.now, setTimeout, clearTimeout, random: Math.random };
const silent: SocketConfig['logger'] = { level: 'silent', child: () => silent, trace() {}, debug() {}, info() {}, warn() {}, error() {} };

export function createCollector({ authDb, archive, lock, onStatus = () => {}, socketFactory, newProfile = false, clock = realClock }: { authDb: Database.Database; archive: Archive; lock: ServiceLock; onStatus?: () => void; socketFactory?: SocketFactory; newProfile?: boolean; clock?: Clock }) {
  lock.assert();
  if (dirname(resolve(authDb.name)) !== lock.dir || dirname(resolve(archive.db.name)) !== lock.dir) throw Error('Bancos fora da trava exclusiva');
  // Plan 01-06 supplies verified snapshot/restore validation before any live socket.
  if (!socketFactory) throw Error('Coleta real bloqueada: cópia privada e restauração conferidas são obrigatórias');
  lock.claimCollector();
  let socket: Socket | undefined, generation = 0, stopped = false, state: CollectorState = 'connecting', diagnostic: string | null = null;
  let qr: { value: string; expiresAt: number; generation: number } | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined, retry: ReturnType<typeof setTimeout> | undefined, stable: ReturnType<typeof setTimeout> | undefined, connecting: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0, retryAt: number | null = null, restarted = false;
  const clearQr = () => { qr = undefined; if (expiry) clock.clearTimeout(expiry); expiry = undefined; };
  const retire = () => { generation++; clearQr(); for (const timer of [retry, stable, connecting]) if (timer) clock.clearTimeout(timer); retry = stable = connecting = undefined; retryAt = null; const prior = socket; socket = undefined; prior?.end(undefined); };
  const fail = () => { state = 'disconnected'; diagnostic = 'Falha de persistência; coleta suspensa'; stopped = true; retire(); onStatus(); };
  let auth: ReturnType<typeof createAuthState>;
  try { auth = createAuthState(authDb, { newProfile, onFailure: fail }); } catch (error) { lock.releaseCollector(); throw error; }
  const snapshot = () => ({ connection: state, collectorEnabled: !stopped, pairingAvailable: Boolean(qr && qr.expiresAt > clock.now()), qrExpiresAt: qr && qr.expiresAt > clock.now() ? new Date(qr.expiresAt).toISOString() : null, generation, diagnostic, retryAttempt, retryAt: retryAt === null ? null : new Date(retryAt).toISOString() });
  function disconnect(code: number) {
    auth.saveCreds(); retire();
    if (code === 401) { state = 'invalid-session'; stopped = true; diagnostic = 'Sessão inválida; novo vínculo necessário. Acervo preservado'; }
    else if ([440, 403, 411, 500].includes(code)) {
      state = 'disconnected'; stopped = true; diagnostic = code === 440 ? 'Conexão substituída; conferir coletor concorrente' : `Conexão recusada (${code}); sessão e acervo preservados`;
    } else if (![515, 408, 428, 503].includes(code) || retryAttempt >= 6 || (code === 515 && restarted)) {
      state = 'disconnected'; stopped = true; diagnostic = 'Reconexão interrompida; limite atingido ou falha sem recuperação automática';
    } else {
      if (code === 515) restarted = true;
      retryAttempt++; state = 'reconnecting'; diagnostic = 'Aguardando tentativa limitada de reconexão';
      const wait = Math.min(60_000, 1000 * 2 ** (retryAttempt - 1) * (1 + clock.random() * 0.5));
      retryAt = clock.now() + wait;
      retry = clock.setTimeout(() => {
        retry = undefined; retryAt = null;
        if (stopped) return;
        try { connect(); } catch { try { disconnect(503); } catch { fail(); } }
      }, wait);
    }
    onStatus();
  }
  function connect() {
    const current = ++generation; clearQr(); state = 'connecting';
    const config: Parameters<typeof makeWASocket>[0] = { auth: { creds: JSON.parse(JSON.stringify(auth.state.creds, BufferJSON.replacer), BufferJSON.reviver), keys: {
      get: (type, ids) => { if (current !== generation || stopped) throw Error('Socket expirado'); return auth.state.keys.get(type, ids); },
      set: data => { if (current !== generation || stopped) throw Error('Socket expirado'); return auth.state.keys.set(data); }
    } }, logger: silent, browser: Browsers.macOS('Desktop'), syncFullHistory: true, shouldSyncHistoryMessage: () => true, markOnlineOnConnect: false, qrTimeout: 20_000, connectTimeoutMs: 20_000,
      getMessage: async key => archive.readPrivateMessage(key)?.message as proto.IMessage | undefined };
    socket = socketFactory!(config);
    connecting = clock.setTimeout(() => { if (current !== generation || stopped || state !== 'connecting') return; try { disconnect(408); } catch { fail(); } }, config.connectTimeoutMs!);
    function on<K extends keyof BaileysEventMap>(name: K, fn: (event: BaileysEventMap[K]) => void) {
      socket!.ev.on(name, event => { if (current !== generation || stopped) return; try { fn(event); } catch { fail(); } });
    }
    on('creds.update', event => { Object.assign(config.auth.creds, event); auth.saveCreds(config.auth.creds); });
    on('messaging-history.set', event => { archive.ingestHistory(event); });
    on('messaging-history.status', event => archive.ingestHistoryStatus(event));
    on('messages.upsert', event => { archive.ingestUpsert(event); });
    on('messages.update', event => { archive.ingestUpdates(event); });
    on('messages.delete', event => {
      const keys = 'keys' in event ? event.keys : (archive.db.prepare('SELECT key_json FROM origins WHERE json_extract(key_json,\'$.remoteJid\')=?').all(event.jid) as { key_json: string }[]).map(row => JSON.parse(row.key_json));
      archive.ingestUpdates(keys.map(key => ({ key, update: { message: null } })));
    });
    on('contacts.upsert', event => archive.ingestContacts(event)); on('contacts.update', event => archive.ingestContacts(event));
    on('lid-mapping.update', event => archive.ingestContacts(event));
    on('chats.upsert', event => archive.ingestGroups(event)); on('chats.update', event => archive.ingestGroups(event));
    on('groups.upsert', event => archive.ingestGroups(event)); on('groups.update', event => archive.ingestGroups(event));
    on('group-participants.update', event => archive.ingestContacts(event.participants));
    on('connection.update', event => {
      if (Object.hasOwn(event, 'qr')) { clearQr(); if (event.qr) { if (connecting) clock.clearTimeout(connecting); connecting = undefined; qr = { value: event.qr, expiresAt: clock.now() + config.qrTimeout!, generation: current }; state = 'awaiting-pairing'; expiry = clock.setTimeout(() => { clearQr(); onStatus(); }, config.qrTimeout!); } }
      if (event.connection === 'open') {
        clearQr(); if (connecting) clock.clearTimeout(connecting); connecting = undefined; state = 'connected'; diagnostic = null;
        if (stable) clock.clearTimeout(stable);
        stable = clock.setTimeout(() => { if (current === generation && !stopped && state === 'connected') { retryAttempt = 0; restarted = false; onStatus(); } }, 60_000);
      }
      if (event.connection === 'connecting') { clearQr(); state = 'connecting'; }
      if (event.connection === 'close') { const error = event.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined; disconnect(error?.output?.statusCode ?? 0); }
      onStatus();
    });
    onStatus();
  }
  try { connect(); } catch (error) { stopped = true; retire(); lock.releaseCollector(); throw Error('Não foi possível iniciar coletor'); }
  return {
    snapshot,
    async pairing() {
      const current = qr; if (!current || current.expiresAt <= clock.now()) return null;
      const image = await QRCode.toDataURL(current.value);
      if (qr !== current || current.generation !== generation || current.expiresAt <= clock.now()) return null;
      return { image, generation: current.generation, expiresAt: new Date(current.expiresAt).toISOString() };
    },
    hidePairing() { clearQr(); onStatus(); },
    drain() { return Promise.resolve(); },
    async stop() { if (!stopped) { stopped = true; retire(); state = 'disconnected'; onStatus(); } lock.releaseCollector(); }
  };
}
export type Collector = ReturnType<typeof createCollector>;

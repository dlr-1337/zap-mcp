import session, { Store, type SessionData } from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

declare module 'express-session' {
  interface SessionData { owner?: boolean; csrfToken?: string; authenticatedAt?: number; ownerGeneration?: string; }
}

const IDLE = 30 * 60_000, ABSOLUTE = 8 * 60 * 60_000, WINDOW = 15 * 60_000;
const derive = (password: string, salt: Buffer) => new Promise<Buffer>((ok, fail) => scrypt(password, salt, 64, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => error ? fail(error) : ok(key)));
function config(db: Database.Database, key: string) { return (db.prepare('SELECT value FROM web_config WHERE key = ?').get(key) as { value: string } | undefined)?.value; }

export class SQLiteStore extends Store {
  constructor(private db: Database.Database) { super(); }
  get(id: string, callback: (error: unknown, data?: SessionData | null) => void) {
    try {
      const row = this.db.prepare('SELECT data, touched_at FROM web_sessions WHERE id = ?').get(id) as { data: string; touched_at: number } | undefined;
      if (!row) return callback(null, null);
      const data = JSON.parse(row.data) as SessionData;
      if (Date.now() - row.touched_at >= IDLE || (data.authenticatedAt && Date.now() - data.authenticatedAt >= ABSOLUTE) || (data.owner && data.ownerGeneration !== config(this.db, 'owner-generation'))) { this.destroy(id); return callback(null, null); }
      callback(null, data);
    } catch (error) { callback(error); }
  }
  set(id: string, data: SessionData, callback?: (error?: unknown) => void) {
    try {
      if (this.db.prepare('SELECT id FROM web_revocations WHERE id = ?').get(id) || (data.owner && data.ownerGeneration !== config(this.db, 'owner-generation'))) { callback?.(); return; }
      this.db.prepare('INSERT OR REPLACE INTO web_sessions VALUES (?, ?, ?)').run(id, JSON.stringify(data), Date.now()); callback?.();
    } catch (error) { callback?.(error); }
  }
  destroy(id: string, callback?: (error?: unknown) => void) {
    try { this.db.transaction(() => { this.db.prepare('INSERT OR IGNORE INTO web_revocations VALUES (?, ?)').run(id, Date.now()); this.db.prepare('DELETE FROM web_sessions WHERE id = ?').run(id); })(); callback?.(); } catch (error) { callback?.(error); }
  }
  touch(id: string, _data: SessionData, callback?: (error?: unknown) => void) {
    try { this.db.prepare('UPDATE web_sessions SET touched_at = ? WHERE id = ?').run(Date.now(), id); callback?.(); } catch (error) { callback?.(error); }
  }
}

export async function setOwnerPassword(db: Database.Database, password: string) {
  if (!password || Buffer.byteLength(password) > 4096) throw Error('Senha inválida');
  const salt = randomBytes(32), hash = await derive(password, salt);
  db.transaction(() => {
    db.prepare('INSERT OR REPLACE INTO web_owner VALUES (1, ?, ?)').run(salt, hash);
    db.prepare('INSERT OR REPLACE INTO web_config VALUES (?, ?)').run('owner-generation', randomBytes(32).toString('hex'));
    db.exec('DELETE FROM web_sessions');
  })();
}

export function createWebAuth(authDb: Database.Database) {
  authDb.transaction(() => {
    const version = authDb.pragma('user_version', { simple: true }) as number;
    if (version === 0) authDb.exec('CREATE TABLE web_owner(id INTEGER PRIMARY KEY CHECK(id = 1), salt BLOB NOT NULL, hash BLOB NOT NULL); CREATE TABLE web_sessions(id TEXT PRIMARY KEY, data TEXT NOT NULL, touched_at INTEGER NOT NULL); CREATE TABLE web_config(key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version = 1');
    if (version < 2) authDb.exec('CREATE TABLE web_revocations(id TEXT PRIMARY KEY, revoked_at INTEGER NOT NULL); PRAGMA user_version = 2');
    for (const key of ['signing-secret', 'owner-generation']) if (!config(authDb, key)) authDb.prepare('INSERT INTO web_config VALUES (?, ?)').run(key, randomBytes(48).toString('hex'));
  })();
  const store = new SQLiteStore(authDb);
  let active = 0;
  const middleware = session({ name: 'zap.sid', secret: config(authDb, 'signing-secret')!, store, resave: false, saveUninitialized: false, rolling: true, cookie: { httpOnly: true, sameSite: 'strict', secure: false, maxAge: IDLE } });
  const requireOwner = (req: Request, res: Response, next: NextFunction) => {
    store.get(req.sessionID, (error, current) => {
      if (error) { next(error); return; }
      if (!req.session.owner || !current?.owner || current.ownerGeneration !== config(authDb, 'owner-generation')) { res.status(401).json({ error: 'Autenticação necessária' }); return; }
      next();
    });
  };
  const csrf = (req: Request, res: Response, next: NextFunction) => {
    const origin = `http://${req.get('Host')}`;
    if (req.get('Origin') !== origin || !req.session.csrfToken || typeof req.body?.csrfToken !== 'string' || req.body.csrfToken !== req.session.csrfToken) { res.status(403).json({ error: 'Solicitação recusada' }); return; } next();
  };
  const sessionInfo = (req: Request, res: Response) => {
    req.session.csrfToken ??= randomBytes(32).toString('hex');
    res.json({ authenticated: req.session.owner === true, csrfToken: req.session.csrfToken });
  };
  const login = async (req: Request, res: Response) => {
    if (typeof req.body?.password !== 'string' || !req.body.password) { res.status(401).json({ error: 'Acesso recusado' }); return; }
    const now = Date.now();
    let budget = JSON.parse(config(authDb, 'login-window') ?? '{"start":0,"count":0}') as { start: number; count: number };
    if (now - budget.start >= WINDOW) budget = { start: now, count: 0 };
    if (budget.count >= 5 || active >= 2) { res.set('Retry-After', String(budget.count >= 5 ? Math.max(1, Math.ceil((budget.start + WINDOW - now) / 1000)) : 1)); res.status(429).json({ error: 'Muitas tentativas' }); return; }
    budget.count++;
    authDb.prepare('INSERT OR REPLACE INTO web_config VALUES (?, ?)').run('login-window', JSON.stringify(budget));
    const owner = authDb.prepare('SELECT salt, hash FROM web_owner WHERE id = 1').get() as { salt: Buffer; hash: Buffer } | undefined;
    if (!owner) { res.status(401).json({ error: 'Acesso recusado' }); return; }
    const generation = config(authDb, 'owner-generation');
    active++;
    let hash: Buffer;
    try { hash = await derive(req.body.password, owner.salt); } finally { active--; }
    if (owner.hash.length !== hash.length || !timingSafeEqual(hash, owner.hash) || generation !== config(authDb, 'owner-generation')) { res.status(401).json({ error: 'Acesso recusado' }); return; }
    await new Promise<void>((ok, fail) => req.session.regenerate(error => error ? fail(error) : ok()));
    req.session.owner = true; req.session.authenticatedAt = Date.now(); req.session.ownerGeneration = generation; req.session.csrfToken = randomBytes(32).toString('hex');
    await new Promise<void>((ok, fail) => req.session.save(error => error ? fail(error) : ok()));
    if (req.is('application/x-www-form-urlencoded')) { res.redirect('/'); return; }
    res.json({ authenticated: true });
  };
  const logout = async (req: Request, res: Response) => {
    await new Promise<void>((ok, fail) => req.session.destroy(error => error ? fail(error) : ok()));
    res.clearCookie('zap.sid', { httpOnly: true, sameSite: 'strict', secure: false }); res.json({ authenticated: false });
  };
  return { middleware, requireOwner, csrf, sessionInfo, login, logout };
}

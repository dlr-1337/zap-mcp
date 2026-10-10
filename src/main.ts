import express, { type Request, type Response, type NextFunction } from 'express';
import session, { Store, type SessionData } from 'express-session';
import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

declare module 'express-session' {
  interface SessionData { owner?: boolean; csrfToken?: string; authenticatedAt?: number; }
}

const options = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const derive = (password: string, salt: Buffer, length: number, config: typeof options) => new Promise<Buffer>((ok, fail) => scrypt(password, salt, length, config, (error, key) => error ? fail(error) : ok(key)));
class SQLiteStore extends Store {
  constructor(private db: Database.Database) { super(); }
  get(id: string, callback: (error: unknown, data?: SessionData | null) => void) {
    try {
      const row = this.db.prepare('SELECT data, touched_at FROM web_sessions WHERE id = ?').get(id) as { data: string; touched_at: number } | undefined;
      if (!row) return callback(null, null);
      const data = JSON.parse(row.data) as SessionData;
      if (Date.now() - row.touched_at >= 30 * 60_000 || (data.authenticatedAt && Date.now() - data.authenticatedAt >= 8 * 60 * 60_000)) { this.db.prepare('DELETE FROM web_sessions WHERE id = ?').run(id); return callback(null, null); }
      callback(null, data);
    } catch (error) { callback(error); }
  }
  set(id: string, data: SessionData, callback?: (error?: unknown) => void) {
    try { this.db.prepare('INSERT OR REPLACE INTO web_sessions VALUES (?, ?, ?)').run(id, JSON.stringify(data), Date.now()); callback?.(); } catch (error) { callback?.(error); }
  }
  destroy(id: string, callback?: (error?: unknown) => void) {
    try { this.db.prepare('DELETE FROM web_sessions WHERE id = ?').run(id); callback?.(); } catch (error) { callback?.(error); }
  }
  touch(id: string, _data: SessionData, callback?: (error?: unknown) => void) {
    try { this.db.prepare('UPDATE web_sessions SET touched_at = ? WHERE id = ?').run(Date.now(), id); callback?.(); } catch (error) { callback?.(error); }
  }
}
async function setOwnerPassword(db: Database.Database, password: string) {
  if (!password || Buffer.byteLength(password) > 4096) throw Error('Senha inválida');
  const salt = randomBytes(32);
  const hash = await derive(password, salt, 64, options) as Buffer;
  db.transaction(() => { db.prepare('INSERT OR REPLACE INTO web_owner VALUES (1, ?, ?)').run(salt, hash); db.exec('DELETE FROM web_sessions'); })();
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export type StoredMessage = { reference: string; conversationId: string; conversationName: string | null; text: string; originalTimestamp: string };

export function createService({ dataDir }: { dataDir: string }) {
  if (process.versions.node.split('.')[0] !== '24') throw Error('Node24 obrigatório');
  const root = realpathSync(resolve('.'));
  const location = resolve(dataDir);
  if (location === root || location.startsWith(root + '/')) throw Error('Armazenamento privado deve ficar fora do checkout');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  if (lstatSync(dataDir).isSymbolicLink() || realpathSync(dataDir) !== location) throw Error('Diretório privado inválido');
  chmodSync(dataDir, 0o700);
  for (const name of ['archive.sqlite', 'auth.sqlite']) {
    const path = join(dataDir, name);
    if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw Error('Arquivo privado inválido');
  }
  const archiveDb = new Database(join(dataDir, 'archive.sqlite'));
  const authDb = new Database(join(dataDir, 'auth.sqlite'));
  for (const db of [archiveDb, authDb]) db.pragma('foreign_keys = ON');
  archiveDb.transaction(() => {
    if (archiveDb.pragma('user_version', { simple: true }) === 0) {
      archiveDb.exec('CREATE TABLE conversations(id TEXT PRIMARY KEY, name TEXT); CREATE TABLE messages(reference TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), text TEXT NOT NULL, original_timestamp TEXT NOT NULL); PRAGMA user_version = 1');
    }
  })();
  authDb.transaction(() => {
    if (authDb.pragma('user_version', { simple: true }) === 0) authDb.exec('CREATE TABLE web_owner(id INTEGER PRIMARY KEY CHECK(id = 1), salt BLOB NOT NULL, hash BLOB NOT NULL); CREATE TABLE web_sessions(id TEXT PRIMARY KEY, data TEXT NOT NULL, touched_at INTEGER NOT NULL); CREATE TABLE web_config(key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version = 1');
    if (!authDb.prepare('SELECT value FROM web_config WHERE key = ?').get('signing-secret')) authDb.prepare('INSERT INTO web_config VALUES (?, ?)').run('signing-secret', randomBytes(48).toString('hex'));
  })();
  for (const name of ['archive.sqlite', 'auth.sqlite']) chmodSync(join(dataDir, name), 0o600);
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); next();
  });
  app.use(express.json({ limit: '4kb' }));
  app.use(express.urlencoded({ extended: false, limit: '4kb' }));
  const secret = (authDb.prepare('SELECT value FROM web_config WHERE key = ?').get('signing-secret') as { value: string }).value;
  app.use(session({ name: 'zap.sid', secret, store: new SQLiteStore(authDb), resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'strict', secure: false, maxAge: 30 * 60_000 } }));
  const requireOwner = (req: Request, res: Response, next: NextFunction) => { if (!req.session.owner) { res.status(401).json({ error: 'Autenticação necessária' }); return; } next(); };
  const csrf = (req: Request, res: Response, next: NextFunction) => {
    if (req.get('Origin') !== `http://${req.get('Host')}` || !req.session.csrfToken || typeof req.body?.csrfToken !== 'string' || req.body.csrfToken !== req.session.csrfToken) { res.status(403).json({ error: 'Solicitação recusada' }); return; } next();
  };
  app.get('/api/session', (req, res) => { req.session.csrfToken ??= randomBytes(32).toString('hex'); res.json({ authenticated: req.session.owner === true, csrfToken: req.session.csrfToken }); });
  app.post('/login', csrf, async (req, res) => {
    const owner = authDb.prepare('SELECT salt, hash FROM web_owner WHERE id = 1').get() as { salt: Buffer; hash: Buffer } | undefined;
    if (!owner || typeof req.body?.password !== 'string' || !req.body.password) { res.status(401).json({ error: 'Acesso recusado' }); return; }
    const hash = await derive(req.body.password, owner.salt, 64, options) as Buffer;
    if (!timingSafeEqual(hash, owner.hash)) { res.status(401).json({ error: 'Acesso recusado' }); return; }
    await new Promise<void>((ok, fail) => req.session.regenerate(error => error ? fail(error) : ok()));
    req.session.owner = true; req.session.authenticatedAt = Date.now(); req.session.csrfToken = randomBytes(32).toString('hex');
    await new Promise<void>((ok, fail) => req.session.save(error => error ? fail(error) : ok()));
    if (req.is('application/x-www-form-urlencoded')) { res.redirect('/'); return; }
    res.json({ authenticated: true });
  });
  app.use('/api/status', requireOwner);
  app.use('/api/conversations', requireOwner);
  app.get('/api/status', (_req, res) => res.json({ connection: 'disconnected', collectorEnabled: false, pairingAvailable: false, lastIngestion: null }));
  app.get('/api/conversations', (_req, res) => res.json({ conversations: archiveDb.prepare('SELECT id, name FROM conversations ORDER BY id LIMIT 50').all(), nextCursor: null }));
  app.get('/api/conversations/:id/messages', (req, res) => {
    const conversation = archiveDb.prepare('SELECT id, name FROM conversations WHERE id = ?').get(req.params.id);
    if (!conversation) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    res.json({ conversation, messages: archiveDb.prepare('SELECT reference, text, original_timestamp AS originalTimestamp FROM messages WHERE conversation_id = ? ORDER BY original_timestamp, reference LIMIT 100').all(req.params.id), nextCursor: null });
  });
  app.get('/', (req, res) => {
    req.session.csrfToken ??= randomBytes(32).toString('hex');
    const content = req.session.owner ? '<a href="/conversations">Abrir conversas arquivadas</a>' : `<form action="/login" method="post"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" required><input type="hidden" name="csrfToken" value="${req.session.csrfToken}"><button>Entrar no acervo</button></form>`;
    res.type('html').send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Zap MCP — arquivo privado</title><main><h1>Zap MCP — arquivo privado</h1>${content}</main></html>`);
  });
  app.get('/conversations', requireOwner, (_req, res) => {
    const items = archiveDb.prepare('SELECT id, name FROM conversations ORDER BY id LIMIT 50').all() as { id: string; name: string | null }[];
    res.type('html').send(`<html lang="pt-BR"><meta charset="utf-8"><title>Conversas arquivadas</title><main><h1>Conversas arquivadas</h1><ul>${items.map(item => `<li><a href="/api/conversations/${encodeURIComponent(item.id)}/messages">${escapeHtml(item.name ?? 'Conversa sem nome recebido')}</a></li>`).join('')}</ul></main></html>`);
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { const status = (error as { status?: number }).status; res.status(status === 413 ? 413 : 500).json({ error: 'Solicitação não concluída' }); });
  return {
    app, archiveDb, authDb,
    writeMessage: archiveDb.transaction((message: StoredMessage) => {
      archiveDb.prepare('INSERT INTO conversations(id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name').run(message.conversationId, message.conversationName);
      archiveDb.prepare('INSERT INTO messages VALUES (?, ?, ?, ?) ON CONFLICT(reference) DO NOTHING').run(message.reference, message.conversationId, message.text, message.originalTimestamp);
    }),
    setPassword(password: string) { return setOwnerPassword(authDb, password); },
    close() { archiveDb.close(); authDb.close(); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dataDir = process.env.ZAP_DATA_DIR;
  if (!dataDir) throw Error('Configure ZAP_DATA_DIR privado fora do checkout');
  const service = createService({ dataDir });
  if (process.argv[2] === 'owner-set') {
    let input = ''; for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 4096) throw Error('Senha inválida'); }
    await service.setPassword(input.replace(/\r?\n$/, '')); service.close();
  } else if (process.argv[2] === 'serve') {
    const server = service.app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close(() => { service.close(); }));
  } else { service.close(); throw Error('Comando inválido'); }
}

import express, { type Request, type Response, type NextFunction } from 'express';
import { createWebAuth, setOwnerPassword } from './auth.js';
import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

export type StoredMessage = { reference: string; conversationId: string; conversationName: string | null; text: string; originalTimestamp: string };

export function createService({ dataDir }: { dataDir: string }) {
  if (process.versions.node.split('.')[0] !== '24') throw Error('Node24 obrigatório');
  const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  const location = resolve(dataDir);
  if (location === root || location.startsWith(root + '/')) throw Error('Armazenamento privado deve ficar fora do checkout');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  if (lstatSync(dataDir).isSymbolicLink() || realpathSync(dataDir) !== location) throw Error('Diretório privado inválido');
  chmodSync(dataDir, 0o700);
  process.umask(0o077);
  for (const name of ['archive.sqlite', 'auth.sqlite']) {
    const path = join(dataDir, name);
    if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw Error('Arquivo privado inválido');
  }
  const lockDir = join(dataDir, 'service.lock');
  try { mkdirSync(lockDir, { mode: 0o700 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    let pid: number;
    try { pid = Number(readFileSync(join(lockDir, 'pid'), 'utf8')); } catch { throw Error('Serviço já ativo ou trava incompleta'); }
    if (!Number.isSafeInteger(pid) || pid <= 0) throw Error('Trava inválida');
    try { process.kill(pid, 0); throw Error('Serviço já ativo'); }
    catch (probe) { if ((probe as NodeJS.ErrnoException).code !== 'ESRCH') throw probe; }
    rmSync(lockDir, { recursive: true }); mkdirSync(lockDir, { mode: 0o700 });
  }
  writeFileSync(join(lockDir, 'pid'), String(process.pid), { mode: 0o600 });
  let archiveDb: Database.Database, authDb: Database.Database;
  const opened: Database.Database[] = [];
  let auth: ReturnType<typeof createWebAuth>;
  try {
  archiveDb = new Database(join(dataDir, 'archive.sqlite')); opened.push(archiveDb);
  authDb = new Database(join(dataDir, 'auth.sqlite')); opened.push(authDb);
  for (const db of [archiveDb, authDb]) db.pragma('foreign_keys = ON');
  archiveDb.transaction(() => {
    if (archiveDb.pragma('user_version', { simple: true }) === 0) {
      archiveDb.exec('CREATE TABLE conversations(id TEXT PRIMARY KEY, name TEXT); CREATE TABLE messages(reference TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), text TEXT NOT NULL, original_timestamp TEXT NOT NULL); PRAGMA user_version = 1');
    }
    if ((archiveDb.pragma('user_version', { simple: true }) as number) < 2) {
      archiveDb.exec('ALTER TABLE conversations ADD COLUMN source_id TEXT; CREATE UNIQUE INDEX conversation_source ON conversations(source_id); PRAGMA defer_foreign_keys = ON');
      const prior = archiveDb.prepare('SELECT id FROM conversations').all() as { id: string }[];
      for (const row of prior) {
        const id = randomUUID();
        archiveDb.prepare('UPDATE conversations SET id = ?, source_id = ? WHERE id = ?').run(id, row.id, row.id);
        archiveDb.prepare('UPDATE messages SET conversation_id = ? WHERE conversation_id = ?').run(id, row.id);
      }
      archiveDb.exec('CREATE INDEX message_window ON messages(conversation_id, original_timestamp, reference); PRAGMA user_version = 2');
    }
  })();
  auth = createWebAuth(authDb);
  for (const name of ['archive.sqlite', 'auth.sqlite']) chmodSync(join(dataDir, name), 0o600);
  } catch (error) { for (const db of opened) db.close(); rmSync(lockDir, { recursive: true }); throw error; }
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!/^(127\.0\.0\.1|localhost)(:[0-9]+)?$/.test(req.get('Host') ?? '') || !['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(req.socket.remoteAddress ?? '')) { res.status(403).json({ error: 'Transporte recusado' }); return; } next();
  });
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }); next();
  });
  app.use(express.json({ limit: '4kb' }));
  app.use(express.urlencoded({ extended: false, limit: '4kb' }));
  app.use(auth.middleware);
  const requireOwner = auth.requireOwner;
  app.get('/api/session', auth.sessionInfo);
  app.post('/login', auth.csrf, auth.login);
  app.post('/logout', auth.csrf, auth.logout);
  app.use('/api/status', requireOwner);
  app.use('/api/conversations', requireOwner);
  app.get('/api/status', (_req, res) => res.json({ connection: 'disconnected', collectorEnabled: false, pairingAvailable: false, lastIngestion: null }));
  const signingKey = (authDb.prepare('SELECT value FROM web_config WHERE key = ?').get('signing-secret') as { value: string }).value;
  const encodeCursor = (parts: string[]) => {
    const body = Buffer.from(JSON.stringify(parts)).toString('base64url');
    return body + '.' + createHmac('sha256', signingKey).update(body).digest('base64url');
  };
  const decodeCursor = (input: unknown, kind: string, scope: string): string[] | null => {
    if (input === undefined) return null;
    if (typeof input !== 'string' || input.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(input)) throw Object.assign(Error('cursor'), { status: 400 });
    const [body, signature] = input.split('.');
    const expected = createHmac('sha256', signingKey).update(body).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw Object.assign(Error('cursor'), { status: 400 });
    let parts: unknown;
    try { parts = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { throw Object.assign(Error('cursor'), { status: 400 }); }
    if (!Array.isArray(parts) || !parts.every(p => typeof p === 'string') || parts[0] !== kind || parts[1] !== scope || parts.length !== (kind === 'conversations' ? 3 : 4)) throw Object.assign(Error('cursor'), { status: 400 });
    return parts;
  };
  app.get('/api/conversations', (req, res) => {
    const cursor = decodeCursor(req.query.cursor, 'conversations', '');
    const rows = archiveDb.prepare('SELECT c.id, c.name, (SELECT max(original_timestamp) FROM messages WHERE conversation_id = c.id) AS lastTimestamp FROM conversations c WHERE c.id > ? ORDER BY c.id LIMIT 51').all(cursor?.[2] ?? '') as { id: string; name: string | null; lastTimestamp: string | null }[];
    const conversations = rows.slice(0, 50);
    res.json({ conversations, nextCursor: rows.length > 50 ? encodeCursor(['conversations', '', conversations.at(-1)!.id]) : null });
  });
  app.get('/api/conversations/:id/messages', (req, res) => {
    if (!/^[0-9a-f-]{36}$/.test(req.params.id)) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    const conversation = archiveDb.prepare('SELECT id, name FROM conversations WHERE id = ?').get(req.params.id);
    if (!conversation) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    const cursor = decodeCursor(req.query.cursor, 'messages', req.params.id);
    const rows = archiveDb.prepare('SELECT reference, text, original_timestamp AS originalTimestamp FROM messages WHERE conversation_id = ? AND (? IS NULL OR (original_timestamp, reference) < (?, ?)) ORDER BY original_timestamp DESC, reference DESC LIMIT 101').all(req.params.id, cursor?.[2] ?? null, cursor?.[2] ?? '', cursor?.[3] ?? '') as { reference: string; text: string; originalTimestamp: string }[];
    const page = rows.slice(0, 100);
    const oldest = page.at(-1);
    res.json({ conversation, messages: page.reverse(), nextCursor: rows.length > 100 ? encodeCursor(['messages', req.params.id, oldest!.originalTimestamp, oldest!.reference]) : null });
  });
  const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
  for (const [route, filename] of [['/', 'index.html'], ['/app.js', 'app.js'], ['/style.css', 'style.css']]) {
    app.get(route, (_req, res) => res.sendFile(join(publicDir, filename), { cacheControl: false, lastModified: false, etag: false }));
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { const status = (error as { status?: number }).status; res.status(status === 413 ? 413 : status === 400 ? 400 : 500).json({ error: 'Solicitação não concluída' }); });
  return {
    app, archiveDb, authDb,
    writeMessage: archiveDb.transaction((message: StoredMessage) => {
      if (typeof message.text !== 'string' || !message.reference || !message.conversationId || !Number.isFinite(Date.parse(message.originalTimestamp))) throw Error('Mensagem inválida');
      const existing = archiveDb.prepare('SELECT id FROM conversations WHERE source_id = ?').get(message.conversationId) as { id: string } | undefined;
      const id = existing?.id ?? randomUUID();
      archiveDb.prepare('INSERT INTO conversations(id, name, source_id) VALUES (?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET name = excluded.name').run(id, message.conversationName, message.conversationId);
      archiveDb.prepare('INSERT INTO messages VALUES (?, ?, ?, ?) ON CONFLICT(reference) DO NOTHING').run(message.reference, id, message.text, message.originalTimestamp);
      return id;
    }),
    setPassword(password: string) { return setOwnerPassword(authDb, password); },
    close() { archiveDb.close(); authDb.close(); rmSync(lockDir, { recursive: true }); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dataDir = process.env.ZAP_DATA_DIR;
  if (!dataDir) throw Error('Configure ZAP_DATA_DIR privado fora do checkout');
  const service = createService({ dataDir });
  if (process.argv[2] === 'owner-set') {
    try {
      let input = ''; process.stdin.setEncoding('utf8'); for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 4096) throw Error('Senha inválida'); }
      await service.setPassword(input.replace(/\r?\n$/, ''));
    } finally { service.close(); }
  } else if (process.argv[2] === 'serve') {
    const server = service.app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close(() => { service.close(); }));
  } else { service.close(); throw Error('Comando inválido'); }
}

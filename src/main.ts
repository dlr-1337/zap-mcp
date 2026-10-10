import express, { type Request, type Response, type NextFunction } from 'express';
import { createWebAuth, setOwnerPassword } from './auth.js';
import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

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
  try { archiveDb = new Database(join(dataDir, 'archive.sqlite')); authDb = new Database(join(dataDir, 'auth.sqlite')); }
  catch (error) { rmSync(lockDir, { recursive: true }); throw error; }
  for (const db of [archiveDb, authDb]) db.pragma('foreign_keys = ON');
  archiveDb.transaction(() => {
    if (archiveDb.pragma('user_version', { simple: true }) === 0) {
      archiveDb.exec('CREATE TABLE conversations(id TEXT PRIMARY KEY, name TEXT); CREATE TABLE messages(reference TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), text TEXT NOT NULL, original_timestamp TEXT NOT NULL); PRAGMA user_version = 1');
    }
  })();
  const auth = createWebAuth(authDb);
  for (const name of ['archive.sqlite', 'auth.sqlite']) chmodSync(join(dataDir, name), 0o600);
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

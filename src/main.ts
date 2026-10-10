import express, { type Request, type Response, type NextFunction } from 'express';
import { createWebAuth, setOwnerPassword } from './auth.js';
import { openArchive, type Archive } from './archive.js';
import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { acquireServiceLock, createCollector, type Collector, type SocketFactory, type Clock } from './whatsapp.js';

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
  const lock = acquireServiceLock(dataDir);
  let collector: Collector | undefined;
  let archiveDb: Database.Database, authDb: Database.Database, archive: Archive;
  const opened: Database.Database[] = [];
  let auth: ReturnType<typeof createWebAuth>;
  try {
  archive = openArchive(dataDir); archiveDb = archive.db; opened.push(archiveDb);
  authDb = new Database(join(dataDir, 'auth.sqlite')); opened.push(authDb);
  for (const db of [archiveDb, authDb]) db.pragma('foreign_keys = ON');
  auth = createWebAuth(authDb);
  for (const name of ['archive.sqlite', 'auth.sqlite']) chmodSync(join(dataDir, name), 0o600);
  } catch (error) { for (const db of opened) db.close(); lock.release(); throw error; }
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
  app.post('/logout', auth.csrf, async (req, res) => { await auth.logout(req, res); collector?.hidePairing(); });
  app.use('/api/status', requireOwner);
  app.use('/api/qr', requireOwner);
  app.use('/api/conversations', requireOwner);
  app.get('/api/status', (_req, res) => { const coverage = archive.getCoverage(); res.json({ ...(collector?.snapshot() ?? { connection: 'disconnected', collectorEnabled: false, pairingAvailable: false, diagnostic: 'Coleta real bloqueada até cópia e restauração conferidas' }), lastIngestion: coverage.lastIngestion, coverage }); });
  app.get('/api/qr', async (req, res) => {
    const pairing = await collector?.pairing();
    if (!req.session.owner || !authDb.prepare('SELECT 1 FROM web_sessions WHERE id=?').get(req.sessionID)) { res.status(401).json({ error: 'Autenticação necessária' }); return; }
    if (!pairing) { res.status(409).json({ error: 'QR vigente não disponível' }); return; }
    res.json(pairing);
  });
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
    const page = archive.listConversations({ cursor: cursor?.[2] });
    res.json({ conversations: page.conversations, nextCursor: page.nextCursor ? encodeCursor(['conversations', '', page.nextCursor]) : null });
  });
  app.get('/api/conversations/:id/messages', (req, res) => {
    if (!/^[0-9a-f-]{36}$/.test(req.params.id)) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    const cursor = decodeCursor(req.query.cursor, 'messages', req.params.id);
    const page = archive.readConversation(req.params.id, { cursor: cursor ? { timestamp: cursor[2], reference: cursor[3] } : undefined });
    if (!page) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    res.json({ ...page, nextCursor: page.nextCursor ? encodeCursor(['messages', req.params.id, page.nextCursor.timestamp, page.nextCursor.reference]) : null });
  });
  const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
  for (const [route, filename] of [['/', 'index.html'], ['/app.js', 'app.js'], ['/style.css', 'style.css']]) {
    app.get(route, (_req, res) => res.sendFile(join(publicDir, filename), { cacheControl: false, lastModified: false, etag: false }));
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { const status = (error as { status?: number }).status; res.status(status === 413 ? 413 : status === 400 ? 400 : 500).json({ error: 'Solicitação não concluída' }); });
  return {
    app, archiveDb, archive, authDb,
    writeMessage: archiveDb.transaction((message: StoredMessage) => {
      if (typeof message.text !== 'string' || !message.reference || !message.conversationId || !Number.isFinite(Date.parse(message.originalTimestamp))) throw Error('Mensagem inválida');
      const existing = archiveDb.prepare('SELECT id FROM conversations WHERE source_id = ?').get(message.conversationId) as { id: string } | undefined;
      const id = existing?.id ?? randomUUID();
      archiveDb.prepare('INSERT INTO conversations(id, name, source_id) VALUES (?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET name = excluded.name').run(id, message.conversationName, message.conversationId);
      archiveDb.prepare('INSERT INTO messages(reference,conversation_id,text,original_timestamp) VALUES (?, ?, ?, ?) ON CONFLICT(reference) DO NOTHING').run(message.reference, id, message.text, message.originalTimestamp);
      return id;
    }),
    setPassword(password: string) { return setOwnerPassword(authDb, password); },
    startCollector(options: { socketFactory?: SocketFactory; newProfile?: boolean; clock?: Clock } = {}) { lock.assert(); if (collector) throw Error('Coletor já ativo'); collector = createCollector({ authDb, archive, lock, ...options }); return collector; },
    close() {
      const finish = () => { archiveDb.close(); authDb.close(); lock.release(); };
      if (collector) return collector.stop().then(finish);
      finish();
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dataDir = process.env.ZAP_DATA_DIR;
  if (!dataDir) throw Error('Configure ZAP_DATA_DIR privado fora do checkout');
  if (process.argv.includes('--collect')) throw Error('Coleta real bloqueada: cópia privada e restauração conferidas são obrigatórias');
  const service = createService({ dataDir });
  if (process.argv[2] === 'owner-set') {
    try {
      let input = ''; process.stdin.setEncoding('utf8'); for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 4096) throw Error('Senha inválida'); }
      await service.setPassword(input.replace(/\r?\n$/, ''));
    } finally { service.close(); }
  } else if (process.argv[2] === 'serve') {
    const server = service.app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1');
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close(() => { void service.close(); }));
  } else { service.close(); throw Error('Comando inválido'); }
}

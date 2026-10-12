import express, { type Request, type Response, type NextFunction } from 'express';
import { createWebAuth, setOwnerPassword } from './auth.js';
import { openArchive, type Archive } from './archive.js';
import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, closeSync, createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { acquireServiceLock, createCollector, createAuthState, type Collector, type SocketFactory, type Clock } from './whatsapp.js';
import { startMediaWorker, openVerifiedAttachment, reconcileMedia } from './media.js';
import { createSnapshot, restoreSnapshot, verifyBackup, preflight } from './backup.js';

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
  let mediaWorker: ReturnType<typeof startMediaWorker> | undefined;
  const mediaDir = join(dataDir, 'media');
  let archiveDb: Database.Database, authDb: Database.Database, archive: Archive;
  const opened: Database.Database[] = [];
  let auth: ReturnType<typeof createWebAuth>;
  try {
  archive = openArchive(dataDir); archiveDb = archive.db; opened.push(archiveDb);
  reconcileMedia(archive, mediaDir);
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
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }); next();
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
  app.use('/api/attachments', requireOwner);
  app.get('/api/attachments/:id', (req, res, next) => {
    const file = openVerifiedAttachment(archive, mediaDir, req.params.id);
    if (!file) { res.status(404).json({ error: 'Original disponível não encontrado no acervo' }); return; }
    let start = 0, end = file.size - 1;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || !range[1] && !range[2] || [range[1], range[2]].some(n => n && !Number.isSafeInteger(Number(n)))) { closeSync(file.fd); res.status(416).set('Content-Range', `bytes */${file.size}`).end(); return; }
      if (!range[1]) { const tail = Number(range[2]); start = Math.max(0, file.size - tail); if (!tail) start = file.size; }
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start < 0 || start >= file.size) { closeSync(file.fd); res.status(416).set('Content-Range', `bytes */${file.size}`).end(); return; }
      res.status(206).set('Content-Range', `bytes ${start}-${end}/${file.size}`);
    }
    const name = (file.attachment.name ?? 'original').replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 180);
    const encoded = encodeURIComponent(Buffer.from(name).toString('utf8')).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
    res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="original"; filename*=UTF-8''${encoded}`, 'Content-Length': String(file.size ? end - start + 1 : 0), 'Accept-Ranges': 'bytes' });
    if (req.method === 'HEAD' || file.size === 0) { closeSync(file.fd); res.end(); return; }
    const stream = createReadStream('', { fd: file.fd, autoClose: true, start, end });
    res.on('close', () => stream.destroy()); stream.on('error', error => { if (res.headersSent) res.destroy(); else next(error); }); stream.pipe(res);
  });
  app.get('/api/status', (_req, res) => { const coverage = archive.getCoverage(); res.json({ ...(collector?.snapshot() ?? { connection: 'disconnected', collectorEnabled: false, pairingAvailable: false, diagnostic: 'Coleta real bloqueada até cópia e restauração conferidas' }), media: mediaWorker?.snapshot() ?? null, lastIngestion: coverage.lastIngestion, coverage }); });
  app.get('/api/qr', async (req, res) => {
    const pairing = await collector?.pairing();
    requireOwner(req, res, error => {
      if (error) { res.status(500).json({ error: 'Solicitação não concluída' }); return; }
      if (!pairing) { res.status(409).json({ error: 'QR vigente não disponível' }); return; }
      res.json(pairing);
    });
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
  const limit = (input: unknown, maximum: number) => {
    if (input === undefined) return maximum;
    if (typeof input !== 'string' || !/^[1-9]\d*$/.test(input) || Number(input) > maximum) throw Object.assign(Error('limit'), { status: 400 });
    return Number(input);
  };
  const pageQuery = (req: Request) => {
    if (Object.keys(req.query).some(key => !['limit', 'cursor'].includes(key))) throw Object.assign(Error('query'), { status: 400 });
  };
  const conversationEvidence = (conversation: { id: string; name: string | null }) => {
    const row = archiveDb.prepare('SELECT source_id FROM conversations WHERE id=?').get(conversation.id) as { source_id: string | null };
    const identity = row.source_id && /@(g\.us|s\.whatsapp\.net|lid)$/.test(row.source_id) ? row.source_id : null;
    return { ...conversation, identity, kind: identity?.endsWith('@g.us') ? 'group' : identity?.endsWith('@s.whatsapp.net') || identity?.endsWith('@lid') ? 'individual' : null };
  };
  app.get('/api/conversations', (req, res) => {
    pageQuery(req);
    const cursor = decodeCursor(req.query.cursor, 'conversations', '');
    const page = archive.listConversations({ cursor: cursor?.[2], limit: limit(req.query.limit, 50) });
    res.json({ conversations: page.conversations.map(conversationEvidence), nextCursor: page.nextCursor ? encodeCursor(['conversations', '', page.nextCursor]) : null });
  });
  app.get('/api/conversations/:id/messages', (req, res) => {
    pageQuery(req);
    if (!/^[0-9a-f-]{36}$/.test(req.params.id)) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    const cursor = decodeCursor(req.query.cursor, 'messages', req.params.id);
    const page = archive.readConversation(req.params.id, { limit: limit(req.query.limit, 100), cursor: cursor ? { timestamp: cursor[2], reference: cursor[3] } : undefined });
    if (!page) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    for (const message of page.messages) for (const attachment of message?.attachments ?? []) {
      if (attachment?.state !== 'available') continue;
      const file = openVerifiedAttachment(archive, mediaDir, attachment.id);
      if (file) closeSync(file.fd); else Object.assign(attachment, archive.getAttachment(attachment.id));
    }
    res.json({ ...page, conversation: conversationEvidence(page.conversation as { id: string; name: string | null }), nextCursor: page.nextCursor ? encodeCursor(['messages', req.params.id, page.nextCursor.timestamp, page.nextCursor.reference]) : null });
  });
  const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));
  for (const [route, filename] of [['/', 'index.html'], ['/app.js', 'app.js'], ['/style.css', 'style.css']]) {
    app.get(route, (_req, res) => res.sendFile(filename, { root: publicDir, cacheControl: false, lastModified: false, etag: false }));
  }
  app.use((_req, res) => { res.status(404).json({ error: 'Não encontrado no acervo' }); });
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
    startCollector(options: { socketFactory?: SocketFactory; newProfile?: boolean; clock?: Clock } = {}) {
      lock.assert(); if (collector) throw Error('Coletor já ativo');
      collector = createCollector({ authDb, archive, lock, ...options });
      try { mediaWorker = startMediaWorker({ archive, mediaDir, online: () => collector?.snapshot().connection === 'connected', downloadOriginal: (job, signal) => collector!.downloadOriginal(job, signal) }); }
      catch (error) { void collector.stop(); collector = undefined; throw error; }
      return collector;
    },
    close() {
      const finish = () => { archiveDb.close(); authDb.close(); lock.release(); };
      if (collector) return collector.stop().then(() => mediaWorker!.stop()).then(() => collector!.drain()).then(finish);
      finish();
    }
  };
}

async function cli() {
  const dataDir = process.env.ZAP_DATA_DIR;
  if (!dataDir) throw Error('Configure ZAP_DATA_DIR privado fora do checkout');
  const collect = process.argv.includes('--collect');
  if (collect && (process.argv[2] !== 'serve' || process.argv.length !== 4)) throw Error('Uso: serve --collect');
  if (process.argv[2] === 'backup') { if (process.argv.length !== 4) throw Error('Uso: backup DESTINO_NOVO'); await createSnapshot({ dataDir, destination: process.argv[3] }); console.log('Snapshot privado íntegro; restauração ainda deve ser verificada'); return; }
  if (process.argv[2] === 'restore') { if (process.argv.length !== 5) throw Error('Uso: restore SNAPSHOT DESTINO_NOVO'); await restoreSnapshot({ snapshotDir: process.argv[3], destination: process.argv[4] }); console.log('Arquivo restaurado para consulta offline; coletor bloqueado'); return; }
  if (process.argv[2] === 'verify-backup') { if (process.argv.length !== 5) throw Error('Uso: verify-backup SNAPSHOT RESTORE_NOVO'); await verifyBackup({ dataDir, snapshotDir: process.argv[3], destination: process.argv[4] }); console.log('Restore isolado conferido; recibo privado gravado no perfil fonte. Conta ainda não validada'); return; }
  if (process.argv[2] === 'preflight') { if (process.argv.length !== 3) throw Error('Uso: preflight'); preflight(dataDir); console.log('Pronto para um único coletor; conta e cobertura ainda não validadas'); return; }
  if (!collect && process.argv.length !== 3) throw Error('Argumentos inválidos');
  const service = createService({ dataDir });
  if (process.argv[2] === 'profile-init') {
    try { createAuthState(service.authDb, { newProfile: true }); console.log('Perfil local preparado; nenhuma conta conectada'); } finally { await service.close(); }
  } else if (process.argv[2] === 'owner-set') {
    try {
      let input = ''; process.stdin.setEncoding('utf8'); for await (const chunk of process.stdin) { input += chunk; if (Buffer.byteLength(input) > 4096) throw Error('Senha inválida'); }
      await service.setPassword(input.replace(/\r?\n$/, ''));
    } finally { service.close(); }
  } else if (process.argv[2] === 'serve') {
    if (collect) { try { service.startCollector(); } catch (error) { await service.close(); throw error; } }
    const port = Number(process.env.ZAP_PORT ?? 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) { await service.close(); throw Error('ZAP_PORT inválido'); }
    const server = service.app.listen(port, '127.0.0.1');
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close(() => { void service.close(); }));
  } else { service.close(); throw Error('Comando inválido'); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void cli().catch(error => { console.error(error instanceof Error && error.message === 'Serviço já ativo' ? 'Serviço já ativo. Pare com SIGTERM e aguarde o encerramento antes de backup/reset.' : 'Operação recusada. Confira comando, diretórios privados, integridade e espaço. Para --collect, prepare backup e verify-backup do mesmo perfil. Pare o serviço com SIGTERM e aguarde seu encerramento antes de backup/reset.'); process.exitCode = 1; });
}

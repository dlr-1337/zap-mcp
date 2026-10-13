import express, { type Request, type Response, type NextFunction } from 'express';
import { createWebAuth, setOwnerPassword } from './auth.js';
import { openArchive, searchTerms, parsePeriod, type Archive } from './archive.js';
import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, closeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { acquireServiceLock, createCollector, createAuthState, type Collector, type SocketFactory, type Clock } from './whatsapp.js';
import { startMediaWorker, openVerifiedAttachment, streamVerifiedAttachment, reconcileMedia, classifyPreview } from './media.js';
import { createSnapshot, restoreSnapshot, verifyBackup, preflight } from './backup.js';
import { createExportManager } from './export.js';
import { createMcpAdapter, rotateMcpToken } from './mcp.js';
import { createTransport, transportFromEnv, type TransportConfig } from './transport.js';

export type StoredMessage = { reference: string; conversationId: string; conversationName: string | null; text: string; originalTimestamp: string };

export function createService({ dataDir, transport: config }: { dataDir: string; transport?: TransportConfig }) {
  const transport = createTransport(config);
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
  auth = createWebAuth(authDb, transport);
  for (const name of ['archive.sqlite', 'auth.sqlite']) chmodSync(join(dataDir, name), 0o600);
  } catch (error) { for (const db of opened) db.close(); lock.release(); throw error; }
  const app = express();
  let exports: ReturnType<typeof createExportManager>;
  try { exports = createExportManager({ archive, dataDir, mediaDir }); } catch (e) { for (const db of opened) db.close(); lock.release(); throw e; }
  app.disable('x-powered-by');
  app.set('trust proxy', transport.trustProxy);
  app.use(transport.guard);
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }); next();
  });
  app.use('/mcp', createMcpAdapter({ archive, authDb, mediaDir }));
  app.use(express.json({ limit: '4kb' }));
  app.use(express.urlencoded({ extended: false, limit: '4kb' }));
  app.use(auth.middleware);
  const requireOwner = auth.requireOwner;
  app.get('/api/session', auth.sessionInfo);
  app.post('/login', auth.csrf, auth.login);
  app.post('/logout', auth.csrf, async (req, res) => { const scope = searchSession(req); await auth.logout(req, res); archive.dropQueries(scope); collector?.hidePairing(); });
  app.use('/api/status', requireOwner);
  app.use('/api/qr', requireOwner);
  app.use('/api/conversations', requireOwner);
  app.use('/api/search', requireOwner);
  app.use('/api/context', requireOwner);
  app.use('/api/attachments', requireOwner);
  app.use('/api/exports', requireOwner);
  app.get(['/api/attachments/:id', '/api/attachments/:id/preview'], (req, res, next) => {
    const file = typeof req.params.id === 'string' ? openVerifiedAttachment(archive, mediaDir, req.params.id) : null;
    if (!file) { res.status(404).json({ error: 'Original disponível não encontrado no acervo' }); return; }
    const preview = req.path.endsWith('/preview');
    let mime: string | null = 'application/octet-stream';
    try { if (preview) mime = classifyPreview(file); } catch (error) { closeSync(file.fd); next(error); return; }
    if (!mime) { closeSync(file.fd); res.status(415).json({ error: 'Sem visualização integrada para este formato. Baixe o original para abrir em outro aplicativo.' }); return; }
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
    res.set({ 'Content-Type': mime, 'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="original"; filename*=UTF-8''${encoded}`, 'Content-Length': String(file.size ? end - start + 1 : 0), 'Accept-Ranges': 'bytes' });
    if (req.method === 'HEAD' || file.size === 0) { closeSync(file.fd); res.end(); return; }
    const stream = streamVerifiedAttachment(archive, file, start, end);
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
    if (!Array.isArray(parts) || !parts.every(p => typeof p === 'string') || parts[0] !== kind || parts[1] !== scope || parts.length !== (kind === 'conversations' ? 3 : ['search', 'context'].includes(kind) ? 5 : 4)) throw Object.assign(Error('cursor'), { status: 400 });
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
  const searchSession = (req: Request) => createHmac('sha256', signingKey).update(JSON.stringify([req.sessionID, req.session.ownerGeneration])).digest('hex');
  const exportError = (error: unknown, res: Response, next: NextFunction) => {
    const status = (error as { status?: number }).status;
    if ([400, 404, 409, 410, 413, 422, 507].includes(status ?? 0)) res.status(status!).json({ error: (error as Error).message }); else next(error);
  };
  app.post('/api/exports', auth.csrf, (req, res, next) => {
    try { if (!req.body || Object.keys(req.body).some(k => !['conversationId', 'from', 'to', 'csrfToken', 'requestId'].includes(k))) throw Object.assign(Error('Seleção inválida'), { status: 400 }); res.status(202).json(exports.createExportJob(searchSession(req), req.body.conversationId, req.body.from, req.body.to, req.body.requestId)); } catch (e) { exportError(e, res, next); }
  });
  app.get('/api/exports/period', (req, res, next) => {
    try { if (Object.keys(req.query).some(k => !['from', 'to'].includes(k)) || Object.values(req.query).some(v => typeof v !== 'string')) throw Object.assign(Error('Período inválido'), { status: 400 }); res.json(parsePeriod(req.query.from, req.query.to)); } catch (e) { exportError(e, res, next); }
  });
  app.get('/api/exports/:id', (req, res, next) => { try { res.json(exports.getExportJob(req.params.id, searchSession(req))); } catch (e) { exportError(e, res, next); } });
  app.get('/api/exports/:id/download', (req, res, next) => {
    try {
      const file = exports.openExport(req.params.id, searchSession(req));
      res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="exportacao-' + req.params.id + '.zip"', 'Content-Length': String(file.size) });
      const stream = file.stream;
      if (req.method === 'HEAD') { stream.destroy(); res.end(); return; }
      res.on('close', () => stream.destroy()); stream.on('error', e => res.headersSent ? res.destroy() : exportError(e, res, next)); stream.pipe(res);
    } catch (e) { exportError(e, res, next); }
  });
  auth.store.on('revoked', (id: string, generation: string | undefined) => exports.dropSession(createHmac('sha256', signingKey).update(JSON.stringify([id, generation])).digest('hex')));
  auth.store.on('revoked', (id: string, generation: string | undefined) => archive.dropQueries(createHmac('sha256', signingKey).update(JSON.stringify([id, generation])).digest('hex')));
  const querySweep = setInterval(() => {
    for (const row of authDb.prepare('SELECT id FROM web_sessions').all() as { id: string }[]) auth.store.get(row.id, () => {});
    archiveDb.prepare('DELETE FROM query_snapshots WHERE expires_at<=?').run(Date.now());
    exports.purge();
  }, 60_000); querySweep.unref();
  app.get('/api/context/:reference', (req, res) => {
    if (Object.keys(req.query).some(k => !['sourceSnapshotId', 'limit', 'cursor', 'direction'].includes(k)) || Object.values(req.query).some(v => typeof v !== 'string')) throw Object.assign(Error('query'), { status: 400 });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(req.params.reference)) { res.status(404).json({ error: 'Não encontrado no acervo' }); return; }
    const session = searchSession(req), scope = createHmac('sha256', signingKey).update(JSON.stringify([session, req.params.reference])).digest('hex');
    const cursor = decodeCursor(req.query.cursor, 'context', scope), direction = req.query.direction;
    if (cursor ? !['before', 'after'].includes(direction as string) || cursor[3] !== direction || !/^\d+$/.test(cursor[4]) || !Number.isSafeInteger(Number(cursor[4])) || req.query.sourceSnapshotId !== undefined : direction !== undefined) throw Object.assign(Error('cursor'), { status: 400 });
    if (req.query.sourceSnapshotId !== undefined && !/^[0-9a-f-]{36}$/.test(req.query.sourceSnapshotId as string)) throw Object.assign(Error('snapshot'), { status: 400 });
    const size = req.query.limit === undefined ? 50 : limit(req.query.limit, 100);
    try {
      const { previousOrdinal, nextOrdinal, ...page } = cursor ? archive.readContextPage({ reference: req.params.reference, session, snapshotId: cursor[2], ordinal: Number(cursor[4]), direction: direction as 'before' | 'after', limit: size }) : archive.openContext(req.params.reference, session, req.query.sourceSnapshotId as string | undefined);
      res.json({ ...page, previousCursor: previousOrdinal !== null ? encodeCursor(['context', scope, page.snapshotId, 'before', String(previousOrdinal)]) : null, nextCursor: nextOrdinal !== null ? encodeCursor(['context', scope, page.snapshotId, 'after', String(nextOrdinal)]) : null });
    } catch (error) { const status = (error as { status?: number }).status; if ([400, 404, 410, 413, 429].includes(status ?? 0)) { res.status(status!).json({ error: (error as Error).message }); return; } throw error; }
  });
  app.get('/api/search', (req, res) => {
    if (Object.keys(req.query).some(k => !['q', 'conversationId', 'from', 'to', 'limit', 'cursor'].includes(k)) || Object.values(req.query).some(v => typeof v !== 'string')) throw Object.assign(Error('query'), { status: 400 });
    const terms = searchTerms(req.query.q), conversationId = typeof req.query.conversationId === 'string' && req.query.conversationId ? req.query.conversationId : null;
    const filters = { terms, conversationId, ...parsePeriod(req.query.from, req.query.to) };
    const session = searchSession(req), scope = createHmac('sha256', signingKey).update(JSON.stringify([session, filters])).digest('hex');
    const cursor = decodeCursor(req.query.cursor, 'search', scope);
    if (cursor && (cursor[3] !== 'next' || !/^\d+$/.test(cursor[4]) || !Number.isSafeInteger(Number(cursor[4])))) throw Object.assign(Error('cursor'), { status: 400 });
    try {
      const { nextOrdinal, ...page } = archive.searchMessages({ terms, conversationId, session, filters, limit: req.query.limit === undefined ? 50 : limit(req.query.limit, 100), snapshotId: cursor?.[2], ordinal: cursor ? Number(cursor[4]) : 0 });
      res.json({ ...page, nextCursor: nextOrdinal !== null ? encodeCursor(['search', scope, page.snapshotId, 'next', String(nextOrdinal)]) : null });
    } catch (error) {
      const status = (error as { status?: number }).status;
      if ([400, 404, 410, 413, 429].includes(status ?? 0)) { res.status(status!).json({ error: (error as Error).message }); return; }
      throw error;
    }
  });
  app.get('/api/conversations', (req, res) => {
    if (Object.keys(req.query).some(k => !['q', 'limit', 'cursor'].includes(k)) || Object.values(req.query).some(v => typeof v !== 'string')) throw Object.assign(Error('query'), { status: 400 });
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''; if ([...q].length > 2000) throw Object.assign(Error('query'), { status: 400 });
    const cursor = decodeCursor(req.query.cursor, 'conversations', q);
    const page = archive.listConversations({ q, cursor: cursor?.[2], limit: limit(req.query.limit, 50) });
    res.json({ conversations: page.conversations.map(conversationEvidence), nextCursor: page.nextCursor ? encodeCursor(['conversations', q, page.nextCursor]) : null });
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
      archive.indexMessage(message.reference);
      return id;
    }),
    async setPassword(password: string) { const sessions = authDb.prepare('SELECT id,data FROM web_sessions').all() as { id: string; data: string }[]; await setOwnerPassword(authDb, password); for (const row of sessions) exports.dropSession(createHmac('sha256', signingKey).update(JSON.stringify([row.id, JSON.parse(row.data).ownerGeneration])).digest('hex')); archiveDb.exec('DELETE FROM query_snapshots'); },
    startCollector(options: { socketFactory?: SocketFactory; newProfile?: boolean; clock?: Clock } = {}) {
      lock.assert(); if (collector) throw Error('Coletor já ativo');
      collector = createCollector({ authDb, archive, lock, ...options });
      try { mediaWorker = startMediaWorker({ archive, mediaDir, online: () => collector?.snapshot().connection === 'connected', downloadOriginal: (job, signal) => collector!.downloadOriginal(job, signal) }); }
      catch (error) { void collector.stop(); collector = undefined; throw error; }
      return collector;
    },
    close() {
      const finish = () => { clearInterval(querySweep); archiveDb.close(); authDb.close(); lock.release(); };
      if (collector) return collector.stop().then(() => mediaWorker!.stop()).then(() => collector!.drain()).then(() => exports.close()).then(finish);
      const closing = exports.close(); if (closing) return closing.then(finish); finish();
    }
  };
}

async function cli() {
  const dataDir = process.env.ZAP_DATA_DIR;
  if (!dataDir) throw Error('Configure ZAP_DATA_DIR privado fora do checkout');
  if (process.argv[2] === 'mcp-token-rotate') {
    if (process.argv.length !== 4) throw Error('Uso: mcp-token-rotate ARQUIVO_PRIVADO_NOVO');
    const location = resolve(dataDir), root = realpathSync(fileURLToPath(new URL('../../', import.meta.url))), path = join(location, 'auth.sqlite');
    if (location === root || location.startsWith(root + '/') || realpathSync(location) !== location || lstatSync(location).mode & 0o077 || lstatSync(location).uid !== process.getuid!() || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink() || lstatSync(path).mode & 0o077 || lstatSync(path).uid !== process.getuid!()) throw Error('Banco privado inválido');
    const db = new Database(path, { fileMustExist: true });
    try { rotateMcpToken(db, process.argv[3]); } finally { db.close(); } return;
  }
  const collect = process.argv.includes('--collect');
  if (collect && (process.argv[2] !== 'serve' || process.argv.length !== 4)) throw Error('Uso: serve --collect');
  if (process.argv[2] === 'backup') { if (process.argv.length !== 4) throw Error('Uso: backup DESTINO_NOVO'); await createSnapshot({ dataDir, destination: process.argv[3] }); console.log('Snapshot privado íntegro; restauração ainda deve ser verificada'); return; }
  if (process.argv[2] === 'restore') { if (process.argv.length !== 5) throw Error('Uso: restore SNAPSHOT DESTINO_NOVO'); await restoreSnapshot({ snapshotDir: process.argv[3], destination: process.argv[4] }); console.log('Arquivo restaurado para consulta offline; coletor bloqueado'); return; }
  if (process.argv[2] === 'verify-backup') { if (process.argv.length !== 5) throw Error('Uso: verify-backup SNAPSHOT RESTORE_NOVO'); await verifyBackup({ dataDir, snapshotDir: process.argv[3], destination: process.argv[4] }); console.log('Restore isolado conferido; recibo privado gravado no perfil fonte. Conta ainda não validada'); return; }
  if (process.argv[2] === 'preflight') { if (process.argv.length !== 3) throw Error('Uso: preflight'); preflight(dataDir); console.log('Pronto para um único coletor; conta e cobertura ainda não validadas'); return; }
  if (!collect && process.argv.length !== 3) throw Error('Argumentos inválidos');
  const transport = process.argv[2] === 'serve' ? transportFromEnv(process.env) : { mode: 'local' as const };
  const service = createService({ dataDir, transport });
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

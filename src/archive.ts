import Database from 'better-sqlite3';
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { serialize, deserialize } from 'node:v8';

type Obj = Record<string, unknown>;
export type Attachment = { id: string; reference: string; type: string; name: string | null; mimeType: string | null; state: string; reason: string | null; attempts: number; size: number | null; sha256: string | null; sourceHashVerified: boolean };
const obj = (value: unknown): Obj => value && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const str = (value: unknown) => typeof value === 'string' && value.length ? value : null;
const bool = (value: unknown) => typeof value === 'boolean' ? value : null;
const wrappers = ['ephemeralMessage', 'documentWithCaptionMessage', 'editedMessage'];
const viewWrappers = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
type Key = { remoteJid: string | null; id: string | null; fromMe: boolean | null; participant: string | null; remoteJidAlt: string | null; participantAlt: string | null; isViewOnce: boolean | null; server_id: string | null; addressingMode: string | null; remoteJidUsername: string | null; participantUsername: string | null };
function keyOf(input: unknown): Key {
  const k = obj(input);
  return { remoteJid: str(k.remoteJid), id: str(k.id), fromMe: bool(k.fromMe), participant: str(k.participant), remoteJidAlt: str(k.remoteJidAlt), participantAlt: str(k.participantAlt), isViewOnce: bool(k.isViewOnce), server_id: str(k.server_id), addressingMode: str(k.addressingMode), remoteJidUsername: str(k.remoteJidUsername), participantUsername: str(k.participantUsername) };
}
function seconds(value: unknown): bigint | null {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return Number.isSafeInteger(value) ? BigInt(value) : null;
    if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
    const v = obj(value);
    if (typeof v.low === 'number' && typeof v.high === 'number' && Number.isInteger(v.low) && Number.isInteger(v.high)) {
      const bits = BigInt(v.high >>> 0) << 32n | BigInt(v.low >>> 0);
      return v.unsigned ? bits : BigInt.asIntN(64, bits);
    }
  } catch { /* malformed protocol integer remains unknown */ }
  return null;
}
function timestamp(value: unknown, milliseconds = false) {
  const n = seconds(value);
  if (n === null || n < 0n) return null;
  const ms = milliseconds ? n : n * 1000n;
  return ms <= 8640000000000000n ? new Date(Number(ms)).toISOString() : null;
}
function restricted(input: unknown, depth = 0): boolean {
  const m = obj(input);
  if (m.restricted === true || depth >= 40) return true;
  if (viewWrappers.some(k => m[k] != null) || mediaTypes.some(k => obj(m[k]).viewOnce === true)) return true;
  return wrappers.some(k => m[k] != null && restricted(obj(m[k]).message, depth + 1));
}
function content(input: unknown): Obj {
  let m = obj(input);
  for (let depth = 0; depth < 12; depth++) {
    const wrapper = wrappers.find(k => m[k] != null);
    if (!wrapper) break;
    m = obj(obj(m[wrapper]).message);
  }
  return m;
}
// Sanitize restricted subtrees before serializing even private replay material.
function permitted(input: unknown, depth = 0): unknown {
  if (depth > 40) return null;
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) return Buffer.from(input);
  if (input === null || typeof input !== 'object') return typeof input === 'function' ? undefined : input;
  if (restricted(input)) return { restricted: true };
  if (Array.isArray(input)) return input.map(v => permitted(v, depth + 1));
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, permitted(v, depth + 1)]));
}
function projection(input: unknown, blocked: boolean) {
  if (blocked) return { type: 'viewOnce', text: null, quote: null, expirationSeconds: null, restricted: true };
  const m = content(input);
  const type = typeof m.conversation === 'string' ? 'conversation' : Object.keys(m).find(k => k.endsWith('Message')) ?? 'unknown';
  const node = obj(m[type]), context = obj(node.contextInfo);
  const quoted = context.quotedMessage;
  const quoteBlocked = restricted(quoted);
  const q = quoteBlocked ? {} : content(quoted);
  const qNode = obj(q[Object.keys(q).find(k => k.endsWith('Message')) ?? '']);
  return {
    type, text: str(m.conversation) ?? str(node.text) ?? str(node.caption), restricted: false,
    quote: quoted != null || context.stanzaId != null ? { id: str(context.stanzaId), author: str(context.participant), remoteJid: str(context.remoteJid), text: quoteBlocked ? null : str(q.conversation) ?? str(qNode.text) ?? str(qNode.caption), restricted: quoteBlocked, reference: null } : null,
    expirationSeconds: typeof context.expiration === 'number' && Number.isSafeInteger(context.expiration) && context.expiration >= 0 ? context.expiration : null
  };
}
type Revision = { id: number; fingerprint: string; kind: string; source_time: string | null; observed_at: string; evidence: string; payload: Buffer | null; restricted: number };
type MessageRow = { reference: string; conversation_id: string; text: string | null; original_timestamp: string | null; logical_key: string | null; author: string | null; from_me: number | null; restricted: number; order_uncertain: number; revoked: number; evidence: string | null };

export function openArchive(dataDir: string) {
  const location = resolve(dataDir);
  mkdirSync(location, { recursive: true, mode: 0o700 });
  if (realpathSync(location) !== location || lstatSync(location).isSymbolicLink()) throw Error('Diretório privado inválido');
  const path = join(location, 'archive.sqlite');
  if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw Error('Arquivo privado inválido');
  chmodSync(location, 0o700);
  const db = new Database(path);
  chmodSync(path, 0o600);
  // Rebuild the attachment table inside the migration; validate all references before committing.
  db.pragma('foreign_keys = OFF'); db.pragma('secure_delete = ON');
  try {
    db.transaction(() => {
      let version = db.pragma('user_version', { simple: true }) as number;
      if (version > 6) throw Error('Versão do arquivo não suportada');
      if (version === 0) {
        db.exec('CREATE TABLE conversations(id TEXT PRIMARY KEY,name TEXT,source_id TEXT); CREATE UNIQUE INDEX conversation_source ON conversations(source_id); CREATE TABLE messages(reference TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id),text TEXT NOT NULL,original_timestamp TEXT NOT NULL); PRAGMA user_version=2'); version = 2;
      }
      if (version === 1) {
        db.exec('ALTER TABLE conversations ADD COLUMN source_id TEXT; CREATE UNIQUE INDEX conversation_source ON conversations(source_id); PRAGMA defer_foreign_keys=ON');
        for (const row of db.prepare('SELECT id FROM conversations').all() as { id: string }[]) {
          const id = randomUUID(); db.prepare('UPDATE conversations SET id=?,source_id=? WHERE id=?').run(id, row.id, row.id); db.prepare('UPDATE messages SET conversation_id=? WHERE conversation_id=?').run(id, row.id);
        }
        version = 2;
      }
      if (version === 2) db.exec(`
        ALTER TABLE messages RENAME TO messages_v2;
        CREATE TABLE messages(reference TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id),text TEXT,original_timestamp TEXT,logical_key TEXT UNIQUE,author TEXT,from_me INTEGER,restricted INTEGER NOT NULL DEFAULT 0,order_uncertain INTEGER NOT NULL DEFAULT 0,revoked INTEGER NOT NULL DEFAULT 0,evidence TEXT);
        INSERT INTO messages(reference,conversation_id,text,original_timestamp) SELECT reference,conversation_id,text,original_timestamp FROM messages_v2;
        DROP TABLE messages_v2;
        CREATE INDEX message_window ON messages(conversation_id,original_timestamp,reference);
        CREATE TABLE identities(jid TEXT PRIMARY KEY,canonical TEXT NOT NULL);
        CREATE TABLE identity_evidence(jid TEXT NOT NULL,alternate TEXT NOT NULL,PRIMARY KEY(jid,alternate));
        CREATE TABLE conversation_redirects(old_id TEXT PRIMARY KEY,target_id TEXT NOT NULL REFERENCES conversations(id));
        CREATE TABLE message_redirects(old_reference TEXT PRIMARY KEY,target_reference TEXT NOT NULL REFERENCES messages(reference));
        CREATE TABLE origins(origin TEXT PRIMARY KEY,reference TEXT NOT NULL REFERENCES messages(reference),key_json TEXT NOT NULL);
        CREATE TABLE revisions(id INTEGER PRIMARY KEY,reference TEXT NOT NULL REFERENCES messages(reference),fingerprint TEXT NOT NULL,kind TEXT NOT NULL,source_time TEXT,observed_at TEXT NOT NULL,evidence TEXT NOT NULL,payload BLOB,restricted INTEGER NOT NULL,UNIQUE(reference,fingerprint));
        CREATE TABLE attachments(id TEXT PRIMARY KEY,reference TEXT NOT NULL REFERENCES messages(reference),revision_id INTEGER NOT NULL REFERENCES revisions(id),type TEXT NOT NULL,name TEXT,mime_type TEXT,state TEXT NOT NULL,descriptor BLOB,UNIQUE(reference,revision_id));
        CREATE TABLE media_jobs(id TEXT PRIMARY KEY,attachment_id TEXT NOT NULL UNIQUE REFERENCES attachments(id),state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE batches(id TEXT PRIMARY KEY,kind TEXT NOT NULL,received INTEGER NOT NULL,confirmed INTEGER NOT NULL DEFAULT 0,failed INTEGER NOT NULL DEFAULT 0,received_at TEXT NOT NULL,last_progress TEXT,completed_at TEXT,is_latest INTEGER,metadata TEXT NOT NULL,failure TEXT);
        CREATE TABLE batch_items(batch_id TEXT NOT NULL REFERENCES batches(id),position INTEGER NOT NULL,payload BLOB NOT NULL,state TEXT NOT NULL DEFAULT 'pending',PRIMARY KEY(batch_id,position));
        PRAGMA user_version=3;
      `);
      if (version <= 3) db.exec('CREATE TABLE history_statuses(sync_type INTEGER NOT NULL,status TEXT NOT NULL,explicit INTEGER NOT NULL,observed_at TEXT NOT NULL,PRIMARY KEY(sync_type,status,explicit)); PRAGMA user_version=4');
      if (version <= 4) db.exec(`
        ALTER TABLE attachments ADD COLUMN reason TEXT;
        ALTER TABLE attachments ADD COLUMN size INTEGER;
        ALTER TABLE attachments ADD COLUMN sha256 TEXT;
        ALTER TABLE attachments ADD COLUMN source_hash_verified INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE media_jobs ADD COLUMN generation TEXT;
        ALTER TABLE media_jobs ADD COLUMN lease_until INTEGER;
        ALTER TABLE media_jobs ADD COLUMN retry_at INTEGER NOT NULL DEFAULT 0;
        PRAGMA user_version=5;
      `);
      if (version <= 5) db.exec(`
        CREATE TABLE attachments_v6(id TEXT PRIMARY KEY,reference TEXT NOT NULL REFERENCES messages(reference),revision_id INTEGER NOT NULL REFERENCES revisions(id),type TEXT NOT NULL,name TEXT,mime_type TEXT,state TEXT NOT NULL,descriptor BLOB,reason TEXT,size INTEGER,sha256 TEXT,source_hash_verified INTEGER NOT NULL DEFAULT 0,source_key TEXT);
        INSERT INTO attachments_v6 SELECT *,NULL FROM attachments;
        DROP TABLE attachments;
        ALTER TABLE attachments_v6 RENAME TO attachments;
        PRAGMA user_version=6;
      `);
      if ((db.pragma('foreign_key_check') as unknown[]).length) throw Error('Arquivo inconsistente');
    })();
    db.pragma('foreign_keys = ON');
    if (db.pragma('integrity_check', { simple: true }) !== 'ok' || (db.pragma('foreign_key_check') as unknown[]).length) throw Error('Arquivo inconsistente');
  } catch (error) { db.close(); throw error; }
  const now = () => new Date().toISOString();
  const canonical = (jid: string | null): string | null => jid ? (db.prepare('SELECT canonical FROM identities WHERE jid=?').get(jid) as { canonical: string } | undefined)?.canonical ?? jid : null;
  const originKey = (key: Key) => JSON.stringify([key.remoteJid, key.id, key.fromMe, key.participant]);
  const logicalKey = (key: Key) => JSON.stringify([canonical(key.remoteJid), key.id, key.fromMe, canonical(key.participant)]);
  function conversation(jid: string | null, name: string | null = null) {
    const source = canonical(jid);
    const old = source ? db.prepare('SELECT id FROM conversations WHERE source_id=?').get(source) as { id: string } | undefined : undefined;
    if (old) { if (name !== null) db.prepare('UPDATE conversations SET name=? WHERE id=?').run(name, old.id); return old.id; }
    const id = randomUUID(); db.prepare('INSERT INTO conversations(id,name,source_id) VALUES(?,?,?)').run(id, name, source); return id;
  }
  function project(reference: string) {
    const revisions = db.prepare('SELECT * FROM revisions WHERE reference=? ORDER BY id').all(reference) as Revision[];
    const edits = revisions.filter(r => r.kind === 'edit'), originals = revisions.filter(r => r.kind === 'original');
    const candidates = edits.length ? edits : originals;
    const blocked = revisions.some(r => r.restricted === 1), revoked = revisions.some(r => r.kind === 'revoke');
    const timed = candidates.filter(r => r.source_time !== null).sort((a, b) => b.source_time!.localeCompare(a.source_time!));
    const latest = timed[0];
    const uncertain = candidates.length > 1 && (timed.length !== candidates.length || timed.filter(r => r.source_time === latest?.source_time).length > 1);
    const current = uncertain ? undefined : latest ?? candidates[0];
    const evidence = current ? JSON.parse(current.evidence) as Obj : { type: 'unknown', text: null };
    db.prepare('UPDATE messages SET text=?,restricted=?,order_uncertain=?,revoked=?,evidence=? WHERE reference=?').run(blocked || revoked || uncertain ? null : evidence.text ?? null, Number(blocked), Number(uncertain), Number(revoked), JSON.stringify({ ...evidence, restricted: blocked }), reference);
  }
  function mergeMessages(keep: string, drop: string) {
    const a = db.prepare('SELECT * FROM messages WHERE reference=?').get(keep) as MessageRow, b = db.prepare('SELECT * FROM messages WHERE reference=?').get(drop) as MessageRow;
    db.prepare('UPDATE messages SET original_timestamp=coalesce(original_timestamp,?) WHERE reference=?').run(b.original_timestamp, keep);
    db.prepare('UPDATE origins SET reference=? WHERE reference=?').run(keep, drop);
    for (const r of db.prepare('SELECT * FROM revisions WHERE reference=?').all(drop) as Revision[]) {
      const duplicate = db.prepare('SELECT id FROM revisions WHERE reference=? AND fingerprint=(SELECT fingerprint FROM revisions WHERE id=?)').get(keep, r.id) as { id: number } | undefined;
      if (duplicate) {
        const attachments = db.prepare("SELECT a.id,a.revision_id,a.state,a.size,a.sha256,j.state job_state,r.payload FROM attachments a JOIN revisions r ON r.id=a.revision_id LEFT JOIN media_jobs j ON j.attachment_id=a.id WHERE a.revision_id IN (?,?) ORDER BY CASE a.state WHEN 'available' THEN 4 WHEN 'downloading' THEN 3 WHEN 'pending' THEN 2 WHEN 'retry_wait' THEN 1 ELSE 0 END DESC,(j.id IS NOT NULL) DESC,a.rowid").all(duplicate.id, r.id) as { id: string; revision_id: number; state: string; size: number | null; sha256: string | null; job_state: string | null; payload: Buffer | null }[];
        const winner = attachments[0];
        for (const attachment of attachments) {
          // A live writer or persisted digest may own unique bytes; only disk verification proves availability.
          if (attachment === winner || attachment.state === 'downloading' || attachment.job_state === 'downloading' || attachment.size !== null || attachment.sha256 !== null) {
            const key = attachment.payload ? keyOf(obj(deserialize(attachment.payload)).key) : null;
            db.prepare('UPDATE attachments SET reference=?,revision_id=?,source_key=coalesce(source_key,?) WHERE id=?').run(keep, duplicate.id, key ? JSON.stringify(key) : null, attachment.id);
          } else {
            db.prepare('DELETE FROM media_jobs WHERE attachment_id=?').run(attachment.id);
            db.prepare('DELETE FROM attachments WHERE id=?').run(attachment.id);
          }
        }
        if (winner?.revision_id === r.id) {
          db.prepare('UPDATE revisions SET payload=? WHERE id=?').run(r.payload, duplicate.id);
        }
        db.prepare('DELETE FROM revisions WHERE id=?').run(r.id);
      } else { db.prepare('UPDATE revisions SET reference=? WHERE id=?').run(keep, r.id); db.prepare('UPDATE attachments SET reference=? WHERE revision_id=?').run(keep, r.id); }
    }
    db.prepare('UPDATE message_redirects SET target_reference=? WHERE target_reference=?').run(keep, drop);
    db.prepare('INSERT OR REPLACE INTO message_redirects VALUES(?,?)').run(drop, keep);
    db.prepare('DELETE FROM messages WHERE reference=?').run(drop);
    project(a.reference);
  }
  function reconcile() {
    const messages = db.prepare('SELECT m.reference,o.key_json FROM messages m JOIN origins o ON o.reference=m.reference ORDER BY m.rowid').all() as { reference: string; key_json: string }[];
    db.exec('UPDATE messages SET logical_key=NULL');
    for (const row of messages) {
      if (!db.prepare('SELECT 1 FROM messages WHERE reference=?').get(row.reference)) continue;
      const key = JSON.parse(row.key_json) as Key;
      if (!key.id || !key.remoteJid) continue;
      const logical = logicalKey(key);
      const prior = db.prepare('SELECT reference FROM messages WHERE logical_key=?').get(logical) as { reference: string } | undefined;
      if (prior && prior.reference !== row.reference) mergeMessages(prior.reference, row.reference);
      else db.prepare('UPDATE messages SET logical_key=?,author=? WHERE reference=?').run(logical, canonical(key.participant) ?? (key.fromMe === false && !key.remoteJid?.endsWith('@g.us') ? canonical(key.remoteJid) : null), row.reference);
    }
  }
  function alias(jid: string | null, alternate: string | null) {
    if (!jid || !alternate || jid === alternate) return;
    const first = canonical(jid)!, second = canonical(alternate)!;
    db.prepare('INSERT OR IGNORE INTO identity_evidence VALUES(?,?)').run(jid, alternate);
    if (first === second) return;
    const conversations = db.prepare('SELECT id,source_id FROM conversations WHERE source_id IN (?,?) ORDER BY rowid').all(first, second) as { id: string; source_id: string }[];
    const chosen = conversations[0]?.source_id ?? first;
    db.prepare('UPDATE identities SET canonical=? WHERE canonical IN (?,?)').run(chosen, first, second);
    for (const name of [jid, alternate, first, second]) db.prepare('INSERT INTO identities VALUES(?,?) ON CONFLICT(jid) DO UPDATE SET canonical=excluded.canonical').run(name, chosen);
    if (conversations.length === 2) {
      const [keep, drop] = conversations;
      db.prepare('UPDATE messages SET conversation_id=? WHERE conversation_id=?').run(keep.id, drop.id);
      db.prepare('UPDATE conversation_redirects SET target_id=? WHERE target_id=?').run(keep.id, drop.id);
      db.prepare('INSERT OR REPLACE INTO conversation_redirects VALUES(?,?)').run(drop.id, keep.id);
      db.prepare('DELETE FROM conversations WHERE id=?').run(drop.id);
    }
    reconcile();
  }
  function ingestIdentity(input: unknown, group = false) {
    const c = obj(input), id = str(c.id) ?? str(c.lid) ?? str(c.pn);
    alias(id, str(c.lid)); alias(id, str(c.phoneNumber) ?? str(c.pn));
    if (id) conversation(id, str(group ? c.subject : c.name) ?? str(c.notify));
  }
  function ingestOne(input: unknown, kind = 'original') {
    const raw = obj(input), protocol = obj(content(raw.message).protocolMessage);
    let source = raw;
    if (protocol.type === 0 || protocol.type === 14) {
      // The inner key is sender-relative; rc14 targets the local envelope key plus this ID.
      source = { key: { ...obj(raw.key), id: str(obj(protocol.key).id) }, message: protocol.type === 0 ? null : protocol.editedMessage, revisionTimestamp: protocol.timestampMs, messageTimestamp: protocol.type === 14 ? raw.messageTimestamp : undefined };
      kind = protocol.type === 0 ? 'revoke' : 'edit';
    }
    const key = keyOf(source.key);
    if ((kind === 'edit' || kind === 'revoke') && (!key.id || !key.remoteJid || key.fromMe === null || key.remoteJid.endsWith('@g.us') && !key.fromMe && !key.participant)) throw Error('Identidade da alteração não recebida');
    alias(key.remoteJid, key.remoteJidAlt); alias(key.participant, key.participantAlt);
    const logical = key.id && key.remoteJid ? logicalKey(key) : randomUUID();
    let row = db.prepare('SELECT reference FROM origins WHERE origin=?').get(originKey(key)) as { reference: string } | undefined;
    if (!key.id || !key.remoteJid) row = undefined;
    row ??= db.prepare('SELECT reference FROM messages WHERE logical_key=?').get(logical) as { reference: string } | undefined;
    const reference = row?.reference ?? randomUUID();
    const originalTime = kind === 'original' ? timestamp(source.messageTimestamp) : null;
    if (!row) db.prepare('INSERT INTO messages(reference,conversation_id,original_timestamp,logical_key,author,from_me) VALUES(?,?,?,?,?,?)').run(reference, conversation(key.remoteJid), originalTime, logical, canonical(key.participant) ?? (key.fromMe === false && !key.remoteJid?.endsWith('@g.us') ? canonical(key.remoteJid) : null), key.fromMe === null ? null : Number(key.fromMe));
    else if (originalTime !== null) db.prepare('UPDATE messages SET original_timestamp=coalesce(original_timestamp,?) WHERE reference=?').run(originalTime, reference);
    db.prepare('INSERT OR IGNORE INTO origins VALUES(?,?,?)').run(key.id && key.remoteJid ? originKey(key) : logical, reference, JSON.stringify(key));
    const blocked = key.isViewOnce === true || restricted(source.message);
    const evidence = projection(source.message, blocked);
    const sourceTime = kind === 'original' ? originalTime : timestamp(source.revisionTimestamp, true) ?? timestamp(source.messageTimestamp);
    const safeSource = blocked ? { key, messageTimestamp: source.messageTimestamp } : permitted(kind === 'edit' ? { ...source, message: content(source.message) } : source);
    const payload = blocked || kind === 'revoke' ? null : serialize(safeSource);
    // rc14 delivers each edit twice; its update truncates the protocol's milliseconds.
    const fingerprintAt = (time: string | null) => createHash('sha256').update(serialize([kind, time, evidence, blocked ? null : permitted(kind === 'edit' ? content(source.message) : source.message)])).digest('hex');
    const fingerprint = fingerprintAt(sourceTime), preciseTime = timestamp(source.revisionTimestamp, true);
    if (kind === 'edit' && sourceTime !== null) {
      const equivalent = (db.prepare("SELECT * FROM revisions WHERE reference=? AND kind='edit' AND substr(source_time,1,19)=?").all(reference, sourceTime.slice(0, 19)) as Revision[]).find(r =>
        r.fingerprint === fingerprintAt(r.source_time) && (r.source_time === sourceTime || preciseTime === null || timestamp(r.payload ? obj(deserialize(r.payload)).revisionTimestamp : null, true) === null));
      if (equivalent) {
        if (preciseTime !== null) db.prepare('UPDATE revisions SET fingerprint=?,source_time=?,payload=? WHERE id=?').run(fingerprint, sourceTime, payload, equivalent.id);
        project(reference); return reference;
      }
    }
    const inserted = db.prepare('INSERT OR IGNORE INTO revisions(reference,fingerprint,kind,source_time,observed_at,evidence,payload,restricted) VALUES(?,?,?,?,?,?,?,?)').run(reference, fingerprint, kind, sourceTime, now(), JSON.stringify(evidence), payload, Number(blocked));
    if (inserted.changes && !blocked && kind !== 'revoke') {
      const m = content(source.message), type = mediaTypes.find(k => m[k] != null);
      if (type) {
        const id = randomUUID(), node = obj(m[type]);
        const eligible = Boolean((str(node.url) || str(node.directPath)) && (node.mediaKey instanceof Uint8Array) && node.mediaKey.length === 32);
        db.prepare('INSERT INTO attachments(id,reference,revision_id,type,name,mime_type,state,descriptor,reason) VALUES(?,?,?,?,?,?,?,?,?)').run(id, reference, inserted.lastInsertRowid, type, str(node.fileName), str(node.mimetype), eligible ? 'pending' : 'unavailable', serialize(permitted(node)), eligible ? null : 'Original não recebido; miniatura não satisfaz anexo');
        if (eligible) db.prepare('INSERT INTO media_jobs(id,attachment_id) VALUES(?,?)').run(randomUUID(), id);
      }
    }
    project(reference);
    return reference;
  }
  function ingestBatch(kind: string, messages: readonly unknown[], metadata: Obj = {}) {
    const id = randomUUID();
    db.transaction(() => {
      db.prepare('INSERT INTO batches(id,kind,received,received_at,is_latest,metadata) VALUES(?,?,?,?,?,?)').run(id, kind, messages.length, now(), bool(metadata.isLatest) === null ? null : Number(metadata.isLatest), JSON.stringify({ isLatest: bool(metadata.isLatest), syncType: typeof metadata.syncType === 'number' ? metadata.syncType : null, chunkOrder: typeof metadata.chunkOrder === 'number' ? metadata.chunkOrder : null }));
      messages.forEach((input, i) => {
        const raw = obj(input), update = kind === 'update' ? obj(raw.update) : raw;
        const safe = keyOf(raw.key).isViewOnce === true || restricted(update.message) ? kind === 'update' ? { key: { ...keyOf(raw.key), isViewOnce: true }, update: { ...update, message: null, restricted: true } } : { key: { ...keyOf(raw.key), isViewOnce: true }, messageTimestamp: raw.messageTimestamp } : permitted(input);
        db.prepare('INSERT INTO batch_items(batch_id,position,payload) VALUES(?,?,?)').run(id, i, serialize(safe));
      });
    })();
    processBatch(id, kind);
    return id;
  }
  function processBatch(id: string, kind: string) {
    const items = db.prepare("SELECT position,payload FROM batch_items WHERE batch_id=? AND state='pending' ORDER BY position").all(id) as { position: number; payload: Buffer }[];
    items.forEach(({ position: i, payload }) => {
      try { db.transaction(() => {
        const input = deserialize(payload) as unknown;
        if (kind === 'update') {
          const e = obj(input), update = obj(e.update);
          const updated = Object.hasOwn(update, 'message');
          ingestOne({ ...update, key: e.key }, updated ? update.message === null ? 'revoke' : 'edit' : 'partial');
        } else ingestOne(input);
        db.prepare("UPDATE batch_items SET state='confirmed' WHERE batch_id=? AND position=?").run(id, i);
        db.prepare('UPDATE batches SET confirmed=confirmed+1,last_progress=? WHERE id=?').run(now(), id);
      })(); }
      catch { db.transaction(() => { db.prepare("UPDATE batch_items SET state='failed' WHERE batch_id=? AND position=?").run(id, i); db.prepare("UPDATE batches SET failed=failed+1,failure='Falha de persistência do item' WHERE id=?").run(id); })(); }
    });
    db.prepare('UPDATE batches SET completed_at=? WHERE id=?').run(now(), id);
  }
  function resolveConversation(id: string) { return (db.prepare('SELECT target_id FROM conversation_redirects WHERE old_id=?').get(id) as { target_id: string } | undefined)?.target_id ?? id; }
  function dto(reference: string) {
    const redirected = (db.prepare('SELECT target_reference FROM message_redirects WHERE old_reference=?').get(reference) as { target_reference: string } | undefined)?.target_reference ?? reference;
    const row = db.prepare('SELECT * FROM messages WHERE reference=?').get(redirected) as MessageRow | undefined;
    if (!row) return null;
    const evidence = row.evidence ? JSON.parse(row.evidence) as Obj : { type: 'unknown', text: row.text };
    const origins = (db.prepare('SELECT key_json FROM origins WHERE reference=? ORDER BY rowid').all(redirected) as { key_json: string }[]).map(o => JSON.parse(o.key_json) as Key);
    const revisions = (db.prepare('SELECT * FROM revisions WHERE reference=? ORDER BY id').all(redirected) as Revision[]).map(r => ({ kind: r.kind, sourceTimestamp: r.source_time, observedAt: r.observed_at, ...JSON.parse(r.evidence) as Obj }));
    const identities = new Set(origins.flatMap(k => [k.remoteJid, k.participant, k.remoteJidAlt, k.participantAlt]).filter(k => k !== null));
    const identityMappings = (db.prepare('SELECT jid,alternate FROM identity_evidence').all() as { jid: string; alternate: string }[]).filter(m => identities.has(m.jid) || identities.has(m.alternate));
    const attachments = (db.prepare('SELECT id FROM attachments WHERE reference=? ORDER BY rowid').all(redirected) as { id: string }[]).map(a => getAttachment(a.id));
    return { ...evidence, reference: row.reference, conversationId: row.conversation_id, text: row.text, originalTimestamp: row.original_timestamp, author: row.author, fromMe: row.from_me === null ? null : Boolean(row.from_me), key: origins[0] ?? null, origins, identityMappings, revisions, revoked: Boolean(row.revoked), restricted: Boolean(row.restricted), orderUncertain: Boolean(row.order_uncertain), attachments };
  }
  function locate(input: unknown) {
    if (typeof input === 'string') return input;
    const key = keyOf(input);
    return (db.prepare('SELECT reference FROM origins WHERE origin=?').get(originKey(key)) as { reference: string } | undefined)?.reference ?? (db.prepare('SELECT reference FROM messages WHERE logical_key=?').get(logicalKey(key)) as { reference: string } | undefined)?.reference;
  }
  function getCoverage() {
    return db.transaction(() => {
      const span = db.prepare('SELECT count(*) AS uniqueMessages,min(original_timestamp) AS oldestTimestamp,max(original_timestamp) AS newestTimestamp FROM messages').get() as { uniqueMessages: number; oldestTimestamp: string | null; newestTimestamp: string | null };
      const last = db.prepare('SELECT max(last_progress) AS value FROM batches WHERE confirmed>0').get() as { value: string | null };
      const batches = db.prepare('SELECT id,kind,received,confirmed,failed,received-confirmed-failed AS pending,received_at AS receivedAt,last_progress AS lastProgress,completed_at AS completedAt,is_latest AS isLatest,metadata,failure FROM batches ORDER BY rowid').all() as Obj[];
      const safeBatches = batches.map(b => ({ ...b, isLatest: b.isLatest === null ? null : Boolean(b.isLatest), metadata: JSON.parse(b.metadata as string) as Obj, stalled: b.completedAt === null && Date.now() - Date.parse((b.lastProgress ?? b.receivedAt) as string) >= 120_000 }));
      const statuses = db.prepare('SELECT sync_type AS syncType,status,explicit,observed_at AS observedAt FROM history_statuses ORDER BY observed_at,rowid').all() as Obj[];
      return { ...span, interval: { oldest: span.oldestTimestamp, newest: span.newestTimestamp }, lastIngestion: last.value, batches: safeBatches, historyStatuses: statuses.map(s => ({ ...s, explicit: Boolean(s.explicit) })), completeAccount: false, watchdogSeconds: 120 };
    })();
  }
  try { for (const batch of db.prepare('SELECT id,kind FROM batches WHERE completed_at IS NULL ORDER BY rowid').all() as { id: string; kind: string }[]) processBatch(batch.id, batch.kind); }
  catch (error) { db.close(); throw error; }
  function getAttachment(id: string): Attachment | null {
    const row = db.prepare('SELECT a.id,a.reference,a.type,a.name,a.mime_type AS mimeType,a.state,a.reason,a.size,a.sha256,a.source_hash_verified AS verified,coalesce(j.attempts,0) AS attempts FROM attachments a LEFT JOIN media_jobs j ON j.attachment_id=a.id WHERE a.id=?').get(id) as (Omit<Attachment, 'sourceHashVerified'> & { verified: number }) | undefined;
    if (!row) return null;
    const { verified, ...safe } = row; return { ...safe, sourceHashVerified: Boolean(verified) };
  }
  return {
    db,
    ingestHistory(batch: { messages: readonly unknown[]; contacts?: readonly unknown[]; chats?: readonly unknown[]; lidPnMappings?: readonly unknown[]; [key: string]: unknown }) {
      db.transaction(() => { for (const m of batch.lidPnMappings ?? []) ingestIdentity(m); for (const c of batch.contacts ?? []) ingestIdentity(c); for (const c of batch.chats ?? []) ingestIdentity(c, true); })();
      return ingestBatch('history', batch.messages, batch);
    },
    ingestUpsert(event: { messages: readonly unknown[]; type: string }) { return ingestBatch(event.type, event.messages); },
    ingestUpdates(event: readonly unknown[]) { return ingestBatch('update', event); },
    ingestHistoryStatus(event: { syncType: number; status: 'complete' | 'paused'; explicit: boolean }) {
      if (!Number.isSafeInteger(event.syncType) || !['complete', 'paused'].includes(event.status) || typeof event.explicit !== 'boolean') throw Error('Estado de lote inválido');
      db.prepare('INSERT OR IGNORE INTO history_statuses VALUES(?,?,?,?)').run(event.syncType, event.status, Number(event.explicit), now());
    },
    ingestContacts: db.transaction((event: readonly unknown[] | Obj) => { for (const c of Array.isArray(event) ? event : [event]) ingestIdentity(c); }),
    ingestGroups: db.transaction((event: readonly unknown[]) => { for (const c of event) ingestIdentity(c, true); }),
    readStoredMessage(input: unknown) { const ref = locate(input); return ref ? dto(ref) : null; },
    readPrivateMessage(input: unknown) {
      const ref = locate(input), message = ref ? dto(ref) : null;
      if (!message || message.restricted || message.revoked || message.orderUncertain) return undefined;
      const revision = db.prepare("SELECT payload FROM revisions WHERE reference=? AND kind IN ('original','edit') AND payload IS NOT NULL ORDER BY CASE kind WHEN 'edit' THEN 1 ELSE 0 END DESC,source_time DESC,id DESC LIMIT 1").get(message.reference) as { payload: Buffer } | undefined;
      return revision ? deserialize(revision.payload) as Obj : undefined;
    },
    listConversations({ limit = 50, cursor = '' }: { limit?: number; cursor?: string } = {}) {
      const size = Math.max(1, Math.min(50, limit));
      const rows = db.prepare('SELECT c.id,c.name,(SELECT max(original_timestamp) FROM messages WHERE conversation_id=c.id) AS lastTimestamp FROM conversations c WHERE c.id>? ORDER BY c.id LIMIT ?').all(cursor, size + 1) as { id: string; name: string | null; lastTimestamp: string | null }[];
      return { conversations: rows.slice(0, size), nextCursor: rows.length > size ? rows[size - 1].id : null };
    },
    readConversation(id: string, { limit = 100, cursor }: { limit?: number; cursor?: { timestamp: string; reference: string } } = {}) {
      const resolved = resolveConversation(id), size = Math.max(1, Math.min(100, limit));
      const conversation = db.prepare('SELECT id,name FROM conversations WHERE id=?').get(resolved);
      if (!conversation) return null;
      const rows = db.prepare("SELECT reference,original_timestamp FROM messages WHERE conversation_id=? AND (? IS NULL OR (coalesce(original_timestamp,''),reference)<(?,?)) ORDER BY coalesce(original_timestamp,'') DESC,reference DESC LIMIT ?").all(resolved, cursor?.timestamp ?? null, cursor?.timestamp ?? '', cursor?.reference ?? '', size + 1) as { reference: string; original_timestamp: string | null }[];
      const page = rows.slice(0, size), oldest = page.at(-1);
      return { conversation, messages: page.reverse().map(m => dto(m.reference)), nextCursor: rows.length > size ? { timestamp: oldest!.original_timestamp ?? '', reference: oldest!.reference } : null };
    },
    getAttachment,
    getCoverage,
    close() { db.close(); }
  };
}

export type Archive = ReturnType<typeof openArchive>;

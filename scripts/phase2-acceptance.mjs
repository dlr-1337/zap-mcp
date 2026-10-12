import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, chmodSync, lstatSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { validateSnapshot, restoreSnapshot, assertCollectorReady } from '../dist/src/backup.js';
import { createService } from '../dist/src/main.js';

const check = (value, name) => assert.equal(Boolean(value), true, name);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => isDeepStrictEqual(a, b);
export function auditEvidence(p) {
  try {
    const accepted = p.synthetic === false && p.originVerified === true && p.isolated === true && p.collectorEnabled === false
      && Array.isArray(p.expectedReferences) && p.expectedReferences.length > 100
      && same(p.references, p.expectedReferences) && new Set(p.references).size === p.references.length
      && p.metadataEqual === true && Array.isArray(p.files) && p.files.every(f => Number.isSafeInteger(f.size) && f.size >= 0
        && f.size === f.actualSize && /^[a-f0-9]{64}$/.test(f.sha256) && f.sha256 === f.actualSha256)
      && Array.isArray(p.missingExpected) && same(p.missing, p.missingExpected);
    return { accepted: Boolean(accepted) };
  } catch { return { accepted: false }; }
}
function privateJson(path) {
  const stat = lstatSync(path);
  check(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() && !(stat.mode & 0o077), 'private input');
  return JSON.parse(readFileSync(path, 'utf8'));
}
const localDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
// Independent ICU calendar oracle: locate the first millisecond of a civil day, including historical DST.
export function calendarStart(day) {
  check(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day), 'calendar input');
  const noon = Date.parse(day + 'T12:00:00Z'); let low = noon - 36 * 3600_000, high = noon + 36 * 3600_000;
  while (low < high) { const mid = Math.floor((low + high) / 2); if (localDay(mid) < day) low = mid + 1; else high = mid; }
  check(localDay(low) === day && localDay(low - 1) !== day, 'civil day boundary'); return low;
}
function periodFor(c) {
  const next = new Date(Date.parse(c.to + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  return { start: calendarStart(c.from), end: calendarStart(next) };
}
function rowsFor(db, c, period) {
  const rows = db.prepare('SELECT * FROM messages WHERE conversation_id=?').all(c.conversationId);
  return rows.filter(m => Number.isFinite(Date.parse(m.original_timestamp)) && Date.parse(m.original_timestamp) >= period.start && Date.parse(m.original_timestamp) < period.end)
    .sort((a, b) => Date.parse(a.original_timestamp) - Date.parse(b.original_timestamp) || Buffer.compare(Buffer.from(a.reference), Buffer.from(b.reference)));
}
function matchesMetadata(db, row, m) {
  const evidence = JSON.parse(row.evidence ?? '{}');
  const revisions = db.prepare('SELECT id,kind,source_time,observed_at,evidence FROM revisions WHERE reference=? ORDER BY id').all(row.reference);
  const origins = db.prepare('SELECT key_json FROM origins WHERE reference=? ORDER BY rowid').all(row.reference).map(r => JSON.parse(r.key_json));
  const wanted = { reference: row.reference, conversationId: row.conversation_id, text: row.restricted ? null : row.text,
    originalTimestamp: row.original_timestamp, author: row.author, fromMe: row.from_me === null ? null : Boolean(row.from_me),
    revoked: Boolean(row.revoked), restricted: Boolean(row.restricted), orderUncertain: Boolean(row.order_uncertain), origins, key: origins[0] ?? null };
  if (!same(wanted, Object.fromEntries(Object.keys(wanted).map(k => [k, m[k]])))) return false;
  if (!same(m.quote ?? null, row.restricted ? null : evidence.quote ?? null) || m.revisions.length !== revisions.length) return false;
  for (const [i, r] of revisions.entries()) {
    const e = JSON.parse(r.evidence), got = m.revisions[i];
    if (got.revisionId !== r.id || got.kind !== r.kind || got.sourceTimestamp !== r.source_time || got.observedAt !== r.observed_at
      || got.text !== (row.restricted ? null : typeof e.text === 'string' && e.text.length ? e.text : null)
      || got.fingerprint !== digest(JSON.stringify([r.kind, r.source_time, e])) || !same(got.quote ?? null, row.restricted ? null : e.quote ?? null)) return false;
  }
  const identities = new Set(origins.flatMap(k => [k.remoteJid, k.participant, k.remoteJidAlt, k.participantAlt]).filter(Boolean));
  const mappings = db.prepare('SELECT jid,alternate FROM identity_evidence').all().filter(r => identities.has(r.jid) || identities.has(r.alternate));
  return same(m.identityMappings, mappings);
}
function zipOracle(path, db, c, period, snapshot) {
  const run = args => spawnSync('unzip', args, { maxBuffer: 100 * 1024 ** 2 });
  check(run(['-t', path]).status === 0, 'ZIP integrity');
  const read = name => { const p = run(['-p', path, name]); check(p.status === 0, 'ZIP entry'); return p.stdout; };
  const m = JSON.parse(read('manifest.json')), rows = rowsFor(db, c, period), files = [], missing = [], expectedMissing = [], entries = ['mensagens.txt', 'manifest.json'];
  check(m.effectiveFilters.startMs === period.start && m.effectiveFilters.endMs === period.end && m.effectiveFilters.zone === 'America/Sao_Paulo', 'ZIP period UTC');
  check(m.coverage.completeAccount === false && m.counts.messages === rows.length, 'coverage and exact count');
  let metadataEqual = m.messages.length === rows.length;
  for (const [i, row] of rows.entries()) {
    const item = m.messages[i]; metadataEqual &&= Boolean(item) && matchesMetadata(db, row, item) && item.originalUtc === row.original_timestamp;
    if (!item) continue;
    const attachments = row.restricted ? [] : db.prepare('SELECT * FROM attachments WHERE reference=? ORDER BY rowid').all(row.reference);
    metadataEqual &&= attachments.length === item.attachments.length;
    for (const [j, a] of attachments.entries()) {
      const got = item.attachments[j];
      metadataEqual &&= !!got && got.id === a.id && got.reference === row.reference && got.revisionId === a.revision_id && got.type === a.type
        && got.name === a.name && got.mimeType === a.mime_type && got.size === a.size && got.sha256 === a.sha256 && got.capturedState === a.state;
      if (a.state === 'available') {
        const bytes = read('arquivos/' + a.id + '.bin'), source = readFileSync(join(snapshot, 'media', a.id + '.bin'));
        files.push({ size: a.size, actualSize: bytes.length, sha256: digest(source), actualSha256: digest(bytes) });
        metadataEqual &&= got?.packagingState === 'included' && got.path === 'arquivos/' + a.id + '.bin'; entries.push('arquivos/' + a.id + '.bin');
      } else { expectedMissing.push(a.id); check(got?.packagingState === 'missing' && got.path === null && typeof got.reason === 'string', 'missing status'); }
    }
  }
  missing.push(...m.missing.map(a => a.attachmentId));
  const listed = run(['-Z1', path]); check(listed.status === 0 && same(listed.stdout.toString().trim().split('\n').sort(), entries.sort()), 'exact ZIP entries');
  const text = read('mensagens.txt').toString();
  check(rows.every(row => text.includes(row.reference)) && text.includes('America/Sao_Paulo'), 'readable references');
  const proof = { synthetic: false, originVerified: true, isolated: true, collectorEnabled: false, expectedReferences: rows.map(r => r.reference),
    references: m.messages.map(r => r.reference), metadataEqual, files, missingExpected: expectedMissing, missing };
  check(auditEvidence(proof).accepted, 'independent ZIP acceptance');
  return { proof, counts: m.counts, revisions: m.messages.reduce((n, r) => n + r.revisions.length, 0), quotes: m.messages.filter(r => r.quote).length };
}
export async function runAcceptance({ mode, snapshotDir, caseFile }) {
  check(['real-offline', 'real-browser'].includes(mode), 'mode');
  const c = privateJson(caseFile); check(c.synthetic === false && !!c.source, 'real case required');
  const initial = validateSnapshot(snapshotDir), source = realpathSync(c.source);
  check(source !== realpathSync(snapshotDir), 'original and snapshot differ');
  const auth = new Database(join(source, 'auth.sqlite'), { readonly: true });
  try { assertCollectorReady(source, auth); const creds = JSON.parse(auth.prepare('SELECT creds FROM whatsapp_profile WHERE id=1').get().creds); check(!!creds.me?.id && !!creds.account && creds.signalIdentities?.length > 0, 'linked original account'); } finally { auth.close(); }
  const oracle = new Database(join(snapshotDir, 'archive.sqlite'), { readonly: true }), period = periodFor(c), expected = rowsFor(oracle, c, period);
  check(expected.length > 100 && expected.some(r => r.reference === c.anchorReference), 'real recorte and anchor');
  const directory = mkdtempSync(join(tmpdir(), 'zap-phase2-proof-')); chmodSync(directory, 0o700);
  const destination = join(directory, 'restore'); await restoreSnapshot({ snapshotDir, destination });
  check(realpathSync(destination) !== source, 'isolated restore');
  const s = createService({ dataDir: destination }), server = s.app.listen(0, '127.0.0.1'); let stage = 'login';
  try {
    await once(server, 'listening'); const base = 'http://127.0.0.1:' + server.address().port, password = randomUUID() + randomUUID(); await s.setPassword(password);
    const request = (path, options = {}) => fetch(base + path, { ...options, signal: AbortSignal.timeout(30000) });
    const challenge = await request('/api/session'), token = await challenge.json();
    const login = await request('/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie').split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password, csrfToken: token.csrfToken }) });
    check(login.status === 200, 'authenticated copy'); const cookie = login.headers.get('set-cookie').split(';')[0];
    const read = async path => { const r = await request(path, { headers: { Cookie: cookie } }); check(r.status === 200, 'private HTTP'); return r.json(); };
    const status = await read('/api/status'); check(!status.collectorEnabled && status.connection === 'disconnected' && !status.pairingAvailable, 'zero collector');
    check(status.coverage.uniqueMessages === initial.manifest.databases['archive.sqlite'].counts.messages, 'archive count preserved');
    for (const path of ['/api/search', '/api/exports/period', '/api/context/' + c.anchorReference, '/api/attachments/' + c.media[0].id]) check((await request(path)).status === 401, 'anonymous denied');
    stage = 'search';
    let cursor, candidates = []; do { const p = await read('/api/conversations?' + new URLSearchParams({ q: c.contact, ...(cursor ? { cursor } : {}) })); candidates.push(...p.conversations); cursor = p.nextCursor; } while (cursor);
    check(candidates.some(r => r.id === c.conversationId), 'canonical contact candidate');
    const filter = { conversationId: c.conversationId, from: c.from, to: c.to, limit: '100' }, results = []; let first;
    do { const p = await read('/api/search?' + new URLSearchParams({ ...filter, ...(cursor ? { cursor } : {}) })); first ??= p; results.push(...p.messages); cursor = p.nextCursor; } while (cursor);
    check(same(results.map(r => r.reference), expected.slice().reverse().map(r => r.reference)), 'all search pages independent order');
    check(first.effectiveFilters.startMs === period.start && first.effectiveFilters.endMs === period.end, 'independent UTC calendar');
    check(results.every(m => matchesMetadata(oracle, expected.find(r => r.reference === m.reference), m)), 'search metadata');
    const term = await read('/api/search?' + new URLSearchParams({ ...filter, q: c.term }));
    check(term.messages.some(r => r.reference === c.anchorReference), 'known term anchor');
    const filenameTerm = c.filename.name.match(/[\p{L}]{4,}/u)[0];
    const nameSearch = await read('/api/search?' + new URLSearchParams({ q: filenameTerm, conversationId: oracle.prepare('SELECT conversation_id FROM messages WHERE reference=?').get(c.filename.reference).conversation_id }));
    check(nameSearch.messages.some(r => r.reference === c.filename.reference), 'received filename search');
    stage = 'context';
    const context = await read('/api/context/' + c.anchorReference + '?' + new URLSearchParams({ sourceSnapshotId: term.snapshotId }));
    const contextRows = oracle.prepare('SELECT * FROM messages WHERE conversation_id=?').all(c.conversationId).sort((a,b) => (a.original_timestamp===null)-(b.original_timestamp===null) || Date.parse(a.original_timestamp)-Date.parse(b.original_timestamp) || Buffer.compare(Buffer.from(a.reference),Buffer.from(b.reference)));
    let all = [...context.messages];
    for (const direction of ['before', 'after']) { let next = direction === 'before' ? context.previousCursor : context.nextCursor; while (next) { const p = await read('/api/context/' + c.anchorReference + '?' + new URLSearchParams({ direction, cursor: next })); all = direction === 'before' ? [...p.messages, ...all] : [...all, ...p.messages]; next = direction === 'before' ? p.previousCursor : p.nextCursor; } }
    check(same(all.map(r => r.reference), contextRows.map(r => r.reference)) && all.every(m => matchesMetadata(oracle, contextRows.find(r => r.reference === m.reference), m)), 'bidirectional context oracle');
    check(context.anchorReference === c.anchorReference && context.matchedEvidence.length > 0, 'anchor evidence');
    stage = 'originals'; const originals = [];
    for (const a of c.media) { check(!!a, 'four original types'); const bytes = readFileSync(join(snapshotDir, 'media', a.id + '.bin')), r = await request('/api/attachments/' + a.id, { headers: { Cookie: cookie } }); check(r.status === 200, 'original HTTP'); const got = Buffer.from(await r.arrayBuffer()); check(got.length === bytes.length && digest(got) === digest(bytes), 'original bytes hash'); originals.push({ type: a.type, bytes: got.length, verified: true }); }
    stage = 'export'; const session = await read('/api/session');
    const created = await request('/api/exports', { method: 'POST', headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: c.conversationId, from: c.from, to: c.to, csrfToken: session.csrfToken }) });
    check(created.status === 202, 'export created'); let job = await created.json();
    const deadline = Date.now() + 120000; while (job.state === 'preparing' && Date.now() < deadline) { await new Promise(r => setTimeout(r, 50)); job = await read('/api/exports/' + job.jobId); }
    check(job.state === 'ready', 'verified ready'); const exported = await request(job.downloadURL, { headers: { Cookie: cookie } }); check(exported.status === 200, 'ZIP download');
    const zipPath = join(directory, 'offline.zip'); writeFileSync(zipPath, Buffer.from(await exported.arrayBuffer()), { mode: 0o600, flag: 'wx' });
    const checked = zipOracle(zipPath, oracle, c, period, snapshotDir);
    let browser = null;
    if (mode === 'real-browser') { stage = 'browser'; browser = await runBrowser({ base, password, c, directory, oracle, period, snapshotDir }); }
    check(validateSnapshot(snapshotDir).digest === initial.digest, 'snapshot unmodified');
    const report = { mode, synthetic: false, accepted: true, sourceVerified: true, snapshotUnmodified: true, collectorEnabled: false,
      archiveMessages: status.coverage.uniqueMessages, candidates: candidates.length, searchedMessages: results.length, contextMessages: all.length,
      counts: checked.counts, revisions: checked.revisions, quotes: checked.quotes, originals, browser, exampleFound: c.exampleFound,
      proof: checked.proof, observedAt: new Date().toISOString() };
    writeFileSync(join(directory, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
    writeFileSync(join(dirname(caseFile), 'latest-' + mode + '.json'), JSON.stringify({ directory, report: join(directory, 'report.json'), destination }), { mode: 0o600 });
    return { accepted: true, synthetic: false, mode, archiveMessages: report.archiveMessages, searchedMessages: results.length, ...checked.counts,
      revisions: checked.revisions, quotes: checked.quotes, originals: originals.length, offline: true, browser: browser?.passed ?? false };
  } catch (error) { writeFileSync(join(directory, 'failure.json'), JSON.stringify({ stage, name: error.name, message: error.message }), { mode: 0o600 }); throw Error('Aceite recusado na etapa: ' + stage); }
  finally { oracle.close(); await new Promise(r => server.close(r)); await s.close(); rmSync(destination, { recursive: true }); }
}
async function runBrowser() { throw Error('Browser acceptance not implemented'); }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAcceptance({ mode: process.argv[process.argv.indexOf('--mode') + 1], snapshotDir: process.env.ZAP_PHASE2_SNAPSHOT, caseFile: process.env.ZAP_PHASE2_CASE_FILE })
    .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message?.startsWith('Aceite recusado na etapa:') ? error.message : 'Aceite recusado: entrada ou prova privada inválida'); process.exitCode = 1; });
}

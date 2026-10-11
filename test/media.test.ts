import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, createCipheriv } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { getMediaKeys } from '@whiskeysockets/baileys';
import type { MediaJob } from '../src/media.js';
import { serialize } from 'node:v8';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import { createAuthState } from '../src/whatsapp.js';
import { createSnapshot, verifyBackup } from '../src/backup.js';
import { deserialize } from 'node:v8';
import { spawnSync } from 'node:child_process';

const bytes = Buffer.from('original sintético\0🧪');
const hash = createHash('sha256').update(bytes).digest();
function media(id: string, type = 'imageMessage', node: Record<string, unknown> = {}) {
  return { key: { remoteJid: '1@s.whatsapp.net', id, fromMe: false }, messageTimestamp: 1700000000,
    message: { [type]: { url: 'https://mmg.whatsapp.net/original', mediaKey: Buffer.alloc(32, 1), fileLength: bytes.length, fileSha256: hash, caption: 'legenda', fileName: '../../original\r\n.svg', ...node } } };
}
function fixture(t: { after(fn: () => unknown): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'zap-media-')), service = createService({ dataDir: dir });
  t.after(async () => { await service.close(); rmSync(dir, { recursive: true }); });
  return { dir, service, archive: service.archive };
}
async function moduleMedia() { const path = '../src/media.js'; return import(path); }

for (const point of ['published', 'beforeAvailable'] as const) for (const priorHash of [false, true]) {
  test(`PN/LID preserva original em ${point} com dois workers e hash pré-publicação=${priorHash}`, async t => {
    const base = mkdtempSync(join(tmpdir(), 'zap-merge-race-')), dataDir = join(base, 'source');
    let service = createService({ dataDir });
    t.after(async () => { await service.close(); rmSync(base, { recursive: true }); });
    createAuthState(service.authDb, { newProfile: true });
    const archive = service.archive, pn = media('race'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
    archive.ingestHistory({ messages: [pn, lid] });
    const firstId = archive.readStoredMessage(pn.key)!.attachments[0]!.id, savedId = archive.readStoredMessage(lid.key)!.attachments[0]!.id;
    let rejectFirst!: (error: Error) => void, reached!: () => void, release!: () => void, downloads = 0, time = 0;
    const first = new Promise<Readable>((_, reject) => { rejectFirst = reject; });
    const checkpoint = new Promise<void>(resolve => { reached = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
    const { startMediaWorker } = await moduleMedia();
    const worker = startMediaWorker({ archive, mediaDir: join(dataDir, 'media'), now: () => time,
      downloadOriginal: async (job: MediaJob) => { if (++downloads > 2) throw Error('origem indisponível no retry'); return job.id === firstId ? first : Readable.from([bytes]); },
      fault: async (current: string) => { if (current === point) { reached(); await held; archive.db.exec("CREATE TRIGGER media_fault BEFORE UPDATE OF state ON attachments WHEN NEW.state='available' BEGIN SELECT RAISE(ABORT,'injected'); END"); } }
    });
    t.after(async () => { release(); rejectFirst(Error('cleanup')); await worker.stop(); });
    await checkpoint;
    assert.equal(worker.snapshot().active, 2);
    if (priorHash) archive.db.prepare('UPDATE attachments SET size=?,sha256=? WHERE id=?').run(bytes.length, hash.toString('hex'), firstId);
    const lease = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(savedId);
    const manifest = (lease as { generation: string }).generation;
    archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
    try {
      assert.ok(archive.getAttachment(savedId), 'ID do original publicado deve permanecer consultável');
      assert.ok(archive.getAttachment(firstId), 'outro worker ainda pode produzir bytes únicos');
      assert.deepEqual(archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(savedId), lease);
      for (const [id, jid] of [[firstId, pn.key.remoteJid], [savedId, lid.key.remoteJid]]) {
        const privateRow = archive.db.prepare('SELECT source_key FROM attachments WHERE id=?').get(id) as { source_key: string };
        assert.equal(JSON.parse(privateRow.source_key).remoteJid, jid, 'locator fica congelado por attachment');
        const publicFields = ['id', 'reference', 'type', 'name', 'mimeType', 'state', 'reason', 'attempts', 'size', 'sha256', 'sourceHashVerified'].sort();
        assert.deepEqual(Object.keys(archive.getAttachment(id)!).sort(), publicFields);
        const message = archive.readStoredMessage(pn.key)!, attachment = message.attachments.find(a => a!.id === id)!;
        assert.deepEqual(Object.keys(attachment).sort(), [...publicFields, 'revisionId'].sort());
        assert.ok(message.revisions.some(r => r.revisionId === attachment.revisionId), 'anexo pertence à revisão capturada');
      }
      assert.equal(archive.getCoverage().uniqueMessages, 1); assert.equal(archive.readStoredMessage(pn.key)!.revisions.length, 1);
      assert.deepEqual(archive.db.pragma('foreign_key_check'), []);
    } finally { release(); rejectFirst(Error('primeiro download falhou')); }
    await worker.drain();
    assert.notEqual(archive.getAttachment(savedId)!.state, 'available', 'publicação interrompida ainda exige verificação');
    const publishedJob = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(savedId) as { generation: string; attempts: number };
    const locator = archive.db.prepare('SELECT source_key FROM attachments WHERE id=?').get(savedId);
    const receipt = readFileSync(join(dataDir, 'media', `${savedId}.${manifest}.manifest`));
    archive.db.exec('DROP TRIGGER media_fault'); time = 2000;
    await worker.drain(); await worker.stop();
    assert.equal(archive.getAttachment(savedId)!.state, 'available', 'retry no mesmo processo deve adotar o final antes de outro download');
    assert.equal(downloads, 3, 'só a origem sem binário tenta baixar novamente');
    const adoptedJob = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(savedId) as { generation: string; attempts: number; state: string; lease_until: number | null };
    assert.equal(adoptedJob.generation, publishedJob.generation); assert.equal(adoptedJob.attempts, publishedJob.attempts);
    assert.equal(adoptedJob.state, 'available'); assert.equal(adoptedJob.lease_until, null);
    assert.deepEqual(archive.db.prepare('SELECT source_key FROM attachments WHERE id=?').get(savedId), locator);
    assert.deepEqual(readFileSync(join(dataDir, 'media', `${savedId}.${manifest}.manifest`)), receipt);
    assert.deepEqual(readFileSync(join(dataDir, 'media', savedId + '.bin')), bytes);
    assert.equal(worker.snapshot().active, 0); assert.equal(worker.snapshot().diagnostic, null);
    await service.setPassword('synthetic-password');
    const server = service.app.listen(0, '127.0.0.1'); await once(server, 'listening');
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      assert.equal((await fetch(url + '/api/attachments/' + savedId)).status, 401);
      const challenge = await fetch(url + '/api/session'), form = await challenge.json() as { csrfToken: string };
      const login = await fetch(url + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'synthetic-password', csrfToken: form.csrfToken }) });
      assert.equal(login.status, 200);
      const response = await fetch(url + '/api/attachments/' + savedId, { headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } });
      assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
    await service.close(); service = createService({ dataDir });
    assert.equal(service.archive.getAttachment(savedId)!.state, 'available');
    assert.equal(service.archive.getAttachment(savedId)!.sha256, hash.toString('hex'));
    assert.notEqual(service.archive.getAttachment(firstId)!.state, 'available', 'hash isolado não prova presença do binário');
    assert.deepEqual(readFileSync(join(dataDir, 'media', savedId + '.bin')), bytes);
    assert.equal(JSON.parse(readFileSync(join(dataDir, 'media', `${savedId}.${manifest}.manifest`), 'utf8')).sha256, hash.toString('hex'));
    const offline = startMediaWorker({ archive: service.archive, mediaDir: join(dataDir, 'media'), online: () => false,
      downloadOriginal: async () => { downloads++; throw Error('nenhum redownload offline'); } });
    await offline.drain(); await offline.stop(); assert.equal(downloads, 3);
    await service.close();
    const snapshotDir = join(base, 'snapshot'), destination = join(base, 'restore');
    await createSnapshot({ dataDir, destination: snapshotDir });
    assert.equal((await verifyBackup({ dataDir, snapshotDir, destination })).verified, true, 'restore verifica HTTP autenticado offline e hash');
    assert.deepEqual(readFileSync(join(destination, 'media', savedId + '.bin')), bytes);
    service = createService({ dataDir: destination });
    assert.equal(service.archive.getAttachment(savedId)!.state, 'available');
    assert.equal(service.archive.readStoredMessage(lid.key)!.attachments.some(a => a!.id === savedId), true);
    assert.equal(downloads, 3);
  });
}

for (const outcome of ['sql', 'corrupt', 'unverified', 'noSpace', 'lastAttempt'] as const) {
  test(`retry verifica final publicado antes de geração, tentativa e orçamento: ${outcome}`, async t => {
    const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
    const message = media('retry-final'); archive.ingestHistory({ messages: [message] });
    const id = archive.readStoredMessage(message.key)!.attachments[0]!.id;
    if (outcome === 'lastAttempt') archive.db.prepare('UPDATE media_jobs SET attempts=4 WHERE attachment_id=?').run(id);
    let downloads = 0, time = 0, free = 1n << 30n;
    const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), now: () => time,
      diskSpace: () => ({ free, total: 1n << 30n }),
      downloadOriginal: async () => { if (++downloads > 1) throw Error('origem indisponível'); return Readable.from([bytes]); },
      fault: async (point: string) => { if (point === 'beforeAvailable') archive.db.exec("CREATE TRIGGER media_fault BEFORE UPDATE OF state ON attachments WHEN NEW.state='available' BEGIN SELECT RAISE(ABORT,'injected'); END"); }
    });
    t.after(() => worker.stop()); await worker.drain();
    const published = archive.db.prepare('SELECT generation,attempts FROM media_jobs WHERE attachment_id=?').get(id) as { generation: string; attempts: number };
    const final = join(dir, 'media', id + '.bin'), receipt = join(dir, 'media', `${id}.${published.generation}.manifest`), manifest = readFileSync(receipt);
    assert.deepEqual(readFileSync(final), bytes);
    if (outcome !== 'sql') archive.db.exec('DROP TRIGGER media_fault');
    const damaged = Buffer.from(bytes); damaged[0] ^= 1;
    if (outcome === 'corrupt') writeFileSync(final, damaged);
    if (outcome === 'unverified') archive.db.prepare('UPDATE attachments SET size=NULL,sha256=NULL WHERE id=?').run(id);
    if (outcome === 'noSpace') free = 256n * 1024n * 1024n;
    time = 60_000; await worker.drain(); const status = worker.snapshot(); await worker.stop();
    const job = archive.db.prepare('SELECT generation,attempts,state,lease_until FROM media_jobs WHERE attachment_id=?').get(id) as { generation: string; attempts: number; state: string; lease_until: number | null };
    assert.deepEqual(readFileSync(receipt), manifest);
    if (outcome === 'corrupt') {
      assert.equal(downloads, 2); assert.equal(existsSync(final), false);
      const quarantine = readdirSync(join(dir, 'media')).filter(name => name.endsWith('.damaged'));
      assert.equal(quarantine.length, 1); assert.deepEqual(readFileSync(join(dir, 'media', quarantine[0])), damaged);
      assert.equal(job.attempts, published.attempts + 1); assert.notEqual(job.generation, published.generation);
      assert.notEqual(archive.getAttachment(id)!.state, 'available');
    } else {
      assert.equal(downloads, 1); assert.deepEqual(readFileSync(final), bytes);
      assert.equal(job.generation, published.generation); assert.equal(job.attempts, published.attempts); assert.equal(job.lease_until, null);
      assert.equal(readdirSync(join(dir, 'media')).some(name => name.endsWith('.damaged')), false);
      if (outcome === 'sql' || outcome === 'unverified') {
        assert.notEqual(archive.getAttachment(id)!.state, 'available'); assert.equal(status.paused, true);
        assert.match(status.diagnostic!, /persistência/i);
        if (outcome === 'sql') archive.db.exec('DROP TRIGGER media_fault');
      } else { assert.equal(archive.getAttachment(id)!.state, 'available'); assert.equal(status.paused, false); }
    }
  });
}

test('PN/LID preserva bytes distintos e usa locator de cada attachment nas novas tentativas', async t => {
  const { archive, dir, service } = fixture(t), { startMediaWorker } = await moduleMedia();
  const pn = media('distinct', 'documentMessage', { fileLength: undefined, fileSha256: undefined }), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
  archive.ingestHistory({ messages: [pn, lid] });
  const ids = [archive.readStoredMessage(pn.key)!.attachments[0]!.id, archive.readStoredMessage(lid.key)!.attachments[0]!.id];
  let started!: () => void, release!: () => void, calls = 0;
  const both = new Promise<void>(resolve => { started = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
  const originals = [bytes, Buffer.from('outro original sem hash de origem')];
  let worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async (job: MediaJob) => {
    calls++; if (calls === 2) started(); await held; return Readable.from([originals[ids.indexOf(job.id)]]);
  } });
  t.after(() => worker.stop()); await both;
  archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid }); release(); await worker.drain(); await worker.stop();
  assert.equal(archive.getCoverage().uniqueMessages, 1); assert.equal(archive.readStoredMessage(pn.key)!.revisions.length, 1);
  for (const [index, id] of ids.entries()) {
    assert.equal(archive.getAttachment(id)!.state, 'available'); assert.deepEqual(readFileSync(join(dir, 'media', id + '.bin')), originals[index]);
    rmSync(join(dir, 'media', id + '.bin'));
  }
  const { reconcileMedia } = await moduleMedia(); reconcileMedia(archive, join(dir, 'media'));
  worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async (job: MediaJob) => {
    const index = ids.indexOf(job.id); assert.equal(job.message.key.remoteJid, index === 0 ? pn.key.remoteJid : lid.key.remoteJid);
    calls++; return Readable.from([originals[index]]);
  } });
  await worker.drain(); await worker.stop(); assert.equal(calls, 4);
  for (const [index, id] of ids.entries()) assert.deepEqual(readFileSync(join(dir, 'media', id + '.bin')), originals[index]);
  assert.deepEqual(service.archiveDb.pragma('foreign_key_check'), []);
});

test('PN/LID exclui job supersedido e impede publicação do worker realmente descartado', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const pn = media('retired'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
  archive.ingestHistory({ messages: [pn, lid] });
  const retiredId = archive.readStoredMessage(pn.key)!.attachments[0]!.id, keptId = archive.readStoredMessage(lid.key)!.attachments[0]!.id;
  let started!: () => void, release!: () => void, calls = 0;
  const both = new Promise<void>(resolve => { started = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => {
    if (++calls === 2) started(); await held; return Readable.from([bytes]);
  } });
  t.after(async () => { release(); await worker.stop(); }); await both;
  archive.db.prepare("UPDATE media_jobs SET generation='superseded',state='unavailable' WHERE attachment_id=?").run(retiredId);
  archive.db.prepare("UPDATE attachments SET state='unavailable' WHERE id=?").run(retiredId);
  archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
  assert.equal(archive.getAttachment(retiredId), null); release(); await worker.drain(); await worker.stop();
  assert.equal(existsSync(join(dir, 'media', retiredId + '.bin')), false);
  assert.equal(archive.getAttachment(keptId)!.state, 'available');
  assert.deepEqual(readFileSync(join(dir, 'media', keptId + '.bin')), bytes);
});

test('PN/LID mantém o único original disponível, locator privado, HTTP offline e backup restaurado', async t => {
  const base = mkdtempSync(join(tmpdir(), 'zap-media-merge-')), dataDir = join(base, 'source');
  const service = createService({ dataDir }), archive = service.archive; let closed = false;
  t.after(async () => { if (!closed) await service.close(); rmSync(base, { recursive: true }); });
  createAuthState(service.authDb, { newProfile: true });
  const pn = media('same'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
  archive.ingestHistory({ messages: [pn, lid] });
  const kept = archive.readStoredMessage(pn.key)!, keptId = kept.attachments[0]!.id, availableId = archive.readStoredMessage(lid.key)!.attachments[0]!.id;
  archive.db.prepare("UPDATE attachments SET state='unavailable' WHERE id=?").run(keptId);
  archive.db.prepare("UPDATE media_jobs SET state='unavailable',attempts=5 WHERE attachment_id=?").run(keptId);
  let downloads = 0; const { startMediaWorker } = await moduleMedia();
  const worker = startMediaWorker({ archive, mediaDir: join(dataDir, 'media'), downloadOriginal: async () => { downloads++; return Readable.from([bytes]); } });
  await worker.drain(); await worker.stop();
  const job = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(availableId);
  archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
  const merged = archive.readStoredMessage(pn.key)!;
  assert.equal(merged.reference, kept.reference); assert.equal(archive.readStoredMessage(lid.key)!.reference, kept.reference);
  assert.equal(merged.attachments[0]!.id, availableId); assert.equal(merged.attachments[0]!.state, 'available');
  assert.equal(merged.attachments[0]!.sourceHashVerified, true); assert.equal(merged.attachments[0]!.sha256, hash.toString('hex'));
  assert.deepEqual(archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(availableId), job);
  const privateSource = archive.db.prepare('SELECT payload FROM revisions WHERE reference=?').get(kept.reference) as { payload: Buffer };
  assert.equal(deserialize(privateSource.payload).key.remoteJid, lid.key.remoteJid, 'locator do original mantido para renovação privada');
  assert.equal(merged.revisions.length, 1); assert.equal(archive.getCoverage().uniqueMessages, 1); assert.equal(downloads, 1);
  assert.deepEqual(archive.db.pragma('foreign_key_check'), []);
  await service.setPassword('synthetic-password');
  const server = service.app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    assert.equal((await fetch(url + '/api/attachments/' + availableId)).status, 401);
    const challenge = await fetch(url + '/api/session'), form = await challenge.json() as { csrfToken: string };
    const login = await fetch(url + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'synthetic-password', csrfToken: form.csrfToken }) });
    assert.equal(login.status, 200);
    const publicPage = await fetch(url + '/api/conversations/' + kept.conversationId + '/messages', { headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } });
    const page = await publicPage.json() as { messages: { attachments: Record<string, unknown>[]; revisions: { revisionId: number }[] }[] };
    assert.equal(publicPage.status, 200);
    for (const message of page.messages) for (const attachment of message.attachments) {
      assert.deepEqual(Object.keys(attachment).sort(), ['id', 'reference', 'revisionId', 'type', 'name', 'mimeType', 'state', 'reason', 'attempts', 'size', 'sha256', 'sourceHashVerified'].sort());
      assert.ok(message.revisions.some(revision => revision.revisionId === attachment.revisionId), 'anexo público pertence à revisão capturada');
    }
    const response = await fetch(url + '/api/attachments/' + availableId, { headers: { Cookie: login.headers.get('set-cookie')!.split(';')[0] } });
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  await service.close(); closed = true;
  const snapshotDir = join(base, 'snapshot'), destination = join(base, 'restore');
  await createSnapshot({ dataDir, destination: snapshotDir });
  assert.equal((await verifyBackup({ dataDir, snapshotDir, destination })).verified, true, 'restore inclui login e download HTTP offline autenticados');
  assert.deepEqual(readFileSync(join(destination, 'media', availableId + '.bin')), bytes);
});

test('PN/LID conserva a lease em andamento e finaliza uma vez em ambas as perspectivas', async t => {
  for (const activeJid of ['1@s.whatsapp.net', '9@lid']) {
    const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
    const pn = media('lease'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
    archive.ingestHistory({ messages: [pn, lid] });
    const activeId = archive.readStoredMessage({ ...pn.key, remoteJid: activeJid })!.attachments[0]!.id;
    const otherId = archive.readStoredMessage({ ...pn.key, remoteJid: activeJid === pn.key.remoteJid ? lid.key.remoteJid : pn.key.remoteJid })!.attachments[0]!.id;
    let start!: () => void, release!: (stream: Readable) => void, downloads = 0;
    const started = new Promise<void>(resolve => { start = resolve; }), blocked = new Promise<Readable>(resolve => { release = resolve; });
    const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => { downloads++; start(); return blocked; } });
    archive.db.prepare("UPDATE media_jobs SET retry_at=? WHERE attachment_id=?").run(Date.now() + 60_000, otherId);
    t.after(() => worker.stop()); await started;
    const lease = archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(activeId);
    archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
    assert.deepEqual(archive.db.prepare('SELECT * FROM media_jobs WHERE attachment_id=?').get(activeId), lease);
    release(Readable.from([bytes])); await worker.drain(); await worker.stop();
    assert.equal(archive.getAttachment(activeId)!.state, 'available'); assert.equal(downloads, 1);
    assert.deepEqual(readFileSync(join(dir, 'media', activeId + '.bin')), bytes);
  }
});
test('PN/LID conserva job pendente quando a outra origem esgotou tentativas', t => {
  const { archive } = fixture(t), pn = media('pending'), lid = { ...pn, key: { ...pn.key, remoteJid: '9@lid' } };
  archive.ingestHistory({ messages: [pn, lid] });
  const failedId = archive.readStoredMessage(pn.key)!.attachments[0]!.id, pendingId = archive.readStoredMessage(lid.key)!.attachments[0]!.id;
  archive.db.prepare("UPDATE attachments SET state='unavailable' WHERE id=?").run(failedId);
  archive.db.prepare("UPDATE media_jobs SET state='unavailable',attempts=5 WHERE attachment_id=?").run(failedId);
  archive.ingestContacts({ lid: lid.key.remoteJid, pn: pn.key.remoteJid });
  assert.equal(archive.readStoredMessage(pn.key)!.attachments[0]!.id, pendingId);
  assert.equal(archive.getAttachment(pendingId)!.state, 'pending');
});

test('thumbnail-only nunca cria job nem satisfaz original disponível', t => {
  const { archive } = fixture(t); const message = media('thumbnail', 'imageMessage', { url: undefined, mediaKey: undefined, thumbnailDirectPath: '/thumb' });
  archive.ingestUpsert({ messages: [message], type: 'notify' });
  const attachment = (archive.readStoredMessage(message.key) as any).attachments[0];
  assert.equal(attachment.state, 'unavailable', 'miniatura não é original');
  assert.equal((archive.db.prepare('SELECT count(*) n FROM media_jobs').get() as any).n, 0);
});

test('fila legada sem original é reclassificada antes do downloader', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia(); const message = media('legacy'); archive.ingestUpsert({ messages: [message], type: 'notify' });
  archive.db.prepare('UPDATE attachments SET descriptor=?').run(serialize({ thumbnailDirectPath: '/thumb', mediaKey: Buffer.alloc(32) })); let called = 0;
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => { called++; return Readable.from([bytes]); } }); await worker.drain(); await worker.stop();
  assert.equal(called, 0); assert.equal((archive.readStoredMessage(message.key) as any).attachments[0].state, 'unavailable');
});

test('quatro originais têm bytes conferidos e download HTTP autenticado offline', async t => {
  const { archive, service, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const messages = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage'].map((type, i) => media(String(i), type));
  archive.ingestUpsert({ messages, type: 'notify' });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes.subarray(0, 3), bytes.subarray(3)]) });
  await worker.drain(); await worker.stop();
  const ids = messages.map(m => (archive.readStoredMessage(m.key) as any).attachments[0].id);
  for (const id of ids) { const a = archive.getAttachment(id) as any; assert.equal(a.state, 'available'); assert.equal(a.sha256, hash.toString('hex')); assert.equal(a.size, bytes.length); assert.deepEqual(readFileSync(join(dir, 'media', id + '.bin')), bytes); }
  await service.setPassword('synthetic-password'); const server = service.app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const method of ['GET', 'HEAD']) assert.equal((await fetch(base + '/api/attachments/' + ids[0], { method, headers: { Range: 'bytes=0-2' } })).status, 401);
  const challenge = await fetch(base + '/api/session'), form = await challenge.json() as any;
  const login = await fetch(base + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'synthetic-password', csrfToken: form.csrfToken }) });
  const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0] };
  for (const id of ids) { const response = await fetch(base + '/api/attachments/' + id, { headers }); assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes); assert.match(response.headers.get('content-disposition')!, /^attachment;/); assert.equal(response.headers.get('content-type'), 'application/octet-stream'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.equal(response.headers.get('cache-control'), 'no-store'); }
  const partial = await fetch(base + '/api/attachments/' + ids[0], { headers: { ...headers, Range: 'bytes=1-3' } }); assert.equal(partial.status, 206); assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(1, 4));
  assert.equal((await fetch(base + '/api/attachments/' + ids[0], { method: 'HEAD', headers })).headers.get('content-length'), String(bytes.length));
  assert.equal((await fetch(base + '/api/attachments/' + ids[0], { headers: { ...headers, Range: 'bytes=999-' } })).status, 416);
});

test('tamanho n-1/n/n+1, hash e Long inválido nunca publicam corrupção', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const cases = [{ fileLength: bytes.length - 1 }, { fileLength: bytes.length + 1 }, { fileSha256: Buffer.alloc(32) }, { fileLength: { low: -1, high: 2147483647, unsigned: true } }, { fileLength: Number.MAX_SAFE_INTEGER + 1 }, { fileLength: { low: 1.5, high: 0 } }];
  const messages = cases.map((node, i) => media('bad' + i, 'documentMessage', node));
  messages.push(media('good'), media('unknown', 'audioMessage', { fileName: undefined, fileLength: undefined, fileSha256: undefined }));
  archive.ingestUpsert({ messages, type: 'notify' });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([bytes]) }); await worker.drain(); await worker.stop();
  for (const m of messages.slice(0, -2)) assert.notEqual((archive.readStoredMessage(m.key) as any).attachments[0].state, 'available');
  for (const m of messages.slice(-2)) assert.equal((archive.readStoredMessage(m.key) as any).attachments[0].state, 'available');
  assert.equal((archive.readStoredMessage(messages.at(-1)!.key) as any).attachments[0].sourceHashVerified, false);
});

test('erros antes/tarde e cancelamento mantêm parcial indisponível e viewOnce restrito', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const a = media('before'), b = media('late'), view = media('view');
  archive.ingestUpsert({ messages: [a, b, { ...view, message: { ephemeralMessage: { message: { viewOnceMessageV2: { message: view.message } } } } }, { key: { ...view.key, id: 'quote' }, message: { extendedTextMessage: { text: 'texto', contextInfo: { quotedMessage: { viewOnceMessage: { message: view.message } } } } } }], type: 'notify' });
  let calls = 0;
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async (job: any) => { calls++; if (job.message.key.id === 'before') throw Error('PRIVATE URL'); return Readable.from((async function* () { yield bytes.subarray(0, 2); throw Error('PRIVATE KEY'); })()); } });
  await worker.drain(); await worker.stop(); assert.equal(calls, 2);
  for (const m of [a, b]) { const attachment = (archive.readStoredMessage(m.key) as any).attachments[0]; assert.equal(attachment.state, 'retry_wait'); assert.doesNotMatch(JSON.stringify(attachment), /PRIVATE|https:|mediaKey|descriptor|path/); }
  assert.equal((archive.readStoredMessage(view.key) as any).restricted, true);
  assert.equal((archive.readStoredMessage({ ...view.key, id: 'quote' }) as any).attachments.length, 0);
});

test('dispatcher passa family=4 e exercita lookup público fixado no Node24 sem rede', () => {
  const source = `
    import assert from 'node:assert/strict';
    import https from 'node:https';
    import { syncBuiltinESMExports } from 'node:module';
    import { EventEmitter } from 'node:events';
    const stop = Error('TRANSPORTE_SINTETICO_INTERROMPIDO');
    let requests = 0, dns = 0, lookups = 0, requestOptions, lookupResult;
    https.request = (url, options) => {
      requests++; requestOptions = options;
      options.lookup(url.hostname, { family: options.family, all: false }, (...result) => {
        lookups++; lookupResult = result;
      });
      const req = new EventEmitter();
      req.destroy = () => req;
      req.end = () => queueMicrotask(() => { req.emit('error', stop); req.emit('close'); });
      return req;
    };
    syncBuiltinESMExports();
    const { mediaDispatcher } = await import(${JSON.stringify(new URL('../src/media.js', import.meta.url).href)});
    const dispatcher = mediaDispatcher(new AbortController().signal, async hostname => {
      dns++; assert.equal(hostname, 'mmg.whatsapp.net');
      return [{ address: '8.8.8.8', family: 4 }];
    });
    await assert.rejects(fetch('https://mmg.whatsapp.net/file', { dispatcher }), error => error.cause === stop);
    assert.equal(requests, 1, 'request deve ser alcançado exatamente uma vez');
    assert.equal(dns, 1);
    assert.equal(requestOptions.family, 4, 'request deve fixar family=4');
    assert.equal(requestOptions.agent, false);
    assert.equal(lookups, 1, 'lookup fixado deve ser exercitado exatamente uma vez');
    assert.deepEqual(lookupResult, [null, '8.8.8.8', 4]);
    console.log('DNS_LOOKUP_FAMILY4_SEM_REDE_OK');
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8' });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), 'DNS_LOOKUP_FAMILY4_SEM_REDE_OK');
});

test('dispatcher bloqueia URL interna, redirect host e DNS privado antes de conexão', async () => {
  const { mediaDispatcher } = await moduleMedia(); let dns = 0;
  const dispatcher = mediaDispatcher(new AbortController().signal, async () => { dns++; return [{ address: '127.0.0.1', family: 4 }]; });
  for (const url of ['http://mmg.whatsapp.net/file', 'https://127.0.0.1/file', 'https://mmg.whatsapp.net.evil.test/file', 'https://mmg.whatsapp.net:444/file', 'https://user@mmg.whatsapp.net/file', 'https://mmg.whatsapp.net/file']) await assert.rejects(fetch(url, { dispatcher } as any));
  assert.equal(dns, 1, 'só host permitido consulta DNS, endereço interno não conecta');
  let first = true;
  const redirect = { dispatch(options: any, handler: any) {
    if (!first) return dispatcher.dispatch(options, handler);
    first = false; queueMicrotask(() => { handler.onConnect(() => {}); handler.onHeaders(302, [Buffer.from('location'), Buffer.from('https://127.0.0.1/private')], () => {}, 'Found'); handler.onComplete([]); }); return true;
  } };
  await assert.rejects(fetch('https://mmg.whatsapp.net/redirect', { dispatcher: redirect } as any)); assert.equal(dns, 1, 'redirect interno é recusado antes de DNS/conexão');
});

test('adapter Baileys fixado entrega plaintext original e renova 404 com locator privado', async t => {
  const { service } = fixture(t), events = new EventEmitter(), key = Buffer.alloc(32, 1);
  const keys = await getMediaKeys(key, 'image'); const cipher = createCipheriv('aes-256-cbc', keys.cipherKey, keys.iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final(), Buffer.alloc(10)]);
  let fetches = 0, renewed = 0; const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(typeof (options as any).dispatcher.dispatch, 'function'); fetches++;
    return fetches === 1 ? new Response(null, { status: 404 }) : new Response(encrypted);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const collector = service.startCollector({ newProfile: true, socketFactory: () => ({ ev: events, end() {}, async updateMediaMessage(message: any) { renewed++; return { ...message, message: { imageMessage: { ...message.message.imageMessage, url: 'https://mmg.whatsapp.net/refreshed' } } }; } }) as any });
  events.emit('connection.update', { connection: 'open' });
  const message = media('adapter'), descriptor = message.message.imageMessage;
  const job = { id: 'internal', type: 'imageMessage', descriptor, message, attempts: 1, generation: 'synthetic' } as unknown as MediaJob;
  const stream = await collector.downloadOriginal(job, new AbortController().signal), chunks = [];
  for await (const chunk of stream) chunks.push(chunk); assert.deepEqual(Buffer.concat(chunks), bytes); assert.equal(renewed, 1); assert.equal(fetches, 2);
  await assert.rejects(collector.downloadOriginal({ ...job, descriptor: { ...descriptor, viewOnce: true } }, new AbortController().signal)); assert.equal(fetches, 2);
});

test('conteúdo vazio só é disponível quando comprimento zero é confirmado pela origem', async t => {
  const { archive, dir } = fixture(t), { startMediaWorker } = await moduleMedia();
  const known = media('zero', 'documentMessage', { fileLength: 0, fileSha256: createHash('sha256').digest() }), unknown = media('unknown-zero', 'audioMessage', { fileLength: undefined, fileSha256: undefined });
  archive.ingestUpsert({ messages: [known, unknown], type: 'notify' });
  const worker = startMediaWorker({ archive, mediaDir: join(dir, 'media'), downloadOriginal: async () => Readable.from([]) }); await worker.drain(); await worker.stop();
  assert.equal((archive.readStoredMessage(known.key) as any).attachments[0].state, 'available'); assert.notEqual((archive.readStoredMessage(unknown.key) as any).attachments[0].state, 'available');
});

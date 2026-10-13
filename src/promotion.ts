import type Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { randomBytes, randomUUID, createHmac, timingSafeEqual, createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import Sqlite from 'better-sqlite3';
import { acquireServiceLock } from './whatsapp.js';
import { validateSnapshot, verifyPromotionBackup, profileReadonly, checkPromotionTarget } from './backup.js';
import { acquireOperation, newJournal, atomicPrivateJson, readPrivateJson, privateFile, createSupervisor, assertQuiet, type OperationConfig, type SupervisorConfig, type Controller, type SupervisorFacts } from './operation.js';

export type SourceFenceConfig = OperationConfig & { targetDataDir: string; targetMachineId: string };
export type PromotionConfig = OperationConfig & { source: SupervisorConfig; snapshotDir: string; verificationDir: string; sourceFenceFile?: string; sourceFencePublicKey?: string };
type SourceFence = { version: 1; profile: string; generation: string; source: string; sourceMachineId: string; target: string; targetMachineId: string; operationId: string; observedAt: string; facts: SupervisorFacts };
type SignedFence = { proof: string; signature: string };
type Proof = { version: 1; target: string; profile: string; generation: string; manifestHash: string; snapshotDir: string; operationId: string; operationDir: string; fence: SupervisorFacts; source: SupervisorConfig; sourceFence?: SignedFence; sourceFencePublicKey?: string };
export type PromotionPermit = object;
const permits = new WeakMap<PromotionPermit, { target: string; db: Database.Database; operationId: string; until: number }>();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function assertPromotionAuthorization(dataDir: string, authDb: Database.Database): Proof {
  const target = privateFile(dataDir, true); if (!existsSync(join(target, 'promotion.json'))) throw Error('Perfil restaurado é somente consulta offline; promoção explícita necessária');
  const receipt = readPrivateJson(join(target, 'promotion.json'));
  if (typeof receipt.proof !== 'string' || typeof receipt.mac !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.mac) || Object.keys(receipt).sort().join(',') !== 'mac,proof') throw Error('Autorização de promoção inválida');
  const proof: Proof = JSON.parse(receipt.proof);
  if (proof.version !== 1 || proof.target !== hash(target) || !/^[0-9a-f-]{36}$/.test(proof.operationId) || resolve(proof.operationDir) === target || resolve(proof.operationDir).startsWith(target + '/')) throw Error('Promoção de outro path ou incompleta');
  const secret = readPrivateJson(join(privateFile(proof.operationDir, true), 'promotion-key.json'));
  if (typeof secret.key !== 'string' || !/^[0-9a-f]{64}$/.test(secret.key)) throw Error('Chave de promoção inválida');
  const mac = createHmac('sha256', Buffer.from(secret.key, 'hex')).update(receipt.proof).digest(); if (!timingSafeEqual(mac, Buffer.from(receipt.mac, 'hex'))) throw Error('Autorização adulterada');
  const journal = readPrivateJson(join(proof.operationDir, 'promotion-state.json'));
  if (journal.kind !== 'promotion' || journal.stage !== 'committed' || journal.operationId !== proof.operationId || journal.source !== target) throw Error('Promoção não comprometida ou revogada');
  const value = (key: string) => (authDb.prepare('SELECT value FROM web_config WHERE key=?').get(key) as { value: string } | undefined)?.value;
  if (resolve(authDb.name) !== join(target, 'auth.sqlite') || profileReadonly(authDb) !== proof.profile || value('restore-generation') !== proof.generation || value('restore-manifest') !== proof.manifestHash || value('restore-target') !== proof.target || !existsSync(join(target, 'restored.json'))) throw Error('Restore divergente ou marker ausente');
  const snapshot = validateSnapshot(proof.snapshotDir); if (snapshot.digest !== proof.manifestHash || snapshot.manifest.profile !== proof.profile) throw Error('Snapshot da promoção divergente');
  if (proof.sourceFence) {
    const fence = verifyDurableFence(proof.sourceFence, proof.sourceFencePublicKey!, target, proof.profile, proof.source);
    const state = value('collector-fenced'), row = state && JSON.parse(state); if (!row || row.generation !== fence.generation || row.operationId !== fence.operationId || row.target !== fence.target || row.targetMachineId !== fence.targetMachineId) throw Error('Revogação durável divergente');
  } else if (value('collector-fenced')) throw Error('Source cercada; promoção durável obrigatória');
  return proof;
}
function verifyDurableFence(signed: SignedFence, publicKey: string, target: string, profile: string, source: SupervisorConfig): SourceFence {
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || typeof signed.proof !== 'string' || typeof signed.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(signed.signature) || !verify(null, Buffer.from(signed.proof), key, Buffer.from(signed.signature, 'base64url'))) throw Error('Fence durável adulterado');
  const fence: SourceFence = JSON.parse(signed.proof);
  if (fence.version !== 1 || fence.target !== hash(resolve(target)) || fence.profile !== profile || fence.targetMachineId !== readFileSync('/etc/machine-id', 'utf8').trim() || fence.sourceMachineId !== source.machineId || fence.source !== hash(resolve(source.dataDir)) || !/^[0-9a-f-]{36}$/.test(fence.generation) || !Number.isFinite(Date.parse(fence.observedAt)) || fence.facts.machineId !== fence.sourceMachineId) throw Error('Fence durável de outro destino/perfil/host');
  assertQuiet(fence.facts, true); return fence;
}
export async function createSourceFence(config: SourceFenceConfig, controller = createSupervisor(config.supervisor), fault?: (stage: string) => unknown) {
  if (!isAbsolute(config.targetDataDir) || resolve(config.targetDataDir) === '/' || !/^[a-f0-9]{32}$/.test(config.targetMachineId)) throw Error('Destino de handoff inválido');
  const operation = acquireOperation(config, true), journal = operation.prior?.kind === 'handoff' ? operation.prior : newJournal(config, 'handoff'); let lock: ReturnType<typeof acquireServiceLock> | undefined, db: Database.Database | undefined;
  try {
    if (operation.prior && operation.prior.kind !== 'handoff' && !['completed', 'recovered'].includes(operation.prior.stage)) throw Error('Outra operação interrompida');
    operation.save(journal); await fault?.('intended'); const facts = await verifyPromotionFence(config.supervisor, controller); lock = acquireServiceLock(config.dataDir);
    privateFile(join(config.dataDir, 'auth.sqlite'), false, Number.MAX_SAFE_INTEGER); db = new Sqlite(join(config.dataDir, 'auth.sqlite'), { fileMustExist: true }); db.pragma('synchronous=FULL');
    const prior = db.prepare("SELECT value FROM web_config WHERE key='collector-fenced'").get() as { value: string } | undefined, oldFence = prior && JSON.parse(prior.value);
    const generation = oldFence?.generation ?? randomUUID(), profile = profileReadonly(db), target = hash(resolve(config.targetDataDir));
    if (oldFence && (oldFence.target !== target || oldFence.targetMachineId !== config.targetMachineId || oldFence.operationId !== journal.operationId)) throw Error('Source já cercada para outro handoff');
    const keyFile = join(config.operationDir, 'source-fence-key.json');
    if (!existsSync(keyFile)) { const pair = generateKeyPairSync('ed25519'); atomicPrivateJson(keyFile, { privateKey: pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(), publicKey: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString() }); }
    const keys = readPrivateJson(keyFile), privateKey = createPrivateKey(keys.privateKey); if (privateKey.asymmetricKeyType !== 'ed25519' || createPublicKey(privateKey).export({ format: 'pem', type: 'spki' }).toString() !== keys.publicKey) throw Error('Chave de fence inválida');
    await fault?.('key');
    await verifyPromotionFence(config.supervisor, controller); lock.assert();
    if (!oldFence) db.prepare('INSERT INTO web_config(key,value) VALUES(?,?)').run('collector-fenced', JSON.stringify({ version: 1, generation, operationId: journal.operationId, target, targetMachineId: config.targetMachineId }));
    journal.stage = 'source-fenced'; operation.save(journal); await fault?.('source-fenced');
    const proof: SourceFence = { version: 1, profile, generation, source: hash(resolve(config.dataDir)), sourceMachineId: config.supervisor.machineId, target, targetMachineId: config.targetMachineId, operationId: journal.operationId, observedAt: new Date().toISOString(), facts };
    const body = JSON.stringify(proof), fenceFile = join(config.operationDir, 'source-fence.json'); atomicPrivateJson(fenceFile, { proof: body, signature: sign(null, Buffer.from(body), privateKey).toString('base64url') }); atomicPrivateJson(join(config.operationDir, 'source-fence-public.json'), { publicKey: keys.publicKey });
    await fault?.('published'); journal.stage = 'committed'; operation.save(journal); await fault?.('committed'); return { fenced: true, fenceFile, publicKey: keys.publicKey as string };
  } finally { db?.close(); lock?.release(); operation.release(); }
}
export async function verifyPromotionFence(source: SupervisorConfig, controller = createSupervisor(source)) {
  const facts = await controller.inspect(AbortSignal.timeout(10_000)); assertQuiet(facts, true);
  if (facts.machineId !== source.machineId) throw Error('Fence de outro host'); return facts;
}
export async function authorizePromotedCollector(dataDir: string, authDb: Database.Database, controller?: Controller): Promise<PromotionPermit> {
  const before = assertPromotionAuthorization(dataDir, authDb); if (!before.sourceFence) await verifyPromotionFence(before.source, controller);
  const after = assertPromotionAuthorization(dataDir, authDb); if (after.operationId !== before.operationId) throw Error('Promoção mudou durante fence');
  const permit = {}; permits.set(permit, { target: resolve(dataDir), db: authDb, operationId: after.operationId, until: Date.now() + 10_000 }); return permit;
}
export function consumePromotionPermit(permit: PromotionPermit | undefined, dataDir: string, authDb: Database.Database) {
  const proof = assertPromotionAuthorization(dataDir, authDb), allowed = permit && permits.get(permit); if (permit) permits.delete(permit);
  if (!allowed || allowed.target !== resolve(dataDir) || allowed.db !== authDb || allowed.operationId !== proof.operationId || allowed.until < Date.now()) throw Error('Fence atual obrigatório antes do socket');
}

export async function promoteProfile(config: PromotionConfig, { sourceController, targetController = createSupervisor(config.supervisor), fault }: { sourceController?: Controller; targetController?: Controller; fault?: (stage: string) => unknown } = {}) {
  if (config.source.dataDir === config.dataDir && config.source.machineId === config.supervisor.machineId || resolve(config.verificationDir) === resolve(config.dataDir)) throw Error('Origem/destino inválidos');
  const signed: SignedFence | undefined = config.sourceFenceFile ? readPrivateJson(config.sourceFenceFile) : undefined;
  const operation = acquireOperation(config), journal = newJournal(config, 'promotion'); let targetLock: ReturnType<typeof acquireServiceLock> | undefined;
  const sourceFence = async () => signed ? verifyDurableFence(signed, config.sourceFencePublicKey!, config.dataDir, validateSnapshot(config.snapshotDir).manifest.profile, config.source).facts : verifyPromotionFence(config.source, sourceController);
  const stage = async (name: string) => { journal.stage = name; operation.save(journal); atomicPrivateJson(join(config.operationDir, 'promotion-state.json'), journal); await fault?.(name); };
  try {
    await stage('intended'); const fence = await sourceFence(); assertQuiet(await targetController.inspect()); await stage('fenced');
    const verified = await verifyPromotionBackup({ dataDir: config.dataDir, snapshotDir: config.snapshotDir, destination: config.verificationDir }); await stage('verified');
    targetLock = acquireServiceLock(config.dataDir);
    if (signed) {
      const durable = verifyDurableFence(signed, config.sourceFencePublicKey!, config.dataDir, verified.profile, config.source);
      const db = new Sqlite(join(config.dataDir, 'auth.sqlite'), { readonly: true, fileMustExist: true });
      try { const value = (db.prepare("SELECT value FROM web_config WHERE key='collector-fenced'").get() as { value: string } | undefined)?.value, state = value && JSON.parse(value); if (!state || state.generation !== durable.generation || state.operationId !== durable.operationId || state.target !== durable.target || state.targetMachineId !== durable.targetMachineId) throw Error('Restore sem revogação durável correspondente'); } finally { db.close(); }
    }
    if (JSON.stringify(checkPromotionTarget(config.dataDir, config.snapshotDir)) !== JSON.stringify(verified)) throw Error('Destino mudou antes do commit');
    await sourceFence(); assertQuiet(await targetController.inspect()); targetLock.assert();
    const keyPath = join(config.operationDir, 'promotion-key.json'); if (!existsSync(keyPath)) atomicPrivateJson(keyPath, { key: randomBytes(32).toString('hex') });
    const key = readPrivateJson(keyPath).key; if (typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key)) throw Error('Chave privada inválida');
    const proof: Proof = { version: 1, target: hash(resolve(config.dataDir)), ...verified, snapshotDir: resolve(config.snapshotDir), operationId: journal.operationId, operationDir: resolve(config.operationDir), fence, source: config.source, ...(signed ? { sourceFence: signed, sourceFencePublicKey: config.sourceFencePublicKey } : {}) };
    const body = JSON.stringify(proof); await stage('publishing');
    atomicPrivateJson(join(config.dataDir, 'promotion.json'), { proof: body, mac: createHmac('sha256', Buffer.from(key, 'hex')).update(body).digest('hex') }); await stage('published');
    if (JSON.stringify(checkPromotionTarget(config.dataDir, config.snapshotDir)) !== JSON.stringify(verified)) throw Error('Destino mudou durante publicação'); await sourceFence(); assertQuiet(await targetController.inspect()); targetLock.assert(); await stage('committed');
    return { authorized: true, operationId: journal.operationId };
  } catch (error) { journal.stage = 'revoked'; journal.diagnostic = 'Promoção interrompida; fonte permanece parada e destino offline'; operation.save(journal); atomicPrivateJson(join(config.operationDir, 'promotion-state.json'), journal); throw error; }
  finally { targetLock?.release(); operation.release(); }
}
export async function revokePromotion(config: PromotionConfig, targetController = createSupervisor(config.supervisor)) {
  const operation = acquireOperation(config, true); try { const state = readPrivateJson(join(config.operationDir, 'promotion-state.json')); if (state.kind !== 'promotion') throw Error('Promoção ausente'); state.stage = 'revoked'; atomicPrivateJson(join(config.operationDir, 'promotion-state.json'), state); await targetController.stop(); assertQuiet(await targetController.inspect(), true); return { revoked: true, sourceMayResume: false }; } finally { operation.release(); }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proto } from '@whiskeysockets/baileys';

const modulePath = '../src/whatsapp.js';
async function load() { const mod = await import(modulePath).catch(() => null); assert.ok(mod?.createAuthState, 'persistência transacional de auth precisa existir'); return mod; }
const categories = ['pre-key', 'session', 'sender-key', 'sender-key-memory', 'app-state-sync-key', 'app-state-sync-version', 'lid-mapping', 'device-list', 'tctoken', 'identity-key'];
const bytes = Buffer.from([0, 1, 255]);
const values = [{ public: bytes, private: bytes }, bytes, bytes, { 'a@lid': true }, { keyData: bytes, fingerprint: { rawId: 1, currentIndex: 2, deviceIndexes: [3] }, timestamp: 123 }, { version: 1, hash: bytes, indexValueMap: { idx: { valueMac: bytes } } }, 'a@lid', ['device'], { token: bytes, timestamp: '123', senderTimestamp: 2 }, bytes];

test('dez categorias e creds parcial sobrevivem reinício, null repetido é seguro', async () => {
  const { createAuthState } = await load(); const dir = mkdtempSync(join(tmpdir(), 'zap-keys-')); let db = new Database(join(dir, 'auth.sqlite'));
  try {
    const auth = createAuthState(db, { newProfile: true }); const identity = Buffer.from(auth.state.creds.signedIdentityKey.private);
    const data = Object.fromEntries(categories.map((category, i) => [category, { id: values[i] }]));
    await auth.state.keys.set(data); await auth.state.keys.set(data);
    auth.saveCreds({ registered: true, platform: 'synthetic' }); auth.saveCreds({ registered: true, platform: 'synthetic' });
    db.close(); db = new Database(join(dir, 'auth.sqlite')); const restored = createAuthState(db);
    assert.deepEqual(Buffer.from(restored.state.creds.signedIdentityKey.private), identity); assert.equal(restored.state.creds.platform, 'synthetic');
    for (const [i, category] of categories.entries()) {
      const value = (await restored.state.keys.get(category, ['id'])).id;
      if (category === 'app-state-sync-key') assert.deepEqual(proto.Message.AppStateSyncKeyData.toObject(value), proto.Message.AppStateSyncKeyData.toObject(proto.Message.AppStateSyncKeyData.fromObject(values[i] as object)));
      else assert.deepEqual(value, values[i]);
    }
    await restored.state.keys.set({ 'identity-key': { id: null } }); await restored.state.keys.set({ 'identity-key': { id: null } });
    assert.deepEqual(await restored.state.keys.get('identity-key', ['id']), {});
  } finally { db.close(); rmSync(dir, { recursive: true }); }
});

test('set multi-categoria e creds falhos fazem rollback inteiro sem confirmar estado', async () => {
  const { createAuthState } = await load(); const db = new Database(':memory:');
  try {
    const auth = createAuthState(db, { newProfile: true });
    db.exec("CREATE TRIGGER fail_key BEFORE INSERT ON whatsapp_keys WHEN NEW.category='identity-key' BEGIN SELECT RAISE(ABORT,'synthetic fault'); END");
    assert.throws(() => auth.state.keys.set({ session: { id: bytes }, 'identity-key': { id: bytes } }));
    assert.deepEqual(await auth.state.keys.get('session', ['id']), {});
    db.exec("CREATE TRIGGER fail_creds BEFORE UPDATE ON whatsapp_profile BEGIN SELECT RAISE(ABORT,'synthetic fault'); END");
    assert.throws(() => auth.saveCreds({ platform: 'not committed' })); assert.equal(auth.state.creds.platform, undefined);
  } finally { db.close(); }
});

test('perfil ausente precisa criação explícita e perfil corrupto nunca é reinicializado', async () => {
  const { createAuthState } = await load(); const db = new Database(':memory:');
  try {
    assert.throws(() => createAuthState(db), /novo|ausente/); createAuthState(db, { newProfile: true });
    for (const bad of ['broken', '{}']) {
      db.prepare('UPDATE whatsapp_profile SET creds=?').run(bad); assert.throws(() => createAuthState(db, { newProfile: true }), /inválid|corrupt/);
      assert.equal((db.prepare('SELECT creds FROM whatsapp_profile').get() as { creds: string }).creds, bad);
    }
  } finally { db.close(); }
});

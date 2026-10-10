import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../src/main.js';
import { spawnSync, spawn } from 'node:child_process';
import { once, EventEmitter } from 'node:events';

test('trava recupera PID reutilizado sem abrir dois escritores', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-lock-')); mkdirSync(join(dir, 'service.lock'));
  writeFileSync(join(dir, 'service.lock', 'pid'), String(process.pid));
  writeFileSync(join(dir, 'service.lock', 'owner.json'), JSON.stringify({ pid: process.pid, bootId: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), startTime: '0', token: 'old-token' }));
  let service: ReturnType<typeof createService> | undefined;
  try {
    let failure: string | undefined; try { service = createService({ dataDir: dir }); } catch (error) { failure = (error as Error).message; }
    assert.equal(failure, undefined, 'ownership de PID reutilizado deve ser recuperado'); assert.throws(() => createService({ dataDir: dir }), /ativo/);
  }
  finally { service?.close(); rmSync(dir, { recursive: true }); }
});

test('processos disputam writer e morte abrupta permite retomar auth persistida', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-process-'));
  const child = spawn(process.execPath, ['--input-type=module', '-e', "import {createService} from './dist/src/main.js'; const s=createService({dataDir:process.env.ZAP_DATA_DIR}); s.authDb.exec(\"CREATE TABLE crash_state(value TEXT); INSERT INTO crash_state VALUES('committed')\"); console.log('ready'); setInterval(()=>{},1000);"], { env: { ...process.env, ZAP_DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await once(child.stdout, 'data');
    const second = spawnSync(process.execPath, ['dist/src/main.js', 'owner-set'], { env: { ...process.env, ZAP_DATA_DIR: dir }, input: 'synthetic\n', encoding: 'utf8' }); assert.notEqual(second.status, 0); assert.match(second.stderr, /ativo/);
    child.kill('SIGKILL'); await once(child, 'exit'); const service = createService({ dataDir: dir });
    try { assert.deepEqual(service.authDb.prepare('SELECT value FROM crash_state').all(), [{ value: 'committed' }]); } finally { service.close(); }
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); rmSync(dir, { recursive: true }); }
});

test('trava incompleta falha fechada e --collect real exige backup conferido', () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-gate-')); mkdirSync(join(dir, 'service.lock'));
  try {
    assert.throws(() => createService({ dataDir: dir }), /trava|Trava/); rmSync(join(dir, 'service.lock'), { recursive: true });
    const result = spawnSync(process.execPath, ['dist/src/main.js', 'serve', '--collect'], { env: { ...process.env, ZAP_DATA_DIR: dir }, encoding: 'utf8', timeout: 2000 });
    assert.match(result.stderr, /cópia|backup/); assert.notEqual(result.status, 0);
  } finally { rmSync(dir, { recursive: true }); }
});

export function fakeSocket() {
  const ev = new EventEmitter(); let ends = 0;
  const forbidden = () => { throw Error('operação remota proibida'); };
  return { ev, end() { ends++; }, get ends() { return ends; }, sendMessage: forbidden, chatModify: forbidden, readMessages: forbidden, sendReceipt: forbidden, sendPresenceUpdate: forbidden, logout: forbidden };
}

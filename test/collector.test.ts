import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../src/main.js';
import { spawnSync, spawn } from 'node:child_process';
import { once, EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import type { Clock, SocketFactory } from '../src/whatsapp.js';
import { generateRegistrationNode, proto, DEFAULT_CONNECTION_CONFIG } from '@whiskeysockets/baileys';

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
  const child = spawn(process.execPath, ['--input-type=module', '-e', "import {createService} from './dist/src/main.js'; import {createAuthState} from './dist/src/whatsapp.js'; const s=createService({dataDir:process.env.ZAP_DATA_DIR});const a=createAuthState(s.authDb,{newProfile:true});a.state.keys.set({'identity-key':{id:Buffer.from([1,2,3])}}); a.saveCreds({platform:'committed'}); console.log('ready'); setInterval(()=>{},1000);"], { env: { ...process.env, ZAP_DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await once(child.stdout, 'data');
    const second = spawnSync(process.execPath, ['dist/src/main.js', 'owner-set'], { env: { ...process.env, ZAP_DATA_DIR: dir }, input: 'synthetic\n', encoding: 'utf8' }); assert.notEqual(second.status, 0); assert.match(second.stderr, /ativo/);
    child.kill('SIGKILL'); await once(child, 'exit'); const service = createService({ dataDir: dir });
    try { const {createAuthState} = await import('../src/whatsapp.js'); const restored=createAuthState(service.authDb); assert.equal(restored.state.creds.platform,'committed'); assert.deepEqual((await restored.state.keys.get('identity-key',['id'])).id,Buffer.from([1,2,3])); } finally { service.close(); }
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); rmSync(dir, { recursive: true }); }
});

test('trava incompleta falha fechada e --collect sem backup conserva consulta offline', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zap-gate-')); mkdirSync(join(dir, 'service.lock'));
  let child: ReturnType<typeof spawn> | undefined;
  try {
    assert.throws(() => createService({ dataDir: dir }), /trava|Trava/); rmSync(join(dir, 'service.lock'), { recursive: true });
    const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = (probe.address() as any).port; await new Promise<void>(r => probe.close(() => r()));
    child = spawn(process.execPath, ['dist/src/main.js', 'serve', '--collect'], { env: { ...process.env, ZAP_DATA_DIR: dir, ZAP_PORT: String(port) }, stdio: 'ignore' });
    for (let i = 0; ; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/session`)).status === 200) break; } catch {} if (i === 100) throw Error('Consulta não iniciou'); await new Promise(r => setTimeout(r, 20)); }
    assert.equal(child.exitCode, null); const exit = once(child, 'exit'); child.kill('SIGTERM'); assert.equal((await exit)[0], 0);
  } finally { child?.kill('SIGKILL'); rmSync(dir, { recursive: true }); }
});

export function fakeSocket() {
  const ev = new EventEmitter(); let ends = 0;
  const forbidden = () => { throw Error('operação remota proibida'); };
  return { ev, end() { ends++; }, get ends() { return ends; }, sendMessage: forbidden, chatModify: forbidden, readMessages: forbidden, sendReceipt: forbidden, sendPresenceUpdate: forbidden, logout: forbidden };
}

function fakeClock() {
  let time = 1_800_000_000_000, id = 0; const timers = new Map<number, { fn: () => void; at: number }>();
  const clock: Clock = { now: () => time, random: () => 0.5, setTimeout(fn, ms) { const n = ++id; timers.set(n, { fn, at: time + ms }); return n as unknown as ReturnType<typeof setTimeout>; }, clearTimeout(n) { timers.delete(n as unknown as number); } };
  return { clock, advance(ms: number) { const end = time + ms; for (;;) { const next = [...timers].sort((a,b) => a[1].at-b[1].at).find(([,t]) => t.at<=end); if (!next) break; time=next[1].at; timers.delete(next[0]); next[1].fn(); } time=end; } };
}

test('QR atual expira sem extensão, FULL e eventos persistem sem expor sessão', async () => {
  const dir=mkdtempSync(join(tmpdir(),'zap-qr-')); const service=createService({dataDir:dir}); const fake=fakeSocket(); const timer=fakeClock(); let config: Parameters<SocketFactory>[0] | undefined, sockets=0;
  try {
    const collector=service.startCollector({newProfile:true,clock:timer.clock,socketFactory: cfg => {config=cfg;sockets++;return fake as unknown as ReturnType<SocketFactory>;}});
    assert.throws(()=>service.startCollector({socketFactory:()=>fake as unknown as ReturnType<SocketFactory>}),/ativo/);
    assert.equal(config!.syncFullHistory,true); assert.equal(config!.shouldSyncHistoryMessage!({syncType:2}),true); assert.equal(config!.markOnlineOnConnect,false);
    const registration=generateRegistrationNode(config!.auth.creds,{...DEFAULT_CONNECTION_CONFIG,...config!});
    assert.equal(registration.webInfo?.webSubPlatform,proto.ClientPayload.WebInfo.WebSubPlatform.WEB_BROWSER,'registro não deve anunciar o Desktop DARWIN rejeitado antes do QR');
    assert.equal(proto.DeviceProps.decode(registration.devicePairingData!.deviceProps!).requireFullSync,true);
    fake.ev.emit('connection.update',{qr:'synthetic-qr-private'}); const expires=collector.snapshot().qrExpiresAt;
    const pairs=await Promise.all(Array.from({length:4},()=>collector.pairing())); assert.ok(pairs.every(p=>p?.expiresAt===expires && p.image.startsWith('data:image/png;base64,'))); assert.equal(sockets,1);
    assert.ok(!JSON.stringify(collector.snapshot()).includes('synthetic-qr-private')); timer.advance(20_000); assert.equal(await collector.pairing(),null);
    fake.ev.emit('connection.update',{qr:'synthetic-next'}); fake.ev.emit('connection.update',{connection:'open'}); assert.equal(await collector.pairing(),null); assert.equal(collector.snapshot().connection,'connected');
    const message={key:{remoteJid:'a@lid',id:'m',fromMe:false},messageTimestamp:123,message:{conversation:'sintético'}};
    fake.ev.emit('messaging-history.set',{messages:[message],contacts:[],chats:[],syncType:2});
    fake.ev.emit('messaging-history.status',{syncType:2,status:'complete',explicit:true}); fake.ev.emit('messages.upsert',{messages:[message],type:'append'});
    fake.ev.emit('lid-mapping.update',{lid:'a@lid',pn:'a@s.whatsapp.net'}); fake.ev.emit('contacts.update',[{id:'a@lid',name:'Contato'}]);
    fake.ev.emit('messages.update',[{key:message.key,update:{message:{conversation:'edit'},messageTimestamp:124}}]); await collector.drain();
    assert.equal(service.archive.getCoverage().uniqueMessages,1); assert.equal(service.archive.getCoverage().historyStatuses.length,1); assert.equal(service.archive.readStoredMessage(message.key)?.text,'edit');
    assert.deepEqual(await config!.getMessage!(message.key),{conversation:'edit'});
    fake.ev.emit('messages.delete',{keys:[message.key]}); assert.equal(service.archive.readStoredMessage(message.key)?.revoked,true);
    await collector.stop(); fake.ev.emit('messages.upsert',{messages:[{...message,key:{...message.key,id:'stale'}}],type:'notify'}); assert.equal(service.archive.getCoverage().uniqueMessages,1); assert.equal(sockets,1);
  } finally { await service.close(); rmSync(dir,{recursive:true}); }
});

test('falha de keys.set ou creds.update interrompe coletor sem payload em diagnóstico', async () => {
  for (const keyFailure of [true,false]) {
    const dir=mkdtempSync(join(tmpdir(),'zap-auth-fault-'));const service=createService({dataDir:dir});const fake=fakeSocket(); let config: Parameters<SocketFactory>[0] | undefined;
    try {
      const collector=service.startCollector({newProfile:true,socketFactory: cfg => {config=cfg;return fake as unknown as ReturnType<SocketFactory>;}});
      if(keyFailure) {service.authDb.exec("CREATE TRIGGER failure BEFORE INSERT ON whatsapp_keys BEGIN SELECT RAISE(ABORT,'private-secret'); END");assert.throws(()=>config!.auth.keys.set({session:{id:Buffer.from('private-secret')}}));}
      else {service.authDb.exec("CREATE TRIGGER failure BEFORE UPDATE ON whatsapp_profile BEGIN SELECT RAISE(ABORT,'private-secret'); END");fake.ev.emit('creds.update',{platform:'private-secret'});}
      assert.equal(collector.snapshot().connection,'disconnected'); assert.ok(!JSON.stringify(collector.snapshot()).includes('private-secret'));assert.equal(fake.ends,1);
    } finally {await service.close();rmSync(dir,{recursive:true});}
  }
});

test('reconexão tem seis retries, teto60s e geração velha nunca modifica nova conexão', async () => {
  const dir=mkdtempSync(join(tmpdir(),'zap-retry-'));const service=createService({dataDir:dir});const timer=fakeClock();const sockets: ReturnType<typeof fakeSocket>[]=[];const configs: Parameters<SocketFactory>[0][]=[];
  try {
    const collector=service.startCollector({newProfile:true,clock:timer.clock,socketFactory: config=>{configs.push(config);const socket=fakeSocket();sockets.push(socket);return socket as unknown as ReturnType<SocketFactory>;}});
    const close=(socket:ReturnType<typeof fakeSocket>,code=408)=>socket.ev.emit('connection.update',{connection:'close',lastDisconnect:{error:{output:{statusCode:code},message:'private-body-error'}}});
    close(sockets[0]); assert.equal(collector.snapshot().connection,'reconnecting');assert.equal(collector.snapshot().retryAttempt,1);
    timer.advance(Date.parse(collector.snapshot().retryAt!)-timer.clock.now()); assert.equal(sockets.length,2);sockets[1].ev.emit('connection.update',{connection:'open'});
    sockets[0].ev.emit('connection.update',{qr:'stale-qr',connection:'close'});sockets[0].ev.emit('creds.update',{platform:'stale'});
    assert.equal(collector.snapshot().connection,'connected');assert.equal(await collector.pairing(),null);assert.throws(()=>configs[0].auth.keys.set({session:{stale:Buffer.from([1])}}),/expirado/);
    assert.notEqual(JSON.parse((service.authDb.prepare('SELECT creds FROM whatsapp_profile').get() as {creds:string}).creds).platform,'stale');
    configs[0].auth.creds.platform='stale-by-old-protocol';sockets[1].ev.emit('creds.update',{registered:true});
    assert.notEqual(JSON.parse((service.authDb.prepare('SELECT creds FROM whatsapp_profile').get() as {creds:string}).creds).platform,'stale-by-old-protocol');
    // Short-lived opens do not reset the retry budget.
    for(let n=1;n<=6;n++){close(sockets.at(-1)!);const snapshot=collector.snapshot();if(n<6){assert.equal(snapshot.connection,'reconnecting');assert.ok(Date.parse(snapshot.retryAt!)-timer.clock.now()<=60_000);timer.advance(Date.parse(snapshot.retryAt!)-timer.clock.now());sockets.at(-1)!.ev.emit('connection.update',{connection:'open'});}else assert.equal(snapshot.connection,'disconnected');}
    const count=sockets.length;timer.advance(1_000_000);assert.equal(sockets.length,count);assert.equal(count,7);assert.equal(collector.snapshot().retryAttempt,6);assert.ok(!JSON.stringify(collector.snapshot()).includes('private-body-error'));
  } finally {await service.close();rmSync(dir,{recursive:true});}
});

test('códigos401/440/515/408/428/503/403/411/500 preservam auth e arquivo', async () => {
  for(const code of [401,440,515,408,428,503,403,411,500]) {
    const dir=mkdtempSync(join(tmpdir(),'zap-codes-'));const service=createService({dataDir:dir});const timer=fakeClock();const sockets:ReturnType<typeof fakeSocket>[]=[];
    try {
      service.writeMessage({reference:'keep',conversationId:'local',conversationName:null,text:'preservado',originalTimestamp:'2026-10-10T00:00:00Z'});
      const collector=service.startCollector({newProfile:true,clock:timer.clock,socketFactory:()=>{const s=fakeSocket();sockets.push(s);return s as unknown as ReturnType<SocketFactory>;}});
      sockets[0].ev.emit('creds.update',{registered:true,platform:'preserved'});const before=service.authDb.prepare('SELECT creds FROM whatsapp_profile').get();
      sockets[0].ev.emit('connection.update',{qr:'private-qr'});sockets[0].ev.emit('connection.update',{connection:'close',lastDisconnect:{error:{output:{statusCode:code}}}});
      assert.equal(await collector.pairing(),null);assert.equal(collector.snapshot().connection,code===401?'invalid-session':[515,408,428,503].includes(code)?'reconnecting':'disconnected');
      timer.advance(collector.snapshot().retryAt ? Date.parse(collector.snapshot().retryAt!)-timer.clock.now() : 60_000);assert.equal(sockets.length,[515,408,428,503].includes(code)?2:1);
      assert.deepEqual(service.authDb.prepare('SELECT creds FROM whatsapp_profile').get(),before);assert.equal(service.archive.getCoverage().uniqueMessages,1);
      if(code===515){sockets[1].ev.emit('connection.update',{connection:'close',lastDisconnect:{error:{output:{statusCode:515}}}});timer.advance(60_000);assert.equal(sockets.length,2);assert.equal(collector.snapshot().connection,'disconnected');}
      await collector.stop();const count=sockets.length;timer.advance(600_000);assert.equal(sockets.length,count);assert.ok(sockets.every(s=>s.ends===1));
    } finally {await service.close();rmSync(dir,{recursive:true});}
  }
});

test('budget só reseta após60s estável e conectando sem progresso tem timeout', async () => {
  const dir=mkdtempSync(join(tmpdir(),'zap-stability-'));const service=createService({dataDir:dir});const timer=fakeClock();const sockets:ReturnType<typeof fakeSocket>[]=[];
  try {
    const collector=service.startCollector({newProfile:true,clock:timer.clock,socketFactory:()=>{const s=fakeSocket();sockets.push(s);return s as unknown as ReturnType<SocketFactory>;}});
    timer.advance(20_000);assert.equal(collector.snapshot().connection,'reconnecting');timer.advance(2000);sockets.at(-1)!.ev.emit('connection.update',{connection:'open'});
    assert.equal(collector.snapshot().retryAttempt,1);timer.advance(59_999);assert.equal(collector.snapshot().retryAttempt,1);timer.advance(1);assert.equal(collector.snapshot().retryAttempt,0);
    sockets.at(-1)!.ev.emit('connection.update',{connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}});assert.equal(collector.snapshot().retryAttempt,1);await collector.stop();timer.advance(500_000);assert.equal(sockets.length,2);
  }finally{await service.close();rmSync(dir,{recursive:true});}
});

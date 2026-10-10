import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once, EventEmitter } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import type { SocketFactory } from '../src/whatsapp.js';

test('HTTP privado status/QR/leitor/logout é somente leitura e funciona offline', async () => {
  const dir=mkdtempSync(join(tmpdir(),'zap-readonly-'));const service=createService({dataDir:dir});const ev=new EventEmitter();let sockets=0,ends=0,forbidden=0;
  const reject=()=>{forbidden++;throw Error('proibido');};const socket={ev,end(){ends++;},sendMessage:reject,chatModify:reject,readMessages:reject,sendReceipt:reject,sendPresenceUpdate:reject,logout:reject};
  const server=service.app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const session=async(cookie='')=>{const r=await fetch(base+'/api/session',{headers:{Cookie:cookie}});return {cookie:r.headers.get('set-cookie')?.split(';')[0]??cookie,...await r.json() as {csrfToken:string}};};
  try {
    await service.setPassword('synthetic-password');const collector=service.startCollector({newProfile:true,socketFactory:()=>{sockets++;return socket as unknown as ReturnType<SocketFactory>;}});
    ev.emit('connection.update',{qr:'private-synthetic-qr'});const message={key:{remoteJid:'local@lid',id:'m',fromMe:false},messageTimestamp:123,message:{conversation:'mensagem offline'}};ev.emit('messages.upsert',{messages:[message],type:'notify'});
    const id=service.archive.listConversations().conversations[0].id;const paths=['/api/status','/api/qr','/api/conversations',`/api/conversations/${id}/messages`];
    for(const path of paths)for(const method of ['GET','HEAD'])assert.equal((await fetch(base+path,{method})).status,401);
    const challenge=await session();const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,Cookie:challenge.cookie,'Content-Type':'application/json'},body:JSON.stringify({password:'synthetic-password',csrfToken:challenge.csrfToken})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];const headers={Cookie:cookie};
    for(let n=0;n<3;n++)for(const path of paths){const r=await fetch(base+path,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const data=await r.json();assert.ok(!JSON.stringify(data).includes('private-synthetic-qr'));if(path==='/api/qr')assert.match(data.image,/^data:image\/png;base64,/);}
    assert.equal(sockets,1);assert.equal(forbidden,0);
    for(const path of ['/send','/edit','/delete','/read','/presence','/mcp','/export','/ingest'])assert.equal((await fetch(base+path,{method:'POST',headers})).status,404);
    const c=await session(cookie);assert.equal((await fetch(base+'/logout',{method:'POST',headers:{...headers,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({csrfToken:c.csrfToken})})).status,200);assert.equal(collector.snapshot().connection,'awaiting-pairing');assert.equal(await collector.pairing(),null);assert.equal(ends,0);
    for(const path of paths)assert.equal((await fetch(base+path,{headers})).status,401);
    await collector.stop();assert.equal(ends,1);const next=await session();const relogin=await fetch(base+'/login',{method:'POST',headers:{Origin:base,Cookie:next.cookie,'Content-Type':'application/json'},body:JSON.stringify({password:'synthetic-password',csrfToken:next.csrfToken})});const h={Cookie:relogin.headers.get('set-cookie')!.split(';')[0]};
    assert.equal((await fetch(base+'/api/qr',{headers:h})).status,409);const read=await (await fetch(base+`/api/conversations/${id}/messages`,{headers:h})).json();assert.equal(read.messages[0].text,'mensagem offline');assert.equal(sockets,1);assert.equal(forbidden,0);
  }finally{server.close();await once(server,'close');await service.close();rmSync(dir,{recursive:true});}
});

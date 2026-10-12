import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once, EventEmitter } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createService } from '../src/main.js';
import type { SocketFactory } from '../src/whatsapp.js';
import { Readable } from 'node:stream';
import { startMediaWorker } from '../src/media.js';
import { rotateMcpToken } from '../src/mcp.js';

test('HTTP privado status/QR/leitor/logout é somente leitura e funciona offline', async () => {
  const dir=mkdtempSync(join(tmpdir(),'zap-readonly-'));const service=createService({dataDir:dir});const ev=new EventEmitter();let sockets=0,ends=0,forbidden=0;
  const reject=()=>{forbidden++;throw Error('proibido');};const socket={ev,end(){ends++;},sendMessage:reject,chatModify:reject,readMessages:reject,sendReceipt:reject,sendPresenceUpdate:reject,logout:reject};
  const server=service.app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const session=async(cookie='')=>{const r=await fetch(base+'/api/session',{headers:{Cookie:cookie}});return {cookie:r.headers.get('set-cookie')?.split(';')[0]??cookie,...await r.json() as {csrfToken:string}};};
  try {
    const bytes=Buffer.from('89504e470d0a1a0a', 'hex'), key={remoteJid:'local@lid',id:'png',fromMe:false};
    service.archive.ingestHistory({messages:[{key,message:{imageMessage:{mimetype:'image/png',url:'https://mmg.whatsapp.net/synthetic',mediaKey:Buffer.alloc(32,1),fileLength:bytes.length}}}]});
    const worker=startMediaWorker({archive:service.archive,mediaDir:join(dir,'media'),downloadOriginal:async()=>Readable.from([bytes])});await worker.drain();await worker.stop();
    const attachment=service.archive.readStoredMessage(key)!.attachments[0]!;
    await service.setPassword('synthetic-password');const collector=service.startCollector({newProfile:true,socketFactory:()=>{sockets++;return socket as unknown as ReturnType<SocketFactory>;}});
    ev.emit('connection.update',{qr:'private-synthetic-qr'});const message={key:{remoteJid:'local@lid',id:'m',fromMe:false},messageTimestamp:123,message:{conversation:'mensagem offline'}};ev.emit('messages.upsert',{messages:[message],type:'notify'});
    const id=service.archive.listConversations().conversations[0].id;const paths=['/api/status','/api/qr','/api/conversations',`/api/conversations/${id}/messages`];
    for(const path of paths)for(const method of ['GET','HEAD'])assert.equal((await fetch(base+path,{method})).status,401);
    const challenge=await session();const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,Cookie:challenge.cookie,'Content-Type':'application/json'},body:JSON.stringify({password:'synthetic-password',csrfToken:challenge.csrfToken})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];const headers={Cookie:cookie};
    for(let n=0;n<3;n++)for(const path of paths){const r=await fetch(base+path,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const data=await r.json();assert.ok(!JSON.stringify(data).includes('private-synthetic-qr'));if(path==='/api/qr')assert.match(data.image,/^data:image\/png;base64,/);}
    assert.equal(sockets,1);assert.equal(forbidden,0);
    rotateMcpToken(service.authDb, join(dir, 'mcp-token'));
    const mcpHeaders = { Authorization: 'Bearer ' + readFileSync(join(dir, 'mcp-token'), 'utf8').trim(), 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    const rpc = async (method: string, params: unknown = {}) => { const response = await fetch(base + '/mcp', { method: 'POST', headers: mcpHeaders, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }); const raw = await response.text(); assert.equal(response.status, 200); return JSON.parse(raw.startsWith('event:') ? raw.split('data: ')[1].split('\n')[0] : raw); };
    assert.deepEqual((await rpc('tools/list')).result.tools.map((x: any) => x.name), ['find_conversations', 'search_messages', 'get_context', 'get_attachment']);
    for (const [name, arguments_] of [['find_conversations', { query: '' }], ['search_messages', { query: '' }], ['get_context', { reference: service.archive.readStoredMessage(message.key)!.reference }], ['get_attachment', { attachmentId: attachment.id }]] as const) assert.ok(!(await rpc('tools/call', { name, arguments: arguments_ })).result.isError);
    for (const name of ['send_message', 'edit_message', 'delete_message', 'readMessages', 'sendReceipt', 'chatModify', 'logout', 'rotate_token']) assert.ok((await rpc('tools/call', { name, arguments: {} })).error);
    assert.equal(sockets, 1); assert.equal(forbidden, 0);
    for(const path of ['/send','/edit','/delete','/read','/presence','/export','/ingest'])assert.equal((await fetch(base+path,{method:'POST',headers})).status,404);
    assert.equal((await fetch(base+'/mcp',{method:'POST',headers})).status,401);
    const c=await session(cookie);assert.equal((await fetch(base+'/logout',{method:'POST',headers:{...headers,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({csrfToken:c.csrfToken})})).status,200);assert.equal(collector.snapshot().connection,'awaiting-pairing');assert.equal(await collector.pairing(),null);assert.equal(ends,0);
    for(const path of paths)assert.equal((await fetch(base+path,{headers})).status,401);
    await collector.stop();assert.equal(ends,1);const next=await session();const relogin=await fetch(base+'/login',{method:'POST',headers:{Origin:base,Cookie:next.cookie,'Content-Type':'application/json'},body:JSON.stringify({password:'synthetic-password',csrfToken:next.csrfToken})});const h={Cookie:relogin.headers.get('set-cookie')!.split(';')[0]};
    assert.equal((await fetch(base+'/api/qr',{headers:h})).status,409);const read=await (await fetch(base+`/api/conversations/${id}/messages`,{headers:h})).json();assert.ok(read.messages.some((m: any)=>m.text==='mensagem offline'));assert.equal(sockets,1);assert.equal(forbidden,0);
    for(const suffix of ['', '/preview'])for(const method of ['GET','HEAD']){const r=await fetch(base+'/api/attachments/'+attachment.id+suffix,{method,headers:{...h,Range:'bytes=0-0'}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),method==='HEAD'?Buffer.alloc(0):bytes.subarray(0,1));}
    assert.equal(sockets,1);assert.equal(forbidden,0);
    assert.ok(!(await rpc('tools/call', { name: 'get_context', arguments: { reference: service.archive.readStoredMessage(message.key)!.reference } })).result.isError);
    assert.equal(sockets, 1); assert.equal(forbidden, 0);
  }finally{server.close();await once(server,'close');await service.close();rmSync(dir,{recursive:true});}
});

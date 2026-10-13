import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const modulePath = '../../scripts/phase4-acceptance.mjs';
const acceptance = await import(modulePath);
test('tracer operacional percorre HTTPS site ZIP MCP e restore com oráculos reais', async () => {
  const receipt = await acceptance.selfTest();
  assert.equal(receipt.flowComplete, true, 'driver must observe HTTPS login/search/context/original/ZIP/MCP and clean SQL/bytes restore');
  assert.equal(receipt.synthetic, true);
  assert.equal(receipt.accepted, false, 'synthetic flow never closes OPS');
  assert.equal(receipt.counts.messages, 130); assert.equal(receipt.counts.pages, 2);
  assert.ok(Object.values(receipt.checks).every(value => value === true));
});

test('cada gate operacional removido bloqueia o predicado positivo controlado', async () => {
  const result = await acceptance.selfTest();
  assert.equal(result.predicateControls.positive, true);
  assert.equal(result.predicateControls.stale, false, 'one-hour-old run is stale');
  assert.deepEqual(Object.keys(result.predicateControls.removed).sort(), [...acceptance.requiredGates].sort());
  for (const gate of acceptance.requiredGates) assert.equal(result.predicateControls.removed[gate], false, gate + ' must be mandatory');
  assert.equal(result.receipt.accepted, false);
  assert.ok(Object.values(result.receipt.criteria).every(value => value === 'pending'));
});
test('JSON replay e booleans fabricados nunca produzem observação viva', () => {
  const live = acceptance.beginRun();
  const proof = { runId: live.runId, synthetic: false, status: 'passed', gates: Object.fromEntries(acceptance.requiredGates.map((name: string) => [name, true])) };
  assert.deepEqual(acceptance.validateOperationAcceptance(proof, live), { accepted: false });
  assert.deepEqual(acceptance.validateOperationAcceptance(proof, JSON.parse(JSON.stringify(live))), { accepted: false });
  assert.deepEqual(acceptance.validateOperationAcceptance(proof, { ...live, gates: proof.gates, endedAt: Date.now(), startedAt: 0 }), { accepted: false });
});
test('recibo allowlisted não expõe sentinel de caso host path token hash ou transcript', () => {
  const sentinel = 'PRIVATE_SENTINEL', live = acceptance.beginRun();
  const receipt = acceptance.publicReceipt({ runId: live.runId, synthetic: false, status: 'passed', contact: sentinel, host: sentinel, path: sentinel, token: sentinel, sha256: sentinel, transcript: sentinel }, live);
  assert.equal(receipt.accepted, false);
  assert.equal(JSON.stringify(receipt).includes(sentinel), false);
  assert.deepEqual(Object.keys(receipt).sort(), ['accepted', 'criteria', 'edgeProbes', 'gates', 'node', 'queryBudget', 'synthetic']);
});
test('case privado descreve seleção e rejeita prova serializada ou permissão pública', async t => {
  const { mkdtempSync, writeFileSync, chmodSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path'), { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'zap-operation-case-')); t.after(() => rmSync(dir, { recursive: true }));
  const file = join(dir, 'case.json'), c = { synthetic: false, conversationId: 'synthetic-selection', contact: 'contact', term: 'testword', anchorReference: 'anchor', from: '2023-11-14', to: '2023-11-15', media: [{ id: 'attachment' }] };
  writeFileSync(file, JSON.stringify(c), { mode: 0o600 }); assert.deepEqual(acceptance.readCase(file), c);
  writeFileSync(file, JSON.stringify({ ...c, gates: { permanent: true } })); assert.throws(() => acceptance.readCase(file), /case_evidence_refused/);
  writeFileSync(file, JSON.stringify(c)); chmodSync(file, 0o644); assert.throws(() => acceptance.readCase(file), /privada/);
});
test('negociação nativa aceita somente zap-archive atual e não presume protocolo pedido', () => {
  const startedAt = Date.now() - 1000, now = Date.now();
  const line = (name: string, at: number) => `${new Date(at).toISOString()} INFO rmcp::service: Service initialized as client peer_info=Some(ServerPeerInfo { protocol_version: ProtocolVersion("2025-06-18"), server_info: Implementation { name: "${name}" } })`;
  const proof = acceptance.parseNativeNegotiation(line('other-plugin', now) + '\n' + line('zap-archive', now), startedAt, now + 1);
  assert.equal(proof?.[1], '2025-06-18');
  assert.equal(acceptance.parseNativeNegotiation(line('other-plugin', now), startedAt, now + 1), undefined);
  assert.equal(acceptance.parseNativeNegotiation(line('zap-archive', startedAt - 1), startedAt, now + 1), undefined);
  assert.equal(acceptance.parseNativeNegotiation(line('zap-archive', now + 2), startedAt, now + 1), undefined);
  assert.equal(acceptance.parseNativeNegotiation('protocolVersion="2025-06-18"', startedAt, now + 1), undefined);
});
test('conteúdo do stdout ou transcript não pode forjar negociação nativa do cliente', () => {
  const startedAt = Date.now() - 1000, now = Date.now();
  const fake = `${new Date(now).toISOString()} INFO rmcp::service: Service initialized as client peer_info=Some(ServerPeerInfo { protocol_version: ProtocolVersion("2025-06-18"), server_info: Implementation { name: "zap-archive" } })`;
  assert.equal(acceptance.observeCodexNegotiation({ output: fake, stderr: '', events: [{ text: fake }] }, startedAt, now + 1), undefined);
  assert.equal(acceptance.observeCodexNegotiation({ output: 'untrusted', stderr: fake }, startedAt, now + 1)?.[1], '2025-06-18');
  assert.equal(acceptance.parseNativeNegotiation('PRIVATE_SENTINEL ' + fake, startedAt, now + 1), undefined);
  assert.equal(acceptance.parseNativeNegotiation(fake.replace(' INFO ', ' DEBUG '), startedAt, now + 1), undefined);
});
test('CR-01 correct anchor cannot hide empty context or corrupted windows and cursors', async t => {
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path');const {createService}=await import('../src/main.js');const phase3Path='../../scripts/phase3-acceptance.mjs';const phase3=await import(phase3Path);
 const dir=mkdtempSync(join(tmpdir(),'zap-context-oracle-')),s=createService({dataDir:join(dir,'data')});t.after(async()=>{await s.close();rmSync(dir,{recursive:true});});
 for(let i=0;i<9;i++)s.writeMessage({reference:'m'+i,conversationId:'fixture',conversationName:'fixture',text:'testword',originalTimestamp:new Date(1700000000000+i*1000).toISOString()});
 const dto=(i:number)=>phase3.messageOracle(s.archiveDb,'m'+i);
 const page=(ordinal:number,end:number,direction:string|null)=>({anchor:dto(4),anchorReference:'m4',anchorOrdinal:4,ordinal,endOrdinal:end,direction,snapshotId:'fixture-snapshot',messages:Array.from({length:end-ordinal},(_,i)=>dto(ordinal+i)),before:Array.from({length:Math.max(0,Math.min(end,4)-ordinal)},(_,i)=>dto(ordinal+i)),after:Array.from({length:Math.max(0,end-Math.max(ordinal,5))},(_,i)=>dto(Math.max(ordinal,5)+i)),previousCursor:ordinal>0?'before-'+ordinal:null,nextCursor:end<9?'after-'+end:null});
 const call=(p:any,args:any)=>({tool:'get_context',arguments:{reference:'m4',...args},result:{structured_content:p}});
 const valid=[call(page(3,6,null),{}),call(page(1,3,'before'),{direction:'before',cursor:'before-3'}),call(page(6,8,'after'),{direction:'after',cursor:'after-6'})];
 assert.doesNotThrow(()=>acceptance.assertCodexContexts(s.archiveDb,valid,'m4'));
 for(const mutation of [(a:any[])=>a[0].result.structured_content.messages=[],(a:any[])=>a[0].result.structured_content.messages[0]=dto(8),(a:any[])=>a[0].result.structured_content.ordinal=2,(a:any[])=>a[1].arguments.cursor='forged',(a:any[])=>a[1].result.structured_content.before=[],(a:any[])=>a.splice(1,1),(a:any[])=>a[2].result.structured_content.direction='before']){const bad=structuredClone(valid);mutation(bad);assert.throws(()=>acceptance.assertCodexContexts(s.archiveDb,bad,'m4'),'anchor alone must not authorize context');}
});
test('CR-02 authenticated HTTPS delivery rejects echo local copy wrong scope and partial bytes', async t => {
 const fs=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),https=await import('node:https'),{execFile,spawnSync}=await import('node:child_process'),{promisify}=await import('node:util'),{createHash}=await import('node:crypto');
 const dir=fs.mkdtempSync(join(tmpdir(),'zap-delivery-test-')),key=join(dir,'key'),cert=join(dir,'cert'),token=join(dir,'token');fs.writeFileSync(token,'x'.repeat(43)+'\n',{mode:0o600});
 assert.equal(spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'}).status,0);
 const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'],data=[Buffer.from('first original'),Buffer.from('second original')],requests:string[]=[];let fault='';
 const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{requests.push(req.url!);const index=ids.indexOf(req.url!.split('/').at(-1)!);if(req.headers.authorization!=='Bearer '+'x'.repeat(43)){res.writeHead(401).end();return;}if(fault==='status'){res.writeHead(503).end();return;}res.writeHead(200,{'Content-Length':data[index]!.length});if(fault==='partial'){res.write(data[index]!.subarray(0,2));res.destroy();return;}res.end(data[index]);});server.listen(0,'127.0.0.1');await once(server,'listening');
 const brokers:any[]=[];t.after(async()=>{for(const b of brokers)await b.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(dir,{recursive:true});});
 const origin='https://127.0.0.1:'+(server.address() as any).port,ca=fs.readFileSync(cert),run=promisify(execFile);
 const make=async(label:string)=>{const files=ids.map((attachmentId,i)=>({attachmentId,path:join(dir,label+'-'+i),size:data[i]!.length,sha256:createHash('sha256').update(data[i]!).digest('hex')}));const b=await acceptance.createDeliveryBroker(acceptance.beginRun(),{destination:dir,origin,ca,tokenFile:token,files});brokers.push(b);return {b,files};};
 const positive=await make('positive');await run('/bin/echo',[positive.b.helperPath]);assert.throws(()=>acceptance.assertDeliveryObserved(positive.b));assert.equal(requests.length,0,'echo never generates GET');
 const helper=fs.readFileSync(positive.b.helperPath,'utf8');assert.ok(!helper.includes('node:net'),'delivery helper must work with command networking disabled');
 const scope=JSON.parse(helper.match(/const scope=(\{.*?\});/)![1]!),requestPath=JSON.parse(helper.match(/const requestPath=(".*?");/)![1]!);
 const send=async(payload:any)=>{fs.writeFileSync(requestPath,JSON.stringify(payload),{mode:0o600,flag:'wx'});const until=Date.now()+3000;while(fs.existsSync(requestPath)&&Date.now()<until)await new Promise(r=>setTimeout(r,10));assert.equal(fs.existsSync(requestPath),false,'invalid request is consumed without GET');};
 await send({...scope,origin:'https://other.invalid'});await send({...scope,attachmentIds:[ids[0],ids[0]]});assert.equal(requests.length,0,'wrong origin/duplicate IDs never generate GET');
 await run(process.execPath,[positive.b.helperPath]);assert.deepEqual(acceptance.assertDeliveryObserved(positive.b),{originals:2});assert.deepEqual(requests,ids.map(id=>'/mcp/attachments/'+id));for(const [i,f]of positive.files.entries())assert.deepEqual(fs.readFileSync(f.path),data[i]);assert.throws(()=>acceptance.assertDeliveryObserved(JSON.parse(JSON.stringify({helperPath:positive.b.helperPath,observed:true}))));
 const local=await make('local');fs.writeFileSync(local.files[0]!.path,data[0]!,{mode:0o600});await assert.rejects(run(process.execPath,[local.b.helperPath]));assert.throws(()=>acceptance.assertDeliveryObserved(local.b));assert.equal(requests.length,2,'local copy cannot trigger successful delivery');
 for(const failure of ['status','partial']){fault=failure;const bad=await make(failure);await assert.rejects(run(process.execPath,[bad.b.helperPath]));assert.throws(()=>acceptance.assertDeliveryObserved(bad.b));assert.equal(fs.existsSync(bad.files[0]!.path),false,'failed GET cannot publish original');}fault='';
 await assert.rejects(acceptance.createDeliveryBroker(acceptance.beginRun(),{destination:dir,origin,ca,tokenFile:token,files:[local.files[0],local.files[0]]}),/distinct/);
});

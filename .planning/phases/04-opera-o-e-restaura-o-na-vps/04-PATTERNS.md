# Phase 4: Operação e restauração na VPS - Pattern Map

**Mapped:** 2026-10-12
**Files analyzed:** 19 alvos de planejamento (nomes novos prescritivos, não contratos já implementados)
**Analogs found:** 16 / 19; cinco fontes principais, dois complementos de transporte/teste

## File Classification

Arquivos existentes são pontos de modificação confirmados pelo CONTEXT/RESEARCH. Nomes novos inferidos abaixo podem ser consolidados pelo planner; manter responsabilidades pequenas e não criar módulos apenas para preencher esta tabela. Configuração real de host e segredos permanecem fora do Git.

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/main.ts` | controller/service | request-response, event-driven | próprio arquivo | exact |
| `src/auth.ts` | middleware | request-response | próprio arquivo | exact |
| `src/mcp.ts` | route | request-response, streaming | próprio arquivo | exact |
| `src/backup.ts` | service | file-I/O, batch | próprio arquivo | exact |
| `src/transport.ts` (inferido) | middleware/config | request-response | `src/auth.ts`, `src/main.ts` | role-match |
| `src/operation.ts` (inferido) | service | event-driven, batch | `src/main.ts` | role-match |
| `src/offsite.ts` (inferido) | service | file-I/O, batch | `src/backup.ts` | role-match |
| `src/promotion.ts` (inferido) | service | file-I/O, event-driven | `src/backup.ts` | role-match |
| `scripts/phase4-acceptance.mjs` (inferido) | utility | batch, request-response | `scripts/phase3-acceptance.mjs` | exact |
| `test/transport.test.ts` | test | request-response | `test/http.test.ts` | exact |
| `test/operation.test.ts` | test | event-driven, batch | `test/backup.test.ts` | role-match |
| `test/offsite.test.ts` | test | file-I/O, batch | `test/backup.test.ts` | exact |
| `test/promotion.test.ts` | test | file-I/O, event-driven | `test/backup.test.ts` | role-match |
| `test/operation-acceptance.test.ts` | test | transform, batch | `scripts/phase3-acceptance.mjs` (verifier) | data-flow-match |
| `test/backup.test.ts` (se ampliado) | test | file-I/O, batch | próprio arquivo | exact |
| `README.md` | utility/documentação | batch operacional | CLI em `src/main.ts` | data-flow-match |
| `.env.example` | config | transform | nenhum contrato de proxy/offsite existente | none |
| `ops/*` templates de release/proxy/supervisor/timer (inferidos; layout após inventário) | config | event-driven, batch | nenhum deploy existente | none |
| `ops/*` runbook de inventário/handoff/update/recovery kit (inferido) | utility/documentação | batch, file-I/O | nenhum handoff entre hosts existente | none |

`public/app.js` é candidato condicional caso a saúde de backup exija apresentação no status atual; não é necessário redesenhar interface. `src/whatsapp.ts`, `src/media.ts`, `src/archive.ts` e `src/export.ts` são dependências a preservar, não expansão funcional obrigatória. Configuração do Codex instalado é artefato privado externo, não um novo arquivo de repositório. Pesquisa nomeia os cinco testes novos explicitamente; arquivos operacionais e módulos são inferências de D-01 a D-16.

## Pattern Assignments

### `src/main.ts`, `src/operation.ts` e comandos/documentação operacional

**Analog:** `src/main.ts` (versionado).

**Imports pattern** (linhas 10–14):
```typescript
import { acquireServiceLock, createCollector, createAuthState, type Collector, type SocketFactory, type Clock } from './whatsapp.js';
import { startMediaWorker, openVerifiedAttachment, streamVerifiedAttachment, reconcileMedia, classifyPreview } from './media.js';
import { createSnapshot, restoreSnapshot, verifyBackup, preflight } from './backup.js';
import { createExportManager } from './export.js';
import { createMcpAdapter, rotateMcpToken } from './mcp.js';
```
ESM com extensão `.js`, imports de tipos explícitos e factories com dependências injetáveis. Preferir APIs existentes para snapshot, consulta e mídia.

**Privacidade/volume** (linhas 21–26):
```typescript
const location = resolve(dataDir);
if (location === root || location.startsWith(root + '/')) throw Error('Armazenamento privado deve ficar fora do checkout');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
if (lstatSync(dataDir).isSymbolicLink() || realpathSync(dataDir) !== location) throw Error('Diretório privado inválido');
chmodSync(dataDir, 0o700);
process.umask(0o077);
```
Release/checkout separado do volume persistente. Config real, inventário, recovery kit, URLs privadas e recibos integrais não entram no repositório.

**Guard de superfície** (linhas 56–65):
```typescript
app.use('/mcp', createMcpAdapter({ archive, authDb, mediaDir }));
app.use(express.json({ limit: '4kb' }));
app.use(express.urlencoded({ extended: false, limit: '4kb' }));
app.use(auth.middleware);
const requireOwner = auth.requireOwner;
app.get('/api/session', auth.sessionInfo);
app.post('/login', auth.csrf, auth.login);
app.post('/logout', auth.csrf, async (req, res) => { const scope = searchSession(req); await auth.logout(req, res); archive.dropQueries(scope); collector?.hidePairing(); });
app.use('/api/status', requireOwner);
app.use('/api/qr', requireOwner);
```
Manter bearer MCP e cookie web separados. Saúde operacional privada amplia `/api/status`, não cria endpoint público de conteúdo.

**Drain existente** (linhas 235–238):
```typescript
close() {
  const finish = () => { clearInterval(querySweep); archiveDb.close(); authDb.close(); lock.release(); };
  if (collector) return collector.stop().then(() => mediaWorker!.stop()).then(() => collector!.drain()).then(() => exports.close()).then(finish);
  const closing = exports.close(); if (closing) return closing.then(finish); finish();
```
É ponto de extensão, não shutdown final pronto: tornar encerramento idempotente/aguardado e limitar conexões abertas. Hoje o CLI aguarda `server.close` antes de chamar `service.close` (linha 273); testar stream/conexão persistente. Falha de início do collector precisa preservar consulta em vez de encerrar todo o serviço. Orquestração deve serializar backup/update/promoção, parar/drenar, produzir snapshot e retomar o modo anteriormente autorizado em `finally` **antes** do upload/readback. Não segurar indisponibilidade durante transferência externa.

### `src/auth.ts`, `src/transport.ts` e `test/transport.test.ts`

**Analog:** `src/auth.ts`; complemento HTTP em `test/http.test.ts`.

**Imports** (`src/auth.ts`, linhas 1–4):
```typescript
import session, { Store, type SessionData } from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
```
**Guard de proprietário** (linhas 62–67):
```typescript
const requireOwner = (req: Request, res: Response, next: NextFunction) => {
  store.get(req.sessionID, (error, current) => {
    if (error) { next(error); return; }
    if (!req.session.owner || !current?.owner || current.ownerGeneration !== config(authDb, 'owner-generation')) { res.status(401).json({ error: 'Autenticação necessária' }); return; }
    next();
  });
```
Preservar SQLiteStore, regeneração/salvamento de sessão no login (92–94), gerações/revogação (14–39). Não chamar `setOwnerPassword` na migração para normalizar credenciais.

**Anti-pattern a corrigir**, não copiar como contrato HTTPS (69–71):
```typescript
const csrf = (req: Request, res: Response, next: NextFunction) => {
  const origin = `http://${req.get('Host')}`;
  if (req.get('Origin') !== origin || !req.session.csrfToken || typeof req.body?.csrfToken !== 'string' || req.body.csrfToken !== req.session.csrfToken) { res.status(403).json({ error: 'Solicitação recusada' }); return; } next();
```
Cookie atual e clearCookie usam `secure: false` (61,100); gate main aceita apenas Host/peer loopback (50–52). Criar contrato compartilhado de origem HTTPS explícita + proxy conhecido; cookie Secure inclusive logout, CSRF exato, Host/protocolo/peer conferidos. Nenhum `trust proxy=true` irrestrito, fallback a forwarded arbitrário ou remoção do Origin para resolver WINDOWS13. Manter modo local explícito necessário aos testes/restore.

**Test harness** (`test/http.test.ts`, linhas 12–19):
```typescript
const dir = mkdtempSync(join(tmpdir(), 'zap-http-')), s = createService({ dataDir: dir });
const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
await s.setPassword('senha sintética');
const challenge = await fetch(base + '/api/session'), { csrfToken } = await challenge.json();
const login = await fetch(base + '/login', { method: 'POST', headers: { Cookie: challenge.headers.get('set-cookie')!.split(';')[0], Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'senha sintética', csrfToken }) });
const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0] };
```
Adaptar para proxy TLS realista com Host público e peer confiável, matriz de spoofing, login/logout/CSRF, download/Range/MCP. Senha sintética é apenas fixture; nunca redefinir a senha do acervo real.

### `src/mcp.ts` e origem dos downloads/cliente instalado

**Analog complementar:** próprio `src/mcp.ts`.

**Bearer com revogação** (34–40):
```typescript
authenticate(header: string | undefined) {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header ?? '')?.[1];
  if (!token) return null;
  const row = authDb.prepare("SELECT (SELECT value FROM web_config WHERE key='mcp-token-digest') AS digest, (SELECT value FROM web_config WHERE key='mcp-generation') AS generation").get() as { digest: string | null; generation: string | null };
  if (!row.digest || !row.generation || !/^[a-f0-9]{64}$/.test(row.digest) || !timingSafeEqual(digest(token), Buffer.from(row.digest, 'hex')) || row.generation !== value(authDb, 'mcp-generation')) return null;
  return row.generation;
},
```
Rotação existente (45–56) grava destino exclusivo 0600, fsync e digest/generation transacionais; preservar guard por write/end (78–82). Origem em 71 é derivada do socket/Host e falha atrás de TLS terminado no proxy: substituir pelo contrato comum validado. Links de anexos devem usar somente essa origem. Token permanente exclusivo e revogável, entregue ao Codex por referência privada/env, sem literal TOML/URL/prompt; preservar outras configurações. Nenhuma CA/token descartável do piloto passa à produção.

### `src/backup.ts`, `src/offsite.ts`, `src/promotion.ts`

**Analog:** `src/backup.ts`.

**Imports** (1–8): SQLite, `node:fs` com O_NOFOLLOW/O_EXCL/fsync, paths, crypto e `acquireServiceLock` de `./whatsapp.js`; reutilizar esta combinação em vez de copiar banco vivo.

**Snapshot coordenado e publicação** (89–96,118–121):
```typescript
export async function createSnapshot({ dataDir, destination, fault }: { dataDir: string; destination: string; fault?: Fault }) {
  const source = privatePath(dataDir), dest = privatePath(destination, false);
  if (dest.startsWith(source + '/')) throw Error('Snapshot deve ficar fora do perfil fonte');
  const lock = acquireServiceLock(source), databases: Database.Database[] = []; let staging: string | undefined;
```
```typescript
writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600, flag: 'wx' }); sync(join(staging, 'manifest.json'));
validateSnapshot(staging); await fault?.('verified'); lock.assert(); publish(staging, dest); staging = undefined;
return { files: manifest.files.length, messages: manifest.databases['archive.sqlite'].counts.messages };
} finally { for (const db of databases) db.close(); if (staging) rmSync(staging, { recursive: true }); lock.release(); }
```
Reusar SQL integrity/FK/schema/contagens (57–63), hashes via blocos de 64KiB (32–45), reserva statfs (72–75), allowlist/validação integral (123–146) e nomes exclusivos (82–87). Reserva operacional precisa considerar também ZIP/staging/readback/restore medidos. Não garantir janela curta antes de medir custo linear de todos os originais.

**Gate de promoção existente** (155–166):
```typescript
if (existsSync(join(source, 'restored.json'))) throw Error('Perfil restaurado é somente consulta offline');
```
```typescript
const proof = JSON.parse(receipt.proof) as Proof;
if (proof.version !== 1 || proof.checks !== checks || proof.source !== createHash('sha256').update(source).digest('hex') || proof.profile !== profileReadonly(authDb) || !Number.isFinite(Date.parse(proof.verifiedAt))) throw Error('Recibo de outro perfil ou incompleto');
const snapshot = validateSnapshot(proof.snapshotDir);
if (snapshot.digest !== proof.manifestHash || snapshot.manifest.profile !== proof.profile) throw Error('Snapshot do recibo divergente');
```
HMAC em 161–162 e recibo publicado só após conferência em 209–216. Não é prova portável de desligamento de outro host. Novo handoff precisa verificar origem parada, autoarranque desabilitado, destino único e estados duráveis recuperáveis; ambiguidade inicia somente consulta. Não promover removendo manualmente `restored.json` ou reutilizando recibo vinculado ao caminho anterior. Não apresentar lock local como fencing distribuído.

**Restore offline** (235–241):
```typescript
for (const f of manifest.files) { checkSpace(dirname(dest), BigInt(f.size)); const digest = fileDigest(join(resolve(snapshotDir), f.path), join(staging, f.path)); if (digest.size !== f.size || digest.sha256 !== f.sha256) throw Error('Cópia divergente'); await fault?.('file'); }
fileDigest(join(resolve(snapshotDir), 'manifest.json'), join(staging, 'manifest.json'));
validateSnapshot(staging);
writeFileSync(join(staging, 'restored.json'), JSON.stringify({ offlineOnly: true }), { mode: 0o600, flag: 'wx' }); sync(join(staging, 'restored.json'));
await fault?.('verified'); publish(staging, dest);
return { files: manifest.files.length, messages: manifest.databases['archive.sqlite'].counts.messages };
} finally { if (existsSync(staging)) rmSync(staging, { recursive: true }); }
```
Offsite precisa cifrar snapshot finalizado com ferramenta existente escolhida após inventário, recuperar do destino externo e validar/descriptografar antes de declarar sucesso. Chave independente da VPS, nomes imutáveis, último bom preservado e nenhuma política automática de expurgo. `verifyBackup` atual altera senha só no clone de ensaio (172–174); não usar esse clone como volume promovido nem transformar verify-backup integral em condição de retomada diária.

### Testes de operação/offsite/promoção e ampliação do backup

**Analog:** `test/backup.test.ts` (1–17,28–70).

**Imports e limpeza** (1–5,14–17):
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
```
```typescript
function setup(t: { after(fn: () => unknown): void }) {
  const base = mkdtempSync(join(tmpdir(), 'zap-backup-')), dataDir = join(base, 'source'), destination = join(base, 'snapshot');
  t.after(() => rmSync(base, { recursive: true })); return { base, dataDir, destination };
}
```
**Falha sem publicação** (64–67):
```typescript
test('falha ENOSPC/SQL não publica cópia nem altera snapshot anterior', async t => {
  const m = await load(), f = setup(t); await seed(f.dataDir, 1); await m.createSnapshot(f); const original = readFileSync(join(f.destination, 'manifest.json'));
  await assert.rejects(m.createSnapshot({ dataDir: f.dataDir, destination: join(f.base, 'failed'), fault: () => { throw Object.assign(Error('synthetic'), { code: 'ENOSPC' }); } }));
  assert.equal(existsSync(join(f.base, 'failed')), false); assert.deepEqual(readFileSync(join(f.destination, 'manifest.json')), original);
```
Reusar fault injection significativa por estágio e asserts sobre último bom/fonte/destino, writer ativo (42–50), traversal/symlink (52–62), FTS/proveniência/bytes/permissões (28–40). Adicionar mutex/retomada, chave errada/ausente/readback truncado e promoção interrompida. Fixtures são controles de engenharia, não evidência OPS real.

### `scripts/phase4-acceptance.mjs` e `test/operation-acceptance.test.ts`

**Analog:** `scripts/phase3-acceptance.mjs`.

**Imports** (6–14):
```javascript
import { spawn, spawnSync } from 'node:child_process';
import { createServer, request } from 'node:https';
import { request as plainRequest } from 'node:http';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual as same } from 'node:util';
import Database from 'better-sqlite3';
import { createService } from '../dist/src/main.js';
import { rotateMcpToken } from '../dist/src/mcp.js';
import { calendarStart } from './phase2-acceptance.mjs';
```
**Execução fresca/validação** (19–20,24–29):
```javascript
const runs = new WeakSet();
export function beginRun() { const live = { runId: randomUUID(), startedAt: Date.now() }; runs.add(live); return live; }
```
```javascript
const accepted = p?.status === 'passed' && p.synthetic === false && p.sourceVerified === true && p.offline === true && p.collectorEnabled === false
  && runs.has(live) && live?.runId === p.runId && live.startedAt <= live.endedAt && live.configPreserved === true
  && live.process.pid > 0 && live.process.code === 0 && live.process.installed === true && /^codex-cli \d+\.\d+\.\d+/.test(live.process.version)
```
Copiar ideia de correlação e rejeição de prova stale/sintética, não hostname fixo nem todo gate da fase anterior. Novo gate inclui endpoint permanente, restart/update preservando acervo, leitura sem WhatsApp, snapshot **recuperado do destino externo**, integridade integral e fluxo no Codex instalado sobre restauração offline.

**Oráculo SQL/disco** (175,208–216) e **contexto** (219–226): abrir SQL/disco independente, comparar IDs/ordem/filtros/fuso/proveniência ao site/MCP e verificar bytes reais dos downloads. Incluir ZIP offline do recorte usando padrões existentes do driver fase2. Exemplo de oráculo de arquivo (175):
```javascript
const a = db.prepare('SELECT id,size,sha256,state FROM attachments WHERE id=?').get(id), bytes = privateFile(join(c.dataDir, 'media', id + '.bin'));
check(a?.state === 'available' && bytes.length === a.size && hash(bytes) === a.sha256, 'independent original bytes');
```
Selecionar conversa real conhecida em case privado; não fabricar João nem inferir confirmação a partir de proposta. Conteúdo de conversa nunca vira instrução executável. Preservar faltantes e cobertura parcial.

**Erro/cleanup** (249,264–265):
```javascript
} catch (error) { writeFileSync(join(directory, 'failure.json'), JSON.stringify({ stage, message: error.message, observed }), { mode: 0o600 }); throw Error('Aceite recusado na etapa: ' + stage); }
```
```javascript
]) { try { await cleanup(); } catch (error) { errors.push(error); } }
if (errors.length) throw new AggregateError(errors, 'Aceite recusado na etapa: cleanup');
```
Separar evidência integral privada e recibo público allowlisted. Não copiar `publicReceipt` literalmente: linhas 40–46 incluem hostname e SHA de originais e assumem ambiente local. Recibo novo não publica hosts/paths/hashes reais, query/contato, QR, token, sessão ou observações brutas. Configuração persistente do Codex é parte do handoff real; cleanup remove apenas material transitório, sem revogar a credencial permanente entregue ou restaurar configuração antiga sobre alterações alheias.

## Shared Patterns

- **Auth/erros:** guards de `src/auth.ts:62–71` e `src/mcp.ts:70–82`; 401/403 explícitos, mensagens externas mínimas, revogação conferida no consumo. Todas as superfícies precisam da mesma origem canônica validada; somente hints MCP não impedem escrita remota.
- **Integridade/estado durável:** `src/backup.ts:32–45,57–63,82–87,118–121,123–146` aplica hashes privados, SQL/FK/schema/contagens, staging/fsync/publicação exclusiva e cleanup em finally. Sucesso externo só após readback validado; agendamento/upload iniciado não é sucesso.
- **Permissões:** `src/main.ts:21–26` e `src/backup.ts:17–25` recusam checkout/symlink/owner ou modo inadequado; usar 0700/0600, owner exclusivo e volume fora do release. Sem log de corpo/header/query identificadora.
- **Operação segura:** código e dados têm rollback distintos. Release recuperável não autoriza sobrepor acervo atual com snapshot antigo ou ligar collector na origem. Verificar schema e preservar registros recebidos após snapshot.
- **Aceite:** `scripts/phase3-acceptance.mjs:24–35,208–233,250–265` fornece correlação e oráculos independentes. Testes locais, processo ativo, QR e URL são intermediários; OPS permanece aberto até provas reais descritas no CONTEXT.

## No Analog Found

| File/Responsabilidade | Role | Data Flow | Reason |
|---|---|---|---|
| `.env.example` — origem/proxy/offsite novos | config | transform | Não existe contrato de origem pública compartilhado; exemplo não é lido automaticamente pelo CLI atual |
| `ops/*` deploy/proxy/supervisor/timer | config | event-driven, batch | Nenhum template de implantação permanente versionado; produto/layout dependem de inventário |
| `ops/*` runbook de handoff/recovery kit | utility | batch, file-I/O | Nenhum procedimento entre hosts/segredo independente já implementado |

Módulos `offsite` e `promotion` têm analogias locais fortes, mas **não** existe protocolo de transferência cifrada/readback nem autorização segura entre hosts pronta para copiar. Usar decisões D-06/D-09–14 e RESEARCH como especificação, testar falhas antes de operar. Destino/supervisor/proxy/criptografia são decisões condicionadas a recursos reais, sem fixar restic/age/systemd antecipadamente.

## Metadata

**Analog search scope:** `src/`, `scripts/`, `test/`, inventário `git ls-files`; cinco fontes principais lidas, dois complementos targeted. Sem auditoria ampla, testes ou operação remota.
**Tracked-source gate:** todos os sete caminhos citados como analog foram confirmados por `git ls-files -- <path>`; nenhum mirror de instalação/runtime foi usado.
**Project skills:** `.codex/skills/` e `.agents/skills/` sem arquivos encontrados nesta sondagem.
**Pattern extraction date:** 2026-10-12.
**Limites:** VPS/domínio/proxy/destino externo/chave não identificados por este trabalho. O documento não comprova implantação, handoff, integridade do acervo atual, backup remoto ou aceite OPS.

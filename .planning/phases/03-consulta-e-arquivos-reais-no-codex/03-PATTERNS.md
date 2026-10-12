# Phase 3: Consulta e arquivos reais no Codex — Pattern Map

**Mapped:** 2026-10-12
**Files analyzed:** 9 destinos propostos; nomes novos são sugestões para o planner.
**Analogs found:** 8 / 9; o protocolo SDK não possui implementação anterior.

## File Classification

| Arquivo novo/modificado | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/main.ts` | controller/config | request-response | próprio arquivo, linhas 17–90, 101–194 | exact |
| `src/auth.ts` | middleware/service | request-response/CRUD | próprio arquivo, linhas 14–102 | role-match: cookie não é bearer |
| `src/archive.ts` (somente se necessário) | model/service | CRUD/transform | próprio arquivo, linhas 366–523 | exact |
| `src/media.ts` | utility/service | streaming/file-I/O | próprio arquivo, linhas 50–90 | exact |
| `src/mcp.ts` (proposto) | controller | request-response/streaming | `src/main.ts`, linhas 69–90, 159–194 | role-match; protocolo novo |
| `test/mcp.test.ts` (proposto) | test | request-response | `test/search.test.ts`, linhas 13–26, 127–176 | exact |
| `test/auth.test.ts` / `test/media.test.ts` | test | request-response/file-I/O | próprios arquivos; casos indicados abaixo | exact |
| `package.json` / `package-lock.json` (um conjunto) | config | batch | pins e scripts existentes | exact |
| `03-ACCEPTANCE.md` (proposto; prova sanitizada) | utility/documento | batch/file-I/O | nenhum analog de negociação/recebimento no Codex | none |

Todos os analogs acima foram confirmados por `git ls-files -- <path>`. Nenhum mirror de runtime é fonte de edição. Há cinco fontes principais de padrões: main, auth, archive, media e search.test; testes adicionais abaixo são casos de regressão, não nova arquitetura.

## Pattern Assignments

### `src/main.ts` e adaptador `src/mcp.ts`

**Imports:** ESM TypeScript com extensão `.js` e tipos explícitos; `src/main.ts:1–7,11`:
```typescript
import express, { type Request, type Response, type NextFunction } from 'express';
import { openArchive, searchTerms, parsePeriod, type Archive } from './archive.js';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { startMediaWorker, openVerifiedAttachment, streamVerifiedAttachment, reconcileMedia, classifyPreview } from './media.js';
```
**Montagem:** `src/main.ts:49–57` verifica Host e endereço loopback, aplica headers privados, depois executa:
```typescript
app.use(express.json({ limit: '4kb' }));
app.use(express.urlencoded({ extended: false, limit: '4kb' }));
app.use(auth.middleware);
```
Montar MCP/transferência depois do gate de transporte e headers, **antes** desses parsers e do cookie middleware. Aplicar bearer antes do parsing específico limitado; se Express consumir o body, passá-lo ao handler SDK conforme RESEARCH. Não aumentar o limite global nem reutilizar cookie/CSRF como autorização MCP. Origin ausente de cliente nativo e Origin presente precisam de política explícita.

**Cursores:** `src/main.ts:102–116` usa corpo JSON/base64url, HMAC-SHA256, formato/limite e comparação constante:
```typescript
return body + '.' + createHmac('sha256', signingKey).update(body).digest('base64url');
if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw Object.assign(Error('cursor'), { status: 400 });
```
`src/main.ts:174–181` vincula busca a identidade e filtros efetivos:
```typescript
const filters = { terms, conversationId, ...parsePeriod(req.query.from, req.query.to) };
const session = searchSession(req), scope = createHmac('sha256', signingKey).update(JSON.stringify([session, filters])).digest('hex');
```
Extrair apenas lógica comum necessária mantendo callers HTTP. Substituir identidade web por escopo MCP separado e geração vigente. Cursor de conversas atual usa `q`, não sessão (`main:190–193`): não copiar esse escopo literalmente para MCP. Contexto inclui referência, direção e ordinal (`main:162–169`).

**Erros:** `main:182–185` permite statuses de domínio `[400,404,410,413,429]`; demais erros seguem handler sanitizado. Adaptar erros ao contrato MCP sem stack, caminhos, SQL, payload ou segredo. Validar campos desconhecidos, IDs e números antes de chamar o arquivo.

### `src/auth.ts`: bearer privado independente

**Analog:** `auth:4,33–34,42–57,87–93` — crypto nativa, transação SQLite e revogação observável:
```typescript
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
db.prepare('INSERT OR REPLACE INTO web_config VALUES (?, ?)').run('owner-generation', randomBytes(32).toString('hex'));
```
Copiar formato transacional e comparação de buffers de mesmo tamanho (`auth:91`), **não** esquema semântico da senha/cookie. Persistir digest e geração específica MCP em auth privado; rotação local atômica invalida cursores/snapshots/transferências antigos. `owner-generation` e logout web não são a geração MCP. `main:152–158` é analog de invalidação de derivados e limpeza; conectar à revogação MCP sem resetar site ou sessão WhatsApp.

### `src/archive.ts`: consultas e projeções, preferencialmente sem alteração

**Contratos existentes:** `parsePeriod(from?: unknown, to?: unknown): EffectivePeriod` (`archive:10–23`), `searchTerms(input: unknown = '')` (`26–30`), `conversationEvidence(id: string)` (`410`), `searchMessages(...)` (`416`), `openContext(reference: string, session: string, sourceSnapshotId?: string)` (`452`), `readContextPage(...)` (`478`), `getAttachment` (`514–517`) e `dropQueries(session: string)` (`523`). Reutilizar esses símbolos; não fazer SQL livre nem ler `revisions.payload`/locators privados no adaptador.

**Snapshot:** `archive:422–449` exige session, filtros idênticos, ordinal seguro; expiração retorna 410 e excesso explícito 413/429. TTL 30 minutos, máximo 20 recortes ativos, 50 mil mensagens/64 MiB são limites do acervo, **não** orçamento MCP. Antes de avançar cursor, confirmar quais DTOs completos couberam na resposta; uma única mensagem grande deve gerar limite explícito, sem cortar revisões.

**Restrição atual vence recorte:** `archive:448–449`:
```typescript
const messages = (db.prepare('SELECT dto FROM query_items WHERE snapshot_id=? AND ordinal>=? ORDER BY ordinal LIMIT ?').all(snapshot.id, ordinal, limit) as { dto: string }[]).map(r => permittedMessage(JSON.parse(r.dto)));
```
`permittedMessage` (`366–368`) e contexto (`485–487`) reavaliam conteúdo/revisões/matchedEvidence. Revalidar também após esperas assíncronas ou formação de buffer MCP. Preservar cobertura, datas originais, unknowns, citações, autoria e identidade; `Attachment.state` é string e `sourceHashVerified` boolean (`25`), não inventar enum incompatível.

### `src/media.ts`: original e gate durante consumo

**Abertura:** `media:65–74` recebe ID, verifica attachment disponível/restrição e abre arquivo com hash/tamanho, mantendo fd. `media:50–56` usa O_NOFOLLOW e fecha fd no erro. Não converter filename recebido em caminho nem devolver localização interna.
```typescript
if (!attachment || attachment.state !== 'available' || archive.isRestricted(attachment.reference)) return null;
```
**Stream:** `media:77–90`:
```typescript
const source = createReadStream('', { fd: file.fd, autoClose: true, start, end });
const check = () => { if (archive.isRestricted(file.attachment.reference)) throw Error('Conteúdo restrito indisponível'); };
```
Somar gate da geração bearer ao consumo sem remover gate de restrição. `main:85–90` sanitiza Content-Disposition, Content-Length, fecha HEAD/vazio e destrói stream no fechamento/erro; reaproveitar. `classifyPreview` verifica assinatura, não só MIME informado. Inline também exige integridade/gates; URL ou metadata não comprova entrega. A abertura pode registrar corrupção/falha local: somente leitura impede operações WhatsApp, não a contabilidade local necessária.

### Testes e configuração

**Fixture HTTP:** `test/search.test.ts:13–26`; analog literal de ciclo de vida:
```typescript
const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
```
Usar node:test/assert, tmpdir privado e HTTP real; substituir login da fixture por emissão bearer sintético local. Não reutilizar armazenamento real para testes.
- `search.test:68–85,99–125,127–176`: replay/empates, calendário 23h/25h, tampering/filtros/expiração/limites e sentinelas de vazamento.
- `context.test:63–101`: escopo distinto, direção, ordinal, origem do snapshot, expiração e restart.
- `auth.test:159–196`: revogação concorrente, operação administrativa exclusiva/stdin e Host externo.
- `media.test:307–349`: originais reais sintéticos, tamanho/hash divergente e cancelamento sem publicação parcial; adicionar revogação durante stream/inline.
- `readonly.test:26–35`: GET/HEAD não autorizados, operações proibidas e leitura offline. Atualizar a expectativa histórica POST `/mcp`=404 somente para o endpoint autorizado novo; conservar negações de enviar/editar/apagar/leitura e ausência de socket nas consultas.

`package.json`/lock: manter pins, Node24 e scripts build/test existentes; TS já inclui src/test. SDK ainda não instalado: auditoria/instalação e prova no cliente pertencem execução. Nenhum novo painel, coletor ou abstraction preventiva.

## Shared Patterns

Privacidade (`main:18–44`): diretório fora do checkout, 0700, arquivos SQLite 0600, umask 077, symlinks recusados, lock único e fechamento de recursos em falha. Segredo/recibos privados também ficam fora do checkout. Dados de conversas são dados não confiáveis, nunca instrução privilegiada. Conteúdo exposto deve vir das projeções permitidas; retornar ausência como ausência no acervo.

## No Analog Found

Negociação MCP oficial, suporte inline/download pelo Codex instalado e recibo no destino não possuem analog implementado. Usar RESEARCH para SDK; medir suporte/limites no tracer real. `03-ACCEPTANCE.md` registra versões/ambiente/status/hashes sanitizados; artefatos privados não entram no Git. Loopback não comprova VPS.

## Metadata

**Scope:** src/main.ts, auth.ts, archive.ts, media.ts; test HTTP/auth/search/context/media/readonly; package/lock/tsconfig. **Sources principais:** 5. **Extraction:** 2026-10-12. Mapeamento estático; nenhum código, sessão, credencial, runtime ou configuração do cliente alterado.

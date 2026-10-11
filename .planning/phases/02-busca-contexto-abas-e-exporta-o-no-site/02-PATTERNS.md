# Phase 2: Busca, contexto, abas e exportação no site — Pattern Map

**Mapped:** 2026-10-11 · **Files analyzed:** 19 · **Analogs found:** 17/19 (inclui correspondências parciais).
Escopo derivado de 02-CONTEXT.md e 02-RESEARCH.md. Nomes dos módulos novos abaixo são propostas mínimas para o planner; a pesquisa não fixa sua separação. Todos os caminhos de analogia foram confirmados por `git ls-files`; nenhum mirror/runtime é referência.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/archive.ts` | model/migration/query + parsePeriod/EffectivePeriod exportados | CRUD/transform | próprio arquivo | exact para arquivo; calendário histórico novo sem analogia |
| `src/query.ts` (proposto) | service | request-response | `src/archive.ts` | partial: consulta; snapshot novo |
| `src/export.ts` (proposto) | service | file-I/O/batch | `src/media.ts` | partial: integridade; ZIP novo |
| `src/main.ts` | controller | request-response/streaming | próprio arquivo | exact |
| `src/auth.ts` (se necessário) | middleware | request-response | próprio arquivo | exact |
| `src/media.ts` (se necessário) | service | file-I/O | próprio arquivo | exact |
| `public/app.js` | component/store | event-driven | próprio arquivo | partial: leitor único |
| `public/index.html` | component | event-driven | próprio arquivo | role-match |
| `public/style.css` | component | transform | próprio arquivo | role-match |
| `package.json`, `package-lock.json` | config | batch | próprios arquivos | exact |
| `test/search.test.ts` | test | CRUD/request-response + calendário/trust boundaries | `test/http.test.ts`, `test/security.test.ts` | role-match; asserts de filtro histórico novos |
| `test/export.test.ts` | test | file-I/O/batch | `test/backup.test.ts` | partial: originais; ZIP novo |
| `test/ui.test.ts` | test | event-driven | `test/http.test.ts` | partial: fixture, sem DOM |
| `test/http.test.ts`, `test/security.test.ts`, `test/readonly.test.ts` | test | request-response | próprios arquivos | exact |

## Pattern Assignments

### Arquivo, query e DTO
**Analog:** `src/archive.ts:1-6,87-152,330-364,384-403`. Importações ESM, SQL parametrizado, migração transacional com `user_version`, checagem FK/integridade, redirect e projeção explícita. Usar estes pontos para índice, contratos de consulta, contexto e seleção congelada; hooks de ingestão/projeção/reconciliação estão no mesmo módulo. Não importar payload privado para a consulta/exportação.
```ts
const redirected = (db.prepare('SELECT target_reference FROM message_redirects WHERE old_reference=?').get(reference) as { target_reference: string } | undefined)?.target_reference ?? reference;
const row = db.prepare('SELECT * FROM messages WHERE reference=?').get(redirected) as MessageRow | undefined;
if (!row) return null;
```
**DTO de revisão** (`src/archive.ts:338`):
```ts
const revisions = (db.prepare('SELECT * FROM revisions WHERE reference=? ORDER BY id').all(redirected) as Revision[]).map(r => ({ kind: r.kind, sourceTimestamp: r.source_time, observedAt: r.observed_at, ...JSON.parse(r.evidence) as Obj }));
```
Acrescentar vínculo sanitizado revisão/anexo à projeção, sem espalhar a linha SQL bruta. `getAttachment` em 361-365 seleciona campos públicos explicitamente. A paginação viva atual não é analogia suficiente para freeze: merges alteram referências e conversas; materializar DTOs/ordinais conforme RESEARCH.

### HTTP, cursor e validação
**Analog:** `src/main.ts:50-62,63-83,86-108,128-138`; aplicar a busca, contexto, preview e criação/status/download de exportação.
```ts
const body = Buffer.from(JSON.stringify(parts)).toString('base64url');
return body + '.' + createHmac('sha256', signingKey).update(body).digest('base64url');
```
Copiar validação estrutural, tamanho e `timingSafeEqual` de 96-108; acrescentar snapshot/filtros/direção e propriedade de sessão. Assinatura não congela dados. Preservar respostas 400 para limites/cursor e 404 sanitizado para referência ausente, sem expor erro interno.

### Arquivos privados e exportação
**Analog:** `src/media.ts:1-10,15-21,49-75`; imports `node:fs`, `node:stream/promises` e `import type { Archive } from './archive.js'`. Abrir original por ID, consumir o mesmo fd e fechar em sucesso/erro; HTTP já preserva HEAD/Range e stream em `src/main.ts:63-83`.
```ts
file = hashFile(join(mediaDirectory(archive, mediaDir), id + '.bin'));
if (file.size !== attachment.size || file.sha256 !== attachment.sha256) throw Error('Final divergente');
return { ...file, attachment };
```
`src/media.ts:74` fecha fd e registra motivo seguro na falha. `openVerifiedAttachment` pode atualizar estado de mídia ao encontrar corrupção; não tratá-lo como função pura. Exportação reaproveita esta verificação e compara com metadados congelados. ZIP, job exclusivo, conferência CRC/entradas e publicação de derivados precisam da pesquisa; não copiar backup completo nem incluir banco/sessão.

### UI assíncrona, abas e estilos
**Analog:** `public/app.js:20-36,113-132,197-203`; aplicar à busca, contexto, abas, players e exportação. Evoluir geração de navegação para geração por aba mantendo geração global da sessão.
```js
if (version !== readVersion || navigation !== navigationVersion) return;
const anchor = append ? $('messages').firstElementChild : null, offset = anchor?.getBoundingClientRect().top;
```
Preservação da leitura (`public/app.js:130`):
```js
if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - offset);
```
`addText`/`detail` em 35-36 usam `textContent`; conservar essa fronteira para texto recebido. `signedOut` invalida e limpa conteúdo; ampliar para Map de abas, DOM de preview e respostas de jobs. Sem localStorage. `public/index.html:37-55` fornece `role=alert/status`, reader rotulado e foco programático; tablist/teclado ainda são novos. Copiar tokens/48px/foco de `public/style.css:1-17` e breakpoint de 47-56, ajustando o leitor para abas sem redesign.

### Testes
**Analogs:** `test/http.test.ts:1-20,24-43`, `test/backup.test.ts:14-26`, `test/security.test.ts:25-34`. Usar `node:test`, assert estrito, temporário, porta efêmera, login sintético e cleanup. Seed de backup mostra worker com stream sintético + hash, sem socket real; fixture HTTP já cobre homônimos, 105 empates, aliases e offline.
```ts
const dir = mkdtempSync(join(tmpdir(), 'zap-http-')), s = createService({ dataDir: dir });
const server = s.app.listen(0, '127.0.0.1'); await once(server, 'listening');
t.after(async () => { server.close(); await once(server, 'close'); await s.close(); rmSync(dir, { recursive: true }); });
```
A sentinela `PRIVATE_SENTINEL_NEVER_RETURN` do security test valida vazamento. Ampliar matriz GET/HEAD/Range sem sessão para rotas novas. Teste UI requer DOM/browser com respostas atrasadas controladas; fixture HTTP é só suporte e regex não verifica abas/foco/scroll. `test/readonly.test.ts` permanece controle da superfície sem mutações WhatsApp. No plano02-04 fica somente como regressão; os novos testes de exportação/somente leitura são adicionados em `test/export.test.ts`. O plano02-01 também reutiliza o padrão de segurança em `test/search.test.ts`, sem modificar `test/security.test.ts`.

## Shared Patterns
Auth existente (`src/auth.ts:58-68`) deve executar antes de consulta/stream; export POST usa também `auth.csrf`. Novos derivados pertencem à sessão e geração do proprietário; limpeza no logout/reset/expiração precisa de integração explícita.
```ts
if (!req.session.owner || !current?.owner || current.ownerGeneration !== config(authDb, 'owner-generation')) { res.status(401).json({ error: 'Autenticação necessária' }); return; }
```
`src/main.ts:50` aplica no-store/nosniff/CSP; conservar em novas rotas e liberar apenas mídia própria para preview. Erros de dados ausentes permanecem seguros; original desconhecido não recebe data de ingestão como substituto. Imports locais TypeScript usam extensão `.js`.

## No Analog Found
`parsePeriod`/`EffectivePeriod` serão exportados em `src/archive.ts`, com assertions em `test/search.test.ts`: nenhum calendário histórico/filtro civil existente; usar Temporal e probes/fixtures da RESEARCH. FTS/snapshot, ZIP e tabs têm apenas analogias parciais acima; não declarar mecanismo existente por compartilhar SQL, stream ou leitor.

## Metadata
**Search scope:** `src/`, `public/`, `test/`, manifests; gate tracked-source aplicado. **Strong anchors:** arquivo, HTTP/auth, mídia, leitor e fixtures. Análise somente leitura; nenhum teste executado, acervo privado acessado ou aceite operacional declarado.

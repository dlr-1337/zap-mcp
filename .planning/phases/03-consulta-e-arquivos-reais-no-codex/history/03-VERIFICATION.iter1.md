---
phase: 03-consulta-e-arquivos-reais-no-codex
verified: 2026-10-12T19:14:57Z
status: gaps_found
score: 19/21 must-haves verified
covered_files: [
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-01-PLAN.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-01-SUMMARY.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-01-red1.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-01-red2.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-PLAN.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-SUMMARY.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-red1.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-red2.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-red3.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-03-PLAN.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-03-SUMMARY.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-03-red1.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-03-red2.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-PLAN.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-SUMMARY.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-red-coverage.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-red1.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-ACCEPTANCE.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-CONTEXT.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-DEPENDENCY-REVALIDATION.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-DEPENDENCY-REVALIDATION.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-PATTERNS.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-RESEARCH.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-REVIEW-DISPOSITION.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-REVIEW-FIX.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-REVIEW.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-SECURITY.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-UI-REVIEW.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-VALIDATION.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-review-wr01-iter2-red.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-review-wr01-red.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/03-review-wr02-red.json",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/COVERAGE.md",
    ".planning/phases/03-consulta-e-arquivos-reais-no-codex/deferred-items.md",
    "AGENTS.md",
    "README.md",
    "package-lock.json",
    "package.json",
    "scripts/phase2-acceptance.mjs",
    "scripts/phase3-acceptance.mjs",
    "src/archive.ts",
    "src/auth.ts",
    "src/main.ts",
    "src/mcp.ts",
    "src/media.ts",
    "src/whatsapp.ts",
    "test/auth.test.ts",
    "test/context.test.ts",
    "test/export.test.ts",
    "test/mcp-acceptance.test.ts",
    "test/mcp.test.ts",
    "test/media.test.ts",
    "test/readonly.test.ts",
    "test/recovery.test.ts",
    "test/search.test.ts",
    "test/security.test.ts",
    "tsconfig.json"
  ]
covered_digest: "v3:sha256:f40051ae53ba6fcf1e7ef4abdd23135dd8902f0ef1bc4329f9710e03da18e2f1"
behavior_unverified: 0
overrides_applied: 0
prohibitions_flagged: 3
decision_coverage:
  honored: 20
  total: 20
  not_honored: []
gaps:
  - truth: "A meta de uma fase mode:mvp passa no guard canônico user-story.validate."
    status: failed
    reason: "Goal do ROADMAP não tem os três slots de User Story; owner retornou valid:false e três erros. O guard do verifier proíbe certificar a fase assim."
    artifacts:
      - path: .planning/ROADMAP.md
        issue: "Phase 3 declara Mode:mvp com Goal fora do formato canônico."
    missing:
      - "Normalizar somente a forma da Goal pelo workflow gsd-phase --edit 3 --force, preservando sentido, cinco SCs, requisitos e escopo."
      - "Executar user-story.validate e conferir milestone-scope antes/depois; reverificar."
  - truth: "As três proibições de 03-04 têm disposição canônica sustentada por enforcement executado."
    status: partial
    reason: "Continuam unresolved e sem verification; dispositionForProhibition devolveu unverified/flagged:true nas três. Testes negativos existentes passaram, mas isso não muda silenciosamente os descriptors do contrato."
    artifacts:
      - path: .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-PLAN.md
        issue: "must_haves.prohibitions descriptor-less/unresolved."
    missing:
      - "Vincular cada statement existente a status:resolved e verification:test com enforcementEvidence do teste pertinente efetivamente verde."
      - "Reavaliar dispositionForProhibition; vazio deve permanecer unverified e evidência test válida deve ser green/flagged:false."
  - truth: "O último tracer encerra sua credencial descartável sem deixar bearer vigente no clone offline."
    status: failed
    reason: "O tracer de 18:24:13.110Z deixou três chaves mcp-% e um arquivo de token que corresponde ao digest vigente. Endpoint encerrado e arquivo privado não equivalem a revogação."
    artifacts:
      - path: test/mcp.test.ts
        issue: "finally do tracer fecha serviço/listener e confere TOML, mas não revoga o grant nem remove seu token descartável."
    missing:
      - "Corrigir o cleanup do tracer com teste negativo significativo e garantir execução também nos erros."
      - "Revogar/remover somente a credencial descartável do último tracer no clone offline; preservar prova, transcrições, binários, configuração global e fonte viva."
      - "Conferir token inválido, ausência de token/derivados e preservação do restante antes de reverificar."
deferred:
  - truth: "Login do site sob HTTPS/proxy operacional e implantação supervisionada na VPS."
    addressed_in: "Phase 4"
    evidence: "Phase 4 SC1 exige serviço privado HTTPS com supervisão na VPS; WINDOWS13 registra login HTTPS nativo 403."
  - truth: "Backup privado fora da VPS e restauração operacional com fluxo real no site/Codex."
    addressed_in: "Phase 4"
    evidence: "Phase 4 SC2-SC4 exigem cópia externa, restore isolado e fluxo real restaurado."
prohibition_verification:
  - statement: "MUST NOT chamar metadata, URL ou transferência parcial de arquivo recebido pelo Codex."
    status: unverified
    flagged: true
    verification: null
    enforcement_candidate: "test/mcp-acceptance.test.ts#arquivo ausente, parcial, corrupto ou antigo nunca conta como entrega"
    candidate_execution: "1/1 PASS independente, exit0; 493.512216ms."
  - statement: "MUST NOT descrever ausência no arquivo como inexistência no WhatsApp ou histórico integral."
    status: unverified
    flagged: true
    verification: null
    enforcement_candidate: "test/mcp.test.ts#MCP candidatos preservam homônimos grupo e identidades recebidas"
    candidate_execution: "1/1 PASS independente, exit0; 660.537337ms; completeAccount:false e ausência no acervo."
  - statement: "MUST NOT transformar conversa arquivada em instrução privilegiada ou operação de escrita no WhatsApp."
    status: unverified
    flagged: true
    verification: null
    enforcement_candidate: "test/mcp.test.ts#MCP instruções fixas não promovem mensagem adversarial a ferramenta ou segredo"
    candidate_execution: "1/1 PASS independente, exit0; 724.29589ms; allowlist, operação inventada e segredo."
---

# Fase 3: Consulta e arquivos reais no Codex — Verification Report

**Phase Goal:** O Codex instalado do usuário consegue consultar o mesmo acervo privado por MCP somente leitura e receber ou baixar anexos com integridade verificável.
**Verified:** 2026-10-12T19:14:57Z
**Status:** gaps_found
**Re-verification:** Não — nenhum 03-VERIFICATION anterior encontrado.

A fase não está certificada para avançar. A evidência de implementação local é forte: cliente instalado, TLS, doze chamadas, SQL/site e dois originais conferidos independentemente. Existem um guard documental obrigatório, três proibições ainda flagged e um erro concreto de cleanup do tracer posterior. Os dois primeiros grupos podem ser regularizados sem mudar o produto; o último exige correção e limpeza limitada ao clone offline. Nenhuma autorização humana foi fabricada, nenhum requisito foi marcado e nenhum commit foi criado.

## User Flow Coverage

O ROADMAP marca mode:mvp. `query user-story.validate --story <Goal exata> --raw` retornou `valid:false`, `slots:null` e erros para actor/capability/outcome. Os PLANs possuem uma User Story semanticamente equivalente, mas o guard exige a meta canônica do ROADMAP; não foi substituída silenciosamente pela redação dos planos. A tabela abaixo registra as observações já coletadas, sem certificar a fase contra uma Goal inválida.

| Passo | Esperado | Evidência diretamente conferida | Status |
|---|---|---|---|
| Conectar o Codex instalado | Negociação e canal protegido | Executável nativo e seu SHA iguais ao da prova, Codex 0.162.1; initialize 2025-06-18, codex-mcp-client; negativa sem CA e positiva confiada | ✓ VERIFIED |
| Encontrar conversa e mensagens | Candidato canônico e filtros/continuação | 1 find + 3 search; argumentos/eventos/servidor correlacionados; 13 resultados consecutivos de 128 no SQL | ✓ VERIFIED |
| Abrir contexto | Âncora e vizinhas com proveniência | 6 get_context; ordem/IDs/autoria/original/quote/revisões conferidos em SQL e recibo de comparação HTTP autenticada do site | ✓ VERIFIED |
| Baixar os originais | Arquivo no destino com integridade | 2 get_attachment + 1 helper GET fixo; 4200 e 271485 bytes, disco/HTTP/destino iguais | ✓ VERIFIED |
| Encerrar a prova temporária | Bearer descartável revogado/removido | Integrado 17:13 limpou; tracer posterior 18:24 deixou token correspondente ao digest vigente | ✗ FAILED — BLOCKER |
| Guard MVP | Goal canônica válida | Owner valid:false; normalização documental pendente | ✗ FAILED — BLOCKER |

## Goal Achievement

### Observable Truths

Cinco SCs do ROADMAP são mantidas. Dos dezenove itens positivos dos PLANs, cinco restatamentos foram incorporados nas SCs: 03-01.1, 03-02.3, 03-03.2, 03-04.1 e 03-04.2. Os catorze refinamentos restantes aparecem abaixo. Os dois controles obrigatórios finais são contados separadamente: guard MVP e cleanup de credencial. Proibições são checagens negativas separadas, com suas três flags preservadas.

`R184` significa o log completo atual do orquestrador, lido nesta rodada: 184 linhas PASS, zero fail/cancel/skip/todo, 87736.763314ms. É execução do orquestrador, não nova suíte deste verifier. `REAL` significa prova integrada preservada de 17:13:27.794Z, inspecionada privadamente nesta rodada; nenhuma nova chamada a cliente ou conta é alegada.

| # | Truth | Status | Evidence |
|---|---|---|---|
| SC1 | O Codex realmente instalado inicializa e usa o MCP remoto por transporte protegido com bearer privado revogável, com protocolo negociado registrado sem segredos; token ausente, inválido ou revogado é recusado sem revelar dados. | ✓ VERIFIED | `src/mcp.ts:33-43,70-80`; REAL initialize/calls; negativas 401/403, negativa CA antes de initialize; token integrado revogado. Cleanup do token posterior é gap distinto. |
| SC2 | O Codex encontra contatos/conversas e busca mensagens por contato, termo e período, recebendo filtros efetivos, alcance/limites e continuação explícitos em respostas com tamanho controlado. | ✓ VERIFIED | `src/mcp.ts:129-173`; REAL 1 find/3 search, máximo32587/32768bytes; SQL independente128total/13amostra; teste de continuação nomeado1/1 e R184. |
| SC3 | Ao pedir um trecho ou contexto por referência, o Codex recebe os mesmos IDs, autoria, datas originais/fuso, citações, alterações, estados de anexo e cobertura conhecidos no site; ausência continua sendo “não encontrado no acervo”. | ✓ VERIFIED | `src/mcp.ts:174-212`, `src/archive.ts:366-487`; REAL6contextos/20referências, quote/edit/null, SQL/origem/ICU e comparação web registrada; R184 e buffer nomeado1/1. |
| SC4 | Em uma conversa real conhecida, o Codex efetivamente recebe um anexo disponível ou conclui seu download autorizado, e os bytes/tamanho/hash conferem com o arquivo preservado; listagem de recurso ou URL isolada não conta como entrega, e tipo/tamanho sem suporte recebe limite explícito. | ✓ VERIFIED | `src/mcp.ts:213-239`, `src/media.ts:50-90`; REAL2tools/2GETs completos, arquivos novos e bytes/SHA recalculados; pequeno inline no protocolo, ambos salvos por GET, grande download_required. |
| SC5 | As consultas pelo site e pelo Codex não enviam, editam, apagam nem marcam mensagens como lidas no WhatsApp; não existe operação pública que permita essas ações. Conteúdo de conversa é tratado como dado não confiável, sem instruções privilegiadas ou exposição de chaves, e anotações MCP não são usadas como único bloqueio. | ✓ VERIFIED | Adapter recebe archive/authDb/mediaDir; quatro registros fixos; `test/readonly.test.ts` spies zero em R184; adversarial nomeado1/1; REAL0outros MCP/1helper fixo. |
| 01.2 | Cada requisição/download exige bearer vigente, independente de cookie/sessão do site/protocolo. | ✓ VERIFIED | Auth precede parser/cookie (`src/main.ts:56`); REAL negativas e R184 `MCP exige bearer antes de parsing e cookie não autoriza`. |
| 01.3 | Rotação atômica sobrevive à reabertura, invalida geração/derivados e preserva isolamento web. | ✓ VERIFIED | SELECT conjunto, assertCurrent e CLI; teste nomeado inline/restart1/1; R184 CLI/cursor/web. |
| 01.4 | Restrição/geração conferidas antes de buffer e próximo bloco; parcial não é concluído. | ✓ VERIFIED | write/end guards e stream atual; inline/restart, streams com rotação e contexto bufferizado nomeados1/1cada; R184 restrição. |
| 01.5 | Original verificado por ID interno; nome é metadado, fallback na mesma origem privada. | ✓ VERIFIED | Schema UUID fechado, fd O_NOFOLLOW/tamanho/SHA, preview reconhecido; REALURLs sem token e helper fixo sem redirects; R184 corrupção/HEAD/symlink. |
| 02.1 | Candidatos não unem homônimos, grupo/individual ou PN/LID por suposição. | ✓ VERIFIED | `conversationEvidence` e IDs distintos; teste nomeado1/1 com3IDs; REALcandidato conferido com SQL. |
| 02.2 | AND/texto/legenda/filename e dias inclusivos usam as regras do site. | ✓ VERIFIED | `searchTerms/parsePeriod/searchMessages` compartilhados; R184 AND/histórico/DST23h25h/null; REALfiltros/ICU/SQL/site. |
| 02.4 | Paginação conserva revisões/ordem, vincula cursor a operação/filtros/grant/TTL e não salta item não entregue. | ✓ VERIFIED | HMAC/schema/namespace, DTOs congelados; teste nomeado65mensagens/55candidatos1/1; R184 cursor/restart/TTL/oversized; REAL3páginas consecutivas. |
| 02.5 | Buffer e próximos blocos respeitam política/token em pedidos paralelos isolados. | ✓ VERIFIED | Closure por request, referências e guards; R184 requests private/safe; dois streams nomeado1/1. |
| 03.1 | Âncora/vizinhas por referência reutilizam busca congelada e continuam antes/depois. | ✓ VERIFIED | sourceSnapshotId validado e openContext/readContextPage; R184 percurso111refs/bidirecional/redirect/histórico; REAL6calls. |
| 03.3 | Restrição atual prevalece em contexto/matchedEvidence/revisões/buffer. | ✓ VERIFIED | permittedMessage e referências no consumo; contexto bufferizado nomeado1/1; R184 redaction/âncora/vizinha. |
| 03.4 | Lista final exata de quatro ferramentas; nenhuma operação inventada chega ao WhatsApp. | ✓ VERIFIED | Quatro registerTool; schemas strict, sem socket/sessão no adapter; adversarial nomeado1/1 e spies readonly R184. |
| 04.3 | Interrupção/restrição/rotação impede próximos bytes e recibo completo, também concorrente. | ✓ VERIFIED | Streams com rotação nomeado1/1; gate de recibo parcial/corrupto/antigo nomeado1/1; R184 restrição/cleanup/processos. |
| 04.4 | Cópia real fica sem coletor e evidência privada/configuração são preservadas. | ✓ VERIFIED | restored offline, prova manifest-bound, collectorEnabled:false; snapshot/global TOML preservados nos registros e código de overrides/cleanup; inspeção0600/0700/clone sem trava. Fonte viva não foi reaberta. |
| 04.5 | Versões/protocolo/canal/recusas/hashes são revisáveis e não prometem VPS/histórico integral. | ✓ VERIFIED | Whitelist receipt, `completeAccount:false`, limites explícitos; R184 sanitização; README/ACCEPTANCE delimitam canal transitório. |
| G-MVP | A meta mode:mvp passa no user-story.validate canônico. | ✗ FAILED — BLOCKER | valid:false, errors3, slots:null. |
| G-CLEANUP | Último tracer não deixa sua credencial descartável vigente. | ✗ FAILED — BLOCKER | Leitura somente leitura:3chaves mcp-% e1token correspondente após18:24; finally não revoga/remove. |

**Score:**19/21 verdades verificadas;0 presentes com comportamento não exercitado. As3proibições ainda flagged não são absorvidas no score nem em passed. A soma verde de implementação não supera os guards/gaps finais.

### Required Artifacts

`query verify.artifacts` executado nos quatro PLANs:3/3,2/2,2/2,3/3, exit0cada — dez declarações, cinco caminhos únicos. Conteúdo e ligação foram lidos além da heurística.

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/mcp.ts` | Auth, rotação, guards, quatro tools/transferência | ✓ VERIFIED | Implementação substantiva montada em main; Archive/media reais e resultados no Codex. |
| `test/mcp.test.ts` | Invariantes e tracer real | ⚠️ WARNING | 29casos normais em R184, tracer separado real; cleanup do bearer posterior é G-CLEANUP. |
| `scripts/phase3-acceptance.mjs` | Cliente real e oráculos/recibo atual | ✓ VERIFIED | SQL/ICU/HTTP/disco independentes, processo nativo, correlação, WeakSet contra replay e cleanup abrangente. |
| `test/mcp-acceptance.test.ts` | Recibos negativos/cleanup/processos | ✓ VERIFIED | 11casos ativos R184; controles sintéticos reais de processos/SQLite; teste de binário negativo repetido1/1. |
| `03-ACCEPTANCE.md` | Evidência sanitizada | ✓ VERIFIED | Agregados conferem com prova privada; não é usado sozinho como evidência. |

### Key Link Verification

Heurística `query verify.key-links`:0/9, exit1por plano, JSON inspecionado. Não reconhece imports ESM `.js` para fontes `.ts` nem `from` descritivo não path. Isso é limite da declaração/heurística, não evidência de wiring ausente; nove ligações foram rastreadas manualmente.

| From | To | Via | Status | Details |
|---|---|---|---|---|
| main | mcp | import+app.use antes de parser/cookie | ✓ WIRED | `src/main.ts:14,56` argumentos archive/authDb/mediaDir. |
| mcp | media | openVerifiedAttachment/streamVerifiedAttachment | ✓ WIRED | Import11, GET86 e tool223; mesmo fd, hash e guards. |
| mcp test | Codex instalado | runCodex compartilhado | ✓ WIRED | Tracer condicionado ao modo real, executável nativo observado, dois destinos. |
| mcp | Archive | lista/busca/fuso/coverage | ✓ WIRED | Métodos chamados em148-173, SQL real em archive. |
| cursor | query_snapshots | mcp:generation/filtros/ordinal | ✓ WIRED | HMAC, session e filtros; snapshots materializados e consumidos. |
| get_context | Archive | openContext/readContextPage | ✓ WIRED | 188-196; DTOs sanitizados e ordem canônica. |
| get_context | search_messages | searchCursor/sourceSnapshotId | ✓ WIRED | 177-186 verifica operação/geração/TTL/hash/sessão. |
| aceite | Codex/TLS | spawn/overrides/CA/processo | ✓ WIRED | Calls/eventos/servidor correlacionados e TLS observado. |
| aceite | SQLite/disco/site | oráculo separado | ✓ WIRED | SQL readonly, HTTP site autenticado, ICU e disco/destino; não retorna resultado MCP como sua própria expectativa. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| find_conversations | conversations | conversations/messages/identity SQL | Sim; candidato real conferido | ✓ FLOWING |
| search_messages | messages/timestamps/filters | FTS por revisão → query_items → DTO/Temporal | Sim;13de128 reais,3páginas | ✓ FLOWING |
| get_context | anchor/messages/revisions/quote | messages/origins/revisions/attachments → snapshot | Sim;6janelas reais/20refs | ✓ FLOWING |
| get_attachment/GET | image/original bytes | fd privado, tamanho/SHA e política | Sim;2originais bytes iguais | ✓ FLOWING |
| queryCoverage | coverage/batchSummary | batches/history_statuses/messages SQL | Sim; contagens/intervalos mantidos, detalhes no status autenticado | ✓ FLOWING |

Arrays/nulls encontrados no scan são defaults de protocolo, ausência autenticada ou fatos desconhecidos do acervo, não um retorno estático que substitui consulta. `completeAccount:false` é limite factual deliberado.

### Behavioral Spot-Checks

Todos os testes nomeados abaixo foram executados por este verifier com Node24.21.0. Comando padrão: `mise exec node@24.21.0 -- node --test --test-reporter=tap --test-name-pattern='^<nome>$' <arquivo dist>` com TMPDIR privado na partição home. Cada execução teve um teste ativo, zero fail/cancel/skip/todo e exit0.

| Behavior/teste exato | Arquivo dist | Resultado | Status |
|---|---|---|---|
| arquivo ausente, parcial, corrupto ou antigo nunca conta como entrega | test/mcp-acceptance.test.js |1/1,493.512216ms|✓ PASS|
| MCP candidatos preservam homônimos grupo e identidades recebidas | test/mcp.test.js |1/1,660.537337ms|✓ PASS|
| MCP instruções fixas não promovem mensagem adversarial a ferramenta ou segredo | test/mcp.test.js |1/1,724.29589ms|✓ PASS|
| MCP continuação congela candidatos e mensagens sem perder ordinais por budget | test/mcp.test.js |1/1,1707.478824ms; envelope28827/32768|✓ PASS|
| rotacionar em outra conexão bloqueia resposta inline bufferizada e persiste ao restart | test/mcp.test.js |1/1,591.050333ms|✓ PASS|
| streams simultâneos com rotação interrompem sem publicar transferência completa | test/mcp.test.js |1/1,515.957818ms|✓ PASS|
| MCP contexto bloqueia continuação bufferizada por restrição e rotação | test/mcp.test.js |1/1,961.411611ms|✓ PASS|
| Build TypeScript | npm run build |exit0|✓ PASS|
| Inspeção privada assert-based SQL/transcript/bytes | node --input-type=module -e assertions | Calls/SQL/metadata/contexto/bytes passaram; assertion final de zerochaves MCP deu3!==0 |✗ FAIL — cleanup|
| Conferência privada posterior direcionada | node --input-type=module -e assertions |2originais iguais; integrado token ausente; tracer1token corresponde3chaves atuais |✗ FAIL — cleanup confirmado|
| Guard MVP | query user-story.validate --story Goal exata --raw |valid:false/errors3|✗ FAIL|
| Disposição negativa atual/proposta | probe-core.dispositionForProhibition |Atual3unverified; candidato test+evidência3green; semevidência3unverified|✓ FAIL-CLOSED|
| Diff | git diff --check |exit0|✓ PASS|

As quatro primeiras tentativas nomeadas usaram default/tmp e falharam antes das assertions, em writeFileSync/acquireServiceLock com `UNKNOWN: unknown error, write`. Não foram chamadas de produto nem RED funcional. Mesmos comandos/assertions passaram com TMPDIR privado home; nenhuma fonte/assertion/timeout foi modificada. A suíte atual R184 já havia sido executada nesse ambiente suportado. O verifier não repetiu a suíte inteira nem o fluxo de12chamadas.

### Probe Execution

Não há `scripts/*/tests/probe-*.sh` declarado nesta fase. O driver de prova real é `scripts/phase3-acceptance.mjs --mode real-codex`, com resultado preservado17:13:27.794Z; seus artefatos foram abertos e comparados nesta rodada, sem nova execução ou replay chamado de prova nova. Build, sete testes nomeados e owners foram executados independentemente. Self-test11 e regressão184 são resultados anteriores conferidos. A classificação spec-less não foi inventada.

### Requirements Coverage

Os cinco requisitos pertencem aos PLANs e ao ROADMAP; zero requisitos órfãos. Os estados globais continuam Pending até fechamento dos gaps e nova verificação.

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| MCP-01 |01/04|Cliente instalado, transporte protegido, bearer revogável/recusas|✓ Evidência local verificada; fase bloqueada|NativeCodex/TLS/protocolo/negativas/rotação; tracer cleanup pendente não é inexistência de revogação.|
| MCP-02 |02/04|Localização, AND/período/filtros/limites/continuação|✓ Evidência local verificada; fase bloqueada|SQL128/13em3páginas, freezer/HMAC/TTL/budget nomeado e R184.|
| MCP-03 |03/04|Contexto por referência e campos iguais ao site|✓ Evidência local verificada; fase bloqueada|6contextos,20refs,quote/edit/null,oráculoSQL/site/ICU.|
| MCP-04 |01/04|Original efetivamente recuperado com integridade e limite|✓ Evidência local verificada; fase bloqueada|4200/271485bytes disco/HTTP/destino; dois SHA e teste negativo de parcial/ausente/corrupto.|
| MCP-05 |01/02/03/04|Consulta local fechada, sem operações WhatsApp/instrução privilegiada|✓ Evidência local verificada; fase bloqueada|Adaptersem socket/quatrotools/spieszero/adversarial1/1; proibição ainda precisa descriptor canônico.|

### Decision Coverage

Owner `query check.decision-coverage-verify`: exit0, honored20/total20, not_honored[]. Message: “All trackable CONTEXT.md decisions are honored by shipped artifacts.” Conferência substantiva: D01cliente;D02bearer;D03rotação;D04tracer antes de expansão;D05IDs;D06AND/fuso;D07snapshot/cursor/budget;D08coverage/unknowns;D09contexto;D10DTO/proveniência;D11consumo;D12dados;D13originalID;D14inline/GET;D15bytes;D16estados;D17allowlist;D18cloneoffline;D19execução delegada;D20privacidade/whitelist. D03/D20 precisam do cleanup adicional do tracer final. O gate heurístico20/20 não apaga esse achado.

### Prohibitions — disposição atual e correção mínima

As três permanecem **unverified-prohibition — human review recommended**, sem VERDICT de LLM tratado como autoridade. Os testes existentes permitem resolver por enforcement determinístico, sem pedir um aceite manual inventado. O mapper real `validateProhibitionResolution({status:'resolved',verification:'test'})` retornoutrue. `dispositionForProhibition(prohibition,{enforcementEvidence:[ref]})` aceita uma lista de evidência executada; não exige nem justifica fabricar `check_*`.

| Statement existente | Enforcement executado pertinente | Disposição atual | Disposição proposta após regularização |
|---|---|---|---|
| MUST NOT chamar metadata, URL ou transferência parcial de arquivo recebido pelo Codex. | `test/mcp-acceptance.test.ts#arquivo ausente, parcial, corrupto ou antigo nunca conta como entrega`; REALarquivo novo/GET/disco |unverified/flagged:true/tier:null|verification:test,status:resolved + enforcementEvidence → green/false|
| MUST NOT descrever ausência no arquivo como inexistência no WhatsApp ou histórico integral. | `test/mcp.test.ts#MCP candidatos preservam homônimos grupo e identidades recebidas`; absence/completeAccount:false, coverage e instruções fixas |unverified/flagged:true/tier:null|verification:test,status:resolved + enforcementEvidence → green/false|
| MUST NOT transformar conversa arquivada em instrução privilegiada ou operação de escrita no WhatsApp. | `test/mcp.test.ts#MCP instruções fixas não promovem mensagem adversarial a ferramenta ou segredo`; readonly/spies em R184 |unverified/flagged:true/tier:null|verification:test,status:resolved + enforcementEvidence → green/false|

Em todas as três simulações, `verification:test` com lista vazia manteve unverified/flagged:true. A simulação de correção não foi aplicada aos PLANs nem é disposição final deles. Probes MCP-01/02/03/05 continuam unclassified/unresolved no detector; comportamento explícito foi conferido, sem transformar evidência em reclassificação fictícia. MCP-04 concurrency tem controles executados. Não foi encontrado `verification:backstop` declarado.

### Test Quality Audit

| Test/evidência | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|---|---|---:|---:|---|---|---|
| mcp.test normal |01-05|29|0|Comparações Archive provam reuso/paridade; não são usadas sozinhas para aceite real|Valores+sequências+recusas/cleanup|Substantivo; tracer cleanup precisa fix|
| mcp-acceptance.test |01/04/05|11|0|Controle positivo sintético não prova conta/cliente|Negativas estruturais, arquivo/destino, processos/SQLite reais de fixture|Adequado como gate, não substitui REAL|
| readonly/security/search/context/media/recovery |Transversal|Presentes em R184|0|Inputs sintéticos e invariantes declarados|Comportamental|Regressões preservadas|
| REAL cliente+SQL/site/disco |01-04|12calls|0|SQL,ICU,HTTP autenticado,originais e transcript independentes|Fluxo+metadados+bytes|Prova local concreta, amostrada|

Zero testes desabilitados ligados aos cinco requisitos. Fixtures do receipt contêm PID/booleans sintéticos propositalmente: seu PASS prova a política de rejeição, não que aquele PID é um Codex real. A prova REAL separada valida executável/processo/calls e SHA do binário instalado. Não se chamou um teste de paridade Archive de prova externa; o oráculo real chama SQL/site/ICU/disco. A mudança atual de timeout após o receipt integrado não alterou sucesso/query/media; foi inspecionada e tem RED semântico/R184. Não há dependência incidental nova identificada no produto; ambiente privado e clone offline são precondições declaradas.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| test/mcp.test.ts |174|finally sem revogação/remoção da credencial efêmera|BLOCKER|Estado final do último tracer mantém grant vigente; repro privado atual.|
| .planning/ROADMAP.md |71|Mode:mvp com Goal não canônica|BLOCKER de contrato|Guard explícito impede certification.|
| 03-04-PLAN.md |30|Proibições unresolved/descriptor-less|WARNING de contrato|Não podem ser silenciosamente verdes; regularização sustentada pelos testes já presentes.|
| src/auth.ts |71|CSRF web constrói Origin http://Host|INFO/deferred|HTTPS site nativo403; SCfase4 específica. MCP/TLS não usa essa autoridade.|

Nenhum TBD/FIXME/XXX sem follow-up nos arquivos modificados. Nulls e `return []` do parser de linhas não representam stub de dados. Não houve mudanças de frontend; diff public e módulos Archive/auth/media/WhatsApp contra baseline da fase3 vazio. UI review N/A não é aprovação visual da interface anterior.

### Security, review e regressões

Registro segurança13/13closed e reauditoria corretiva foram lidos, não confundidos com prova autônoma de cada claim. Código/negativas substantivas confirmam guards de autorização, input, cursor, buffer, arquivo, allowlist e receipt. Revalidação estruturada cobre seis pins,1586arquivos, audit0/smoke0 e comparação stage/ativo, preservando a auditoria transitive posterior à instalação original como desvio histórico. O verifier não reinstalou pacotes nem afirmou nova consulta ao registry.

REVIEW atual clean/0achados, canonicaldisposition2fixed/0open; REDs de WR-01/02 e código do wrapper foram lidos. R184 inclui sete controles atuais; WR-01 possui duas variantes de processosLinux. TDDgate reconhece somente03-02/03-03,passed/0violations; REDs01/04/review são evidências separadas, não “quatro planos reconhecidos”. Nenhum destes gates cobre o novo cleanup final encontrado pelo verifier.

As verificações anteriores1/2 foram lidas para escopo de regressão, sem assumir fingerprints frescos após sourcechanges. R184 contém regressões anteriores; não se repetiu pareamento, conexão real, comparação de celular ou fonte viva. milestone.lock e trabalhos alheios foram preservados.

### Human Verification Required

Nenhuma intervenção humana indispensável foi identificada. O fluxo do Codex foi efetivamente observado por execução delegada e inspecionado; correções restantes cabem ao agente nos acessos disponíveis. O guard precisa normalização canônica, não aprovação inventada. As flags negativas continuam visíveis até se ligar o enforcement formal. Não há claim de nova aceitação humana, renderização visual de inline, dispositivos físicos ou VPS.

### Deferred Items

| Item | Addressed In | Evidence |
|---|---|---|
| HTTPS/proxy/login web e supervisão da VPS |Phase4|SC1 explícita e WINDOWS13/deferred-items|
| Backup externo recorrente, restore operacional e fluxo real restaurado |Phase4|SC2-SC4 explícitas|

Nenhum gap MVP/proibição/cleanup foi transferido à fase4: não existe critério posterior específico que o assuma. Claude/OAuth/bridges/OCR/IA/SQL livre são opt-outs, não requisitos faltantes.

### Gaps Summary

Há três grupos acionáveis: (1) normalização documental da Goal, (2) ligação canônica de três proibições a enforcement executado, (3) cleanup do bearer descartável do último tracer. A fase permanece gaps_found. O receipt integrado17:13 era íntegro e limpou sua credencial; isso não prova que o tracer posterior18:24 limpou a dele. O erro foi reproduzido por leitura privada, sem tocar fonte viva ou conteúdo restrito.

Para normalizar Goal, o workflow real `gsd-phase --edit 3 --force` referencia `gsd-core/workflows/edit-phase.md`: lê/substitui somente a seção exata, captura `query roadmap milestone-scope` antes/depois, preserva número/posição/SC/outros e faz rollback se escopo muda. Nenhum handler SDK de mutação de Goal foi encontrado; não inventar um. A User Story já presente nos PLANs pode normalizar a forma sem ampliar sentido. Este verifier não editou contratos, tracking ou fonte.

Fingerprint foi obtido de `query verification.fingerprint` e copiado com o conjunto retornado. PLAN/SUMMARY foram incluídos pelo owner; relatório, dados privados, logs ignorados e paths externos não fazem parte dele. Mudança de contrato/fix exigirá reverificação e digest novo.

---

_Verified: 2026-10-12T19:14:57Z_
_Verifier: gsd-verifier_

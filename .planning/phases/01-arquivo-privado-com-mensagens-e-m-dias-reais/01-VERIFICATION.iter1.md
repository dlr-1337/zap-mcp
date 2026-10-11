---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
verified: 2026-10-11T04:22:38Z
status: gaps_found
score: 88/88 must-haves verified
covered_files: [".env.example",".gitignore",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-01-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-01-SUMMARY.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-02-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-02-SUMMARY.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-03-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-03-SUMMARY.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-04-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-04-SUMMARY.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-05-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-05-SUMMARY.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-06-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-06-SUMMARY.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-07-PLAN.md",".planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-07-SUMMARY.md","README.md","package-lock.json","package.json","public/app.js","public/index.html","public/style.css","src/archive.ts","src/auth.ts","src/backup.ts","src/main.ts","src/media.ts","src/whatsapp.ts","test/archive.test.ts","test/auth-state.test.ts","test/auth.test.ts","test/backup.test.ts","test/collector.test.ts","test/coverage.test.ts","test/http.test.ts","test/media.test.ts","test/readonly.test.ts","test/recovery.test.ts","test/revisions.test.ts","test/security.test.ts","tsconfig.json"]
covered_digest: "v3:sha256:dd57bec07332024d111fc536f8533ae0e278edaf3ce4526d34882e1d29833a0a"
behavior_unverified: 0
overrides_applied: 0
flagged_prohibitions: 3
decision_coverage:
  honored: 20
  total: 20
  not_honored: []
gaps:
  - truth: "A meta da fase mode:mvp passa no guard canônico de User Story do ROADMAP."
    status: failed
    reason: "query user-story.validate sobre Goal literal retornou false; o enquadramento equivalente existe nos planos, mas não substitui o campo exigido pelo guard."
    artifacts:
      - path: .planning/ROADMAP.md
        issue: "Goal está em frase descritiva, fora de As a ... I want to ... so that ..."
    missing:
      - "Orquestrador atualizar somente o formato canônico equivalente já autorizado, preservando meta e cinco critérios; repetir guard e fingerprint."
prohibition_review_items:
  - statement: "O Zap MCP não envia, edita, apaga nem confirma leitura no WhatsApp em nome do proprietário; acks de entrega/sincronização do protocolo não são leitura."
    verification: judgment
    status: unverified
    flagged: true
    verdict: "NON-AUTHORITATIVE LLM-judge: evidência favorável de código e teste; não observada violação"
    reason: "unverified-prohibition — human review recommended; classificação judgment/unresolved atual exige flag conforme ADR-550 D4"
    enforcement_evidence: "test/readonly.test.ts#HTTP privado status/QR/leitor/logout é somente leitura e funciona offline"
  - statement: "O produto não apresenta material ausente como inexistente nem lote concluído como histórico integral da conta; só afirma o que foi recebido/verificado."
    verification: judgment
    status: unverified
    flagged: true
    verdict: "NON-AUTHORITATIVE LLM-judge: evidência favorável de código e teste; não observada violação"
    reason: "unverified-prohibition — human review recommended; classificação judgment/unresolved atual exige flag conforme ADR-550 D4"
    enforcement_evidence: "test/coverage.test.ts#HTTP cobertura distingue ausência, commits, intervalo original, replay e falhas"
  - statement: "A captura não contorna visualização única nem recupera conteúdo temporário indisponível por bypass; só retém conteúdo normalmente disponibilizado e metadados permitidos."
    verification: judgment
    status: unverified
    flagged: true
    verdict: "NON-AUTHORITATIVE LLM-judge: evidência favorável de código e teste; não observada violação"
    reason: "unverified-prohibition — human review recommended; classificação judgment/unresolved atual exige flag conforme ADR-550 D4"
    enforcement_evidence: "test/revisions.test.ts#viewOnce bloqueado antes de normalizar, incluindo quote, key e mídia"
---

# Fase 1: Arquivo privado com mensagens e mídias reais — Verification Report

**Phase Goal:** O proprietário consegue vincular sua conta sem navegador e consultar um arquivo privado durável de mensagens e anexos efetivamente recebidos, inclusive sem conexão com o WhatsApp.
**Verified:** 2026-10-11T04:22:38Z
**Status:** gaps_found
**Re-verification:** Não — primeira verificação; nenhum VERIFICATION anterior encontrado.

A implementação tem evidência favorável de conquista da capacidade local. O encerramento formal em modo MVP está recusado pelo guard de formato: a meta literal retorna `false` em `query user-story.validate`. O enquadramento equivalente autorizado já existe no Plano07. A lacuna é documental e pertence ao orquestrador; nenhuma mudança de produto ou nova confirmação pelo celular é exigida.

**Aviso proeminente:** três proibições permanecem `verification: judgment` e `status: unresolved` no Plano07. Os vereditos abaixo são **NON-AUTHORITATIVE LLM-judge — unverified-prohibition — human review recommended**. Testes negativos atuais e inspeção favorecem as três, mas não transformam automaticamente julgamento em decisão humana. A classificação do contrato deve ser reconciliada pelo autor/orquestrador, preservando o histórico e a flag; após corrigir somente formato, essas flags ainda impedem `passed` e roteiam para `human_needed` enquanto permanecerem como julgamento não resolvido.

## User Flow Coverage

Enquadramento equivalente já autorizado: «As a proprietário da conta, I want to vincular sem navegador e consultar o arquivo privado durável de mensagens e anexos efetivamente recebidos, so that eu possa recuperar esse material inclusive sem conexão com WhatsApp.»

| Passo | Resultado esperado | Evidência independente | Status |
| --- | --- | --- | --- |
| Entrar/sair | Acesso privado revogável | Login/logout/reset/TTL/CSRF nomeados verdes; HTTP real autentica e recusa anônimo; sessão HttpOnly/no-store | ✓ VERIFIED |
| Vincular | QR privado sem browser no coletor | createCollector Baileys encapsulado, QR vigente por geração; pareamento real já concluído; GET autenticado atual confirma conexão | ✓ VERIFIED |
| Capturar e conferir | Material efetivamente recebido com proveniência | Lotes atuais9.060 recebidos e9.060 confirmados, zero falhas/pendentes; Web26 IDs individuais/27 grupo; referências e metadados locais | ✓ VERIFIED |
| Baixar originais | Quatro formatos em armazenamento privado | Descriptor de origem, disco, HTTP atual, snapshot e restore conferidos por tamanho/SHA256 sem publicar valores; arquivo Chrome específico também conferido | ✓ VERIFIED |
| Recuperar sem WhatsApp | Leitor e bytes duráveis independentes do socket | Restore com8.684 mensagens/828 disponíveis; integridade/FK e seis tabelas idênticas ao snapshot; testes offline e prova operacional autenticada | ✓ VERIFIED |
| Guard de modo | Goal canônica do ROADMAP válida | `query user-story.validate --story <Goal literal> --pick valid` → false | ✗ FAILED — BLOCKER documental |

Checks técnicos a seguir são verificações independentes de capacidade; não contornam o guard nem certificam aceite formal em modo MVP.

## Goal Achievement

### Observable Truths

As cinco verdades do ROADMAP são o contrato. Dos105 itens dos sete planos,22 restatamentos foram incorporados nas SC correspondentes;83 refinamentos adicionais, incluindo61EPs, estão explicitados no apêndice. Nenhum SC foi removido. Proibições são checagens negativas separadas, com flag preservada.

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| SC1 | O proprietário entra e sai da interface privada, vincula a conta pelo QR no celular sem navegador no coletor e vê o estado da conexão; acesso sem credencial ao QR ou ao acervo, inclusive por ID/URL direto, é recusado. Credenciais e chaves não aparecem no Git, logs ou respostas, e conteúdo recebido é tratado como dado sem execução privilegiada. | ✓ VERIFIED | src/auth.ts:21–104; src/main.ts:42–88; src/whatsapp.ts:55–218. Login/logout/TTL/revogação, QR e HEAD/Range passaram; HTTP real atual conectado e anônimo401. |
| SC2 | Em uma conversa real conhecida, a comparação autorizada com WhatsApp Web confere as mensagens de cada lote recebido e novas mensagens individuais/de grupo, recebidas ou enviadas pela própria conta, com referência estável, chave de origem, autoria/direção, data original, tipo, texto/legenda, citação e estados de anexos; campos desconhecidos ficam explícitos e homônimos ou identidades PN/LID não são mesclados sem evidência. | ✓ VERIFIED | src/archive.ts:154–325; FULL/PN-LID/rollback e revisões nomeados passaram. Provas CUA externas registram26 IDs individuais e27 do grupo; conteúdo bruto/instante desconhecido preservados. |
| SC3 | O proprietário reabre conversas e anexos já arquivados com o WhatsApp desconectado; após reinício/reconexão, uma sessão ainda válida retoma sem novo QR por perda de chaves locais, mantém um único coletor e conserva mensagens sem duplicação ou regressão de atualizações quando eventos são repetidos ou chegam fora de ordem. | ✓ VERIFIED | src/whatsapp.ts:16–95/106–218, src/archive.ts:154–177, src/backup.ts:156–248. Testes de dez categorias/retries/replay/gate passaram; snapshot/restore íntegros e prova privada de reconexão sem QR. |
| SC4 | Áudios, imagens, vídeos e documentos acessíveis começam a ser preservados junto da ingestão e seus bytes originais ficam disponíveis offline somente após conferência de tamanho/hash; o proprietário distingue pendência, falha recuperável e indisponibilidade, observa retomada após interrupção com tentativas/concorrência limitadas e não perde material já salvo quando uma mídia falha ou o disco fica sem espaço. | ✓ VERIFIED | src/archive.ts:289–300 e src/media.ts:31–74/169–273. Testes originais/tamanho/concorrência/tentativas/ENOSPC/crash/lease passaram. Quatro formatos reais fonte→disco→HTTP→snapshot→restore conferidos. |
| SC5 | O proprietário vê última sincronização, intervalo observado, falhas, edições/revogações com momento de observação e o conteúdo anteriormente capturado identificado como histórico; tipos desconhecidos e conteúdo temporário não recuperado permanecem explícitos. A comparação com WhatsApp Web registra a cobertura realmente observada, e ausência é descrita como “não encontrado no acervo”, sem promessa de histórico integral. O usuário dispensou a comparação manual pelo celular em 2026-10-11. | ✓ VERIFIED | src/archive.ts:154–177/335–373 e public/app.js:37–94/143–158. Caso coverage e edit/revoke passaram; lote9.060/9.060/0/0; comparação Web explícita parcial, sem promessa integral. |

**Score:** 88/88 verdades de implementação verificadas;0 presentes sem exercício comportamental. Esse escore não suprime o blocker de formato ou as três flags de proibição.

### Required Artifacts

O helper `query verify.artifacts` foi executado para os sete planos:27/27 declarações passaram, com repetição de arquivos compartilhados. Leitura direta confirmou implementações, não stubs. Testes são executáveis de node:test; documentos/configuração ligam-se aos comandos/runtime, sem exigir import de documento.

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `package.json` | Pins pesquisados, build, start e test Node24 | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `src/main.ts` | preflight e serviço privado já implementados nos planos anteriores | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `src/auth.ts` | Senha local e Store SQLite revogável | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/auth.test.ts` | Tracer HTTP real com read/write/restart e contratos de autenticação | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `public/index.html` | HTML semântico pt-BR e leitor único | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `src/archive.ts` | Migrations, ingestão transacional, consultas/DTO seguro e cobertura | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/archive.test.ts` | FULL/notify/append, identidade, origens e atomicidade | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/revisions.test.ts` | Revisões, tombstones e restrições antes da normalização | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/coverage.test.ts` | Lotes e falhas com contagem durável | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `src/whatsapp.ts` | Auth transacional, socket encapsulado, seis estados e retries | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/auth-state.test.ts` | Dez categorias, buffers/proto/null/rollback/restart | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/collector.test.ts` | Eventos/QR/desconexões e exclusividade em subprocesso | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/readonly.test.ts` | Consultas não escrevem no WhatsApp | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `src/media.ts` | Stream de originais, fila, leases e reconciliação | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/media.test.ts` | Quatro formatos, tamanho/hash e disponibilidade offline | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/recovery.test.ts` | Crash de processo, rollback e ENOSPC controlado | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `public/app.js` | Estados/copy/DOM seguro e navegação | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `public/style.css` | Tokens, foco/reflow e responsividade do contrato | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/http.test.ts` | Rotas limitadas privadas e offline GET/HEAD/Range | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/security.test.ts` | Dados hostis e vazamentos negativos observáveis | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `src/backup.ts` | Snapshot/restore/manifest e recibo verificado privados | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `test/backup.test.ts` | Snapshot coerente, restore e gate sem QR | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `README.md` | Resultado seguro de piloto, limites e situação real | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |
| `.env.example` | ZAP_DATA_DIR e ZAP_PORT sem segredo ou caminho real | ✓ VERIFIED | Presente e substantivo; leitura direta, uso no bootstrap/HTTP/worker/CLI ou caso node:test; dados dinâmicos rastreados abaixo. |

### Key Link Verification

O helper `query verify.key-links` retornou1/18: reconheceu o import do teste, mas não resolveu imports ESM `.js` contra artefatos fonte `.ts`, callbacks/DI, HTTP ou SQL compartilhado. Cada link foi rastreado manualmente no código abaixo; resultado heurístico negativo não foi apresentado como ausência real de wiring.

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/main.ts` | `src/auth.ts` | express-session usa Store SQLite e gate comum | ✓ WIRED | import .js em ESM; createWebAuth(authDb), middleware, requireOwner antes de lookup e logout/reset. |
| `public/app.js` | `src/main.ts` | login e leitura por rotas locais autenticadas | ✓ WIRED | fetch autenticado em request(), enter(), list(), openConversation(), refreshStatus() e attachmentBlock(). |
| `test/auth.test.ts` | `src/main.ts` | servidor real em loopback e banco temporário privado | ✓ WIRED | import createService; HTTP real loopback e assertivas persistência/restart. |
| `src/main.ts` | `src/archive.ts` | createService usa openArchive e listConversations/readConversation | ✓ WIRED | openArchive(dataDir), listConversations/readConversation/getCoverage e openVerifiedAttachment. |
| `src/archive.ts` | `public/app.js` | DTO de evidência e cobertura consumido no leitor | ✓ WIRED | archive.dto/getCoverage → rotas JSON de main → messageItem/evidence/refreshStatus. |
| `src/whatsapp.ts` | `src/archive.ts` | callbacks history/upsert/update/contact/group alimentam ingestão confirmada | ✓ WIRED | Callbacks ingestHistory/Upsert/Updates/Contacts/Groups usam Archive fornecido pelo bootstrap. |
| `src/main.ts` | `src/whatsapp.ts` | bootstrap separado, gate pré-piloto e status/QR sem expor socket | ✓ WIRED | startCollector() com lock/authDb/archive; snapshot/pairing encapsulados. |
| `src/archive.ts` | `src/media.ts` | commit de attachment/job é reservado transacionalmente pelo worker | ✓ WIRED | INSERT attachments/media_jobs no commit → startMediaWorker.claim lê/reserva as mesmas tabelas. |
| `src/whatsapp.ts` | `src/media.ts` | downloadOriginal interno usa downloadMediaMessage stream e updateMediaMessage permitido | ✓ WIRED | import mediaDispatcher; downloadOriginal usa downloadMediaMessage stream e callback de renovação guardado por geração. |
| `src/main.ts` | `src/archive.ts` | download ID lê só final verificado local | ✓ WIRED | openArchive(dataDir), listConversations/readConversation/getCoverage e openVerifiedAttachment. |
| `public/app.js` | `src/main.ts` | lista/leitor/status/QR/anexo consomem só DTO privado | ✓ WIRED | fetch autenticado em request(), enter(), list(), openConversation(), refreshStatus() e attachmentBlock(). |
| `src/main.ts` | `src/auth.ts` | gate antes de lookup/HEAD/Range e sessão revogável | ✓ WIRED | import .js em ESM; createWebAuth(authDb), middleware, requireOwner antes de lookup e logout/reset. |
| `src/main.ts` | `src/archive.ts` | mesma fonte de evidência consulta offline | ✓ WIRED | openArchive(dataDir), listConversations/readConversation/getCoverage e openVerifiedAttachment. |
| `src/main.ts` | `src/backup.ts` | comandos offline compartilhando trava e gate antes de --collect | ✓ WIRED | Comandos backup/restore/verify-backup/preflight e assertCollectorReady antes do socket real. |
| `src/backup.ts` | `src/archive.ts` | restauração usa banco/FK/contagens e mesma consulta offline | ✓ WIRED | Consulta SQL/FK/hash de snapshot e verifyOffline() importam createService e servem o mesmo arquivo local. |
| `src/backup.ts` | `src/media.ts` | manifest/hash conferem originais de snapshot fechado | ✓ WIRED | Consulta SQL/FK/hash de snapshot e verifyOffline() importam createService e servem o mesmo arquivo local. |
| `README.md` | `src/main.ts` | procedimento validado corresponde aos comandos/capacidades reais | ✓ WIRED | CLI dist/src/main.js serve/backup/restore/verify-backup/preflight corresponde aos handlers reais. |
| `src/main.ts` | `src/backup.ts` | preflight exige cópia/restore antes de abrir QR | ✓ WIRED | Comandos backup/restore/verify-backup/preflight e assertCollectorReady antes do socket real. |

### Data-Flow Trace (Level 4)

| Artifact | Valor | Fonte | Produz dados reais | Status |
| --- | --- | --- | --- | --- |
| public/app.js list/openConversation | Conversas e messages | fetch autenticado → main → archive SQL parametrizado em conversations/messages/origins/revisions/attachments | Leitor HTTP atual percorreu os quatro exemplos e manteve referência, instante e anexo disponíveis | ✓ FLOWING |
| public/app.js evidence/messageItem | Autoria/direção/texto/citação/histórico | dto(reference) e evidence/revisions persistidos; data original não é observedAt | null explícito para faltantes; fromMe identifica conta, sem inferir aparelho | ✓ FLOWING |
| public/app.js refreshStatus | Conexão, intervalo, lotes, falhas | snapshot encapsulado + getCoverage transacional; SQL batches/history_statuses/messages | Atual conectado, completeAccount=false,9.060/9.060/0/0 | ✓ FLOWING |
| attachmentBlock e GET/HEAD/Range | Bytes de original | Attachment available → openVerifiedAttachment → arquivo privado por ID interno → SHA256/tamanho → stream fd | Quatro formatos reais HTTP200/Range206; anônimo401 | ✓ FLOWING |
| whatsapp→archive→media | Captura/job | callbacks de eventos→journal+projeção/attachment/job→claim transacional→downloadMediaMessage stream |8.684 mensagens/828 disponíveis; quatro descritores de origem correspondem aos bytes | ✓ FLOWING |
| backup/restore | Acervo offline | snapshot privado fechado + manifesto + validação SQL/hash → restore isolado | Seis tabelas snapshot↔restore idênticas; quatro originais conferidos novamente | ✓ FLOWING |

### Behavioral Spot-Checks

Execução própria com Node24.21.0 em casos nomeados, sem repetir suíte completa, build, pareamento ou reparo. Cada caso terminou em menos de10s; total da seleção foi6,105s. Fixtures gravaram somente diretórios sintéticos temporários próprios. Nenhum servidor persistente foi iniciado/parado; HTTP real usou o serviço existente e sua credencial em processo, sem divulgar segredo/cookie.

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Login/logout/reset/TTL/CSRF/limites/revogação | `node --test --test-name-pattern '<nomes exatos de autenticação>' dist/test/auth.test.js`, incluído na seleção única |7 casos nomeados de autenticação verdes | ✓ PASS |
| Lotes/identidades/replay/revisão/restrição | Seleção nomeada em archive/revisions/coverage | FULL, PN/LID, rollback, original preservado, edit/revoke, viewOnce, cobertura verdes | ✓ PASS |
| QR/chaves/retries/geração/readonly | Seleção nomeada auth-state/collector/readonly/security/http | Dez categorias, QR expira, geração velha recusada, retries limitados, rotas privadas e offline verdes | ✓ PASS |
| Originals/fila/disco/crash/backup | Seleção nomeada media/recovery/backup | Quatro originais, tamanho/hash, máximo2/5, ENOSPC, SIGKILL/reconcile, lease/stream tardio e gate verdes | ✓ PASS |
| Resultado global da seleção | `node --test --test-name-pattern '<28 casos descritos abaixo>' dist/test/{auth,archive,auth-state,collector,coverage,http,media,readonly,recovery,revisions,security,backup}.test.js` |28 pass,0 fail,0 skipped,0 cancelled;6,105s | ✓ PASS |
| Prova real independente readonly | Node em processo com better-sqlite3 readonly, SHA256 e HTTP loopback existente | Fonte/snapshot/restore8.684/828; SQL/FK OK; seis tabelas iguais; quatro hashes origem/disco/snapshot/restore/HTTP; Chrome33.529B igual; anônimo GET/HEAD/Range401 | ✓ PASS |
| Guard MVP | `node /home/otavio/.codex/gsd-core/bin/gsd-tools.cjs query user-story.validate --story '<Goal literal>' --pick valid` | false | ✗ FAIL — lacuna documental |

Os28 casos executados: FULL conserva; PN/LID tardio; falha SQL desfaz; dez categorias; autentica e reabre; logout duplo; login concorrente; reset revoga; TTL idle; revogação resiste; falha ENOSPC/SQL da cópia; QR atual expira; reconexão seis retries; HTTP cobertura; HTTP janelas; HTTP estado/QR; quatro originais; tamanho n-1/n/n+1; HTTP readonly offline; máximo2/tentativas4/5/6; reserva/ENOSPC; crash após job/part/publicação/beforeAvailable; lease vencida; gate de restore; replay original conserva; edit antes do original/revoke; viewOnce; HTTP nega HEAD/Range/paths/vazamentos.

**Evidência anterior distinta:**86/86 da suíte completa anterior à alteração textual e12/12+29 assertivas da revisão independente; build atual+13 testes auth/HTTP/security/readonly em6,92s fornecidos pelo orquestrador. Não são reexecuções desta verificação.

### Probe Execution

Não há `scripts/*/tests/probe-*.sh` nem probe declarada nos planos/summaries. N/A; nenhuma alegação de PASS de probe foi usada como prova. O procedimento de preflight existe e tem casos nomeados de gate; não foi repetido no perfil ativo, pois exige serviço parado.

### Real Pilot Evidence and Limits

Reavaliação própria leu as provas privadas somente em processo e publicou agregados. Conta vinculada e único coletor ativos; snapshot/restore pós-reparo têm8.684 mensagens e828 originais; sourceStoppedDuringRestore/restoredCollectorDisabled/reconnectedWithoutQR são registrados em prova operacional. As seis tabelas messages/revisions/attachments/media_jobs/batches/batch_items foram comparadas integralmente entre snapshot e restore; fonte permanece sujeita a novas capturas.

Conversa individual:26 IDs comuns,21 textos,20 datas originais e23 direções comparáveis coincidem. Uma edição tem instante original não recebido, mantido desconhecido; uma notificação de sistema e mídias sem direção visível não foram aprovadas por inferência. Grupo:27 IDs, dez datas e sete autores comparáveis; oito textos literais coincidem e duas diferenças de apresentação (menção/formatação) permanecem documentadas. Isso comprova o recorte observado; não compara cada mensagem de toda a conta ao Web.

Áudio/imagem/vídeo/documento foram correlacionados pelo mesmo ID de origem no Web. Os hashes plaintext recebidos nos descritores coincidem com arquivos fonte, snapshot, restore e HTTP atual. `webBytesVerified` permanecefalse para os quatro: não há prova de bytes baixados diretamente do Web. O download específico de áudio pelo Chrome normal tem33.529 bytes, mesmo hash do attachment e registro de100 linhas visíveis após reparo; é prova de download do produto. Nenhum histórico/perfil de downloads Chrome foi acessado.

Reparo anterior:244 projeções recuperadas ao reprocessar313 itens recebidos;828 originais preservados; dois conflitos não equivalentes ou sem prova de equivalência continuam explícitos. Três mensagens novas entre snapshots (duas da própria conta/uma recebida) são dados de integração, sem envio pelo Zap MCP. `fromMe` não indica celular ou outro dispositivo.

### Requirements Coverage

| Requirement | Source Plan | Descrição resumida | Status | Evidence |
| --- | --- | --- | --- | --- |
| PRIV-01 |01/05/07 | Entrar/sair e sessão privada | ✓ SATISFIED | auth/HTTP casos nomeados + acesso real |
| PRIV-02 |01/03/04/05/06/07 | Gate uniforme de QR/dados/bytes | ✓ SATISFIED nas rotas atuais | HTTP GET/HEAD/Range401; QR revalida sessão; novas superfícies exigem nova verificação |
| PRIV-03 |01/02/03/04/05/06/07 | Segredos fora das interfaces; dado inerte | ✓ SATISFIED no escopo local | DTO allowlist/logger silent/textContent/CSP/octet-stream/0700/0600; security nomeado |
| SYNC-01 |03/05/07 | QR privado sem navegador no coletor | ✓ SATISFIED | Baileys socket, QR real já lido e conexão atual |
| SYNC-02 |02/04/07 | Todos os itens recebidos | ✓ SATISFIED | journal/commits por item; FULL nomeado;9.060 recebidos/confirmados |
| SYNC-03 |02/03/04/07 | Novas entradas e próprias individuais/grupo | ✓ SATISFIED no material recebido | upsert notify/append e chave participante/direção; comparação Web;3 novas entre snapshots |
| SYNC-04 |03/06/07 | Sessão durável e único coletor | ✓ SATISFIED | Dez categorias teste reinício; lock antes do socket; prova real reconectou sem QR |
| SYNC-05 |02/03/07 | Replay/ordem/identidades | ✓ SATISFIED | PN/LID/replay/revisões nomeados; equivalência conservadora de corpo; conflitos preservados |
| SYNC-06 |02/05/07 | Edit/revoke/temporários explícitos | ✓ SATISFIED | source_time/observed_at separados; histórico permitido; viewOnce sanitizado |
| SYNC-07 |02/05/07 | Cobertura/falhas sem promessa integral | ✓ SATISFIED | getCoverage + completeAccount=false e UI de ausência/limites |
| EVID-01 |02/04/05/07 | Referência/origem/autoria/tempo/tipo/citação/anexo | ✓ SATISFIED | DTO de SQL e projeção; quatro exemplos SQL→HTTP; Web parcial sem inventar faltantes |
| MEDIA-01 |04/07 | Preservação imediata de quatro originais | ✓ SATISFIED | job no commit + worker; hashes plaintext de quatro formatos reais |
| MEDIA-02 |04/05/06/07 | Estado disponível só após integridade | ✓ SATISFIED | pipeline/fsync/no-replace/commit; openVerifiedAttachment; bytes reais |
| MEDIA-03 |04/05/06/07 | Recuperação, limites e espaço | ✓ SATISFIED | concorrência2/tentativas5/reserva/lease/crash/ENOSPC nomeados |
| WEB-01 |01/03/04/05/06/07 | Leitor privado inclusive offline | ✓ SATISFIED | UI nativa→HTTP→SQL; restore offline autenticado e teste readonly |

15/15IDs contabilizados; nenhum requisito da Phase1 órfão. PRIV-02/03 continuam transversais: busca/exportação/MCP/HTTPS serão verificados quando essas superfícies existirem. Não foram marcados requisitos nem STATE como concluídos por este agente.

### Decision Coverage

`query check.decision-coverage-verify`:20/20 decisões rastreáveis honradas, not_honored=[]; gate não bloqueante. Mensagem do handler: **All trackable CONTEXT.md decisions are honored by shipped artifacts.** Trechos antigos de Context que ainda mencionam celular/comparação pendente são histórico desatualizado diante de D20/Plano07/SC atuais e instrução explícita2026-10-11; não criam gate de telefone novo.

### Test Quality Audit

| Test File | Linked Req | Ativos/seleção | Skipped | Circular | Assertion Level | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| auth/http/security/readonly | PRIV01/02/03, WEB01, SYNC01 | Casos nomeados rodados |0 | Não identificado | Behavioral + valores/bytes + sentinelas privadas | Conforme |
| archive/revisions/coverage | SYNC02/03/05/06/07, EVID01 | Casos nomeados rodados |0 | Não identificado | Referências/linhas/revisões/tempo/texto esperado independente | Conforme |
| auth-state/collector | SYNC01/04/05 | Casos nomeados rodados |0 | Não identificado | Reinício/rollback/gerações/retries/QR | Conforme |
| media/recovery/backup | MEDIA01/02/03, WEB01, SYNC04 | Casos nomeados rodados |0 | Não identificado | Bytes fixture conhecidos, hash, crash/ENOSPC/lease/gate | Conforme |
| Provas Web privadas | SYNC02/03/07,EVID01 | Captura CUA externa registrada |N/A | Oráculo Web distinto do acervo | ID/texto/instante/direção/autoria parcial | Válido para recorte; duas diferenças de apresentação não aprovadas literalmente |
| QA UI sintético anterior | WEB01,PRIV01/02/03 |6 checks,13 imagens,0 erros registrados;3 pixels reinspecionados |N/A | Não identificado | Fluxo, teclado, download, gerações/401/500 | Evidência anterior; não é pixel atual |

Nenhum test.skip/test.todo, debt markerTBD/FIXME/XXX ou gerador de oráculo circular encontrado no código/testes vinculados. Escritas de teste são entrada/fault injection em temporários; não geração de valores esperados pelo próprio SUT. Testes HTTP sozinhos não provam aparência: pixels e QA anterior estão explicitamente separados.

### Prohibitions — NON-AUTHORITATIVE LLM-judge

| Item | Evidência atual | Veredito de implementação | Disposição do contrato |
| --- | --- | --- | --- |
| Sem enviar/editar/apagar/confirmar leitura no WhatsApp | Socket encapsulado; só leitura/renovação de locator interna; teste readonly espionando operações proibidas e rotas de escrita404 executado | Evidência favorável; nenhuma violação observada | ⚠️ UNCERTAIN (WARNING): unverified-prohibition — human review recommended enquanto judgment/unresolved |
| Sem ausência=inexistência ou lote=histórico integral | completeAccount=false, copy “não encontrado no acervo”, lotes/intervalo/falhas; coverage nomeado + HTTP real atual | Evidência favorável | ⚠️ UNCERTAIN (WARNING): mesma flag |
| Sem bypass viewOnce/temporário indisponível | restricted/permitted antes do journal/payload/quote; worker/downloadOriginal recusam viewOnce; teste viewOnce nomeado executado | Evidência favorável | ⚠️ UNCERTAIN (WARNING): mesma flag |

Owner da reconciliação: autor/orquestrador do01-07-PLAN. Pode preservar a razão histórica do fallback e projetar verificação determinística com os testes negativos reais como enforcement evidence, ou manter judgment com review flag. Este relatório não altera contrato nem atribui aprovação humana inexistente. Não existe falta observável de implementação dessas proibições.

### Anti-Patterns Found

| File | Linha | Padrão | Severity | Impact |
| --- | --- | --- | --- | --- |
| .planning/ROADMAP.md | Phase1 Goal | mode:mvp + frase fora do formato | BLOCKER documental | Guard canônicofalse; encerramento recusado |
| 01-07-PLAN.md | prohibitions | judgment/unresolved do fallback ainda vigente | WARNING |3flags preservadas por política; evidência favorável não é decisão humana |
| 01-CONTEXT.md | specifics/code_context | Texto histórico antigo pede comparação celular | INFO | Instrução/D20 atuais prevalecem; não bloqueia nem justifica pedir telefone |
| public/app.js/source | vários | null/[] defaults/guards | INFO | Initial state e ausência segura; SQL/fetch populam dados, não stub |
| Evidência UI atual | N/A | Captura CUA timeout | INFO | Sem pixel atual; QA anterior e assertivas atuais identificados sem falsa certificação visual |

### Human Verification Required

Nenhuma nova intervenção de pareamento ou comparação pelo celular. As três proibições recebem revisão humana **recomendada**, não uma pergunta de reconfirmação. O modo autônomo preserva flag e veredito não autoritativo; eventual reconciliação determinística pertence ao orquestrador. Não há outra verdade PRESENT_BEHAVIOR_UNVERIFIED.

### Deferred Items / Scope

Não surgiu lacuna de implementação claramente remetida a outra fase. Busca/filtros/abas/preview/ZIP são Phase2; MCP/entrega no Codex são Phase3; VPS/HTTPS/supervisão e backup fora da VPS são Phase4. A proteção pré-piloto local está comprovada; não foi confundida com a operação final externa.

### Gaps Summary

Uma lacuna documental bloqueia o encerramento formal: Goal literal em mode:mvp falha no guard canônico. Preservar meta/SC e trocar somente enquadramento resolve a causa sem mudança de produto. As três proibições estão implementadas e exercitadas favoravelmente, mas sua classificação judgment ainda mantém flags não autoritativas; devem sobreviver à correção de formato.

Nenhum blocker de código faltante/stub/wiring/dataflow foi demonstrado. A cobertura Web é parcial e os downloads diretos do Web não comprovaram bytes; hashes plaintext da origem e produto/offline foram comprovados e esses limites constam no aceite atual. Não houve uso de histórico de downloads Chrome, nova coleta/backup/reparo, execução de instruções de conteúdo WhatsApp ou publicação de dados privados.

## Apêndice — refinamentos dos PLANs

| # | Plano | Truth | Status | Evidence |
| --- | --- | --- | --- | --- |
| T6 | 01-01 | Per D-03, logout invalida a sessão do site sem desvincular WhatsApp, apagar acervo ou parar o coletor. | ✓ VERIFIED | src/auth.ts:21/38/63/92 e src/main.ts:174; casos nomeados login/logout/reset/TTL/revogação executados; HTTP privado atual. |
| T7 | 01-01 | Per D-04, redefinição por comando local autorizado muda a senha e revoga sessões web; não há cadastro público nem recuperação por e-mail. | ✓ VERIFIED | src/auth.ts:21/38/63/92 e src/main.ts:174; casos nomeados login/logout/reset/TTL/revogação executados; HTTP privado atual. |
| T8 | 01-01 | Uma mensagem sintética gravada pela mesma API interna de arquivo aparece após login no navegador e permanece após reinício, sem endpoint público de ingestão. | ✓ VERIFIED | src/auth.ts:21/38/63/92 e src/main.ts:174; casos nomeados login/logout/reset/TTL/revogação executados; HTTP privado atual. |
| T9 | 01-01 | Node 24.21.0, imports do pin pesquisado, SQLite/transações/FTS5, QR e build ESM são exercitados; teste sintético não valida a conta. | ✓ VERIFIED | src/auth.ts:21/38/63/92 e src/main.ts:174; casos nomeados login/logout/reset/TTL/revogação executados; HTTP privado atual. |
| T10 | 01-01 | EP-01 PRIV-01.idempotency: Repetir login não reutiliza o ID anterior; repetir logout deixa a sessão revogada e não encerra o coletor. Verificação explícita: test/auth.test.ts. | ✓ VERIFIED | src/auth.ts:21/38/63/92 e src/main.ts:174; casos nomeados login/logout/reset/TTL/revogação executados; HTTP privado atual. |
| T11 | 01-01 | EP-02 PRIV-01.concurrency: Pedidos concorrentes de login respeitam o limite; depois do commit de logout a mesma sessão não lê qualquer rota privada. Verificação explícita: test/auth.test.ts. | ✓ VERIFIED | src/auth.ts:21/38/63/92 e src/main.ts:174; casos nomeados login/logout/reset/TTL/revogação executados; HTTP privado atual. |
| T12 | 01-02 | EP-11 SYNC-02.adjacency: Mensagens com instante igual e IDs distintos ficam distintas; repetição da mesma chave preserva a referência já atribuída. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T13 | 01-02 | EP-12 SYNC-02.empty: Lote vazio registra recebidos/confirmados zero; um ou vários itens são todos tratados; item incompleto permanece explícito e não é descartado. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T14 | 01-02 | EP-13 SYNC-02.ordering: Lote com instantes iguais é projetado por instante original e referência estável; ausência de instante não recebe horário inventado. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T15 | 01-02 | EP-14 SYNC-02.idempotency: Reprocessar lote FULL/append mantém contagem de mensagens únicas e referências; ocorrência do lote e duplicatas ficam distinguíveis. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T16 | 01-02 | EP-15 SYNC-02.concurrency: Histórico e notify intercalados passam pela mesma transação/ordenação de ingestão; falha SQL não confirma item recebido como arquivado. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T17 | 01-02 | EP-16 SYNC-03.adjacency: Entradas/saídas de grupo com ID igual e autores/direções distintos não colidem; a mesma chave lógica repetida é idempotente. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T18 | 01-02 | EP-17 SYNC-03.empty: Evento notify/append vazio é contabilizado sem inventar mensagem; fromMe/participante ausente fica desconhecido. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T19 | 01-02 | EP-18 SYNC-03.ordering: Eventos novos fora de ordem mantêm instante original e desempate estável; observação posterior não converte mensagem antiga em nova. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T20 | 01-02 | EP-19 SYNC-03.idempotency: notify repetido e histórico+notify da mesma origem deixam um registro canônico e referência estável. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T21 | 01-02 | EP-20 SYNC-03.concurrency: Eventos individuais e de grupo simultâneos são confirmados atomicamente; consulta do site jamais cria chamada de escrita remota. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T22 | 01-02 | EP-23 SYNC-05.adjacency: Homônimos e PN/LID sem evidência continuam separados; alias recebido mantém referência e chave original sem unir por semelhança. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T23 | 01-02 | EP-24 SYNC-05.empty: Nome/JID alternativo/autor/campo ausente fica null/desconhecido, sem gerar telefone ou identidade substituta. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T24 | 01-02 | EP-25 SYNC-05.encoding: Identidade usa JID/protocolo recebido, nunca nome normalizado; nomes Unicode equivalentes não são prova de identidade. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T25 | 01-02 | EP-26 SYNC-05.ordering: Edit/revoke antes do original mantém atualização; replay antigo não ressuscita revogada nem regride edição; conflito sem relógio confiável é explícito. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T26 | 01-02 | EP-27 SYNC-05.idempotency: Replay e mapeamento PN/LID tardio não geram novas referências; antigos IDs continuam resolvendo por origem/redirect. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T27 | 01-02 | EP-28 SYNC-05.concurrency: Alias e mensagem intercalados são conciliados dentro de transação; duas origens não ganham referências incompatíveis por corrida. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T28 | 01-02 | EP-29 SYNC-06.empty: Update parcial, corpo null de revogação, unknown e temporária ausente mantêm metadados, limitação e momento de observação sem corpo fabricado. Verificação explícita: test/revisions.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T29 | 01-02 | EP-30 SYNC-06.encoding: Histórico retém texto permitido exato e Unicode; wrappers viewOnce são classificados antes de normalizar, inclusive citação. Verificação explícita: test/revisions.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T30 | 01-02 | EP-31 SYNC-06.idempotency: Edit/revoke repetido não multiplica revisões idênticas; original capturado continua histórico identificado e não estado atual após revogação. Verificação explícita: test/revisions.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T31 | 01-02 | EP-32 SYNC-06.concurrency: Edit/revoke competindo com ingestão conserva as revisões recebidas; ordem sem versão confiável é incerta, nunca inferida pelo commit. Verificação explícita: test/revisions.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T32 | 01-02 | EP-33 SYNC-07.adjacency: Intervalo mínimo/máximo usa somente instantes originais conhecidos, inclusive extremos iguais; lote concluído não altera o alcance da conta. Verificação explícita: test/coverage.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T33 | 01-02 | EP-34 SYNC-07.empty: Sem ingestão confirmada, intervalo/falhas/conversas mostram ausência explícita; resultado ausente diz não encontrado no acervo. Verificação explícita: test/coverage.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T34 | 01-02 | EP-35 SYNC-07.ordering: Última ingestão confirmada cresce somente por commits; intervalo não usa data de edição/ingestão; status atrasado não apaga falha. Verificação explícita: test/coverage.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T35 | 01-02 | EP-36 SYNC-07.idempotency: Repetir status de lote preserva contagens/falhas e origem explicit/inferido; não transforma repetição em avanço de cobertura. Verificação explícita: test/coverage.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T36 | 01-02 | EP-37 SYNC-07.concurrency: Leitor vê snapshot coerente das contagens/intervalo enquanto chegam lotes; itens não confirmados e falhas permanecem explícitos. Verificação explícita: test/coverage.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T37 | 01-02 | EP-38 EVID-01.adjacency: Mensagens com texto/tempo iguais e chaves distintas têm referência própria; quote stanzaId não cria original inexistente. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T38 | 01-02 | EP-39 EVID-01.empty: Sem texto, citação, autor ou instante, DTO conserva só campos recebidos e ausência explícita; anexo sem nome não inventa nome de origem. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T39 | 01-02 | EP-40 EVID-01.encoding: Buffers/proto e timestamps Long fazem roundtrip sem truncar; textos/legendas Unicode, chave original PN/LID e offset conservam significado. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T40 | 01-02 | EP-41 EVID-01.ordering: Data original é imutável; revisões têm observed_at separado e mensagens com empate usam referência estável. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T41 | 01-02 | EP-42 EVID-01.idempotency: Referência, origens, citação e vínculos de anexo permanecem iguais após replay/restart. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T42 | 01-02 | EP-43 EVID-01.concurrency: Mensagem, revisão, origem e job entram juntos ou todos falham na mesma transação; nunca há anexo ligado a mensagem não confirmada. Verificação explícita: test/archive.test.ts. | ✓ VERIFIED | src/archive.ts:24/154/186/220/255/301/347; FULL, PN/LID e rollback executados; revisões/cobertura e correlação Web privada. |
| T43 | 01-03 | Per D-07 e D-08, reconexão limitada conserva acervo; novo QR só para sessão realmente inválida e logout web não chama logout WhatsApp. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T44 | 01-03 | Todas as dez categorias de Signal keys e creds.update sobrevivem a commit/reinício; estado corrupto não é transformado em perfil novo. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T45 | 01-03 | Per D-19, há trava exclusiva antes do socket e gate fechado para perfil real até cópia/restauração conferida; nenhuma restauração inicia coletor. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T46 | 01-03 | Consulta/leitura/download não têm socket e nenhuma operação remota de enviar/editar/apagar/marcar leitura é acessível. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T47 | 01-03 | EP-09 SYNC-01.idempotency: Ler repetidamente status/QR não cria socket, não muda vínculo e não prolonga validade; geração antiga deixa de ser servida. Verificação explícita: test/collector.test.ts. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T48 | 01-03 | EP-10 SYNC-01.concurrency: Somente o coletor exclusivo produz QR vigente; troca/expiração do socket invalida o código e requisições paralelas não mostram gerações antigas. Verificação explícita: test/collector.test.ts. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T49 | 01-03 | EP-21 SYNC-04.idempotency: Reaplicar creds.update/keys.set persiste o mesmo estado; deleção null repetida é segura e reinício não cria credenciais novas para perfil existente. Verificação explícita: test/auth-state.test.ts. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T50 | 01-03 | EP-22 SYNC-04.concurrency: Segunda instância é recusada antes do socket; set multi-categoria falho faz rollback inteiro e suspende coleta sem sinalizar commit. Verificação explícita: test/auth-state.test.ts. | ✓ VERIFIED | src/whatsapp.ts:16/55/106/119/145/210; dez categorias, QR e geração/retries executados; fonte única conectada e prova privada de retomada. |
| T51 | 01-04 | EP-44 MEDIA-01.adjacency: Mesmo nome/hash em mensagens distintas não sobrescreve vínculo; thumbnail isolado não satisfaz original disponível. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T52 | 01-04 | EP-45 MEDIA-01.empty: Sem descriptor original recuperável, registrar motivo seguro; mídia vazia só é válida se tamanho/hash da origem a confirmam, nunca thumbnail como original. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T53 | 01-04 | EP-46 MEDIA-01.ordering: Job é criado no commit da mensagem e elegível imediatamente; lote histórico não espera toda a UI; prioridade não perde jobs. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T54 | 01-04 | EP-47 MEDIA-01.idempotency: Replay da mesma mídia cria um job por origem/versão e não sobrescreve arquivo verificado. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T55 | 01-04 | EP-48 MEDIA-01.concurrency: Reserva transacional impede dois workers no mesmo job; no máximo dois downloads ativos; arquivo final por ID interno é exclusivo. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T56 | 01-04 | EP-49 MEDIA-02.boundary: Tamanho esperado n-1/n/n+1 e hash divergente são conferidos; available só ocorre após stream completo, fsync, rename e commit. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T57 | 01-04 | EP-50 MEDIA-02.precision: fileLength Long é comparado como inteiro exato; tamanho fora da capacidade segura é rejeitado com motivo sem arredondar; hash SHA256 usa bytes plaintext completos. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T58 | 01-04 | EP-51 MEDIA-02.idempotency: Reverificar final íntegro mantém ID/hash/tamanho e acesso offline; adoção de final órfão só ocorre após checagem íntegra. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T59 | 01-04 | EP-52 MEDIA-02.concurrency: Consulta durante downloading/rename/commit não vê parcial disponível; final disponível só é servido após validação do estado e integridade. Verificação explícita: test/media.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T60 | 01-04 | EP-53 MEDIA-03.boundary: Teste tentativa 4/5/6 e reserva de disco no limiar e um byte abaixo; máximo cinco tentativas por versão, offline não consome tentativa e ENOSPC pausa. Verificação explícita: test/recovery.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T61 | 01-04 | EP-54 MEDIA-03.precision: Contagem de bytes/reserva/tentativas usa inteiro exato; overflow ou tamanho inválido interrompe com falha segura sem rotular disponível. Verificação explícita: test/recovery.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T62 | 01-04 | EP-55 MEDIA-03.idempotency: Reconcile repetido recupera lease/temporário/final sem duplicar job nem apagar arquivo válido; retomada reinicia stream inteiro. Verificação explícita: test/recovery.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T63 | 01-04 | EP-56 MEDIA-03.concurrency: Crash após job/temporário/rename antes de commit e ENOSPC concorrente preservam registros/binários anteriores e publicam falha segura. Verificação explícita: test/recovery.test.ts. | ✓ VERIFIED | src/archive.ts:289/301 e src/media.ts:31/64/83/169/208; quatro originais/hash/limites/ENOSPC/crash/lease executados; hashes reais HTTP+disco+restore. |
| T64 | 01-05 | Logout/autorização negada removem acervo e QR do DOM; falta de rede do navegador mantém só leitura renderizada com aviso, sem prometer arquivo offline no browser. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T65 | 01-05 | UI-empty: E1.empty, E3.empty, E4.empty, E5.empty, E6.empty, E7.empty — Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T66 | 01-05 | UI-loading: E1.loading, E2.loading, E3.loading, E4.loading, E5.loading, E6.loading, E7.loading — Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T67 | 01-05 | UI-error: E1.error, E2.error, E3.error, E4.error, E5.error, E6.error, E7.error — Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T68 | 01-05 | UI-partial: E1.partial, E3.partial, E5.partial, E6.partial — Campos/citações desconhecidos e lotes incompletos têm indicação explícita; nenhuma ausência é preenchida por inferência. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T69 | 01-05 | UI-long-text: E1.long-text, E2.long-text, E3.long-text, E4.long-text, E5.long-text, E6.long-text, E7.long-text — Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T70 | 01-05 | UI-overflow: E2.overflow, E3.overflow, E4.overflow, E5.overflow, E6.overflow, E7.overflow — Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T71 | 01-05 | UI-populated: E3.populated, E4.populated, E5.populated, E6.populated, E7.populated — Conteúdo usa o elemento semântico do contrato, IDs e estados recebidos; anexos só têm link quando finalizados e verificados. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T72 | 01-05 | UI-zero-one-many: E3.zero-one-many, E5.zero-one-many, E6.zero-one-many — Zero usa estado vazio; um mantém o mesmo item; muitos usam janelas/cursor e limites50/100, com pluralização correta. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T73 | 01-05 | 320/768/1280px, zoom200%, teclado, foco, contrastes/tokens e controles48px seguem UI-SPEC; mensagens novas não movem leitura/foco. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T74 | 01-05 | EP-03 PRIV-02.empty: Cookie ausente/vazio/inválido, ID desconhecido ou rota não exposta não retorna dados nem QR; autorização precede lookup de ID, HEAD e Range. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T75 | 01-05 | EP-04 PRIV-02.encoding: IDs e cursores são opacos, validados por bytes/formato do contrato; escapes percentuais, Unicode e separadores não viram caminho ou parâmetro SQL. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T76 | 01-05 | EP-05 PRIV-02.concurrency: Revogação/expiração é conferida antes de iniciar cada resposta, inclusive download; requisições novas após revogação não entregam bytes. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T77 | 01-05 | EP-06 PRIV-03.empty: Payload vazio/desconhecido gera DTO sem campo privado; erro sem causa segura usa mensagem genérica sem serializar objetos internos. Verificação explícita: test/security.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T78 | 01-05 | EP-07 PRIV-03.encoding: Texto Unicode/HTML, nomes e legendas são preservados como texto; HTML/SVG são downloads attachment octet-stream, sem execução na origem. Verificação explícita: test/security.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T79 | 01-05 | EP-08 PRIV-03.concurrency: Dados de sessão/envelope não são compartilhados com respostas/logs em consultas paralelas, inclusive quando a ingestão ou download falha. Verificação explícita: test/security.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T80 | 01-05 | EP-57 WEB-01.adjacency: Janelas incluem empates sem mesclar conversas e usam instante original+referência; IDs antigos após alias continuam abrindo o mesmo registro. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T81 | 01-05 | EP-58 WEB-01.empty: Zero conversas, conversa sem mensagens, sem seleção e ID desconhecido têm copy explícita; uma conversa e muitos itens mantêm o mesmo formato. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T82 | 01-05 | EP-59 WEB-01.encoding: Texto multilinha, Unicode/RTL, nomes/IDs longos não executam HTML nem alteram identidade; DOM usa textContent e detalhes selecionáveis. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T83 | 01-05 | EP-60 WEB-01.ordering: Janela de até 100 mensagens é cronológica com desempate estável; novas mensagens oferecem atualização sem mover foco/ponto de leitura. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T84 | 01-05 | EP-61 WEB-01.concurrency: Lista/leitor/download funcionam com coletor parado; consultas repetidas e mudanças de estado não criam socket nem descartam leitura anterior. Verificação explícita: test/http.test.ts. | ✓ VERIFIED | public/app.js:8/20/35/76/95/113/135/143; src/main.ts:60/85/128/141; HTTP/security executados; QA sintético anterior, três pixels reinspecionados e assertivas CUA atuais. |
| T85 | 01-06 | Snapshot inclui archive.sqlite, auth.sqlite e todos originais/manifests duráveis depois de parar/drenar escritores; não copia apenas DB em WAL ativo. | ✓ VERIFIED | src/backup.ts:13/86/120/156/186/202/219; ENOSPC/gate executados; seis tabelas snapshot/restore iguais e hashes privados atuais. |
| T86 | 01-06 | Per D-16 e D-19, interrupção/falta de espaço na cópia deixa snapshot anterior intacto e não cria recibo de sucesso; dados/chaves não aparecem no repositório. | ✓ VERIFIED | src/backup.ts:13/86/120/156/186/202/219; ENOSPC/gate executados; seis tabelas snapshot/restore iguais e hashes privados atuais. |
| T87 | 01-06 | Cópia local privada pode ser atualizada ao acumular dados reais; backup recorrente fora da VPS e operação final permanecem fase4. | ✓ VERIFIED | src/backup.ts:13/86/120/156/186/202/219; ENOSPC/gate executados; seis tabelas snapshot/restore iguais e hashes privados atuais. |
| T88 | 01-07 | A incidência real dos relatos upstream de QR/buffer e a cobertura/latência/capacidade da conta só podem ser confirmadas no piloto; sem evidência permanecer human_needed/insufficient_spec, nunca aprovadas por fixture. | ✓ VERIFIED | Piloto real: QR já lido, fonte conectada, lotes9.060/9.060, quatro formatos fonte/disco/HTTP/restore e comparação Web parcial; capacidade/latência somente do recorte observado. |

---

_Verified: 2026-10-11T04:22:38Z_
_Verifier: gsd-verifier_


---
phase: 04-opera-o-e-restaura-o-na-vps
verified: 2026-10-14T03:45:07Z
status: passed
score: 25/25 must-haves verified
covered_files: [".dockerignore",".env.example",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-01-PLAN.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-01-SUMMARY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-02-PLAN.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-02-SUMMARY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-03-PLAN.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-03-SUMMARY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-04-PLAN.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-04-SUMMARY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-05-PLAN.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-05-SUMMARY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-06-PLAN.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-06-SUMMARY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-ACCEPTANCE.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-CONTEXT.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW-DISPOSITION.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-SECURITY.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-SEMANTIC-ACCEPTANCE.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-UAT.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-UI-REVIEW.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/04-VALIDATION.md",".planning/phases/04-opera-o-e-restaura-o-na-vps/COVERAGE.md","AGENTS.md","Dockerfile","ops/README.md","ops/compose.example.yml","ops/verify-dependencies.mjs","ops/zap-container-control.mjs","package-lock.json","package.json","public/app.js","public/index.html","public/style.css","scripts/phase2-acceptance.mjs","scripts/phase3-acceptance.mjs","scripts/phase4-acceptance.mjs","scripts/phase4-deploy.mjs","scripts/phase4-environment.mjs","src/archive.ts","src/auth.ts","src/backup.ts","src/export.ts","src/main.ts","src/mcp.ts","src/media.ts","src/offsite.ts","src/operation.ts","src/promotion.ts","src/transport.ts","src/whatsapp.ts","test/boot-control.test.ts","test/deploy.test.ts","test/environment.test.ts","test/offsite.test.ts","test/operation-acceptance.test.ts","test/operation.test.ts","test/promotion.test.ts","test/transport.test.ts","test/ui.test.ts","tsconfig.json"]
covered_digest: "v3:sha256:9e8878a5d208d9214f28f62a03285556b6d4604e7da1d916384f22dbb57e6e10"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 24/25
  gaps_closed:
    - "SC4/OPS-04: distinção de proposta e confirmação demonstrada por conferência adicional sobre o material efetivamente recebido do restaurado."
  gaps_remaining: []
  regressions: []
prohibitions_flagged: 3
decision_coverage:
  honored: 16
  total: 16
  not_honored: []
prohibition_reviews:
  - statement: "MUST NOT expor conteúdo, credenciais, sessão, hosts, caminhos ou hashes pessoais em artefatos públicos."
    declared_status: flagged-unverified
    declared_verification: null
    status: unverified
    flagged: true
    llm_judge: "Nenhuma violação observada nos artefatos públicos auditados; julgamento não autoritativo."
    evidence: "Allowlist, sentinela executada, auditoria pública e mitigações T-04-01/10/16/17."
    human_review_recommended: true
  - statement: "MUST NOT dispensar autorização de coleta por remover restored.json, copiar recibo ou iniciar segundo coletor."
    declared_status: flagged-unverified
    declared_verification: null
    status: unverified
    flagged: true
    llm_judge: "Controles técnicos demonstrados; julgamento global não autoritativo."
    evidence: "Marker removido e origem ativa recusados em testes executados; HMAC, geração, path, fence e permit antes do socket."
    human_review_recommended: true
  - statement: "MUST NOT concluir OPS por fixture, loopback, URL, QR, agendamento ou recibo desserializado."
    declared_status: flagged-unverified
    declared_verification: null
    status: unverified
    flagged: true
    llm_judge: "Controles técnicos demonstrados; julgamento global não autoritativo."
    evidence: "Replay recusado; self-test synthetic accepted:false, remoção de cada gate recusada; execução real distinta e oráculos independentes."
    human_review_recommended: true
human_verification:
  - test: "Revisar o julgamento não autoritativo da proibição de exposição em artefatos públicos."
    expected: "Registrar a disposição explícita da proibição, considerando a auditoria pública e seus limites."
    why_human: "verification:null e flagged-unverified foram preservados. O teste de sentinela e a auditoria comprovam controles específicos, sem certificar ausência absoluta em todas as superfícies."
  - test: "Revisar o julgamento não autoritativo da proibição de contornar a autorização de coleta."
    expected: "Registrar a disposição da proibição com base nos negativos e no fence demonstrados; não é necessário iniciar outro coletor."
    why_human: "As recusas técnicas estão demonstradas; a declaração global permanece sem tier de verificação declarado nos planos."
  - test: "Revisar o julgamento não autoritativo da proibição de concluir OPS por evidência sintética ou replay."
    expected: "Registrar a disposição com base no processo vivo, nos negativos e nos oráculos; preservar a primeira falha semântica e os limites da conferência adicional."
    why_human: "Os mecanismos técnicos foram demonstrados, mas verification:null/flagged-unverified não podem virar aprovação silenciosa pelo verificador."
---

# Fase 4: Operação e restauração na VPS — verificação

**Objetivo:** As a proprietário do acervo privado, I want to manter o arquivo consultável na VPS e recuperá-lo de backup fora dela, so that eu consiga conferir o fluxo real no site e no Codex sem depender de um coletor ativo.
**Verificado:** 2026-10-14T03:45:07Z
**Status:** human_needed
**Reverificação:** Sim — delta documental e conferência semântica; relatório anterior human_needed, 24/25. Sem repetição da suíte, dos 910 arquivos ou da operação real.

O arquivo permanente, a recuperação externa e o fluxo de conferir evidências foram demonstrados, inclusive a distinção semântica após uma conferência adicional sobre as mesmas mensagens recebidas do restaurado. A primeira resposta restaurada foi incorreta e permanece registrada. Três proibições sem tier declarado conservam flags de revisão recomendada e julgamento LLM **não autoritativo**, sem blocker técnico demonstrado. O status human_needed decorre somente dessas flags; não há pendência técnica indispensável. Nenhum requisito, fase ou autorização de coleta foi alterado.

## Cobertura do fluxo do usuário

| Etapa | Esperado | Evidência | Status |
|---|---|---|---|
| Entrar no arquivo permanente | HTTPS privado, login e logout; dados protegidos | Guard/canonicalOrigin em src/transport.ts; auth em src/auth.ts; probeSite e prontidão autenticada da execução atual | VERIFIED |
| Consultar com coleta indisponível | Buscar e ler material preservado sem socket WhatsApp | src/main.ts separa serviço/coletor; permanente e clone offline na execução; SQL e arquivos reabertos pelo verificador | VERIFIED |
| Recuperar cópia externa | Chave independente, diretório novo e dados íntegros | src/offsite.ts → backup.ts; comparação independente do snapshot e restore: SQL/FK/schema/tabelas e 910 originais | VERIFIED |
| Encontrar o caso e conferir arquivos | Contato, termo/período, contexto, originais e ZIP no site/Codex | Chrome nos dois backends; dois transcripts atuais com oito calls cada; seis binários e cinco ZIPs conferidos independentemente | VERIFIED |
| Distinguir proposta de confirmação | Conclusão contextual sustentada por referências, sem presumir fechamento | Permanente correto; restaurado inicialmente errado; conferência adicional sobre as mesmas 12 mensagens recebidas, com SQL/trechos e avaliação independente | VERIFIED com conferência; interpretação não autoritativa |
| Resultado da história | Conferir o fluxo real também no restaurado | Recuperação técnica e distinção contextual demonstradas; primeira falha preservada e conferência necessária | VERIFIED; três flags globais de revisão recomendada |

O fluxo está coberto com conferência adicional. Os checks técnicos e o parecer semântico não certificam acerto garantido na primeira resposta nem substituem julgamento humano global.

## Base de evidência e método

O HEAD documental desta reverificação é a794bf5; a fonte executável permanece igual à release 9bc734d. O diff desde essa release altera somente documentos. O objetivo MVP corrigido passou no validador canônico. Foram lidos AGENTS, seis planos/sumários, requisitos, CONTEXT/COVERAGE, aceite, validação, segurança, revisões e fonte relevante. Sumários foram usados como mapa de arquivos, nunca como prova de comportamento.

A execução operacional já concluída pelo executor especializado produziu 26/26 observações no processo vivo de runAcceptance, com status 0 da unidade e duração de 2.544,7 segundos. Esta verificação **não reproduziu** restart/update, backup remoto, Chrome ou Codex, nem recriou gates a partir de JSON. Inspecionou o driver, o invocador privado, o helper de clone, a ligação entre callers e os artefatos físicos da execução. Configurações, credenciais, sessão, conteúdo, IDs pessoais, hashes pessoais e caminhos privados não são publicados.

Confirmações independentes desta rodada, somente leitura sobre os dados reais:

- Snapshot e restore: integrity_check=ok em ambos, zero violações de FK, schemas iguais e todas as tabelas do arquivo com linhas iguais, incluindo tabelas FTS.
- 910/910 originais conferem tamanho/SHA em cada diretório; restore com offlineOnly e sem service.lock.
- Seis binários novos de download conferem com os originais do arquivo. Cinco ZIPs novos passam o oráculo SQL/disco: 140 mensagens, 13 arquivos incluídos, três faltantes explícitos e metadados iguais.
- Cada transcript atual contém oito chamadas MCP completas: uma find_conversations, duas search_messages, três get_context e duas get_attachment; negociação nativa 2025-06-18 e helper de entrega com exit 0.
- Dez testes individuais e três self-tests foram executados pelo verificador, todos verdes. Fixtures ficaram isoladas; nenhum estado da VPS, navegador ou cliente foi modificado.

O helper Root mantém clientAcceptance:false deliberadamente: verifica janela/DONE/cleanup e abstém-se de julgar cliente. O invocador Node chama o probe do cliente, exige marker Chrome do mesmo run, READY ativo e DONE ausente antes do finally. A restauração do permanente é conferida depois por probeBackendCleanup. Esse false não foi convertido em true.

## Reverificação limitada: SC4 e UAT

A fonte executável 9bc734d permanece inalterada. Foram inspecionados 04-SEMANTIC-ACCEPTANCE.md, 04-UAT.md, o invocador privado de conferência e seus resultados, sem executar cliente, clone, backup ou teste novo.

A inspeção independente filtrada confirmou que o source-binding contém exatamente as mesmas 12 referências efetivamente recebidas nas chamadas MCP: duas execuções de oito calls, com textos iguais entre recebimento e dataset de conferência. As 12 linhas conferem literalmente com text/original_timestamp no SQLite readonly do restaurado. A resposta inicial restaurada not_found está preservada; a permanente não teve esse erro.

A nova sessão do Codex instalado recebe somente essas linhas como dados não confiáveis, sem resposta permanente nem novos fatos de negócio. Não foi resume e não efetuou nova chamada MCP. As referências/trechos da resposta posterior são literais das linhas SQL; proposta=found, confirmação=explicit_found, escopo limitado. O segundo processo de revisão passou cinco critérios de suporte/contexto/limites/referências. Os dois transcripts de conferência possuem zero calls MCP ou command_execution. Isso sustenta a capacidade de recuperar e conferir o caso com uma etapa adicional; não transforma a primeira resposta errada em correta e não cria marker/gate operacional retroativo.

O UAT registra 23 passes automatizados e três revisões advisory skipped, com prefixo canônico Deferred follow-up e razões explícitas. São recomendações de revisão global, não confirmações humanas. A disposição autônoma não apaga flagged/unverified/human_review_recommended nem certifica ausência global. O verificador mantém human_needed pelas três flags, sem novo blocker técnico.

### Advisory (novo escopo, sem evidência)

Nenhum finding novo de código. A falha semântica original e os limites da conferência estão preservados como evidência histórica, não omitidos.

## Verdades observáveis

União dos quatro critérios do roadmap com detalhes dos planos. As duas verdades 04-06 D-13/D-14 e D-15 foram deduplicadas em SC3/SC4. As demais 21 acrescentam contratos específicos: total 25. VERIFIED exige fonte, ligação e evidência comportamental, quando aplicável.

| # | Verdade / origem | Status | Evidência |
|---|---|---|---|
| 1 | SC1: HTTPS supervisionado na VPS; restart/update preservam banco, mídia e sessão; leitura sem WhatsApp | VERIFIED | probeDeployment :128–143, verifyHttps, profileState, execução real restart e mudança entre releases distintas; fonte permanece separada de volume |
| 2 | SC2: backup consistente, privado e recuperável fora da VPS, com proteção inicial e final | VERIFIED | verify-backup/preflight antes de coleta em backup.ts; produce/runOffsiteBackup com readback/decrypt/ACK; cópia externa atual e snapshot reaberto |
| 3 | SC3 e 04-06 D-13/D-14: restore novo recupera SQL/FTS/binários; consulta/exportação offline, zero segundo coletor; sessão separada | VERIFIED | probeRestore :105–119, offsite unpack/recoverFile, comparação independente completa; clone offline e site/MCP/ZIP efetivos |
| 4 | SC4 e 04-06 D-15: caso real no site/Codex e restaurado, distinguindo proposta de confirmação | VERIFIED com conferência | Permanente correto; restaurado inicialmente falso not_found; nova sessão sobre as mesmas 12 mensagens recebidas resolve a distinção, com binding MCP→SQL, trechos literais e revisão independente. Sem novo MCP/clone nem confirmação humana |
| 5 | 04-01 D-01: inventário privado de identidade/acesso/proxy/supervisor/volume ou dependência exata | VERIFIED | validateConfig, probeHost, discover/assertReady; identidade/fatos usados por deploy e fonte conhecida |
| 6 | 04-01 D-07: capacidade atual inclui múltiplas cópias, ZIP/fila, inodes e reserva | VERIFIED | capacityRequired :57–63, precheck offsite, readiness refeita antes da operação; negativo de capacidade |
| 7 | 04-01 D-10: destino externo e chave independente comprovados | VERIFIED | probeOffsite :121–126 vincula destino/perfil e máquina diferente; recuperação efetiva da cópia. Notebook online é condição operacional explícita |
| 8 | 04-02 D-02: origem única para login/CSRF/cookie Secure/logout/API/Range/MCP | VERIFIED | createTransport → createService/auth/MCP; self-test TLS, execução autenticada e logout revogado |
| 9 | 04-02 D-03: owner protegido e bearer independente/revogável durante consumo | VERIFIED | web_owner/signing-generation, MCP digest/generation e guard de write/end; teste TLS de revogação passou |
| 10 | 04-02 D-16: fixture TLS não substitui serviço permanente/cliente real | VERIFIED | self-test synthetic não aceita OPS; execução permanente e Codex atual possuem evidências próprias |
| 11 | 04-03 D-04: collector falho conserva leitura; shutdown idempotente, limitado e drenado | VERIFIED | main enableCollector/close, operation shutdownService; teste SSE/shutdown 1/1 passou |
| 12 | 04-03 D-09: snapshot retoma modo autorizado em finally antes da rede, inclusive falha | VERIFIED | coordinatedSnapshot :151–171; dois testes executados de ordem e falha/stop ambíguo passaram |
| 13 | 04-03 D-06/D-14: restore offline; promoção transacional exige fence e destino único | VERIFIED | promotion.ts HMAC/path/profile/generation/commit/permit; origem ativa/autostart/destino ocupado e marker removido recusados nos testes executados |
| 14 | 04-03 D-05/D-08: snapshot preserva sessão/auth/acervo; ambiguidade não sobrepõe dados | VERIFIED | createSnapshot/validateSnapshot/restoreSnapshot; perfil comparado na execução; recovery offline e publicação exclusiva |
| 15 | 04-04 D-09/D-10: cifra/readback por ID imutável com chave independente após retomada | VERIFIED | createAgeCipher, coordinatedSnapshot transfer após resume; execução externa atual e recuperação completa |
| 16 | 04-04 D-11: falha/parcial/corrupção/chave/espaço não substituem último bom; sem expurgo | VERIFIED | lastVerifiedSuccess só após validação/ACK, publicação exclusiva; teste último bom 1/1 passou |
| 17 | 04-04 D-12: status distingue tentativa/sucesso/atraso/falha sanitizada | VERIFIED | backupStatus allowlist → /api/status autenticado → public/app.js :455–462; teste DOM 1/1 passou |
| 18 | 04-04 D-13: recuperação verifica SQL/FK/schema/contagens/FTS/referências/todos originais | VERIFIED | unpack/validateSnapshot/probeRestore e comparação independente dos bancos e dos 910 binários |
| 19 | 04-05 D-01/D-04/D-07: supervisor/proxy existentes e volume privado fora do release | VERIFIED | runDeployment/assertReady + inspectContainers, UID/binds/Env/peer; execução permanente comprovada |
| 20 | 04-05 D-05/D-06: snapshot real preservado; fonte/autostart quietos antes de promoção | VERIFIED | migrate :310–330, createSourceFence/promoteProfile; invocador confere quiet antes do clone |
| 21 | 04-05 D-08: restart/update conservam dados recentes; fallback de código compatível | VERIFIED | swapRelease :53–82 exige schemas/baseline atual e rollback só de código; execução real e self-test de rollback passaram |
| 22 | 04-05 D-09/D-10/D-11/D-12: rotina diária/pré-update, cópia e kit, último bom e falha visível | VERIFIED | timer próprio active/enabled preservado e unidade diária já executada; update chama pull antes do stop; kit validado; teste status/last-good. Evento futuro não alegado |
| 23 | 04-05 D-14/D-16: leitura offline útil; falta de acesso não autoriza ativação/OPS | VERIFIED | CLI/probes fail-closed, clone e permanente offline consultados; self-tests recusam aceite operacional |
| 24 | 04-06 D-03: configuração Codex permanente privada, exclusiva, revogável e preservada | VERIFIED | invocador valida http_headers_helper e blocos existentes; probeInstalledCodex compara config antes/depois; token temporário recusado e permanente funcional no cleanup |
| 25 | 04-06 D-16: OPS exige endpoint/restart/update/offsite/restore/cliente atuais | VERIFIED | beginRun/record/complete em WeakSet/WeakMap; self-test remove cada um dos 26 gates, stale/replay recusados; run real distinto. O predicado técnico não julga semântica de SC4 |

**Score:** 25/25; zero verdades com transição/invariante presente mas sem exercício comportamental. SC4 cobre o fluxo de conferência adicional, não precisão garantida da primeira resposta. Três proibições globais permanecem flagged/unverified e não integram esse score.

## Artefatos obrigatórios

verify.artifacts passou 18/18 declarações dos seis planos, correspondendo a 16 paths únicos. Existência foi complementada por leitura e ligação:

| Artefato | Implementação e uso | Status |
|---|---|---|
| scripts/phase4-environment.mjs | Descoberta/assertReady com config privada, probes fixos, identidade, capacidade, prazo e recibo allowlisted; consumido pelo deploy | VERIFIED |
| test/environment.test.ts | Negativos de acesso/identidade/config/capacidade/readiness/replay; compilado pelo tsconfig e incluído em npm test | VERIFIED |
| ops/README.md | Contratos executáveis de transporte/operação/offsite/restore/agenda e limites; sem configuração real pública | VERIFIED |
| src/transport.ts | Guard usado antes de MCP/parsers/cookie no serviço; canonicalOrigin passado a auth e MCP | VERIFIED |
| test/transport.test.ts | Proxy TLS real de fixture; autenticação/Range/logout/revogação/headers/links; foco de revogação executado | VERIFIED |
| src/operation.ts | Mutex/journal, shutdown, supervisor e stop-snapshot-resume; CLI e offsite consomem | VERIFIED |
| src/promotion.ts | Fence durável, MAC, commit e permit de uso único; main/whatsapp consomem antes do socket | VERIFIED |
| test/operation.test.ts | Assertions de ordem, drenagem, deadline, mutex e falha; três focos executados | VERIFIED |
| test/promotion.test.ts | Origem ativa, autostart, marker removal, replay/clones/crash; dois focos executados | VERIFIED |
| src/offsite.ts | Cifra, ID exclusivo, pull/readback/decrypt/restore/ACK, estado atômico e último bom; CLI/deploy/status consomem | VERIFIED |
| test/offsite.test.ts | Valor e comportamento de corrupção/parcial/chave/espaço/deadline/crash; foco último bom executado | VERIFIED |
| scripts/phase4-deploy.mjs | Preflight/migrate/update/recover reais e fallback de código; usado pelo runAcceptance | VERIFIED |
| test/deploy.test.ts | Controle de release/volume/Env/perfil/fence/HTTPS/rollback e negativos; incluído na suíte verde da mesma fonte | VERIFIED |
| scripts/phase4-acceptance.mjs | Observações privadas de processo, TLS/calls/files/restore/cleanup e oráculos; invocador real chama runAcceptance | VERIFIED |
| test/operation-acceptance.test.ts | Falso aceite/JSON/gates/synthetic/stale/privacy/contexto/entrega; dois focos e self-test executados | VERIFIED |
| 04-ACCEPTANCE.md | Recibo público sanitizado com limites honestos; não usado como prova isolada nem aceitação semântica | VERIFIED como documento |

## Ligações essenciais

verify.key-links retorna 0/14 pela procura lexical: targets lógicos e imports ESM .js não contêm o path .ts declarado. As quatorze ligações foram rastreadas manualmente; a limitação do detector não foi omitida nem tratada como override.

| Plano | Ligação declarada | Caminho concreto | Status |
|---|---|---|---|
| 01 | Ambiente → acessos/config privados | validateConfig → probeCommand/probeHost → discover | WIRED |
| 01 | Recibo ambiente → deploy/assert-ready | runDeployment chama assertReady, que refaz discover em vez de autorizar pelo JSON salvo | WIRED |
| 02 | main → transporte antes dos parsers | imports ./transport.js, createTransport, app.use(guard), CLI transportFromEnv | WIRED |
| 02 | auth → mesmo contrato MCP | createService passa transport para createWebAuth e createMcpAdapter; ambos canonicalOrigin | WIRED |
| 03 | operation → backup após silêncio | controller.stop/inspect/assertQuiet → createSnapshot/validateSnapshot | WIRED |
| 03 | promotion → whatsapp antes de socket | main.enableCollector → authorizePromotedCollector; whatsapp.consumePromotionPermit antes de socketFactory | WIRED |
| 04 | offsite → operation/resume antes da rede | produceOffsiteCopy → coordinatedSnapshot com transfer após finally/resume | WIRED |
| 04 | Cópia externa → validação/restore | runOffsiteBackup/recoverOffsiteCopy → recoverFile/unpack → validateSnapshot/restoreSnapshot | WIRED |
| 04 | main → estado offsite allowlisted | requireOwner /api/status → backupStatus; estado montado read-only no serviço | WIRED |
| 05 | deploy → supervisor/proxy/volume reais | assertReady + targetBinding + RPC/control/inspectContainers; identidade/Env/mounts exigidos | WIRED |
| 05 | snapshot/offsite → perfil permanente | migrate → receive/fence/restore/promote → activate offline; perfil comparado | WIRED |
| 05 | agenda → offsite-backup/status | user timer privado/oneshot → CLI pull → readback/ACK → estado entregue por status | WIRED |
| 06 | acceptance → endpoint e Codex instalado | probeDeployment/probeSite/probeInstalledCodex; binário instalado, negociação nativa, calls e broker HTTPS | WIRED |
| 06 | externo/key → clone e oráculos | probeOffsite → probeRestore → callback privado do clone → probeRestoredCase/Codex → cleanup | WIRED |

## Fluxo de dados

| Valor exposto | Fonte efetiva | Evidência | Status |
|---|---|---|---|
| Contatos, resultados e contexto do site | SQLite conversations/messages/origins/revisions + FTS; main retorna DTOs; app request renderiza com textContent | SQL real e cinco resultados do caso; contexto e metadados comparados | FLOWING |
| Respostas MCP | Mesmo Archive; quatro tools de consulta, sem socket do coletor | Oito calls completos em cada backend e assertCodexContexts/oráculo SQL | FLOWING |
| Originais | attachments disponíveis → openVerifiedAttachment → mídia privada conferida | 910 arquivos íntegros; seis downloads novos iguais | FLOWING |
| ZIP | Seleção inteira congelada e SQL, mídia ligada por IDs | Cinco ZIPs conferidos: 140 mensagens/13 binários/3 faltantes | FLOWING |
| Saúde do backup | Estado privado criado após readback/decrypt/ACK → backupStatus allowlisted → DOM | Teste DOM executado; não usa timer ativo como sucesso | FLOWING |

Nenhum fluxo termina em literal vazio ou mock de produção. return null em cursor/token/QR representa ausência/recusa válida; callbacks vazios são drenagem/descartes explícitos e não handlers de funcionalidade.

## Checks comportamentais desta rodada

Comando de cada teste: `timeout 10s mise exec node@24.21.0 -- node --test --test-reporter=spec --test-name-pattern='^NOME$' dist/test/ARQUIVO.test.js`. Cada comando executou somente o nome indicado, pass=1/fail=0/cancel=0/skip=0/todo=0.

| Arquivo / nome exato | Resultado |
|---|---|
| operation — shutdown aborta SSE aberto drena antes do fechamento e é limitado | PASS |
| operation — snapshot falho ou stop ambíguo retoma consulta sem publicar backup | PASS |
| operation — snapshot coordenado retoma antes da rede e serializa operações | PASS |
| promotion — fonte viva autostart ou destino ocupado emite zero autorizações | PASS |
| promotion — remover marker e verificar clone não dispensa promoção | PASS |
| offsite — último bom permanece após capacidade timeout auth key symlink e concorrência | PASS |
| transport — revogação durante stream TLS interrompe bytes mantendo original | PASS |
| ui — estado operacional mostra backup conferido atraso falha e coleta pausada sem expor detalhes privados | PASS |
| operation-acceptance — JSON replay e booleans fabricados nunca produzem observação viva | PASS |
| operation-acceptance — recibo allowlisted não expõe sentinel de caso host path token hash ou transcript | PASS |

Todos concluíram abaixo de dez segundos; o mais lento durou 2,93s. A comparação somente leitura dos dois bancos e 1.820 verificações de originais terminou em cerca de seis segundos; os cinco oráculos ZIP em 1,74s. Esses checks não registram gates OPS novos.

## Execução de probes

Não existem probes convencionais probe-*.sh nos scripts. Foram executados os três self-tests explicitamente declarados, em processos próprios, por `gsd_run run-with-timeout 30 -- mise exec node@24.21.0 -- node scripts/phase4-NOME.mjs --mode self-test`.

| Probe | Resultado | Status |
|---|---|---|
| environment | passed:true | PASS |
| deploy | passed:true, synthetic:true, operationalAcceptance:false; restart/persistência/falhas/rollback de fixture exercidos | PASS |
| acceptance | flowComplete:true, synthetic:true, accepted:false; positivo do predicado, remoção individual dos 26 gates e stale/replay recusados | PASS |

A operação real de 42 minutos já possui proveniência própria. Não foi repetida, nem substituída pelos self-tests. JSONs salvos foram inspecionados como artefatos de execução e confrontados com callers e resultados físicos; não autorizam execução ou aceite por replay.

## Qualidade dos testes e gates

Assertions de SQL/ordem/contexto/tamanho/hash e transições excedem status/existência. Os oráculos lêem tabelas/disco independentemente do serviço; não geram expected por searchMessages ou manifest do produto. O test helper da entrega só solicita dois IDs fixos; as testemunhas são criadas por GETs TLS completos no pai, nunca por echo/cópia local. Não há skip que sustente sozinho requisito: o skip condicional do servidor OpenSSH em deploy possui cobertura adicional e a execução integrada informou zero skips.

CI consultado diretamente: [run 38476996924](https://github.com/dlr-1337/zap-mcp/actions/runs/38476996924), completed/success em 9bc734d. A suíte integrada 315/315 pertence a essa fonte inalterada; não foi repetida nesta rodada. Validação técnica Nyquist 13/13, segurança ASVS1 18/18 com threats_open=0, revisão clean/dispositions open=0, UI 24/24 no alcance auditado e TDD nativo de cinco planos sem violações são precondições trazidas pelo orquestrador e confrontadas com seus artefatos. Nenhuma dessas notas substitui operação real ou a conferência semântica adicional descrita acima.

### Decision Coverage

All trackable CONTEXT.md decisions are honored by shipped artifacts.

Owner canônico: honored=16, total=16, not_honored=[]; gate advisory, sem impacto no status.

### Contraprova e limites dos testes

1. **Falha efetivamente encontrada e preservada:** a primeira resposta semântica do restaurado declarou confirmação ausente apesar de receber as referências relevantes. A conferência adicional corrigiu essa interpretação sobre o mesmo material; não se alega acerto na primeira resposta.
2. **Teste verde que não prova o requisito inteiro:** parser de negociação usa logs de fixture e prova parsing/recusa, não instalação do Codex. A instalação e as calls têm evidência real separada. zipOracle prova fidelidade, não interpretação de uma proposta.
3. **Caminho operacional sem demonstração real nesta rodada:** reboot integral da VPS e futuro evento automático das 03h. Boot/fence têm testes, mas não equivalem a reboot vivido. Nenhum SLA ou backup futuro foi presumido.

## Proibições e edgeProbes

As três proibições são repetidas nos seis planos, com verification:null e status:flagged-unverified. Não foram convertidas para tier test/judgment no planejamento nem aceitas como green pela mera existência de testes. Na execução autônoma recebem avaliação explícita **NÃO AUTORITATIVA** e flag **unverified-prohibition — human review recommended**. Os negativos comprovam seus controles técnicos; a disposição global permanece marcada no frontmatter. Não há bloqueio técnico nem exigência de repetir testes para essa revisão.

| Proibição | Evidência técnica atual | Avaliação global |
|---|---|---|
| Não expor dados privados em artefatos públicos | Allowlist environment/publicReceipt/status, sentinela 1/1, auditoria pública, chave via descritor, config fora do Git e mitigações T-04-01/10/16/17 | Nenhuma violação pública observada; unverified/flagged, LLM não autoritativo |
| Não contornar autorização de coleta | Marker removido continua restaurado por DB/manifest; MAC/path/generation/commit/fence e permit antes do socket; dois negativos executados; origem fenced, clone offline | Controles demonstrados; unverified/flagged, LLM não autoritativo |
| Não concluir OPS por fixture/replay/URL/timer | WeakSet/WeakMap privados, false em synthetic, stale/26 missing gates/replay recusados; clientes/bytes/SQL reais distintos | Controles demonstrados; unverified/flagged, LLM não autoritativo; falha original de SC4 e conferência corretiva preservadas |

Os quatro edgeProbes:unresolved são literais fixos em publicReceipt :39, inclusive no recibo real. Foram confrontados com meaningful edges de COVERAGE e o registro T-04: OPS-01 proxy/revogação/shutdown/update, OPS-02 last-good/readback/chave/espaço, OPS-03 marker/fence/replay/clone e OPS-04 gates/current-client/files têm evidência específica acima. A flag não foi apagada, não significa ausência de risco, não é quatro failures novos e não resolve semântica. T-04-10/16/17 também cobrem o envelope temporário de prontidão owner: arquivo restrito, stdin, TLS/login/status/logout bounded e remoção no finally; esse dado não foi aberto pelo verificador.

Não se afirma histórico de ferramentas absolutamente limpo: a execução anterior emitiu detalhes privados de UI/transporte sem credencial. A proibição avaliada refere-se a artefatos públicos; o limite foi preservado e não apagado.

## Cobertura dos requisitos

Todos os IDs dos seis frontmatters pertencem ao conjunto OPS-01/02/03/04, igual à matriz de Phase 4 em REQUIREMENTS. Nenhum requisito órfão. Checkboxes e matriz permanecem Pending.

| Requisito | Planos | Resultado da verificação |
|---|---|---|
| OPS-01 — HTTPS, supervisão, persistência e leitura offline | 01/02/03/05/06 | SATISFIED tecnicamente: operação real e controles atuais; não altera checkbox |
| OPS-02 — cópia inicial/final privada e offsite | 01/03/04/05/06 | SATISFIED tecnicamente: preflight/backup anterior à coleta e cópia externa atual recuperável |
| OPS-03 — restore limpo íntegro, sem segundo coletor | 03/04/05/06 | SATISFIED tecnicamente: SQL/FTS/910 binários/consulta e cliente restaurados; sessão avaliada separadamente |
| OPS-04 — caso real e distinção proposta/confirmação | 02/06 | SATISFIED com conferência adicional: fluxo técnico e distinção sobre as mesmas mensagens restauradas demonstrados; primeira resposta errada e limites não autoritativos preservados |

## Antipadrões e riscos residuais

Nenhum TBD/FIXME/XXX sem referência, stub ou ligação de produto ausente foi encontrado no alcance coberto. A primeira falha semântica permanece no histórico; a conferência adicional fecha a verdade SC4. As três flags de proibição continuam revisão recomendada não autoritativa. Nenhum blocker técnico demonstrado.

Notebook precisa estar ligado/conectado para a rotina pull; atraso é visível e Persistent permite catch-up. CONTEXT D-10 expressa preferência por independência do notebook, não promessa de disponibilidade contínua. Consulta na VPS continua independente dele. Codex CLI 0.162.1 está comprovado; negociação no Desktop GUI não foi demonstrada. Reboot integral e evento futuro do timer não foram testados. O arquivo contém somente o recebido, não histórico integral. A origem original está parada/fenced; a retomada do único coletor continua separada deste veredito. QR somente se a sessão remota for efetivamente inválida.

## Verificação humana / UAT

A pendência semântica anterior foi conferida adicionalmente, com método e primeira falha preservados em 04-SEMANTIC-ACCEPTANCE.md. O UAT autônomo registra esse resultado; não presume aceite do usuário.

### 1–3. Disposição das três proibições — revisão recomendada

As três revisões globais continuam flagged/unverified/human_review_recommended e não autoritativas. 04-UAT.md registra cada uma como advisory skipped com Deferred follow-up e razão própria. Os controles técnicos já passaram; não exige repetir testes, novo coletor ou ciclo operacional. A regra autônoma permite complete with 3 flagged prohibitions, mantendo revisão futura visível. Este relatório conserva human_needed para as flags, sem transformá-las em ausência de risco ou confirmação humana.

Os dois human-check dos planos permanecem colhidos: QR somente se a sessão realmente inválida; nenhuma ação agora. O de 04-06 impede presumir confirmação humana, que continua false.

## Resultado e itens adiados

Não há implementação faltante ou gap técnico bloqueante demonstrado. As 25 verdades estão verificadas, SC4 com conferência adicional e falha inicial preservada. Três proibições continuam flagged; o relatório mantém **human_needed** por essas revisões globais recomendadas. O UAT autônomo pode rotear sua disposição deferred segundo o owner canônico, sem apagar flags ou inventar confirmação. Nenhum gap de implementação foi deslocado para fase futura.

O fingerprint nativo atualizado cobre 62 arquivos do checkout, inclui automaticamente os planos/sumários e exclui este relatório. Evidências privadas externas foram inspecionadas em modo filtrado e não estão no digest do checkout. Seu sigilo e sua localização ficam no handoff privado.

---

_Verificador: gsd-verifier. Nenhum commit foi criado._

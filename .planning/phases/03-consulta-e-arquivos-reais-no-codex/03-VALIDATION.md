---
phase: "03"
slug: "consulta-e-arquivos-reais-no-codex"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-12"
---

# Phase 3 — Validation Strategy

Contrato de verificação derivado de 03-RESEARCH.md. Execução encerrada em 2026-10-12, com provas abaixo. Auditoria Nyquist do orquestrador concluída; o verificador independente ainda decide o objetivo e os requisitos MCP. Documentos e fixtures isolados não os concluem.

## Test Infrastructure

| Propriedade | Valor |
|---|---|
| Framework | node:test e node:assert existentes, Node 24.21.0 por mise |
| Configuração | package.json e tsconfig.json existentes |
| Build | `mise exec node@24.21.0 -- npm run build` |
| Quick proposto | `mise exec node@24.21.0 -- node --test dist/test/mcp.test.js` após criação/build |
| Suíte completa | `mise exec node@24.21.0 -- npm test` |
| Duração | Suíte independente final: 177/177 em 88,764s, exit 0; foco e execução real no ledger |

## Sampling Rate

- Após cada tarefa: build e teste específico da capacidade alterada, com exit não zero ou ausência de casos executados constituindo falha.
- Após cada wave: suíte integrada completa; falha bloqueia expansão.
- Antes do verificador: suíte verde e recibos do Codex real; cliente SDK isolado não substitui o Codex.
- Meta de retorno rápido: até30s para testes focados; medir e registrar sem declarar meta alcançada por documento.

## Per-Task Verification Map

Quatro planos em quatro waves; oito tarefas. Arquivos compartilhados e gate do tracer real obrigam sequência. Nenhum teste de implementação foi executado pelo planejamento.

| Task ID | Plan | Wave | Requirement | Comportamento e risco | Tipo | Automated Command | Threat Ref | File Exists | Estado |
|---|---|---|---|---|---|---|---|---|---|
| 03-01-01 | 03-01 | 1 | MCP-01/04/05 | Bearer/Host/Origin, TLS validado, negociação no Codex, pequeno e grande no destino | HTTP/TLS + real client | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js`; `ZAP_MCP_REAL_MODE=tracer mise exec node@24.21.0 -- node --test dist/test/mcp.test.js` | T-03-01/03/04/SC | Wave0 criado no início da tarefa | Pass — ledger abaixo |
| 03-01-02 | 03-01 | 1 | MCP-01/04/05 | Rotação/restart, restrição e token no consumo, corrupção/cancelamento/read-only | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/readonly.test.js dist/test/auth.test.js dist/test/media.test.js` | T-03-02/03/04 | MCP criado em 03-01-01; demais existentes | Pass — ledger abaixo |
| 03-02-01 | 03-02 | 2 | MCP-02/05 | Homônimos/PN-LID, AND/calendário/null/unknowns, filtros/cobertura | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/search.test.js` | T-03-06 | Depende de 03-01 | Pass — ledger abaixo |
| 03-02-02 | 03-02 | 2 | MCP-02/05 | Freeze/cursor/tampering/TTL/generation, DTO excessivo, budget e requests paralelos | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/search.test.js dist/test/context.test.js` | T-03-05/06/07 | Depende de 03-01 | Pass — ledger abaixo |
| 03-03-01 | 03-03 | 3 | MCP-03 | Âncora/vizinhas/citações/revisões/instantes e paridade site/MCP | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/context.test.js dist/test/search.test.js` | T-03-10 | Depende de 03-02 | Pass — ledger abaixo |
| 03-03-02 | 03-03 | 3 | MCP-03/05 | Restrição após buffer, conteúdo adversarial, allowlist efetiva e ausência de socket | Security/contract | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/readonly.test.js dist/test/security.test.js dist/test/context.test.js` | T-03-08/09 | Depende de 03-02 | Pass — ledger abaixo |
| 03-04-01 | 03-04 | 4 | MCP-01/02/03/04/05 | Fluxo Codex real atual, oráculo independente, destino/bytes, rejeição de recibo falso | Integration + real client | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp-acceptance.test.js && mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode self-test`; `mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode real-codex` | T-03-11/12 | Criado RED no início da tarefa | Pass — ledger abaixo |
| 03-04-02 | 03-04 | 4 | MCP-01/02/03/04/05 | Ledger/recibos sanitizados, configuração preservada, suíte e limites honestos | Regression + receipt | `mise exec node@24.21.0 -- npm test`; `mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode self-test` | T-03-11/12 | Depende de 03-04-01 | Pass — ledger abaixo |

Todos comandos assumem a raiz do checkout/worktree e Node 24. Cada PLAN liga imediatamente `<fails_when>` ao comando. Exit não zero, zero testes ou recibo/arquivo/protocolo/canal ausente é falha. Casos reais obrigatórios recusam ausência em vez de skip; fixtures não cumprem MCP.

Gate antes de wave2: 03-01-01 passa no Codex instalado por TLS confiado, com controle TLS negativo, negociação observada e dois originais/hash no destino. Plain loopback, URL ou SDK client isolado não habilitam expansão.

## Wave 0 Requirements

- [x] 03-01-01 cria RED test/mcp.test.ts e fixtures HTTP/TLS/SQLite privadas antes de código; dependência de todos testes MCP.
- [x] 03-01-01 cria harness real Codex/canal TLS e recibo privado conferido no destino antes de qualquer expansão.
- [x] 03-04-01 cria RED test/mcp-acceptance.test.ts antes do roteiro, incluindo controles conhecidos inválidos e um positivo.
- [x] Mapeamento de oito tarefas, waves, cinco requisitos, ameaças e comandos concretos pelos planos.

Nenhum framework adicional de testes é necessário. Comando que referencia artefato futuro depende explicitamente de sua criação/build.

## Verificações no cliente real

Agente executa autonomamente os acessos disponíveis. Participação do proprietário só por acesso concreto indispensável.

| Comportamento | Requisito | Evidência exigida |
|---|---|---|
| Conectar Codex instalado ao endpoint protegido | MCP-01 | Versão, protocolo observado, TLS com cadeia/hostname validados e controle negativo, credencial válida/recusada sem segredo |
| Consultar conversa/contexto reais | MCP-02/03 | Campos comparados com site/SQL independente, filtros/cobertura e continuação |
| Recuperar original pequeno e caminho para maior | MCP-04 | Artefato no destino, tamanho/SHA iguais ao original; URL/listagem não conta |
| Somente leitura sob mensagem adversarial | MCP-05 | Ferramentas fechadas e nenhum envio/alteração/socket chamado |

## Validation Sign-Off

- [x] Todas as tarefas têm verificação automatizada ou dependência Wave0.
- [x] Nenhuma sequência de três tarefas sem feedback automatizado.
- [x] Wave0 cobre referências inicialmente ausentes; sem watch-mode.
- [x] Duração dos testes focados registrada.
- [x] Recibos reais sanitizados e suíte integrada verde.
- [x] nyquist_compliant:true após auditoria do mapa e testes verdes no checkout final.

**Approval:** Nyquist validado em 2026-10-12 pelo orquestrador; veredito do objetivo da fase continua pendente do verificador independente.

## Probes e cobertura do planejamento

- GOAL/REQ/RESEARCH/CONTEXT: auditoria completa em 03-04-PLAN.md; MCP-01 a MCP-05 e D-01 a D-20 atribuídos a tarefas. COVERAGE.md registra o subconjunto somente leitura e opt-outs explícitos.
- Edge probe: cinco itens preservados. MCP-04 concurrency tem critério explícito de interrupção/restrição/rotação e grants concorrentes; MCP-01/02/03/05 continuam unclassified/unresolved como flagged assumptions para o verificador, sem descarte ou reclassificação inventados.
- Três proibições específicas foram projetadas por projectProhibitions em 03-04 must_haves.prohibitions, descriptor-less/unresolved, portanto flagged-unverified. Testes de produto planejados não são uma prova executada nem descriptors fabricados.
- Execução concluiu Wave0 e provas reais. status validated e nyquist_compliant:true registram a auditoria do orquestrador sobre o mapa, os casos de teste e a execução independente verde; wave_0_complete:true registra os artefatos efetivamente criados/testados.

## Ledger de execução — oito tarefas

A tabela de estratégia acima é histórica. Este ledger usa comandos/resultados efetivamente executados e os SUMMARYs dos planos; não altera REQUIREMENTS.md. Os testes HTTP normais usam fixtures sintéticas. Somente os casos identificados como Codex real comprovam a conta/cliente/arquivos observados.

| Tarefa | Evidência concreta/comando | Resultado/tempo | Fonte e tipo |
|---|---|---|---|
| 03-01-01 | build + `node --test dist/test/mcp.test.js`; tracer via `ZAP_MCP_REAL_MODE=tracer` | tracer inicial e feedback 3/3; reteste 11/11 em 121,838s | 03-01-SUMMARY; TLS/cliente/originais reais + fixtures de auth/schema |
| 03-01-02 | build + MCP/readonly/auth/media; `npm test` após ajuste de fixture | 154/154, zero skip/fail; reteste integrado 102,974s | 03-01-SUMMARY; sintético para duas transferências, rotação/restart, restrição/buffer, corrupção/cancelamento |
| 03-02-01 | build + MCP/search | 20/20 | 03-02-SUMMARY; candidatos/AND/histórico/calendário/unknowns sintéticos |
| 03-02-02 | build + MCP/search/context; `npm test`; tracer real repetido | 32/32 em 14,053s; full 164/164 em 136,106s; tracer 1/1 em 74,886s | 03-02-SUMMARY; freeze/HMAC/TTL/quota/budget sintéticos, TLS/originais reais |
| 03-03-01 | build + MCP/context/search | 36/36; ver commits em 03-03-SUMMARY | Paridade HTTP web/MCP e cursores/âncora/histórico sintéticos; tracer real posterior |
| 03-03-02 | build + MCP/readonly/security/context; `npm test` | 35/35 focados; full 172/172 em 99,598s; tracer real 1/1 em 67,289s | 03-03-SUMMARY; dados adversariais, spies WhatsApp zero, políticas de consumo sintéticas |
| 03-04-01 | build + `node --test dist/test/mcp-acceptance.test.js` + `scripts/phase3-acceptance.mjs --mode self-test`; `--mode real-codex` | receipt 4/4 em 0,385s; MCP+receipt 33/33 em 14,184s; final real exit0 às 17:13:27.794Z | REDs 46d9bbe/e93a15e, GREENf90509a, 03-ACCEPTANCE; SQL/site/disco/Codex reais |
| 03-04-02 | `mise exec node@24.21.0 -- npm test`; self-test; inspeção de diff e artifacts privados | 177/177 em 115,158s, zero fail/cancel/skip/todo; self-test exit0 | logs ignorados dist/03-04-full.log, 03-ACCEPTANCE, ledger e README; suíte sintética e revisão de prova real |

Comandos de produto acima usam `mise exec node@24.21.0 --` e TMPDIR privado na partição/home. A suíte glob inclui mcp-acceptance; o modo real é separado e obrigatório, não um teste skipped. Nenhum verify prescrito ficou sem rodar.

### Tempo real por caso do aceite final

Tempo entre criação e fechamento do transcript pelo processo atual; não é duração de um teste sintético nem medida de teto/latência garantida do cliente.

| Caso real sanitizado | Calls | Segundos |
|---|---:|---:|
| TLS sem CA |0 initialize|23,18|
| Candidato canônico |1|23,32|
| Busca página1 / página2 / página3 |1 cada|24,50 / 24,78 / 27,52|
| Contexto inicial / antes / depois |1 cada|28,43 / 25,60 / 24,61|
| Citação / edição / instante desconhecido |1 cada|23,16 / 24,36 / 19,50|
| Dois originais + helper |2 +1 command|32,27|

Cada chamada positiva teve subprocesso instalado atual, request ID/timestamp privado, HTTP finalizado e `mcp_tool_call` completed com argumentos/structuredContent iguais ao servidor. O helper teve exit0 e ambos destinos novos/SHA conferidos. A rodada anterior GREEN às 17:02:05Z e todas falhas anteriores foram preservadas externamente; JSON antigo não recria a instância viva do gate.

## Cinco requisitos e vinte decisões

| Requisito | Evidência existente | Estado global |
|---|---|---|
| MCP-01 | Codex0.162.1/initialize2025-06-18, TLS positivo/negativo; bearer ausente/inválido/revogado, cookie/sessão/Host/Origin recusados; restart/rotação sintéticos | Pending — verificador |
| MCP-02 | Candidato canônico e3 páginas reais AND por conversa/termo/dias, SQL/ICU/site; freeze/TTL/escopo/tampering/budget completos em fixtures | Pending — verificador |
| MCP-03 | Âncora/vizinhas reais antes/depois e3 casos reais quote/edit/unknown, campos SQL/site iguais; histórico textual/restrições em fixtures | Pending — verificador |
| MCP-04 |4200/271485 bytes novos no destino, hash disco/HTTP/destino iguais; cancelamento/rotação/restrição/concorrência sintéticos não publicam parcial | Pending — verificador |
| MCP-05 | Allowlist quatro tools, schemas fechados/instruções fixas, socket/spies zero; prova real teve0 outros MCP e1helper GET fixo | Pending — verificador |

| Decisões | Ligação à evidência |
|---|---|
| D-01 | Executável nativo Codex instalado e versão/protocolo reais; 03-01/04 |
| D-02 | Bearer exclusivo por request/GET, token privado no ambiente; 03-01/04 auth + arquivos |
| D-03 | Digest/geração atômicos, CLI, restart, invalidação e isolamento site/MCP; mcp.test rotação/CLI + revogação real03-04 |
| D-04 | Tracer real e feedback gate anteriores à expansão; 03-01-SUMMARY e grafo dos planos |
| D-05 | Homônimos grupo/individual/PN-LID separados sintéticos; candidato/ID canônico real03-04 |
| D-06 | Mesmas regras Archive AND/texto/legenda/filename/revisões; mcp/search + filtros reais SQL/site |
| D-07 | Snapshots/cursor HMAC/TTL/escopo/budget; mcp/search/context e3 páginas reais consecutivas |
| D-08 | America/Sao_Paulo, ICU independente/UTC/offset/nulls, cobertura parcial; testes DST + caso real desconhecido |
| D-09 | Âncora e antes/depois por referência e origem searchCursor; context/mcp +6 calls reais |
| D-10 | DTOs completos sanitizados, campos/revisões/citações/identidade; SQL e HTTP web independentes no real |
| D-11 | Restrição atual antes de write/end/read e próximos bytes; testes de buffer/contexto/dois streams |
| D-12 | Instruções fixas separadas, payload adversarial continua dado; mcp/readonly/security e nenhum comando extra no real |
| D-13 | Anexo por ID interno, original/fd/size/hash; media/mcp +2 originais reais |
| D-14 | content/image pequeno aceito; GET HTTPS explícito com bearer e origem fixa para ambos; fallback grande observado |
| D-15 | Destinos novos 2/2 com tamanho/SHA iguais ao disco e transporte, zero parcial aceito; audit/self-test |
| D-16 | Pendente/falho/indisponível/corrupto/symlink/HEAD/cancelamento/rotação/restrição; testes existentes sintéticos |
| D-17 | Quatro tools e métodos WhatsApp ausentes; mcp/readonly/security, adapters sem sessão/socket |
| D-18 | Clone restaurado de conta vinculada, nenhum pareamento/coletor novo, originais já arquivados; real03-04 |
| D-19 | Roteiro executado autonomamente, acesso disponível e nenhum gate humano pendente; receipts/processos atuais |
| D-20 | Whitelist pública, casos/transcripts/dados externos0700/0600, TOML preservado byte a byte; audit/privacy/diff |

## Ameaças e controles

| Threat | Evidência registrada |
|---|---|
| T-03-01 | Bearer antes de parsing/cookie; Host/Origin e TLS real; src/mcp.ts:70,src/main.ts:51/56,test/mcp.test.ts:538 |
| T-03-02 | Gate por consumo/write/end e fd; src/mcp.ts:57/80/230,src/media.ts:88,test/mcp.test.ts:39/72/89 |
| T-03-03 | ID fechado/O_NOFOLLOW/tamanho/SHA; src/media.ts:50/65,test/mcp.test.ts:54/97/532 |
| T-03-04 | Adapter sem socket, quatro registros fixos, allowlist e spies zero; src/mcp.ts:62/148/166/174/213,test/readonly.test.ts:16/34/36 |
| T-03-05 | HMAC/operação/geração/filtro/TTL e namespace; src/mcp.ts:105,src/archive.ts:422,test/mcp.test.ts:388 |
| T-03-06 | Schemas/corpo/args/envelope/quotas e DTO inteiro; src/mcp.ts:13/17/96/129/203,src/archive.ts:426,test/mcp.test.ts:202/365/409/449 |
| T-03-07 | Closure request-local/namespace/gate no consumo; src/mcp.ts:65/76/139/169,test/mcp.test.ts:427/463/474 |
| T-03-08 | Âncora/referências no gate e projeção atual; src/mcp.ts:206,src/archive.ts:366/487,test/mcp.test.ts:327/345 |
| T-03-09 | Instruções fixas/DTO como dados/allowlist; src/mcp.ts:18/147,test/mcp.test.ts:305,test/readonly.test.ts:37 |
| T-03-10 | Referência/direção/sessão/TTL/ordinal e paridade; src/mcp.ts:174,src/archive.ts:478,test/mcp.test.ts:223/273 e SQL/site real |
| T-03-11 | Whitelist/diretórios0700/arquivos0600/config/cleanup; scripts/phase3-acceptance.mjs:21/38/101/233/236/241,test/mcp-acceptance.test.ts:47 |
| T-03-12 | Run atual/calls/canal/destinos/oráculos; scripts/phase3-acceptance.mjs:19/24/107/153/176/224,test/mcp-acceptance.test.ts:25/29/40 |
| T-03-SC | Desvio de ordem original preservado; revalidação corretiva reauditoria1586/1586arquivos,0vulnerabilidades/scriptsdesabilitados,grafo6pacotes:03-DEPENDENCY-REVALIDATION.md;13/13ameaças fechadas em03-SECURITY.md |

## Pendências explícitas

Os probes MCP-01/02/03/05 e as3 proibições descriptor-less continuam flagged-unverified, sem criar check_* ou resolver taxonomia por documentação. MCP-04 concurrency tem critério explícito e testes concretos; a classificação independente continua fora deste ledger. Nenhum requisito global foi marcado completo aqui.

Pendência fase 4/WINDOWS13: login do site sob TLS nativo com Origin HTTPS retornou 403; oráculo do site foi HTTP exclusivamente loopback no mesmo clone. Configuração proxy/canal e comportamento de produção não foram comprovados. Endpoint de aceite encerrado, sem registro Codex habilitado apontando para ele. VPS, supervisão, backup externo recorrente e restore operacional final permanecem fora desta execução.

## Conferência Nyquist do orquestrador

Oito tarefas mapeadas, cinco requisitos COVERED e nenhum gap de automação identificado. Os testes existentes executam controles positivos e negativos de autenticação, revogação concorrente, integridade, filtros, cursores, contexto/proveniência, orçamento, somente leitura e recibos novos. O recibo real de 12 chamadas inclui SQL/site/bytes independentes e os casos de citação/edição/instante desconhecido; não foi substituído por fixtures. A suíte completa foi repetida no checkout final pelo orquestrador: `TMPDIR=<diretório privado no home> mise exec node@24.21.0 -- npm test`, exit 0, 177/177, zero fail/cancel/skip/todo, 88763,61252ms. Log privado `suite-root-wave4.log`. Nenhum teste novo que espelhe a implementação foi necessário. A validação Nyquist não antecipa o veredito dos requisitos nem a implantação VPS.

## Validation Audit 2026-10-12

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

## Validação após correções da revisão

WR-01 e WR-02 foram reproduzidos com RED semântico antes dos fixes. Sete testes adicionais cobrem subprocesso/descendente que ignoram TERM e seis falhas reais de setup/cleanup com SQLite, serviço e trava de fixture. A última correção também preserva configuração MCP anterior antes da primeira mutação. `03-REVIEW-FIX.md` contém os commits e evidências. Não houve mudança de produto, dependências ou corpus real.

Conferência independente final do orquestrador: `run-with-timeout 600 -- bash -c "mise exec node@24.21.0 -- npm test"`, TMPDIR privado no home, exit0 normal,184/184,zero fail/cancel/skip/todo,81867,432588ms. O timeout usa o fallback600s porque workflow.test_gate_timeout não está configurado; comando normalizado one-shot. A suíte inclui todos os18arquivos de teste extraídos dos relatórios de verificação das fases1/2. Log privado `suite-root-review-final.log`. Tracer atualizado passou1/1 às18:24:13.110Z, com TLSpositivo/negativo e originais4200/271485bytes/SHA iguais. Recibo integrado12calls às17:13:27.794Z foi preservado e as consultas/consumo de sucesso permanecem iguais; não foi substituído pelo tracer.

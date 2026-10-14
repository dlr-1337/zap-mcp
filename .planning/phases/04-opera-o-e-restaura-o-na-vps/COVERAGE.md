# Phase 04 — Coverage and source audit

No external API integration: transporte/deploy/backup usam CLI do ambiente e reutilizam MCP/Baileys existentes; nenhum novo SDK/API externo.

Se o backend identificado exigir nova API, enumerar sua superfície oficial e produzir matriz INTEGRATE/OPT-OUT com razões antes de implementar; esta declaração não dispensa esse gate.

Hooks aplicados na ordem recebida: api-integration (declaração acima), assumption-delta (detector atual detected:false), schema-gate (nenhum ORM/schema path detectado; SQLite existente), security (ASVS1/high bloqueante), tdd (RED/GREEN em capacidades elegíveis). Graphify desabilitado; sem contexto de grafo. Descoberta nível1 com RESEARCH atual + padrões fonte rastreada confirmados por git ls-files; novas versões do host/ferramenta oficial devem ser revalidadas no inventário/execução.

## Dependency graph

| Plan | Needs | Creates | Wave | Gate real |
|---|---|---|---|---|
|04-01 | Baseline/contexto e acessos existentes | Inventário read-only ready/blocked e config privada |1 | Nenhum stop/mutação |
|04-02 | Inventário concluído mesmo blocked; baseline web/MCP | Contrato HTTPS completo e negativos |2 | Endpoint permanente em05/06 |
|04-03 | Transporte | Shutdown/snapshot/resume/promoção |3 | Fence/source real em05 |
|04-04 | Operação coordenada | Cópia cifrada/readback/último bom/kit |4 | Adapter/destino/key reais, não presumidos |
|04-05 |01–04 | Release/volume/proxy/supervisor/agenda/migração/update |5 | Config/probes/backup/key disponíveis |
|04-06 |02–05 | Driver/gates e aceite real/restore/Codex |6 | Implantação05 comprovada antes da execução |

04-06 depende explicitamente de04-05 e executa na wave6. Gate real06 exige handoff05; uma implantação bloqueada mantém06 aguardando, sem interpretar espera como aceite. Shared main/ops são sequenciais nos planos anteriores. Sem docs/source/proof reais, nenhum gate é auto-dismissed. A história MVP equivalente está nos objetivos dos planos; o escopo e os critérios do roadmap foram preservados.

## Multi-Source Coverage Audit

COVERED indica tarefas que entregam/validam a fonte, não requisito implementado.

| Source | ID | Item | Plan/task | Status |
|---|---|---|---|---|
| GOAL | — | Arquivo permanente VPS e recuperação offsite com fluxo site/Codex sem coletor |05-02;06-02 |COVERED|
| REQ | OPS-01 | HTTPS/supervisor/persistência/restart/update/leitura offline |02;03-01;05-02;06-02 |COVERED|
| REQ | OPS-02 | Proteção inicial consistente + cópia externa/key recuperável |03-02;04;05-02;06-02 |COVERED|
| REQ | OPS-03 | Restore novo/SQL/FTS/todos originais/zero collector/sessão separada |03-03;04-01;06-02 |COVERED|
| REQ | OPS-04 | Conversa pessoal/orçamento/contexto/original/ZIP/site/Codex/restore |06-01/02 |COVERED|
| CONTEXT | D-01 | Inventário real/reuso sem host/contratação inventados |01-01/02;05-01/02 |COVERED|
| CONTEXT | D-02 | Origem HTTPS explícita/proxy confiável/Host/Origin/auth/Range/MCP |02-01/02;05-02 |COVERED|
| CONTEXT | D-03 | Preservar owner/password e Codex, bearer independente/revogável por referência |02-02;05-02;06-02 |COVERED|
| CONTEXT | D-04 | Supervisor/graceful/consulta versus collector versus backup |03-01;04-02;05-02 |COVERED|
| CONTEXT | D-05 | Snapshot acervo real/auth/sessão/refs/índices/originais/fallback |03-02/03;05-02 |COVERED|
| CONTEXT | D-06 | Source/autostart stopped antes target, promotion transacional |03-03;05-02 |COVERED|
| CONTEXT | D-07 | Volume privado persistente/capacidade/privilégios/sem apagar acervo |01-02;05-01/02 |COVERED|
| CONTEXT | D-08 | Pré-migração/update, rollback código/schema/dados recentes/fence |03-02;05-01/02 |COVERED|
| CONTEXT | D-09 | Diário/pré-update, stop curto medido/finally/rede após resume/24h |03-02;04-01/02;05-02 |COVERED|
| CONTEXT | D-10 | Cipher/destino sem notebook/key fora VPS/readback/kit |01-02;04;05-02;06-02 |COVERED|
| CONTEXT | D-11 | Imutável/último bom/reserva/parcial/corrupt/sem expurgo |04-01/02;05-02 |COVERED|
| CONTEXT | D-12 | Status seguro último sucesso/atraso/falha sem novo painel/terceiros |04-02;05-02 |COVERED|
| CONTEXT | D-13 | External readback/key→clean restore/SQL/FK/schema/FTS/all media |04-01;06-02 |COVERED|
| CONTEXT | D-14 | Clone offline/sessão separada/source stopped/QR só invalidade |03-03;05-02;06-02 |COVERED|
| CONTEXT | D-15 | Caso real, refs/autoria/filtros/fuso/bytes/oráculos/ZIP/limites |06-01/02 |COVERED|
| CONTEXT | D-16 | Gate real permanente/restart/update/offsite/restore/cliente |05-02;06-01/02 |COVERED|
| RESEARCH | R-01 | WINDOWS13 e origem comum, peer/proto/Host/Origin/Secure/CSRF |02-01/02 |COVERED|
| RESEARCH | R-02 | Shutdown streams antes server.close/drain/idempotência/deadline |03-01 |COVERED|
| RESEARCH | R-03 | Stop/snapshot/resume antes rede, mutex/journal/crash/finally |03-02;04-01 |COVERED|
| RESEARCH | R-04 | Snapshot/restore existentes, recibo source-path não portável/marker |03-03;05-02 |COVERED|
| RESEARCH | R-05 | Source live config/process/autostart/secrets/build não migram por Git |01;03-03;05-02;06-02 |COVERED|
| RESEARCH | R-06 | Releases/data separados, Node24/SQLite nativo/FTS e rollback compatível |05-01/02 |COVERED|
| RESEARCH | R-07 | Uma ferramenta/backend inventariados, oficial/checksum/pins sem upgrade |04-01;05-01 |COVERED|
| RESEARCH | R-08 | Cipher/key independente/readback específico/partialexit/imutável |04-01/02 |COVERED|
| RESEARCH | R-09 | Capacity/growth/stop duração/24h medidos, sem SLA inventado |01-02;04-02;05-02 |COVERED|
| RESEARCH | R-10 | Oráculos independentes/client atual/run não serializável/sem hash público |06-01/02 |COVERED|
| RESEARCH | R-11 | API/site/collector/backup separados, cron não é sucesso |03-01;04-02;05-02 |COVERED|
| RESEARCH | R-12 | Human action somente dependency/QR indispensável, locais seguem |01-02;04-01;05-02;06-02 |COVERED|

Deferred explicitamente excluídos: Claude/OAuth, multiusuário/conta, HA/writers, importador preventivo, OCR/transcrição/vetores/IA hospedada, envio remoto, novo painel, backup online e expurgo automático.

## Meaningful edges and unresolved probes

Probe original: quatro OPS unclassified/unresolved com verification:null. Não há resolução automática pelo planejamento.

| Item | Status original | Verification planejada | Meaningful edge/predicate |
|---|---|---|---|
|OPS-01 |unresolved |explicit:05-02/06-02 real | Proxy spoof/Origin403/Secure, streams/timeout, collector falha mas consulta200, update com dados recentes/schema |
|OPS-02 |unresolved |explicit:04-01/02 +05-02/06-02 real | Partial/readback truncado/key errada ou só VPS/ENOSPC/crash não avançam lastSuccess nem alteram último bom |
|OPS-03 |unresolved |explicit:03-03 +06-02 real | Wrong path/profile/replay/marker removal/source live/crash bloqueiam socket; all media/FTS/refs conferidos |
|OPS-04 |unresolved |explicit:06-01/02 real | Cada gate individual ausente/stale/synthetic/loopback/JSON replay rejeitado; files novos e Codex instalado correlacionados |

Proibições de todos PLANs permanecem flagged-unverified/verification:null até enforcement comportamental independente. Os testes futuros são planos de verificação, não prova executada. Não descartar ausência sem descritor como não aplicável.

## Blockers e hipóteses

A1: Linux/Node24/SQLite/FTS/persistência no destino — ASSUMED até inventário atual.
A2: Acesso/VPS/HTTPS/proxy/supervisor/storage/key existentes adequados sem contratação — ASSUMED até prova.
Nenhum host/domínio/proxy/supervisor/destino/key foi provado por este planejamento.01 registra dependência;02–04 e driver06 podem ter trabalho local pronto; instalação/migração/backup real/aceite aguardam fatos necessários. Fonte não para para preencher lacuna.


---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "02"
subsystem: database
tags: [sqlite, ingestion, provenance, revisions, viewOnce, coverage]
requires:
  - phase: "01-01"
    provides: Node24 ESM, autenticação privada e leitor com cursores assinados
provides:
  - Arquivo transacional de FULL/notify/append/updates com origens, aliases e revisões
  - Recibos privados recuperáveis, restrições anteriores à projeção e elegibilidade de mídia
  - Cobertura durável no HTTP e evidência no leitor privado
affects: ["01-03", "01-04", "01-05", "01-06", "01-07", phase-2, phase-3]
tech-stack:
  added: []
  patterns: [SQLite síncrono por item, migrações versionadas, DTO allowlist, recibo durável anterior à projeção]
key-files:
  created: [src/archive.ts, test/archive.test.ts, test/revisions.test.ts, test/coverage.test.ts]
  modified: [src/main.ts, public/app.js]
key-decisions:
  - "Migrações v2→v3→v4 conservam UUIDs e referências; recibos sanitizados permitem retomar pendências sem rede."
  - "Revisões sem ordenação confiável permanecem como conflito explícito; revogação não apaga conteúdo permitido capturado."
  - "Última ingestão conta somente commits confirmados; status do protocolo e watchdog120s nunca significam cobertura integral."
requirements-completed: []
requirements-supported: [SYNC-02, SYNC-03, SYNC-05, SYNC-06, SYNC-07, EVID-01, PRIV-03, WEB-01]
coverage:
  - id: D1
    description: Ingestão completa por lote, origem, alias, revisão e atomicidade
    verification:
      - kind: integration
        ref: test/archive.test.ts + test/revisions.test.ts + test/coverage.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Cobertura privada, intervalo original e retomada de lote interrompido
    verification:
      - kind: integration
        ref: test/coverage.test.ts#HTTP cobertura distingue ausência, commits, intervalo original, replay e falhas
        status: pass
    human_judgment: false
  - id: D3
    description: Evidência, citações e histórico renderizados no leitor
    verification:
      - kind: other
        ref: public/app.js
        command: node --check public/app.js
        status: pass
    human_judgment: true
    rationale: Conferência visual no browser da wave ainda necessária; sintaxe e respostas HTTP não provam a apresentação.
actuals:
  tokens: 16080
  tasks: 2
  commits: 8
duration: 12min
completed: 2026-10-10
status: complete
implementation_history:
  scope: "histórico local privado anterior à publicação sanitizada"
  plan_head_before: 10c93b445d03534813f11ac35d24d7114544a0c5
  plan_head_after: 7db33a7a6bc901a23492259fb5034d75f0fc6c9a
---

# Phase 1 Plan 2: Projeção durável dos eventos recebidos com evidência Summary

**FULL, notify, append e updates persistem origens e revisões em SQLite, com tombstones, exclusão prévia de viewOnce e cobertura privada baseada em commits.**

## Performance

- Started: 2026-10-10T21:08:00Z
- Completed: 2026-10-10T21:19:52Z
- Duration: 12min
- Tasks: 2
- Product files: 6; duas evidências RED adicionais em planejamento.
- Actual tokens: 16080, teto de caracteres/4 do diff realizado dos seis arquivos de produto/teste. Commits8 medidos incluem quatro RED/GREEN, três commits de documentação canônica e uma correção de reconciliação.

## Accomplishments

- `openArchive(dataDir)` extrai o arquivo do tracer, migra SQLite preservando referências existentes e executa integrity_check/foreign_key_check. Mensagem, origem, revisão, anexo elegível e job confirmam juntos por transação síncrona. Recibo sanitizado antecede a projeção; falhas ficam contabilizadas sem anunciar confirmação.
- Identidade usa chave recebida, direção, participante e aliases evidenciados; nomes Unicode equivalentes não unem contatos. Mapeamento tardio redireciona referências já atribuídas. Atualizações antes do original preservam tombstone e revisão; replay antigo não restaura revogada nem substitui edição com relógio posterior confiável. Conflitos sem relógio são explícitos.
- ViewOnce em key/wrappers/mídia e citações é classificado antes da normalização e removido de conteúdo, recibo, payload privado e job. Temporárias permitidas retêm conteúdo e expiração recebida. Buffer e Long preservam significado no armazenamento privado; DTO não contém payload, descriptor ou URL de mídia.
- HTTP autenticado consulta as mesmas projeções; exibe origem, autoria/direção, instante original, citação recebida, limitações, alterações e estados de anexo. Cursor assinado e limitação de página permanecem do tracer; timestamps ausentes continuam null.
- Cobertura distingue mensagens únicas de ocorrências de lote, recebidos/confirmados/pendentes/falhas, intervalo por instante original e última ingestão confirmada. Status complete/paused explícito/inferido é deduplicado e não apaga falhas. Watchdog de120s é calculado no snapshot; startup retoma recibos pendentes sem socket.

## Task Commits

1. Task 01-02-01 RED: `ee495d5` — testes de ingestão/revisões antes de implementar.
2. Task 01-02-01 GREEN: `14a601f` — arquivo transacional, origens, revisões e recibos privados.
3. Task 01-02-02 RED: `3892c38` — ausência da cobertura HTTP e watchdog/retomada.
4. Task 01-02-02 GREEN: `f4c2951` — cobertura, retomada e leitor com evidência.
5. Correção final: `7db33a7` — alias tardio preserva cada ocorrência incompleta sem chave.

Documentação/estado: `e1e5700`, `7ff52bc`, `42afe39` — SUMMARY antes da atualização canônica e projeção SDK.

## Verification

- Task1: `mise exec node@24.21.0 -- npm run build` seguido de node --test --test-reporter=tap dist/test/archive.test.js dist/test/revisions.test.js dist/test/auth.test.js: **18/18 pass**, cerca de7.5s.
- Task2/plan: build seguido de node --test --test-reporter=tap dist/test/coverage.test.js dist/test/archive.test.js dist/test/revisions.test.js dist/test/auth.test.js: **22/22 pass**, cerca de7.5s.
- Última execução após ajustes finais: `mise exec node@24.21.0 -- npm test`: **22 tests,22 pass,0 fail,0 skipped**, 8459ms. Os quatro arquivos de alvo executaram; nenhum zero-test foi tratado como êxito.
- node --check public/app.js e `git diff --check`: pass. Busca de TODO/FIXME/placeholder e chamadas sendMessage/readMessages/chatModify nos arquivos do plano: nenhum resultado.
- Falha SQL injetada prova rollback de mensagem/revisão/origem/job, contagem de falha e erro sanitizado. Migração real v2, FK/integrity, 130 itens empatados, replay e lote vazio, homônimos/PN-LID/grupo, Long/buffer, update-before-original, revogação/replay, viewOnce/citação/recibos e retomada após reabrir banco foram exercitados.
- `check evaluation-scope --plan 01-02 --commits-only --raw`: resolved, quatro commits alcançáveis neste ramo.

## TDD Gate Compliance

- Task1 report `01-02-red.json`: TAP completo de9 testes,9 falhas; alvo FULL executou e falhou **0 !==130**, porque o tracer não possuía ingestHistory. Classificador: `RED_EVIDENCE_OK`; RED commit precede implementação.
- Task2 report `01-02-coverage-red.json`: TAP completo de4 testes,2 falhas; alvo HTTP autenticado falhou **undefined versus intervalo com limites null**, porque coverage estava ausente. Classificador: `RED_EVIDENCE_OK`; segundo RED commit precede sua implementação.
- Falhas iniciais de tipagem nos testes foram corrigidas antes dos relatórios válidos e nunca usadas como evidência RED. REFACTOR separado dispensado; não houve violação de gate.

## Decisions Made

Sem novas bibliotecas, ORM, socket, fila externa ou infraestrutura. Mídia tem somente elegibilidade/job durável para01-04. Serialização binária privada usa V8 do Node24 fixado, preservando buffers e os componentes recebidos de Long; restauração deve usar runtime compatível. Watchdog apenas sinaliza falta de progresso; não confirma lote nem reinicia coleta. Falhas registradas exigem replay explícito; startup retoma somente itens ainda pendentes.

## Deviations from Plan

**[Rule1 - Bug] Marcador restrito preservado durante retomada:** a leitura do recibo sanitizado removia o wrapper viewOnce e perdia a indicação na citação. O gate passou a reconhecer o marcador interno; `test/revisions.test.ts` e o teste de recibo privado confirmam ausência de corpo e indicação correta. Corrigido em `f4c2951`.

**[Rule1 - Bug] Alias tardio não mescla ocorrências incompletas:** conferência final encontrou que reconciliação atribuía chave lógica comum a dois itens sem ID/JID. A asserção de regressão executou e falhou2 versus3; itens incompletos passaram a ser excluídos da união por identidade, conservando referências próprias. Os22 testes passaram após correção em `7db33a7`.

**Ajuste obrigatório de aceite:** requisitos globais continuam Pending, conforme AGENTS.md e autorização do orquestrador. `requirements-supported` registra os oito contratos avançados; `requirements-completed` permanece vazio porque conta real, anexos reais e leitura em VPS ainda não foram comprovados.

## Issues Encountered

Nenhum bloqueio remanescente no escopo. Uma consulta prematura ao classificador apontou registro inexistente após build de teste falho; somente o relatório TAP real posterior recebeu aprovação para GREEN. Trava preexistente .planning/milestone.lock preservada, sem staging.

## User Setup Required

Nenhuma configuração externa requerida neste plano. Não houve sessão WhatsApp, QR ou mensagem real.

## Next Phase Readiness

01-03 pode ligar eventos ao arquivo; expõe `archive.db`, `ingestHistory`, `ingestUpsert`, `ingestUpdates`, `ingestContacts`, `ingestGroups`, `ingestHistoryStatus`, `readStoredMessage`, `readPrivateMessage`, `listConversations`, `readConversation`, `getAttachment`, `getCoverage`, `close`. `readPrivateMessage` retorna envelope privado sanitizado permitido, ou undefined para restrição/revogação/conflito; o coletor deve usar seu `.message` para getMessage. `ingestContacts({lid,pn})` recebe também mapping evidenciado. `ingestUpdates` recebe array de `{key,update}`; a futura ligação deve mapear delete de chaves para `{message:null}` sem promover exclusão local a expurgo do arquivo.

01-04 implementa captura original usando attachments/media_jobs privados, ainda em pending. QA visual do browser e piloto da conta real permanecem na wave/plano de aceite; esta suíte sintética não os substitui. Sem novo endpoint público de ingestão/escrita, download ou MCP.

## Self-Check: PASSED

Seis arquivos de produto/teste existem. Os oito commits medidos acima são alcançáveis em HEAD. Verificações automatizadas de ambos os tasks e do plano foram executadas, sem testes omitidos. Arquivo SUMMARY salvo antes da atualização canônica; correção final registrada em revisão do próprio resumo.

Nota de publicação: contagens/janelas de commits e verificações de ancestralidade acima foram medidas no histórico local de implementação, preservado no checkout original. A publicação usa snapshot sanitizado para manter dados de conversa fora do histórico público; IDs de commits históricos são referências locais, não commits desta branch publicada.

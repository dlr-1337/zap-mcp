---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "01"
subsystem: search
tags: [sqlite, fts5, temporal, express, playwright, privacy]
requires:
  - phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
    provides: arquivo local com revisões, identidades, mídia e autenticação
provides:
  - busca literal AND por revisão com DTOs e ordinais congelados
  - período civil America/Sao_Paulo com limites UTC e política de instante desconhecido
  - seleção explícita de homônimos e formulário acessível com paginação privada
affects: [02-02, 02-03, 02-04, 02-05, mcp]
tech-stack:
  added: ["@js-temporal/polyfill@0.5.1", "yazl@3.3.1", "yauzl@3.4.0", "@types/yazl@3.3.1", "@types/yauzl@3.4.0"]
  patterns: [FTS por revisão permitida, snapshots sanitizados por sessão, HMAC de escopo e ordinal, calendário Temporal]
key-files:
  created: [test/search.test.ts, test/ui.test.ts]
  modified: [src/archive.ts, src/main.ts, public/app.js, public/index.html, public/style.css, package.json, package-lock.json, test/media.test.ts]
key-decisions:
  - "searchMessages e parsePeriod permanecem em archive.ts; nenhum novo wrapper ou serviço."
  - "Fingerprint público deriva somente de evidência sanitizada; revisionId é aditivo no DTO de mensagem e o getter legado de anexo conserva os campos anteriores."
  - "Snapshots por sessão/ownerGeneration têm TTL30min,20 ativos,50000itens/64MiB; excesso é recusado sem truncar ou expulsar recorte válido."
requirements-completed: [EVID-02, WEB-02, WEB-03]
requirements-proof-scope: "IDs declarados no plano; conclusão global permanece pendente dos planos dependentes e aceite real02-05."
coverage:
  - id: D1
    description: busca por texto legenda e nome da mesma revisão, histórico explícito e freeze de paginação
    verification:
      - kind: integration
        ref: test/search.test.ts#busca HTTP encontra termo literal em evidência congelada
        status: pass
      - kind: integration
        ref: test/search.test.ts#mais de100 empates preservam sequência e DTOs após retroativo edição e merge
        status: pass
    human_judgment: false
  - id: D2
    description: calendário histórico e instante original sem substituição por ingestão
    verification:
      - kind: integration
        ref: test/search.test.ts#dias inclusivos respeitam23h e25h
        status: pass
      - kind: integration
        ref: test/search.test.ts#calendário estrito limites abertos original null e Date.max não viram ingestão
        status: pass
    human_judgment: false
  - id: D3
    description: candidatos distintos feedback acessível segurança e reflow da busca
    verification:
      - kind: automated_ui
        ref: test/ui.test.ts#contatos homônimos e estados UC01 a UC22 usam DOM acessível e recorte estável
        status: pass
      - kind: automated_ui
        ref: test/ui.test.ts#DOM candidatos zero um falha buscas loading termos inválidos e logout recusam resposta antiga
        status: pass
      - kind: integration
        ref: test/search.test.ts#busca privada valida auth cursores limites termos literais homônimos e sentinelas
        status: pass
    human_judgment: false
actuals:
  tokens: 20012.75
  tasks: 3
  commits: 7
plan_head_before: 4c04f535284420d4e1a1b08b725f6bcf8e7d1ae5
plan_head_after: b9b989d23e8d0fff6a1f3311e46cb75135add8f2
duration: 14min
completed: 2026-10-11
status: complete
---

# Phase 2 Plan 1: Busca privada com evidência congelada Summary

**FTS5 por revisão, filtros civis históricos com Temporal e busca autenticada com DTOs imutáveis, candidatos canônicos e continuação assinada.**

## Performance

- Início:2026-10-11T22:49:03Z; término:2026-10-11T23:03:28Z; duração14min25s.
- Tarefas:3/3; arquivos de produto/testes:10.
- actuals.tokens é o diff realizado em caracteres/4; commits medidos pelo ledger, antes deste resumo e metadados.

## Accomplishments

- GET/api/search combina conversa, termos simples e período porAND. FTSunicode61 remove_diacritics2 usa unidade por revisão, não envelopes ou descritores. Replay não duplica resultado; edição/revogação preservam correspondência histórica identificada; restrição remove a evidência do índice.
- query_snapshots/query_items preservam referência, versão, identidade, ordem BINARY e JSON sanitizado.106 mensagens,105 empates e ingresso retroativo/edição/merge não mudaram páginas nem repetição do cursor. TTL30min/20recortes/50000itens/64MiB e limites50/100 são explícitos; excesso não trunca nem remove recorte válido.
- parsePeriod/EffectivePeriod exportados emarchive.ts preservam o instante original e convertem dias civis de SãoPaulo para limites numéricos UTC; DST23/25h, fronteiras1ms, calendário estrito, limites abertos e Date.max foram conferidos. Null/outsideDate permanece desconhecido e é excluído somente quando há período.
- Formulário nativo, candidatos porID, identidade/tipo/ref, UTC emdetails, resultados atuais/históricos separados, textos hostis seguros, retry sem apagar dados, expiração e limpeza/logout com resposta tardia cobrem UC01..22. Sem conteúdo emstorage do navegador.

## Task Commits

| Tarefa | RED | GREEN | Prova |
|---|---|---|---|
|02-01-01|4f41e91|db997ea|HTTP404≠200 e formulário0≠1;4/4GREEN e tracer repetido4/4|
|02-01-02|ead04d0|a641aa9|HTTP400≠200 para período;5/5GREEN|
|02-01-03|0bb00b3|6206cf0|seletor de contato0≠1;11/11GREEN focados|
|Compatibilidade do DTO|—|b9b989d|getter preservado, allowlists fechadas e vínculo de revisão;33/33 afetados|

## TDD Gate Compliance

Os quatro alvos RED executaram assertions de comportamento com fixture/login/browser válidos, sem erro de importação ou sintaxe. Relatórios TAP completos e exit1 estão nos arquivos ignoradosdist/02-01-01-{search,ui}-red.json,dist/02-01-02-red.json,dist/02-01-03-red.json; cada registro foi aceito por `node /home/otavio/.codex/gsd-core/bin/gsd-tools.cjs check tdd-red-evidence <registro> --raw` comRED_EVIDENCE_OK. semanticAssessment registra a falha planejada, sem autoatestado substituindo o classificador. Cada tarefa temRED antes do seuGREEN. Não houve refatoração adicional.

## Verification

- Tracer: `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/search.test.js dist/test/ui.test.js`4/4, repetido4/4 antes da expansão.
- Calendário: build +search.test.js5/5.
- Task3: build +ui/security/search11/11,0skip,5,172s.
- Compatibilidade: build +media/search/ui33/33,0skip,7,361s.
- Final: `mise exec node@24.21.0 -- npm test`97/97,0fail/skip/todo,11,095s.
- Baseline6 reabriu derivados preservando mensagens/origins/revisions/attachments/batches e blobs, sem alterar user_version.
- AuthGET/HEAD, cookie inválido/idle/logout, sessão diferente, HMAC/ordinal/direção/filtro adulterado e cursor expirado recusados; JSON/DOM não expuseram sentinelas/envelopes/descriptors/media keys. P-02-01/P-02-02 têm prova negativa concreta nos testes de null eAND entre revisões.
- Browser real Playwright do bundle e Chromium152 existente; screenshots sintéticasdist/02-01-ui-{320,768,1280}.png ezoom200.png inspecionadas. Reflow de fonte200% foi conferido; zoom nativo do navegador não foi automatizado.

## Files Created/Modified

archive.ts contém FTS/snapshots/calendário/DTO; main.ts integra auth/cursor/candidatos/rota. HTML/CSS/JS mantêm tokens e controles48px. search/ui tests exercitam HTTP eDOM; media.test.ts adapta somente duas allowlists afetadas e suas assertions de vínculo. Manifests fixam os cinco pacotes revalidados pornpm view oficial;0vulnerabilidades reportadas. ZIP é pré-requisito do02-04, ainda não implementado aqui.

## Decisions Made

Mantidos módulos, HTML/CSS nativos e coletor existentes. Campos desconhecidos continuam explícitos. Node24.21.0 usado por mise em todos os comandos de produto; Node global e serviços reais não foram alterados. O fingerprint de evidência não reutiliza o hash de payload privado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Compatibilidade e teste fechado do DTO de anexo**
- Encontrado na regressão final: cinco assertions antigas exigiam a lista semrevisionId.
- Fix: getter legado conservado; DTO acrescenta somenterevisionId; ownership de test/media.test.ts ampliada pelo orquestrador para ajustar exatamente duas allowlists e conferir vínculo com a revisão. Não foi usada aceitação genérica de propriedades.
- Arquivos:src/archive.ts,test/media.test.ts; commit:b9b989d; verificação33/33 e97/97.

**Total deviations:**1 correção direta; sem expansão arquitetural. A execução sequencial no checkout atual foi a degradação já decidida pelo orquestrador, não uma nova branch/worktree.

## Issues Encountered

- Bundle Playwright sem executável esperado: Chromium152 existente lançou antes doRED; não houve nova dependência de browser no produto.
- Fixtures ajustadas para nomes de chats emsubject e para correspondência literal deOR/1 presentes no próprio texto hostil. Espera do route.fulfill controlada antes de remover interceptação.
- Uma seleção de conversa aleatória na fixtureHTTP preexistente falhou na primeira regressão; passou nas duas seguintes. Limitação registrada emdeferred-items.md, sem mudar código/teste fora do escopo.

## User Setup Required

Nenhum para este plano.

## Next Phase Readiness

Pronto para02-02. Abrir contexto já transporta referência e conversa; leitura ancorada bidirecional é responsabilidade explícita do próximo plano. Exportação/abas/preview/aceite real não foram implementados nem simulados como concluídos aqui. EVID-02/WEB-02/WEB-03 continuam pendentes no registro global até os planos compartilhados e prova real; os IDs da frontmatter são os declarados noPLAN.

## Self-Check: PASSED

Os dez arquivos de produto/teste e todos os sete commits existem no checkout/ancestralidade atual; evaluation-scope resolveu os sete subjects do plano. Nenhum stub que impeça o objetivo deste plano, skip ou verify não executado foi deixado. Não surgiu superfície de confiança fora do threat_model: somente a busca/candidatos autenticados e derivados privados planejados.

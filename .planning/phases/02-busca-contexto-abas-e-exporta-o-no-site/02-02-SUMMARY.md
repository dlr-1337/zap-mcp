---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "02"
subsystem: context
tags: [sqlite, express, snapshots, tabs, playwright, privacy]
requires:
  - phase: 02-01
    provides: DTO sanitizado, busca por revisão, snapshots privados e cursor HMAC
provides:
  - contexto ancorado por referência e redirect com janela congelada bidirecional
  - abas em memória com DOM, cursor, âncora, posição e geração independentes
  - teclado, fechamento e invalidação de sessão e respostas tardias
affects: [02-03, 02-04, 02-05, mcp]
tech-stack:
  added: []
  patterns: [contexto em query_snapshots, Map de conversas canônicas, tickets de sessão e aba, purge no ciclo da sessão]
key-files:
  created: [test/context.test.ts]
  modified: [src/archive.ts, src/main.ts, src/auth.ts, public/app.js, public/index.html, public/style.css, test/ui.test.ts, test/security.test.ts, test/http.test.ts]
key-decisions:
  - "Contexto reutiliza query_snapshots/query_items e filtros JSON tipados; nenhuma migração, serviço ou dependência nova."
  - "Cada aba conserva DOM, snapshot, cursores, âncora, scroll e geração; somente o painel ativo recebe os IDs legados, mantendo IDs únicos."
  - "Revogação do SQLiteStore elimina derivados por HMAC de sessão/generation; reset limpa recortes e sweep60s purga TTL."
requirements-completed: [WEB-03, WEB-04, EVID-02]
requirements-proof-scope: "IDs do plano; requisitos globais permanecem pendentes do aceite real02-05 e superfícies posteriores."
coverage:
  - id: D1
    description: âncora distante, vizinhas bidirecionais congeladas e histórico separado do atual
    verification:
      - kind: integration
        ref: test/context.test.ts#resultado distante abre âncora congelada e vizinhas nos dois sentidos
        status: pass
      - kind: integration
        ref: test/context.test.ts#contexto conserva correspondência histórica e resolve redirect recebido
        status: pass
    human_judgment: false
  - id: D2
    description: três abas com leitura própria, teclado, fechamento e telas estreitas
    verification:
      - kind: automated_ui
        ref: test/ui.test.ts#abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34
        status: pass
      - kind: automated_ui
        ref: test/ui.test.ts#resultado distante abre âncora e duas leituras independentes
        status: pass
    human_judgment: false
  - id: D3
    description: sessão e tickets impedem mistura de respostas e ressurgimento de conteúdo privado
    verification:
      - kind: automated_ui
        ref: test/ui.test.ts#resposta retida de A não ativa A sobre B e fechar A invalida sua geração
        status: pass
      - kind: automated_ui
        ref: test/ui.test.ts#logout vence resposta de contexto retida e bfcache exige sessão atual
        status: pass
      - kind: integration
        ref: test/context.test.ts#expiração e reset eliminam snapshots privados além de recusar sessão velha
        status: pass
      - kind: integration
        ref: test/security.test.ts#HTTP privado nega HEAD/Range, paths e vazamentos; revalida expiração antes de responder QR
        status: pass
    human_judgment: false
actuals:
  tokens: 17535
  tasks: 3
  commits: 6
plan_head_before: 8a93acf7ab70a900b22829f05fdd176f043d7f52
plan_head_after: 60e100fb0f111c60b4abb874f125cfcdf645a056
duration: 16min
completed: 2026-10-11
status: complete
---

# Phase 2 Plan 2: Contexto congelado e abas independentes Summary

**Referências e redirects abrem âncoras com vizinhas congeladas; abas canônicas conservam DOM, leitura e cursores privados com teclado e proteção contra respostas tardias.**

## Performance

- Intervalo do ledger: base registrada2026-10-11T23:07:49Z até fechamento do resumo2026-10-11T23:23Z, aproximadamente16min.
- Tarefas3/3;10 arquivos de produto/testes. actuals.tokens mede caracteres/4 do diff de src/public/test; seis commits antes deste resumo.

## Accomplishments

- `openContext`/`readContextPage` e GET `/api/context/:reference` resolvem referência recebida, conversa canônica e redirects. Primeiro recorte inclui até25 vizinhas por lado mais âncora; continuação50/max100 traz ordinais congelados por sessão/referência/direção com HMAC. IDs ausentes404, origem fora do recorte400 e expiração410 seguros. Limites20recortes/50000mensagens/64MiB/30min herdados não truncam dados.
- `matchedEvidence` vem exclusivamente do snapshot de busca da sessão, preservando revisão correspondente e identificação histórica separadas do conteúdo atual. Instante original, UTC, citações, revisões e anexos permanecem no DTO.181mensagens percorrem duas direções sem repetição após retroativo/edição; empates BINARY e null por último conferidos.
- `tabs` Map conserva painel/DOM, snapshot, referências, cursores before/after, âncora, scroll, loading e generation por conversa canônica. Duas leituras e três abas exercitadas; reabertura reutiliza a existente, refreshB conservaA, prepend compensa âncora e retorno móvel conserva estado. IDs DOM são únicos; painel ativo visível, tablist/tabpanel associados e fechamento devolve foco.
- Tickets globais de sessão e próprios de aba/abertura conferidos após fetch/json e em erro/finally. RespostaA retida não ativaA sobreB; fecharA e logout vencem resposta retida. pagehide oculta e invalida requisições; pageshow revalida sessão/CSRF antes de revelar. Logout/TTL/reset removem derivados e superfícies privadas, sem conteúdo em localStorage/sessionStorage. Players são pausados ao sair e src removidos ao liberar painel.
- Setas/Home/End movem foco sem ativar; Enter/Espaço ativam; Delete ou botão separado fecha. Seleção/âncora têm borda4px, controles48px, textos Unicode completos e dir=auto. Fonte200% e320/768/1280 não causaram overflow do documento.

## Task Commits

| Tarefa | RED | GREEN | Prova |
|---|---|---|---|
|02-02-01|db17c73|121dd51|HTTP404 e âncoraDOM0;13/13GREEN e tracer repetido13/13|
|02-02-02|82f9199|9947134|snapshot permaneceu apósTTL e respostaA ativouA;19/19GREEN|
|02-02-03|58c710d|60e100f|ArrowRight não moveu foco;12/12GREEN,HTTP2/2 e full105/105|

## TDD Gate Compliance

Os alvos RED executaram fixtures/login/browser válidos e assertions planejadas antes da implementação correspondente. TAP completo e exit1 preservados nos arquivos ignorados `dist/02-02-01-red.json`, `dist/02-02-01-ui-red.json`, `dist/02-02-02-red.json`, `dist/02-02-02-ui-red.json` e `dist/02-02-03-red.json`, todos aceitos por `gsd-tools.cjs check tdd-red-evidence` como RED_EVIDENCE_OK e com semanticAssessment. Reporter inicial spec foi recusado como INVALID_RED e repetido em TAP antes de autorizar GREEN. Assertions preliminares de status/copy foram ajustadas para alcançar os alvos corretos; esses resultados não foram usados como prova dos comportamentos seguintes. Cada tarefa tem RED antes do seu GREEN; nenhuma refatoração adicional.

## Verification

- Tarefa1: build +context/ui/search13/13; repetição do tracer13/13 antes da expansão.
- Tarefa2: build +context/ui/auth19/19,0skip.
- Tarefa3: build +ui/security/context12/12,0skip; teclado/scroll em3abas, bordas/empates/null/restart, authGET/HEAD e redirects antigos, HMAC/direção/escopo/ordinal adulterados.
- TesteHTTP afetado2/2 após correção determinística. Primeira suíte completa104/105 falhou na fixture preexistente documentada abaixo; suíte final `mise exec node@24.21.0 -- npm test`105/105,0fail/skip/todo,17,323s. Log ignorado `dist/02-02-full-tests-final.log`.
- Browser real com Playwright do bundle e Chromium existente, somente temporários sintéticos sem socket real. Capturas `dist/02-02-ui-{320,768,1280}.png` e `dist/02-02-ui-zoom200.png` inspecionadas.200% corresponde a reflow de fonte, não zoom nativo.
- Segurança preserva no-store/nosniff/CSP, erros sanitizados e nenhuma leitura de payload/mediaKey/paths privados na nova consulta. P-02-03 comprovada pelos testes de retenção/close/logout/storage; VALIDATION atualizada sem concluir requisitos globais.
- Documentação oficial consultada: [Express Session1.19.0](https://github.com/expressjs/session/blob/v1.19.0/README.md) para store/destroy; [W3C APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) para interação de teclado.

## Deviations from Plan

1. **Realocação autorizada:** tablist/panels mínimos de HTML/CSS previstos na tarefa3 foram introduzidos na tarefa1 para verificar o tracer de duas leituras. Teclado, reflow e estados finais permaneceram na tarefa3. Arquivos já estavam no escopo; sem capacidade extra.
2. **[Rule3 — Blocking] FixtureHTTP determinística:** primeira suíte falhou porque `test/http.test.ts` buscava a conversa hostil apenas entre50 de56 IDsUUID aleatórios. Defeito preexistente já registrado no02-01; orquestrador ampliou ownership explicitamente. A seleção agora usa `readStoredMessage` da origemm0, preservando todas as assertions e limites reais. Commit60e100f;HTTP2/2 e full105/105. Item deferred resolvido e WINDOWS#7 marcado fixed.

## Issues Encountered

Somente a fixtureHTTP descrita acima e seleção inicial do reporterTAP. Nenhum gate de autenticação, instalação ou arquitetura.

## Known Stubs

Nenhum stub bloqueando esta capacidade; valores vazios do leitor são estados reais sem abas/dados. Preview e ZIP seguem nos planos02-03/02-04, sem rótulos de entrega fictícia.

## Next Phase Readiness

Contrato de painel e consulta congelada pronto para previews e exportação. Não foi alterado perfil/serviço/coletor real nem feita implantação. Aceite no acervo conhecido, zoom nativo e dispositivos físicos continuam nas validações apropriadas; esta entrega usa fixtures e não conclui Phase2 nemWEB-03/04/EVID-02 globalmente.

## Self-Check: PASSED

Arquivos criados/modificados presentes; seis commits são ancestrais deHEAD e evaluation-scope resolveu02-02 na branch atual. Todos os verify planejados foram executados com testes descobertos e sem skips; suíte final105/105. Nenhum stub essencial ou superfície de ameaça além das previstas no threat_model.

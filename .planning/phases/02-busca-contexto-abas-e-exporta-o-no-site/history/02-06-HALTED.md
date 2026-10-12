---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "06"
subsystem: ui
tags: [css, sticky, native-click, scroll, node-test, playwright]
gap_ids: [G-02-6]
requirements-completed: []
requirements-pending: [WEB-04]
requires:
  - phase: 02-02
    provides: Abas com DOM, contexto e posição independentes na memória.
  - phase: 02-05
    provides: Cópia real offline e sessão privada de aceite sob responsabilidade do parent.
provides:
  - RED validado e GREEN de A/B/A nativo após rolar.
  - Matriz adicional de teclado/reflow e reprodução de scroll chaining em nome longo.
affects: [WEB-04, G-02-6, phase-02-acceptance]
tech-stack:
  added: []
  patterns: [sticky tablist, native locator clicks, local label scrolling]
key-files:
  created: [.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-06-SUMMARY.md]
  modified: [public/style.css, test/ui.test.ts]
key-decisions:
  - Preservar activateTab/tab.scroll sem novo estado ou mudança de app.js.
  - Usar Chrome for Testing headless-shell instalado após SIGTRAP do Chromium do sistema.
  - Parar tarefa2 após três tentativas de ajuste conforme limite do executor; entregar diff e causa restantes.
actuals:
  tokens: 2827
  tasks: 1
  commits: 2
plan_head_before: bf0bdec9211149149b83a08e6f100b1f22812f22
plan_head_after: cbbac69e0bdea5e8a28b349e89037cb4fe5f0072
coverage:
  - id: D1
    description: A/B/A por clique nativo restaura posição menor que2px e preserva DOM/conteúdo/referências/âncora.
    requirement: WEB-04
    verification:
      - kind: automated_ui
        ref: "test/ui.test.ts#abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34"
        status: pass
      - kind: other
        ref: "CUA-real: PENDING_PARENT; recarregar CSS e executar gesto nativo na cópia offline existente"
        status: unknown
    human_judgment: false
  - id: D2
    description: Teclado, reflow320/768/1280 altura480 fonte100/200%, nomes completos, âncora e fechamento.
    requirement: WEB-04
    verification:
      - kind: automated_ui
        ref: "test/ui.test.ts#G-02-6 gesto nativo teclado âncora fechamento e nomes completos em tela baixa"
        status: fail
    human_judgment: false
duration: 6min
started: 2026-10-12T11:02:55Z
completed: 2026-10-12T11:08:50Z
status: halted
---

# Phase 2 Plan 6: alcance nativo de abas após rolar — Summary

**Barra sticky conserva A/B/A por clique nativo; stress identifica propagação da rolagem do nome ao documento, ainda pendente.**

## Performance

- Uma de três tarefas completa. Tarefa2 interrompida no limite de três tentativas de ajuste; tarefa3 não executada.
- Dois commits medidos entre o ledger persistido e HEAD. Metadata deste resumo fica fora de plan_head_after.
- `actuals.tokens`: ceil(11305 caracteres/4) do diff realizado de CSS/testes, incluindo trabalho pendente, mesma escala de estimateTokens; não é uso do harness.
- Checkout principal em `codex/github-sync`; isolamento sequencial determinado pelo orquestrador. Nenhum worktree novo ou protocolo manual criado.

## Task Commits

1. Tarefa02-06-01 RED: `5aa736f` — `test(02-06): reproduce native tab scroll loss`.
2. Tarefa02-06-01 GREEN: `cbbac69` — `feat(02-06): keep tab controls reachable during reading`.
3. Tarefa02-06-02: incompleta; alterações de CSS/testes permanecem no working tree para o parent continuar, sem commit de implementação que falha.
4. Tarefa02-06-03: não executada; suíte completa não rodada porque a fonte não está estável. Prova CUA real `PENDING_PARENT`.

## TDD Gate Compliance

- RED íntegro em `dist/02-06-red.json`: Node TAP, um alvo executado, fail1, exit1, assertion `clique nativo B restaura posição medida antes do gesto`.
- Comando: `ZAP_BROWSER_EXECUTABLE=/home/otavio/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell mise exec node@24.21.0 -- node --test --test-reporter=tap --test-name-pattern='abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34' dist/test/ui.test.js`.
- `node /home/otavio/.codex/gsd-core/bin/gsd-tools.cjs check tdd-red-evidence dist/02-06-red.json --raw`: exit0, `RED_EVIDENCE_OK`, `target_test_failed`.
- SemanticAssessment: alvo1/1 executado e falhou em ERR_ASSERTION da posição B capturada antes do gesto nativo; sem zero testes, falha de import/fixture ou alvo skipped. Dois crashes anteriores foram excluídos da autorização GREEN.
- GREEN `dist/02-06-green.log`: pass1/fail0/cancelled0/skipped0/todo0, exit0. Tracer reexecutou build+mesmo alvo: pass1, exit0 antes da expansão.
- `task.is-behavior-adding`: true. Commit RED precede GREEN e foi validado antes de alterar CSS. Refactor sem commit separado; não havia necessidade na tarefa1.
- Runtime válido: Node24.21.0; Chrome for Testing151.0.7922.34 headless-shell já instalado; Playwright do bundle existente. Pins, dependências e browser do sistema não foram alterados.

## Teste adicional e estado exato da retomada

- Novo alvo `G-02-6 gesto nativo teclado âncora fechamento e nomes completos em tela baixa` usa uiFixture sintética, três nomes longos Unicode/RTL, seis combinações320/768/1280×100/200% em altura480.
- Gestos: clique nativo A/B/A, setas/Home/End antes da ativação, Enter/Espaço, wheel local do nome e Fechar/Delete. Document scroll é arranjo; evaluate não ativa abas. DOM integral é comparado antes/depois; limite continua estritamente menor que2px.
- Falha inicial de âncora em320/100%: top106.59375, altura373, barBottom239. `scroll-padding-top` condicional no documento junto de `scroll-margin-top` da âncora fez a execução avançar até fonte200%.
- Tentativa1: acrescentar scroll-padding condicional. Próxima falha: Fechar48px encoberto na fonte200% (`dist/02-06-stress-fix1.log`).
- Tentativa2: ajustar max-height do texto para `calc(50vh - 1.5em - 40px)` e remover scroll-margin redundante aparente. Remoção revelou novamente oclusão da âncora: top191.59375, altura352, barBottom239 em320/100%.
- Tentativa3: restaurar scroll-margin e reforçar prova de wheel do nome. Última execução `dist/02-06-stress-green.log`: fail1/exit1 em `rolagem do nome permanece local`. Nome chegou ao fim, porém scrollY também mudou. Não é GREEN apesar do nome histórico do arquivo.
- Proposta mínima restante: `overscroll-behavior: contain` no próprio `[role=tab]`, mantendo CSS, app.js e restauração existentes; depois rerodar matriz, UI focada e full uma vez após a última mudança. Essa proposta não foi aplicada por este executor.
- A matriz foi interrompida no primeiro cenário que falhou; não afirmar que todas as combinações/fechamentos finais foram executados. Nenhuma captura adicional foi inspecionada; não se afirma revisão de pixels.

## Deviations from Plan

**[Rule3 — harness] Binário sintético alternativo instalado.** Chromium do sistema caiu duas vezes antes da assertion. `coredumpctl` confirmou SIGTRAP em processos do harness; RAM disponível3.3GiB, shm12GiB livre e journal kernel sem entrada/OOM nesse intervalo. Causa interna/compositor não determinada. Chrome for Testing headless-shell instalado executou o RED real e o GREEN. Logs ignorados `dist/02-06-invalid-red-crash.json`, `dist/02-06-invalid-red-crash2.json`, `dist/02-06-browser-debug.log`. Nenhum core extraído, configuração global alterada ou processo alheio encerrado.

**Limite de execução:** tarefa2 parou após três ajustes conforme regra do executor. Parent recebeu causa e proposta restante; o plano não está completo e G-02-6 continua aberto.

## Verificação e segurança

- `mise exec node@24.21.0 -- npm run build`: exit0 nas rodadas focadas.
- `git diff --check`: exit0 ao entregar.
- `node --check public/app.js`: exit0; arquivo permaneceu intocado.
- Sem nova rota, auth, schema, dependência ou superfície de arquivo. T-02-23 ainda pendente na propagação da rolagem local; T-02-24 tem RED nativo válido; T-02-25/T-02-SC preservados.
- Sem stub de produto novo; fixtures são sintéticas e não substituem dados reais. A suíte completa é verificação não executada, a registrar pelo parent em WINDOWS caso a retomada não a conclua. Esse executor não edita o ledger fora do ownership.

## CUA real — PENDING_PARENT

Depois de fonte/testes estáveis, o parent recarrega sua sessão privada já autenticada da cópia offline e verifica CSS servido, A/B/A e B/A/B após PageDown com delta menor que2px, conteúdo/âncora, teclado e Fechar. Registrar somente agregados sanitizados, `source: autonomous`, `human_confirmation: false`. Somente então reconciliar UAT6/G-02-6.

Este executor não abriu a tab privada, alterou login/senha/perfis/contas/coletor, executou socket WhatsApp, aceite real, VPS, MCP, push, PR ou tags. STATE/ROADMAP/REQUIREMENTS/UAT e demais rastreios pertencem ao parent.

## Self-Check: PASSED

- CSS, testes e este resumo existem. Commits5aa736f/cbbac69 são ancestrais de HEAD; nenhuma exclusão nesses commits.
- Working tree contém explicitamente as mudanças incompletas de public/style.css e test/ui.test.ts; não declarar fonte final aprovada.

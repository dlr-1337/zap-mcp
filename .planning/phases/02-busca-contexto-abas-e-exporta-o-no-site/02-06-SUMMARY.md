---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "06"
subsystem: ui
tags: [css, sticky, native-click, scroll, node-test, playwright]
gap_ids: [G-02-6]
gap-status: open-pending-parent-native-cua
requirements-completed: []
requirements-pending: [WEB-04]
requires:
  - phase: 02-02
    provides: Abas com DOM, contexto e posição independentes na memória.
  - phase: 02-05
    provides: Cópia real offline e sessão privada de aceite sob responsabilidade do parent.
provides:
  - RED validado e restauração de A/B/A por gestos nativos.
  - Matriz de teclado, nomes completos, reflow, âncora e fechamento aprovada.
  - Regressão final 144/144 na fonte e0d921c e handoff para CUA real.
affects: [WEB-04, G-02-6, phase-02-acceptance]
tech-stack:
  added: []
  patterns: [sticky tablist, native locator clicks, local label scrolling, explicit anchor start alignment]
key-files:
  created: [.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-06-SUMMARY.md]
  modified: [public/style.css, public/app.js, test/ui.test.ts, .planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-06-PLAN.md]
key-decisions:
  - Preservar activateTab/tab.scroll, guards e tickets sem novo estado.
  - Alinhar início da âncora em openContext após provar que foco centralizado encobre mensagens altas.
  - Usar Chrome for Testing headless-shell existente e temporários privados fora do checkout.
actuals:
  tokens: 3257
  tasks: 3
  commits: 4
commits: 4
plan_head_before: bf0bdec9211149149b83a08e6f100b1f22812f22
plan_head_after: e0d921c68b6f12fe6534329e8fe9faf9e0cf343a
coverage:
  - id: D1
    description: Fixture sintética comprova A/B/A e B/A/B nativos com delta menor que2px e DOM/referências/âncora preservados.
    requirement: WEB-04
    verification:
      - kind: automated_ui
        ref: "test/ui.test.ts#abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34; dist/02-06-ui-focused.log; source e0d921c"
        status: pass
      - kind: automated_ui
        ref: "test/ui.test.ts#G-02-6 gesto nativo teclado âncora fechamento e nomes completos em tela baixa; dist/02-06-full-tests.log; source e0d921c"
        status: pass
    human_judgment: false
  - id: D2
    description: Fixture sintética comprova teclado, reflow320/768/1280 altura480 fonte100/200%, nomes completos, âncora e fechamento.
    requirement: WEB-04
    verification:
      - kind: automated_ui
        ref: "test/ui.test.ts#G-02-6 gesto nativo teclado âncora fechamento e nomes completos em tela baixa; seis combinações PASS em dist/02-06-task2-anchor-start.log e dist/02-06-full-tests.log"
        status: pass
      - kind: automated_ui
        ref: "test/ui.test.ts#abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34; isolamento/prepend/refresh/reabrir/fechar em dist/02-06-ui-focused.log"
        status: pass
    human_judgment: false
real-cua: PENDING_PARENT
duration: 26min30s
started: 2026-10-12T11:02:55Z
completed: 2026-10-12T11:29:25Z
status: complete
---

# Phase 2 Plan 6: alcance nativo de abas após rolar — Summary

**Barra sticky, rolagem local dos nomes e alinhamento explícito da âncora preservam leitura por gesto nativo; UI19/19 e regressão final144/144 aprovadas.**

## Performance

- Três tarefas de fonte/testes/relatório entregues; aceite nativo real continua sob responsabilidade do parent.
- Janela persistida do plano: bf0bdec→e0d921c, quatro commits medidos por git rev-list --count. Inclui o metadata histórico de interrupção dd246cd; este commit final de documentos fica fora de plan_head_after.
- actuals.tokens: ceil(13025 caracteres/4)=3257 sobre o diff realizado de public/style.css, public/app.js e test/ui.test.ts. Mesma escala chars/4 do estimate; não é contagem de tokens do harness. Metadata documental não entra nessa medição de implementação.
- Checkout principal codex/github-sync, execução sequencial definida pelo parent; nenhum worktree criado.
- A interrupção anterior permanece no histórico preservado pelo parent em history/02-06-HALTED.md. Tarefa1 não foi refeita.

## Accomplishments

- Abas permanecem alcançáveis após rolar, com altura no máximo metade do viewport e fundo opaco.
- Nome completo Unicode/RTL é selecionável e rolável localmente; wheel no fim do nome não desloca o documento. Fechar conserva alvo48×48 e espaço em fonte200%.
- openContext foca a âncora com preventScroll e alinha block:start usando scroll-margin-top existente. O foco continua no elemento original; ausência de âncora, guards/tickets e activateTab(tab,false) permanecem seguros.
- Matriz320/768/1280×100/200% em altura480 exercita clique nativo, setas/Home/End sem ativação antecipada, Enter/Espaço, nomes, âncora e Fechar/Delete. Limite de posição continua estritamente menor que2px.

## Task Commits

1. Tarefa02-06-01 RED: 5aa736f — test(02-06): reproduce native tab scroll loss.
2. Tarefa02-06-01 GREEN: cbbac69 — feat(02-06): keep tab controls reachable during reading.
3. Histórico de interrupção: dd246cd — docs(02-06): record native scroll proof and stress blocker.
4. Tarefa02-06-02: e0d921c — fix(02-06): preserve reading through reflow and native focus.
5. Tarefa02-06-03: este SUMMARY e a exceção de ownership no PLAN são o metadata final separado. Nenhum arquivo de rastreamento global foi editado.

## TDD Gate Compliance

- Evidência histórica válida: dist/02-06-red.json, Node TAP, alvo1/1 executado, fail1/exit1, assertion "clique nativo B restaura posição medida antes do gesto".
- Validação histórica: node /home/otavio/.codex/gsd-core/bin/gsd-tools.cjs check tdd-red-evidence dist/02-06-red.json --raw, exit0, RED_EVIDENCE_OK/target_test_failed.
- SemanticAssessment: falha de posição B capturada antes do gesto nativo; não é zero testes, skip, import/fixture quebrados. Dois crashes anteriores foram excluídos da autorização GREEN.
- GREEN e tracer históricos: dist/02-06-green.log, pass1/fail0/cancelled0/skipped0/todo0, exit0. RED precede CSS/GREEN; tarefa1 não foi repetida.
- Tarefa2 expandiu regressões e registrou falhas comportamentais antes dos ajustes: dist/02-06-task2-before.log, exit1/ERR_ASSERTION na rolagem do nome; dist/02-06-task2-after.log, exit1/ERR_ASSERTION no início da âncora320/200%.
- Diagnóstico independente em dist/02-06-focus-diagnostic.log: viewport320×480/barra239/padding e margem256, alturas373/861/5000 deram top309/65/−2004. É diagnóstico sintético de foco, não prova de aceite real.
- GREEN final da tarefa2: dist/02-06-task2-anchor-start.log, alvo1/pass1/exit0, todas as seis combinações aprovadas. Não foi necessário refactor separado.

## Verification

Runtime: Node24.21.0 via mise; Google Chrome for Testing151.0.7922.34 headless-shell existente; Playwright do bundle existente. Nenhuma instalação/pin/configuração global alterada.

Browser explícito em todas as rodadas:
ZAP_BROWSER_EXECUTABLE=/home/otavio/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell

- UI focada: mise exec node@24.21.0 -- npm run build seguido de node --test --test-reporter=tap dist/test/ui.test.js; dist/02-06-ui-focused.log, tests19/pass19/fail0/cancelled0/skipped0/todo0, exit0, 43945.277ms.
- Regressão final: mise exec node@24.21.0 -- npm test, mesma fonte e0d921c, dist/02-06-full-tests.log: tests144/pass144/fail0/cancelled0/skipped0/todo0, exit0, 75610.085ms.
- Temporários da regressão final: TMPDIR criado por mktemp -d /home/otavio/.local/share/zap-mcp-phase2-proof/ci-temp.02-06.XXXXXX, privado0700 e fora do checkout, no filesystem com espaço livre. Diretório exclusivo dessa rodada removido após os testes.
- node --check public/app.js e git diff --check: exit0. Nenhuma exclusão nos commits de tarefas.

| Viewport/fonte | Top da âncora | Altura da mensagem | Fundo da barra |
|---|---:|---:|---:|
| 320×480/100% | 255.59375 | 373 | 239 |
| 768×480/100% | 255.59375 | 352 | 239 |
| 1280×480/100% | 255.59375 | 331 | 239 |
| 320×480/200% | 256.1875 | 861 | 239 |
| 768×480/200% | 256.1875 | 591 | 239 |
| 1280×480/200% | 256.1875 | 507 | 239 |

Evaluate somente arranja scroll/fontes ou lê DOM/métricas; ativações do oráculo são locator.click e teclado nativos. Clique programático histórico da paginação não aprova restauração de abas. Capturas não foram inspecionadas; não se afirma revisão de pixels, zoom nativo ou dispositivo físico.

## Deviations from Plan

**1. [Rule3 — harness] Browser alternativo existente.** O Chromium do sistema caiu duas vezes antes da assertion histórica. O executor anterior confirmou SIGTRAP por metadata de coredump e usou o headless-shell existente para RED/GREEN válidos. Causa interna/compositor não determinada. Nenhum core extraído, browser instalado, configuração global alterada ou processo alheio encerrado nesta retomada.

**2. [Rule1 — bug] Início de âncora alta encoberto pelo foco centralizado.** Encontrado na tarefa2 após conter scroll chaining: altura861/top65.1875/barra239 em320/200%. Margens CSS fixas não garantem o início para altura variável. Parent ampliou ownership somente para a linha de foco em openContext; focus({preventScroll:true}) seguido de scrollIntoView({block:'start'}) corrigiu as seis combinações, permitindo remover html:has scroll-padding redundante. Arquivos: public/app.js, public/style.css, test/ui.test.ts; commit e0d921c. PLAN registra a exceção sem alterar goal, requisitos ou critérios. [HTML focus](https://html.spec.whatwg.org/multipage/interaction.html#dom-focus-dev) especifica alinhamento centralizado por padrão; [CSS overscroll](https://drafts.csswg.org/css-overscroll/#overscroll-behavior-properties) define contenção da propagação.

**3. [Rule3 — harness] Regressão final exigiu temporários privados externos.** Primeira full na fonte estável: dist/02-06-full-tests-first-failed.log, tests144/pass142/fail2/exit1; ENOENT em "PN/LID preserva bytes distintos e usa locator de cada attachment nas novas tentativas" e SQLITE_IOERR_WRITE em "recortes recusam excesso sem truncar nem remover recortes válidos". Ambos passaram isoladamente2/2 no mesmo ambiente, sem editar os respectivos arquivos. /tmp era tmpfs com2.4GiB livres na leitura posterior; isso não prova saturação, OOM ou ENOSPC durante a falha. Causa exata não confirmada. A tentativa de TMPDIR em dist foi invalidada pelo guard "Armazenamento privado deve ficar fora do checkout", preservada em dist/02-06-full-tests-invalid-tmpdir.log. O processo e temporários próprios foram encerrados/limpos; guard preservado. Parent autorizou ambiente externo0700; full final passou144/144 e não foi repetida após GREEN. Nenhuma fonte fora do escopo alterada.

## Security and Stubs

- Nenhuma nova rota, auth, schema, dependência, endpoint, acesso arbitrário a arquivos ou superfície de confiança.
- T-02-23: matriz confirma altura/controlabilidade/nomes/âncora; T-02-24: RED semântico e gestos nativos preservam oráculo; T-02-25/T-02-SC: sessão privada intocada e nenhuma instalação.
- Scan de alterações sem TODO/FIXME/placeholder, teste skipped/todo ou stub novo de produto. Fixtures são sintéticas e não demonstram cobertura da conta real.
- Logs e capturas sintéticas permanecem ignorados em dist. Nenhum conteúdo, ID, nome, cookie ou segredo da conta real foi incluído.
- STATE/ROADMAP/REQUIREMENTS/UAT/SECURITY/VERIFICATION, serviços, senha, sessão, originais e coletor fonte pertencem ao parent e não foram alterados por este executor. Prova operacional WhatsApp/VPS/MCP não realizada.

## CUA real — PENDING_PARENT

Coverage D1/D2 acima classifica somente entregas sintéticas aprovadas. Não reconciliar G-02-6/WEB-04 apenas por esses resultados. Este SUMMARY complete significa tarefas de implementação/regressão/relatório entregues; o gate real permanece aberto.

Parent deve recarregar a tab privada da cópia offline já autenticada, confirmar CSS/app.js corrigidos servidos, abrir duas conversas pela UI, PageDown emA, cliqueB/A, PageDown emB, cliqueA/B. Medir scroll antes do gesto e retorno menor que2px, com conteúdo/referências/âncora preservados; conferir foco por teclado sem deslocar leitura antes da ativação e Fechar. Registrar apenas agregados sanitizados com source:autonomous e human_confirmation:false, acrescentar o resultado neste SUMMARY e somente então reconciliar UAT6/G-02-6.

Não há checkpoint humano, nova autenticação ou bootstrap de tab privada pelo executor. Teste sintético, metadata de browser e teste histórico de clique programático não substituem essa prova.

## Self-Check: PASSED

- public/style.css, public/app.js, test/ui.test.ts, PLAN e este SUMMARY existem.
- 5aa736f/cbbac69/e0d921c são ancestrais de HEAD; janela de quatro commits medida do ledger persistido ao source e0d921c.
- Fonte/testes commitados; somente PLAN/SUMMARY são metadata desta entrega. Histórico não rastreado criado pelo parent foi preservado para ele integrar.

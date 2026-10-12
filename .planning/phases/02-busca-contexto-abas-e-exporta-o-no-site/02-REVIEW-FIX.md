---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
fixed_at: 2026-10-12T02:23:21Z
review_path: .planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-REVIEW.md
iteration: 3
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-10-12T02:23:21Z
**Source review:** `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-REVIEW.md` (CR-04, revisão de 2026-10-12T02:18:33Z)
**Iteration:** 3

**Summary:** 1 finding in scope; 1 fixed; 0 skipped. Ledger anterior preservado: `02-REVIEW-FIX.iter3.md` (CR-01/CR-02/WR-01) e `02-REVIEW-FIX.iter4.md` (CR-03/WR-02 e diagnósticos de validação).

## Fixed Issues

### CR-04: BLOCKER — Original e preview entregam buffer antecipado após restrição de privacidade

**Files modified:** `src/media.ts`, `test/preview.test.ts`
**Commit:** `1a5b7c8`
**Status:** fixed: requires human verification
**Applied fix:** O stream compartilhado conserva a verificação anterior ao yield e valida também cada read, inclusive bytes já retidos por Readable.from. Uma mudança de ingestão/reconciliação dispara a guarda via archive.onChange e interrompe o stream; close remove o listener e destrói a fonte. O estado destroyed nega consumo posterior do buffer. createReadStream continua sendo o único dono do fd; não há fechamento manual depois de transferi-lo. O caminho alcança original, preview, Range e leitura de mídia durante buildZip; APIs e primários permanecem preservados.

**Regression evidence:** RED local: read liberava buffer sem consumir previamente; HTTP retido fazia 2 writes após restrição, esperado somente o primeiro já transferido. GREEN: read não entrega buffer e o fd fecha sem atingir número reutilizado; HTTP original/preview GET/Range termina sem bytes futuros após restrição, sem polling. Conteúdo/estado/hash do original e mensagem continuam presentes. Casos ordinários de ZIP, mídia, preview, HEAD/Range e abort permanecem cobertos.

## Skipped Issues

None.

## Verificação e limites

- **Worktree isolado**, base inicial `5e485f5`, Node 24.21.0 via mise: build TypeScript, releitura da alteração e diff check. Novas regressões **2/2**, conjunto preview/export/media **45/45**, zero falhas/skips. Logs no principal: `dist/02-cr04-red.log`, `dist/02-cr04-green.log`, `dist/02-cr04-affected.log`.
- **Checkout principal:** integração por ff-only, HEAD `1a5b7c84cec19b3779be0a88c35f27c6561a93bb`; última suíte completa com timeout 180s **143/143**, zero falhas, cancelamentos ou skips, exit0 em 38.366ms, log `dist/02-final-tests.log`. Node 24.21.0/Playwright/Chromium 152 existentes; nenhum override de ambiente ou dependência nova.
- Tentativas anteriores preservadas: `dist/02-final-tests.interrupted.log` (120 pass/4 I/O failures/1 canceled), `dist/02-final-tests.pre-cr04.log` (140/141, único Target crashed). A fixture de fault foi corrigida no commit `6429987` após prova determinística de EBADF em fd reutilizado; o cleanup por iteração Chromium está em `04231d3`, cenário inteiro de cinco lifecycle passou 1/1 sem retirar assertions. Fontes de diagnóstico em `dist/02-fd-reuse-{red,green}.log` e `dist/02-ui-cleanup-green.log`.
- Sem alteração de STATE/ROADMAP/SUMMARY, serviço/coletor/perfil, originais, dependências, VPS ou MCP; sem aceite real adicional. REVIEW e SECURITY do principal são arquivos do orquestrador e foram preservados.
- O gate bloqueia entrega futura; bytes já transferidos ao transporte/cliente antes da restrição não podem ser recolhidos. Testes sintéticos não demonstram cobertura da conta real.

---
_Fixer: the agent (gsd-code-fixer) · Iteration: 3_


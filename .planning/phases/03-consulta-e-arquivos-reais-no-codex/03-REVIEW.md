---
phase: 03-consulta-e-arquivos-reais-no-codex
reviewed: 2026-10-12T21:50:53Z
depth: standard
iteration: 5
files_reviewed: 1
files_reviewed_list:
  - test/mcp-acceptance.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Fase 3: Code Review Report

**Reviewed:** 2026-10-12T21:50:53Z
**Depth:** standard
**Files Reviewed:** 1
**Iteration:** 5 — revisão incremental da fixture de CI
**Status:** clean

## Summary

Revisão adversarial incremental de `test/mcp-acceptance.test.ts` na cópia pública de publicação, do baseline 8f93d39 ao HEAD d0f29b5. Foi lido o arquivo integral e rastreado o fluxo correspondente em `scripts/phase3-acceptance.mjs`, como dependência de contexto. Nenhum achado BLOCKER ou WARNING foi confirmado na correção da fixture.

A mudança remove a dependência dos seis controles WR-02 da instalação pessoal do Codex. Não muda o produto, driver real, dependências, erros aceitos, timeouts ou assertions originais de recursos e estado. A reprodução 553030f é uma falha de isolamento da fixture, não RED funcional de uma nova capacidade. Não houve pre-pass fallow nem evidência de reviewer externo.

## Narrative Findings (AI reviewer)

Nenhum achado ativo.

### Isolamento e controles preservados

- `test/mcp-acceptance.test.ts:37-41,63` prepara um arquivo de quatro bytes ELF exclusivamente no diretório temporário da fixture. Os overrides de `homedir` e `spawnSync` são injetados após os spreads dos módulos e prevalecem nas funções avaliadas. Nenhuma função global de Node nem a configuração pessoal é modificada.
- No fluxo avaliado, `scripts/phase3-acceptance.mjs:113-118` procura executável e configuração por esse `homedir` injetado. `spawnSync` retorna `codex-cli synthetic-fixture`, sem executar o stub. Esse nome satisfaz apenas o preflight necessário aos controles de setup; não satisfaz a identidade numérica exigida pelo gate de aceite real em `scripts/phase3-acceptance.mjs:28`.
- `test/mcp-acceptance.test.ts:42-59,64-70` mantém banco SQLite, perfil sintético, descoberta SQL, serviço e recursos reais. As falhas planejadas continuam vinculadas a permissão0644, PEM inválido, SQL inicial, captura parcial de sessões, encerramento de listener e restauração. Nos dois casos de cleanup, a preparação TLS é controlada e a rotação falha antes do lançamento do cliente. Os demais também falham antes desse lançamento.
- `test/mcp-acceptance.test.ts:71-84` avalia o driver atual e mantém as assertions de rejeição, liberação de lock, fechamento de conexões, nova abertura do serviço e igualdade de owner/config anteriores. A nova assertion em79 percorre os diretórios de tentativa para recusar `receipt.json`, no local onde o driver o produziria. Estes controles não geram prova de cliente real.
- A leitura dos logs RED/GREEN confirma que o erro inicial era ENOENT no preflight, anterior às falhas intencionais. O diff 553030f →6acd909 prepara esse preflight sem ampliar o regex de erros nem enfraquecer as verificações de cleanup.

### Revisões anteriores — contexto preservado

A revisão original de12arquivos permaneceu clean após as correções do wrapper e do setup TLS. A revisão incremental anterior de `test/mcp.test.ts` também ficou clean, com seis regressões de cleanup do tracer executadas independentemente. Essas revisões não foram repetidas nem contadas novamente nesta rodada.

| Aviso anterior | Disposição mantida | Contexto |
|---|---|---|
| WR-01 — Encerramento do pai/descendente por timeout | fixed | Revisão anterior confirmou processos reais, close e timers; o wrapper não mudou nesta correção. |
| WR-02 — Setup TLS fora do cleanup | fixed | Driver com aquisição protegida e ações de cleanup independentes; os seis controles dessa correção voltam a alcançar seus caminhos sem Codex instalado. |

`03-REVIEW-DISPOSITION.md` permanece com2fixed/0open, sem edição nesta rodada. Nenhum achado anterior foi reaberto, renumerado ou apagado do registro canônico.

## Verificação e limites

- Executado independentemente na cópia pública: `mise exec node@24.21.0 -- env -u ZAP_MCP_REAL_MODE -u ZAP_MCP_REAL_CASE_FILE node --test --test-reporter=tap --test-name-pattern='^WR-02 cleanup releases' dist/test/mcp-acceptance.test.js`: **6/6, exit0 normal**, zero fail/cancel/skip/todo, duração TAP **753,822184ms**.
- Foco fornecido pelo executor:6/6, exit0 normal,3736,648146ms. O RED fornecido teve0pass/6fail por ENOENT; não representa falha funcional do produto. Esses logs foram lidos e distinguidos da execução deste reviewer.
- `git diff --check` passou. O diff do baseline ao HEAD contém um arquivo de teste e documentos de CI/publicação; nenhum arquivo de produto ou dependência mudou.
- Somente este REVIEW da cópia pública foi atualizado. Nenhum source, teste, outro relatório, tracking, commit ou checkout original foi modificado pelo reviewer.
- As provas reais anteriores permanecem preservadas e não foram reexecutadas. A aprovação dos controles sintéticos não é aprovação de um cliente real, novo aceite de conta, entrega de arquivos ou CI remoto.

---

_Reviewed: 2026-10-12T21:50:53Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

Não repeti suíte integral, cliente real ou CI remoto. O orquestrador executa a suíte integral separadamente e deve conferir o CI após a publicação; esta revisão cobre apenas o teste alterado.

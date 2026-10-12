---
phase: 03-consulta-e-arquivos-reais-no-codex
fixed_at: 2026-10-12T18:42:22Z
review_path: .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Fase 3: Code Review Fix Report

**Fixed at:** 2026-10-12T18:42:22Z
**Source review:** `03-REVIEW.md`, revisão de 2026-10-12T18:34:17Z
**Iteration:** 2

**Summary:**
- Findings in scope: 2 (escopo original consolidado)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: WARNING — Close do pai cancela o encerramento de descendente ainda vivo

**Files modified:** `scripts/phase3-acceptance.mjs`, `test/mcp-acceptance.test.ts`
**RED commit:** `94f8332`
**Commit:** `a512a69`
**Status:** fixed — confirmado pelo revisor independente, incluindo ambas variantes de timeout
**Applied fix:** Uma linha no wrapper compartilhado: quando `close` ocorre com escalada de timeout pendente, enviar SIGKILL ao grupo antes de limpar timers ou concluir a Promise. ESRCH continua significando grupo já encerrado. O fechamento rápido do pai não cancela mais a terminação do descendente com pipes independentes. Para o pai que ignora TERM e mantém pipes herdados, a escalada existente de 2s continua funcionando. O caminho de sucesso, retorno, transcrição, protocolo e consumo não mudaram nem receberam espera adicional.

**RED:** `03-review-wr01-iter2-red.json`, classificação `RED_EVIDENCE_OK`, exit1 normal. O controle existente passou a executar duas variantes reais do corpo atual de runCodex:
1. Pai e descendente ignoram TERM, com pipes herdados.
2. Pai encerra por TERM; descendente no mesmo grupo ignora TERM com stdio ignorado, confirma prontidão por IPC e não conserva os pipes do pai.

Na segunda variante, antes do fix, close do pai e limpeza dos timers já tinham ocorrido, mas a assertion “descendant with independent pipes still executes when Promise settles” falhou. A fixture foi encerrada no finally, mesmo com o pai já fechado. Não houve atraso artificial, retries, unref ou aumento de orçamento.

**GREEN:** As duas variantes aprovadas. Antes de a chamada terminar, o teste confirma close e ausência do pai, descendente ausente ou zombie sem execução, e conjunto de timers vazio. A variante nova também confirma que o pai realmente terminou por SIGTERM. A mesma função permanece importada pelo tracer, sem novo wrapper.

A reavaliação independente final confirmou WR-01/WR-02 e escreveu REVIEW clean, zero achados, após7/7controles. A confirmação foi automatizada e delegada pelo usuário; nenhuma aprovação humana foi fabricada nem ficou necessária. Este relatório consolida as duas correções e mantém a iteração2 do último fix.

### WR-02: WARNING — Falha no setup TLS contorna a limpeza do serviço já aberto

**Files modified:** `scripts/phase3-acceptance.mjs`, `test/mcp-acceptance.test.ts`
**RED commits:** `0411da7`, `79a7507`
**Commits:** `62b2a23`, `caed2b8`
**Status:** fixed — confirmado pelo revisor independente com seis controles automatizados
**Applied fix:** A proteção try/finally começa antes de abrir o banco somente leitura, descobrir o caso, abrir o serviço, capturar estado e criar HTTPS. Cada recurso adquirido é registrado imediatamente. Cleanup executa sequencialmente todos os fechamentos/restauração/remoções, mesmo se uma ação falhar, e então informa AggregateError. A restauração só é habilitada depois da captura completa, ao começar a primeira mutação; falha de TLS anterior a esse ponto preserva inclusive configuração MCP preexistente.

**RED:** `03-review-wr02-red.json`, classificação `RED_EVIDENCE_OK`. Seis casos executaram o fluxo atual com SQLite e serviço/trava reais: chave 0644, PEM inválido, SQL inicial, captura parcial, erro no fechamento do listener e erro na restauração. Antes da correção, todos conservavam a trava viva ou banco somente leitura. Um RED adicional fortaleceu a mesma verificação de configuração: chave/PEM apagavam a geração MCP anterior antes de qualquer mutação. A correção adicional ficou isolada no mesmo finding.

**GREEN:** Seis casos aprovados, com banco fechado, trava liberada, nova instância aberta no mesmo processo e estado conferido. Falhas de cleanup foram injetadas somente nessa fronteira; os recursos fechados eram reais. A avaliação executa o corpo atual do roteiro, sem réplica da lógica nem alteração de produto. Os dados de fixture são sintéticos e nunca constituem aceite real.

## Verification

Verificações executadas no **checkout principal fixado**, sequencialmente, com isolamento none explicitamente autorizado pelo orquestrador e a mesma exceção de base-check da iteração anterior. Root pin executado antes da escrita e de cada commit. Não foram criados worktrees nem alterada a configuração workflow.use_worktrees.

| Gate final | Resultado |
|---|---|
| Build Node24 + node --check | exit0 |
| WR-01, duas variantes | 1 controle aprovado, exit0 normal; 2098ms de teste |
| MCP + aceite focados | 40/40, exit0 normal; 8496ms |
| Self-test | 11 controles, accepted:true, synthetic:true, exit0 |
| npm test | 184/184, exit0 normal; 103731ms, zero fail/cancel/skip/todo |
| git diff --check | exit0 |

Logs locais ignorados: `dist/03-review-fix-iter2-focused.log` e `dist/03-review-fix-iter2-full.log`.

A comparação privada posterior confirmou configuração global e milestone.lock byte a byte iguais; todos os src/*.ts iguais; projeções primárias e whatsapp_profile/whatsapp_keys do clone offline iguais; ausência da trava do clone. Nenhuma escrita na fonte viva ou sessão/socket original, nem outro coletor.

O tracer real existente de **2026-10-12T18:24:13.110Z** foi preservado: TLS positivo/negativo, duas chamadas e dois arquivos de4200/271485bytes, com tamanho/SHA conferidos novamente no destino. A prova integrada de12calls às17:13:27.794Z e seu apontador continuam preservados byte a byte. Esses são resultados anteriores preservados, não uma nova execução real desta iteração. Não repetimos o cliente positivo porque a correção atua exclusivamente no timeout; retorno, transcrição, transporte e consumo de sucesso permaneceram iguais.

## Previous findings and scope

WR-02 já foi confirmado resolvido pelo REVIEW atual, por código e seis controles automatizados. O histórico e a evidência da primeira correção estão consolidados neste relatório; commits/REDs permanecem versionados.

Não houve alterações no REVIEW, tracking, requisitos, produto, dependências, configuração ou fase4. O relatório atual foi sobrescrito conforme solicitado e fica **sem commit**, para re-review independente. As cópias históricas e as alterações do orquestrador permaneceram intactas.

## Limits

O controle novo usa processos sintéticos reais em Linux; não é aceite de conta ou prova VPS. Fonte viva, dispositivos físicos e portabilidade para Windows/macOS não foram revalidados. O teste cobre o descendente no mesmo grupo Linux citado pelo reviewer.

---

_Fixed: 2026-10-12T18:42:22Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 2_

## Convergência independente

Revisor confirmou os7controles atuais, incluindo dois processos de timeout no controleWR-01 e seis casos de setup/cleanupWR-02. REVIEW final clean,critical0/warning0/info0. Nenhuma fonte foi alterada depois dos gates da iteração2. Cliente real anterior é evidência preservada do caminho de sucesso inalterado, não uma execução nova desta última correção.

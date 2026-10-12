---
phase: 03-consulta-e-arquivos-reais-no-codex
plan: "03"
subsystem: api
tags: [mcp, context, snapshots, provenance, hmac, readonly, codex]
requires:
  - phase: 03-02
    provides: Consultas autenticadas, snapshots Archive, cursores HMAC e orçamento de envelope
provides:
  - get_context com âncora explícita e páginas canônicas congeladas antes/depois
  - Proveniência sanitizada idêntica ao site e correspondência histórica de busca autenticada
  - Política atual no consumo, instruções fixas e allowlist de quatro ferramentas somente leitura
affects: [03-04, 04-operacao-e-restauracao-na-vps]
actuals:
  tokens: 10118
  tasks: 2
  commits: 4
commits: 4
plan_head_before: 8d796bbca0835741b4f41001f124b2b5bbcda552
plan_head_after: 9a2c8768070500ae9ea83fd3c8a92af4e23d1e4a
tech-stack:
  added: []
  patterns: [Contexto Archive compartilhado, cursores por referência e direção, âncora obrigatória no orçamento, instruções fixas separadas de dados]
key-files:
  created: [.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-03-red1.json, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-03-red2.json]
  modified: [src/mcp.ts, test/mcp.test.ts, test/readonly.test.ts]
key-decisions:
  - "Reusar openContext/readContextPage; âncora e dados passam pelas projeções e política atuais do Archive."
  - "searchCursor é emitido mesmo quando não há próxima página; origem é validada por assinatura/operação/grant/filtros/TTL antes de abrir contexto."
  - "Âncora nunca é omitida por orçamento; páginas reduzem somente DTOs inteiros, com cursores antes/depois, ou retornam limite sem avançar."
requirements-completed: [MCP-03, MCP-05]
coverage:
  - id: MCP-CONTEXT
    description: Âncora e proveniência compartilhadas com site, busca histórica e continuação canônica congelada
    requirement: MCP-03
    verification:
      - kind: integration
        ref: "test/mcp.test.ts#MCP contexto preserva âncora e DTOs web com páginas congeladas bidirecionais; MCP contexto reutiliza busca histórica e redirect sem perder unknowns ou sanitização"
        status: pass
    human_judgment: false
  - id: MCP-READONLY-CONTEXT
    description: Restrição/rotação vencem buffer, mensagens adversariais permanecem dados e operações WhatsApp são recusadas
    requirement: MCP-05
    verification:
      - kind: integration
        ref: "test/mcp.test.ts#MCP contexto revalida âncora histórico e vizinha após formar buffer; MCP contexto bloqueia continuação bufferizada por restrição e rotação; MCP instruções fixas não promovem mensagem adversarial a ferramenta ou segredo"
        status: pass
      - kind: integration
        ref: "test/readonly.test.ts#HTTP privado status/QR/leitor/logout é somente leitura e funciona offline"
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-10-12
status: complete
---

# Phase 3 Plan 3: Contexto MCP com proveniência compartilhada Summary

**Codex pode abrir contexto por referência com âncora explícita, páginas congeladas nos dois sentidos e política atual; quatro ferramentas locais recusam operações WhatsApp.**

## Performance

- Início: 2026-10-12T15:53:34Z; fechamento após tracer em 2026-10-12T16:03:43Z.
- Duas tarefas e quatro commits TDD medidos pelo ledger até 9a2c876.
- Actuals: 10118 tokens por chars/4 do diff realizado, incluindo os registros RED, antes deste SUMMARY; não usa contagem do harness.
- Execução sequencial no checkout fixado após degrade legítimo da orquestração. milestone.lock inicial preservado.

## Accomplishments

- get_context recebe referência UUID e campos estritos searchCursor/direction/cursor. Reusa openContext/readContextPage em namespace mcp:<geração>; não consulta socket, sessão WhatsApp ou envelopes privados.
- Âncora explícita e messages/before/after preservam IDs, autoria, direção, origens/PN/LID recebidos, citações, revisões, attachments/estados e campos desconhecidos dos DTOs sanitizados. Tempos adicionais preservam original/UTC/offset e America/Sao_Paulo; cobertura continua explicitamente limitada ao acervo observado.
- Comparação independente HTTP web/MCP confirmou a mesma âncora e DTOs. Percurso bidirecional reuniu 111 referências únicas sem repetir ou perder mensagens e conservou dados congelados após edição e inserção retroativa.
- search_messages agora sempre emite searchCursor autenticado, inclusive no resultado único sem próxima página. get_context valida assinatura, operação, geração, hash dos filtros, sessão, ordinal e expiração persistida antes de aceitar snapshot de origem. Correspondência histórica e redirect recebido permanecem conferíveis.
- Contexto usa ordem/ordinal canônicos do Archive; before/after têm cursores separados vinculados à referência e direção. Direção ausente/trocada, cursor adulterado, ordinal inválido, outra geração, snapshot expirado e referência inexistente são recusados.
- Envelope completo mantém orçamento servidor de 32768 bytes e teto de argumentos de 12288 bytes antes do SDK. Redução conserva âncora e corta apenas a quantidade de DTOs; evidência excessiva retorna response_limit com alternativa e cursor no mesmo ordinal, sem truncar conteúdo. Maior envelope da sequência multibyte de busca nesta execução: 28277 bytes.
- Guard existente de consumo recebe âncora e todas as referências efetivamente entregues. Pausas determinísticas após formar contexto e antes de write/end provaram bloqueio de âncora/histórico/vizinha e continuação após restrição ou rotação. Projeção já restrita elimina texto, citação, matchedEvidence e textos históricos.
- Initialize anuncia instruções fixas separadas dos DTOs; conteúdo adversarial incluindo URLs, caminhos e marcação continua no texto/citação/nome recebido. Registry e geração permanecem iguais, e métodos extras/resources/prompts não oferecem execução nem acesso arbitrário.
- Allowlist final: find_conversations, search_messages, get_context, get_attachment. Spies de sendMessage/chatModify/readMessages/sendReceipt/presença/logout permaneceram zero, com um socket sintético apenas; consultas continuam após desligar o coletor. Anotações são complementares ao bloqueio efetivo.
- Tracer existente repetido no Codex 0.162.1: TLS confiado positivo e CA ausente negativa, initialize 2025-06-18, dois originais reais de 4200/271485 bytes salvos com tamanho/SHA iguais. Configuração global do Codex preservada; usa clone restaurado offline, sem segundo coletor.

## Task Commits

1. 03-03-01 RED — 8f6b5c7: paridade web, referência histórica/redirect, páginas, cursores e limite.
2. 03-03-01 GREEN — 25c87ec: get_context, source searchCursor, orçamento e cursores.
3. 03-03-02 RED — 7658208: instruções fixas, conteúdo adversarial, consumo concorrente e spies somente leitura.
4. 03-03-02 GREEN — 9a2c876: instruções fixas do servidor e assertions das fixtures.

## TDD Gate Compliance

- Tarefa 1: 03-03-red1.json contém comando/TAP/exit1 reais. Classificador retornou RED_EVIDENCE_OK para o teste de paridade: chamada ao endpoint falhou na assertion de ferramenta get_context ausente. Target executou; não foi falha de import ou setup.
- Tarefa 2: 03-03-red2.json contém comando/TAP/exit1 reais. RED_EVIDENCE_OK confirmou assertion de initialize sem instruções fixas para dados não confiáveis.
- GREEN veio após commits RED e validação semântica, por tarefa. REFACTOR separado dispensado; o Archive e os gates existentes já oferecem a estrutura necessária.

## Verification

- Build Node 24.21.0 passou.
- Verify tarefa 1: mcp/context/search, 36/36, exit0. Log privado: <diretorio-privado-de-verificacao>
- Verify tarefa 2: mcp/readonly/security/context, 35/35, exit0. Log privado: <diretorio-privado-de-verificacao>
- Regressão completa npm test: 172/172, exit0, zero falhas/cancelamentos/skips/todo; 99598ms. Log privado: <diretorio-privado-de-verificacao>
- Tracer real: 1/1, exit0, 67289ms. Log privado: <diretorio-privado-de-verificacao>; receipt/transcrições/binários permanecem privados fora do Git.
- evaluation-scope --plan03-03 --commits-only resolveu os quatro commits nesta branch; git diff --check passou.

## Files Created/Modified

- src/mcp.ts: contexto Archive, continuação assinada e instruções fixas.
- test/mcp.test.ts: oito testes novos de contexto/política, paridade HTTP e allowlist atualizada.
- test/readonly.test.ts: quatro consultas com coletor ativo e contexto offline, métodos proibidos e spies.
- 03-03-red1.json e 03-03-red2.json: evidências TDD reproduzíveis com dados sintéticos.

## Decisions Made

Reusar as projeções Archive e o gate existente; expor searchCursor para origem única e manter âncora obrigatória no orçamento. Não adicionar biblioteca, endpoint WhatsApp, UI, bridge ou serviço.

## Deviations from Plan

Nenhuma mudança de arquitetura ou escopo. A inclusão de searchCursor no resultado de busca é o caller diretamente necessário para abrir contexto do último/único resultado.

## Issues Encountered

Assertions de fixture foram ajustadas para usar referência Archive em vez de pressupor 20 itens em página limitada por bytes, aceitar método resources/prompts indisponível e restringir a primeira vizinha efetivamente exposta. Pausas de rotação executam uma vez; não houve retry/timeout/workaround de produto. Fixes de yield das fixtures anteriores foram preservados.

## Known Stubs

Nenhum stub que impeça o objetivo; nenhum verify pulado. Scan não encontrou TODO/FIXME/placeholder em produção nem nova superfície de segurança fora do threat model.

## User Setup Required

Nenhuma intervenção necessária para este plano.

## Next Phase Readiness

03-04 pode validar o caso real completo no Codex com consultas, contexto e arquivos. MCP-03/MCP-05 no registro global continuam pendentes da verificação independente da fase; requisitos não foram marcados por testes sintéticos. Não foi executado 03-04, não foi implantado na VPS e não foi comprovada cobertura integral da conta.

## Self-Check: PASSED

Arquivos criados/modificados existem, quatro hashes são ancestrais de HEAD, ambos verifies passam, scope de commits resolve na branch e não há alterações fora do escopo nem deleções inesperadas.

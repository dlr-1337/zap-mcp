---
phase: 03-consulta-e-arquivos-reais-no-codex
plan: "02"
subsystem: api
tags: [mcp, search, snapshots, cursor, hmac, codex]
requires:
  - phase: 03-01
    provides: MCP oficial autenticado, grant por requisição, originais verificados e guard no consumo
provides:
  - find_conversations com candidatos canônicos congelados e identidades separadas
  - search_messages com regras Archive AND/calendário e continuação autenticada sem perda
  - Orçamento de envelope completo e recusa de argumentos/DTOs excessivos com restrição atual
affects: [03-03, 03-04, 04-operacao-e-restauracao-na-vps]
actuals:
  tokens: 11587
  tasks: 2
  commits: 7
commits: 7
plan_head_before: c0b7bec603dda2bd58cd4b73b44a76b735a6ca57
plan_head_after: 20a7024dcd2ffeee70f3870cab5506c383749bfc
tech-stack:
  added: []
  patterns: [HMAC por operação/filtros/grant/geração/TTL, snapshots Archive em namespace MCP, candidatos em Map da instância, budget no JSON-RPC e SSE]
key-files:
  created: [.planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-red1.json, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-red2.json, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-02-red3.json]
  modified: [src/mcp.ts, test/mcp.test.ts, test/context.test.ts, .planning/WINDOWS.md]
key-decisions:
  - "32KiB é orçamento explícito do servidor para envelope completo de consulta, incluindo JSON-RPC/content/structuredContent/SSE; não é teto comprovado do Codex."
  - "Reusar snapshots Archive e calendário; candidatos permanecem Map privado da instância, TTL30min/20recortes/64MiB, com refresh após restart."
  - "Argumentos query têm teto12KiB antes do SDK para que até erros de schema sejam bounded; nenhuma operação WhatsApp ou pacote novo."
requirements-completed: [MCP-02, MCP-05]
coverage:
  - id: MCP-QUERY
    description: Candidatos separados e busca AND/calendário iguais às projeções Archive
    requirement: MCP-02
    verification:
      - kind: integration
        ref: "test/mcp.test.ts#MCP candidatos preservam homônimos grupo e identidades recebidas; MCP busca AND legenda filename histórico e calendário reutiliza oráculo Archive"
        status: pass
    human_judgment: false
  - id: MCP-CONTINUATION
    description: Sequência congelada, HMAC/TTL/escopo, envelope bounded e guard vigente no consumo
    requirement: MCP-05
    verification:
      - kind: integration
        ref: "test/mcp.test.ts; test/search.test.ts; test/context.test.ts"
        status: pass
    human_judgment: false
duration: 36min
completed: 2026-10-12
status: complete
---

# Phase 3 Plan 2: Busca MCP com recortes autenticados e envelope limitado Summary

**MCP encontra candidatos separados e pagina evidências congeladas com as regras do site; envelope/erros cabem no orçamento e restrição atual prevalece no consumo.**

## Performance

- Início persistido: 2026-10-12T14:54:07Z; duração 36min até o fechamento.
- Tarefas: 2/2; sete commits de implementação/testes medidos pelo ledger até 20a7024.
- Actuals: 11587 tokens por chars/4 do diff realizado, incluindo evidências RED e WINDOWs, antes deste SUMMARY. Não usa tokens do harness.
- Execução sequencial no checkout fixado após degrade legítimo da orquestração; nenhum worktree/ramo/configuração/coletor original alterado.

## Accomplishments

- Duas ferramentas com schemas fechados, descrições fixas, anotação somente leitura e dados separados em DTO/structuredContent. IDs canônicos, homônimos, PN/LID sem evidência e grupos permanecem separados; nomes nunca selecionam automaticamente um candidato.
- Busca reusa searchTerms, parsePeriod e searchMessages; termos AND em texto/legenda/filename, revisões históricas, dias inclusivos de23h/25h, instante original desconhecido, filtros efetivos, UTC/offset/zone e cobertura observada preservados. Ausência informa somente não encontrado no acervo.
- Cursores HMAC-SHA256 incluem operação, hash de filtros canônicos, geração/grant, snapshot, ordinal e expiração. Mensagens usam namespace mcp: separado do site; candidatos são congelados em Map privado da instância. Rotação elimina derivados MCP na próxima varredura autenticada, inclusive após restart, sem remover recortes web.
- TTL30min, máximo20recortes por operação,50000itens e64MiB de DTOs serializados; candidatos ausentes após restart pedem atualização. Requisição sem cursor cria recorte novo.
- Página reduzida somente por DTO inteiro e ordinal entregue. Uma evidência ou metadados excessivos produzem response_limit com tamanho, alternativa site/exportação e cursor no mesmo ordinal; nada é mutilado ou avançado.
- Envelope de consulta usa orçamento operacional32KiB, contando JSON-RPC, content, structuredContent, metadados, timestamps, cursor e framing SSE. Maior corpo HTTP/SSE observado no teste multibyte:32.671bytes. Teto12KiB dos argumentos query impede erro de validação desproporcional; ID JSON-RPC tem limite512bytes.
- Grant/referências permanecem closures por request; guard no write/end impede buffer antigo após restrição/rotação. Pedidos paralelos de dados restritos e permitidos não misturam escopo.

## Task Commits

1. **03-02-01 — Localizar candidatos e buscar recorte:** RED `976e01b`; GREEN `f719489`.
2. **03-02-02 — Continuar sem perda e recusar cursores cruzados:** RED `fc7fecc`; GREEN `7f7b1af`.
3. **Fixture de contexto, ajuste diretamente afetado pela regressão:** `b119376`.
4. **Erro de schema excessivo, correção do orçamento:** RED `f854c0b`; FIX/GREEN `20a7024`.

## Verificações

- Tarefa1: build Node24.21.0 + MCP/search20/20.
- Tarefa2: build + MCP/search/context31/31; após teste do erro excessivo,32/32,14,053s. Log ignorado:dist/03-02-green-final.tap.
- Sequência65mensagens multibyte permanece igual ao recorte original após insert/alteração;55candidatos congelados permanecem iguais após novo contato. Sem ordinal repetido/pulado.
- Tampering, operação/filtros/geração diferentes, ordinal assinado negativo/inseguro/fora de faixa, campos extras assinados, expiração, quota, restart, DTO40k, metadados40k, schema40k e buffer tardio foram exercitados.
- Primeiro full:162/163, uma falha ECONNRESET de fixture; diagnóstico e ajuste abaixo. Full após fixture:163/163. Full final após budget de argumentos:164/164, zero fail/cancel/skip/todo,136,106s. Comando:TMPDIR privado/home + mise exec node@24.21.0 -- npm test. Log ignorado:dist/03-02-regression-final.log.
- Tracer real repetido no Codex instalado:1/1,74,886s. Codex0.162.1/client codex-mcp-client negociou2025-06-18; TLS confiado positivo e CA inválida negativa; originais4.200/271.485bytes salvos por GET explícito e SHA/tamanhos iguais. Configuração original preservada. Caso/recibo/transcrição/log permanecem privados fora do Git; coletor/fonte original não foram tocados.
- git diff --check passou; evaluation-scope resolveu sete commits alcançáveis neste ramo. Nenhum teste skipped/todo ou verificação prescrita ficou sem executar.

## TDD Gate Compliance

- RED1 em03-02-red1.json:duas assertions executadas falharam pela ausência das ferramentas planejadas. Classificador RED_EVIDENCE_OK; inspeção confirmou erro de funcionalidade, sem falha de fixture/import.
- RED2 em03-02-red2.json:assertion de continuação falhou pois nextCursor era null, e erro de DTO excessivo não existia. RED_EVIDENCE_OK; caso de restrição já verde confirmou reaproveitamento do guard anterior.
- RED3 em03-02-red3.json:campo desconhecido40k gerou erro SDK maior que32768bytes, falhando a assertion do envelope completo. RED_EVIDENCE_OK antes do fix.
- Ordem RED→GREEN cumprida por tarefa/correção. REFACTOR separado dispensado: nenhuma duplicação justificava outro commit. Gates e evidências não foram substituídos por prefixo de commit ou contagem narrada.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule3 — Blocking] Fixture HTTP de contexto precisava liberar timers após seed síncrono**
- Encontrado na regressão integral da tarefa2:primeiro teste context.test.ts falhou com fetch/ECONNRESET; testes focados permaneciam verdes.
- A/B controlado com181mensagens e bloqueio síncrono7,5s:keepAliveTimeout5000/buffer1000. Sem yield:ECONNRESET; com awaitsetImmediate:HTTP200 e51mensagens/âncora iguais, socket ocioso fechado antesGET.
- Fix:contextFixture.read libera uma vez o loop antesGET. Sem retry, aumento de timeout, mudança de produto ou relaxamento de assertion. Foco4/4 e full164/164 passaram.
- Arquivo:test/context.test.ts; commit:b119376; WINDOWS10fixed.

**2. [Rule1 — Bug] Erro de schema ultrapassava o orçamento**
- Encontrado na revisão da tarefa2:chave extra40k era rejeitada pelo schema, mas sua mensagem de erro excedia32KiB.
- Fix:gate12KiB dos argumentos somente find_conversations/search_messages antesSDK, retornando413compacto. Entradas válidas máximas das ferramentas cabem. get_attachment/initialize não recebem esse gate.
- Arquivos:src/mcp.ts/test/mcp.test.ts; commits:f854c0b/20a7024; WINDOWS11fixed.

### Clarificação do orçamento

03-01 mediu entrega de originais, não o teto de envelope de consulta do cliente. A orquestração autorizou32KiB como política conservadora do servidor, com medição do corpo completo. Calibração de buscas reais no Codex permanece no aceite03-04; nenhuma capacidade máxima do cliente é inventada.

## Decisions Made

Reusar o arquivo/calendário e a persistência existentes, manter dados de candidatos só na instância, e distinguir orçamento do servidor de suporte observado do cliente. Nenhuma tabela, dependência, UI, OAuth, bridge ou operação WhatsApp foi adicionada.

## Known Stubs

Nenhum stub impede o objetivo. Nulls/arrays vazios de evidência desconhecida são fatos preservados do arquivo, sem substituir o instante original por ingestão.

## Issues Encountered

Nenhum impedimento aberto ao plano seguinte. WINDOWS permanece com open_count0. Requisitos globais MCP ficam pendentes do aceite completo e verificador independente; requirements-completed identifica evidência entregue por este plano. Prova local/offline não demonstra VPS nem histórico integral.

## Next Phase Readiness

03-03 pode reutilizar schema/grant, snapshots de mensagem e guard no consumo. Contexto paginado deve observar o mesmo budget e ampliar o gate de argumentos se necessário. Aceite03-04 deve calibrar consulta real no Codex, preservando o limite como política do servidor.

## Self-Check: PASSED

Arquivos criados/modificados existem; sete commits são ancestrais do HEAD medido; evaluation-scope resolved,32/32foco e164/164regressão final, tracer real1/1. Nenhuma exclusão acidental ou artefato gerado não ignorado foi encontrada; milestone.lock preexistente preservado.


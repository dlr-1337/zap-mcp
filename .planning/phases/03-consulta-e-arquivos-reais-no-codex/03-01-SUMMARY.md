---
phase: 03-consulta-e-arquivos-reais-no-codex
plan: "01"
subsystem: api
tags: [mcp, codex, bearer, tls, sqlite, media]
requires:
  - phase: 02-busca-contexto-abas-e-exporta-o-no-site
    provides: Arquivo privado, restore offline, originais verificados e política de restrição no consumo
provides:
  - MCP oficial autenticado com get_attachment e GET privado do original
  - Rotação local independente e bloqueio de respostas/streams revogados
  - Prova do Codex instalado por TLS com dois originais reais salvos e conferidos
affects: [03-02, 03-03, 03-04, 04-operacao-e-restauracao-na-vps]
actuals:
  tokens: 13601
  tasks: 2
  commits: 4
commits: 4
plan_head_before: a5d7d8c219ff3353d2c072aebfeeecbca4faca68
plan_head_after: 32e852e70224a7303d8566692e22f66d8a198058
tech-stack:
  added: ["@modelcontextprotocol/server@2.3.1", "@modelcontextprotocol/node@2.1.1", "zod@4.6.6"]
  patterns: [Bearer antes de parsing e cookie, grant por closure de requisição, gate em cada write/end, TLS privado por ambiente do cliente]
key-files:
  created: [src/mcp.ts, test/mcp.test.ts, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-ACCEPTANCE.md]
  modified: [package.json, package-lock.json, src/main.ts, test/readonly.test.ts, test/export.test.ts]
key-decisions:
  - "Codex0.162.1 negociou initialize2025-06-18; SDKv2 não determina era do cliente."
  - "Imagem pequena suporta inline observado; salvar os dois originais usa GET explícito autenticado do mesmo origin TLS, com SHA/tamanho no destino."
  - "CA privada somente no subprocesso; overrides mesclados preservam byte a byte a configuração Codex e os servidores existentes."
  - "Digest e geração MCP são lidos atomicamente; rotação não redefine sessão/senha web nem abre coletor."
requirements-completed: [MCP-01, MCP-04, MCP-05]
coverage:
  - id: MCP-TRACER
    description: Codex instalado negocia por TLS validado e salva dois originais com integridade
    requirement: MCP-04
    verification:
      - kind: e2e
        ref: "test/mcp.test.ts#tracer real: Codex TLS negociado e dois originais no destino"
        status: pass
    human_judgment: false
  - id: MCP-ACCESS
    description: Bearer independente, schemas fechados e revogação no consumo
    requirement: MCP-01
    verification:
      - kind: integration
        ref: "test/mcp.test.ts; test/readonly.test.ts; test/auth.test.ts; test/media.test.ts; test/export.test.ts"
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-10-12
status: complete
---

# Phase 3 Plan 1: Originais reais no Codex com bearer e TLS Summary

**Codex0.162.1 recuperou dois originais reais por HTTPS com tamanho/SHA-256 iguais; rotação e restrição interrompem o próximo consumo sem perder originais.**

## Performance

- Início de referência:2026-10-12T13:47:06Z, timestamp do prompt de despacho; duração25min até fechamento, sem contador de início persistido separado.
- Tarefas:2/2; oito arquivos de implementação/aceite e dois registros RED.
- Actuals:13.601 tokens pela contagem chars/4 do diff realizado, incluindo evidências RED; quatro commits medidos pelo ledger. Não representa tokens do harness.

## Accomplishments

- Adaptador oficial montado antes de parser/cookie, schema fechado get_attachment, ID canônico, metadata sanitizada, original verificado e GET/HEAD autenticado. Sem token configurado, MCP fica fechado.
- Token distinto do site, digest/generation/segredo de cursor em auth.sqlite, comparação constante e rotação transacional por CLI local. Arquivo de token exclusivo0600 com fsync; comando não adquire trava do serviço nem inicia outro coletor.
- Grant por requisição e revalidação no consumo write/end, depois da leitura inline e de cada bloco. Duas transferências pausadas, revogação concorrente, restrição depois de buffer, restart, cancelamento, HEAD, symlink, corrupção, estados e operação proibida foram exercitados.
- Tracer real passou inicialmente, no feedback gate e novamente após ajustes de consumo. Protocolo2025-06-18/client codex-mcp-client observados; CA confiada somente pelo processo positivo e negativa com alerta TLS antes de initialize.
- Codex invocou ambos os IDs com preferências distintas e executou auxiliar privado de GET autenticado;4.200 e271.485bytes efetivamente salvos, cada tamanho/SHA igual ao fd/original independente. Imagem pequena apareceu inline; gravação original verificável foi feita por download explícito para ambos.

## Task Commits

1. **03-01-01 — Recuperar originais no Codex instalado:** RED `8c635db`, GREEN `6827d19`.
2. **03-01-02 — Invalidar transferências e comprovar isolamento:** RED `9a589cb`, GREEN `32e852e`.

## Verification

- Build TypeScript com Node24.21.0 passou.
- Foco MCP/auth/media/readonly:43/43, zero falhas, antes do último caso HEAD/symlink; a suíte integral final inclui esse caso e a expectativa de exportação corrigida.
- Tracer final:11/11, zero fail/skip/todo,121,838s. Codex real, negativa/positiva TLS, duas tools/call, dois arquivos e oráculo de tamanho/hash verificados. Recibos/transcrições/binários ficam privados fora do checkout.
- Suíte final: `TMPDIR` privado na partição/home + `mise exec node@24.21.0 -- npm test`:154/154, zero fail/cancel/skip/todo,91,255s. Log ignorado `dist/03-01-final-regression.tap`.
- Configuração Codex original comparada byte a byte; nenhuma confiança de sistema foi instalada. Bearer ausente das transcrições finais conferido privadamente. Coletor original e arquivo fonte preservados.
- Pins/engines/peers/integridade/repos/scripts e transitivas auditados; lock contém core2.3.1, hono4.13.13 e @hono/node-server1.19.17 sem lifecycle de instalação novo. Nenhum SDK client/express ou framework adicional.

## TDD Gate Compliance

- RED1 `03-01-red1.json`:assertion401 falhou com400, porque parsing ocorria antes de auth. Classificador retornou RED_EVIDENCE_OK; inspeção semântica confirmou a falha planejada antes de GREEN.
- RED2 `03-01-red2.json`:rotação de outra conexão entre digest/generation concedia indevidamente a nova geração ao bearer antigo. Assertion de recusa falhou; RED_EVIDENCE_OK e inspeção semântica antes de GREEN. Leitura única e revalidação corrigiram a corrida.
- Sequência RED→GREEN cumprida para ambas tarefas. Refactor separado dispensado; nenhum skip substituiu a prova real.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule1 — Bug] Expectativa histórica adicional em teste de exportação**
- Encontrada na regressão integral da tarefa2:export.test.ts também esperava POST/mcp=404, fora da lista nominal do plano.
- Alterada somente essa expectativa para401; envio/edição/exclusão/leitura/presença continuam404. Arquivo:test/export.test.ts; commit:32e852e.

**2. [Rule3 — Blocking] Temporários de regressão em partição com espaço**
- Primeiro npm test em/tmp registrou SQLITE_IOERR_WRITE e falhas correlatas sob temporários concorrentes. Logs preservados; nenhum material anterior removido.
- Mesma suíte/assertions repetida com TMPDIR privado na partição/home.153/154 passou antes da correção histórica;154/154 passou após a correção. Sem mudança de produto ou enfraquecimento de teste.

## Decisions Made

- Teto defensivo inline262.144bytes para imagem assinada; amostra real pequena comprova seu suporte observado, sem promessa universal do teto/formato. Outros originais seguem GET privado no mesmo origin.
- Configuração do cliente mesclada por overrides da invocação; nenhuma alteração persistente ou CA de sistema necessária.
- Requisitos globais ficam pendentes até planos irmãos e verificação independente; requirements-completed acima identifica a evidência entregue por este plano, não conclusão da fase3.

## Issues Encountered

- Codex apresentou erro genérico http/request failed no controle negativo. O diagnóstico foi corroborado pelo alerta de certificado observado no servidor e pela conexão positiva com a CA, sem desligar validação TLS.
- A primeira compilação RED teve tipagem de headers de fixture corrigida antes de capturar a execução válida. Não foi usada como evidência RED.
- A prova é local/offline. Não demonstra implantação/VPS, histórico integral, busca/contexto MCP ou aceite operacional da fase4.

## Known Stubs

Nenhum stub impede a capacidade deste plano. Ausência/restrição/estados de mídia são resultados explícitos, não dados simulados de produto.

## Self-Check: PASSED

Arquivos criados presentes; todos quatro commits são ancestrais do HEAD. evaluation-scope resolveu exatamente os quatro commits do plano nesta branch; nenhum arquivo de dado, chave ou sessão foi versionado.

## Next Phase Readiness

Tracer e feedback gate passaram. Pronto para03-02, mantendo somente consultas locais e o arquivo privado. Operação final na VPS segue fase4.

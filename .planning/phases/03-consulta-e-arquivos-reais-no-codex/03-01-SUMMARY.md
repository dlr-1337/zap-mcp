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
  tokens: 17488
  tasks: 2
  commits: 8
commits: 8
plan_head_before: a5d7d8c219ff3353d2c072aebfeeecbca4faca68
plan_head_after: c772a248814e02d4e666485ddff35d1604eefec1
tech-stack:
  added: ["@modelcontextprotocol/server@2.3.1", "@modelcontextprotocol/node@2.1.1", "zod@4.6.6"]
  patterns: [Bearer antes de parsing e cookie, grant por closure de requisição, gate em cada write/end, TLS privado por ambiente do cliente]
key-files:
  created: [src/mcp.ts, test/mcp.test.ts, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-ACCEPTANCE.md]
  modified: [package.json, package-lock.json, src/main.ts, test/readonly.test.ts, test/export.test.ts, test/auth.test.ts]
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
duration: 27min
completed: 2026-10-12
status: complete
---

# Phase 3 Plan 1: Originais reais no Codex com bearer e TLS Summary

**Codex0.162.1 recuperou dois originais reais por HTTPS com tamanho/SHA-256 iguais; rotação e restrição interrompem o próximo consumo sem perder originais.**

## Performance

- Início de referência:2026-10-12T13:47:06Z, timestamp do prompt de despacho; duração27min até o SUMMARY, sem contador de início persistido separado.
- Tarefas:2/2; oito arquivos de implementação/aceite e dois registros RED.
- Actuals atualizados após o follow-up:17.488 tokens pela contagem chars/4 do diff realizado atéc772a24, incluindo evidências RED e documentos já integrados; oito commits medidos pelo ledger até esse HEAD, incluindo os três metadados anteriores. Não representa tokens do harness. A duração27min registra a execução original até o primeiro SUMMARY; o diagnóstico posterior é descrito abaixo.

## Accomplishments

- Adaptador oficial montado antes de parser/cookie, schema fechado get_attachment, ID canônico, metadata sanitizada, original verificado e GET/HEAD autenticado. Sem token configurado, MCP fica fechado.
- Token distinto do site, digest/generation/segredo de cursor em auth.sqlite, comparação constante e rotação transacional por CLI local. Arquivo de token exclusivo0600 com fsync; comando não adquire trava do serviço nem inicia outro coletor.
- Grant por requisição e revalidação no consumo write/end, depois da leitura inline e de cada bloco. Duas transferências pausadas, revogação concorrente, restrição depois de buffer, restart, cancelamento, HEAD, symlink, corrupção, estados e operação proibida foram exercitados.
- Tracer real passou inicialmente, no feedback gate e novamente após ajustes de consumo. Protocolo2025-06-18/client codex-mcp-client observados; CA confiada somente pelo processo positivo e negativa com alerta TLS antes de initialize.
- Codex invocou ambos os IDs com preferências distintas e executou auxiliar privado de GET autenticado;4.200 e271.485bytes efetivamente salvos, cada tamanho/SHA igual ao fd/original independente. Imagem pequena apareceu inline; gravação original verificável foi feita por download explícito para ambos.

## Task Commits

1. **03-01-01 — Recuperar originais no Codex instalado:** RED `8c635db`, GREEN `6827d19`.
2. **03-01-02 — Invalidar transferências e comprovar isolamento:** RED `9a589cb`, GREEN `32e852e`.

## Verificações

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

## Follow-up pós-wave — ECONNRESET da fixture HTTP

- O pós-wave do orquestrador registrou153/154 com ECONNRESET em `UI HTTP vazia, texto hostil e janelas com cursor estável sem coletor`, usando TMPDIR na partição/home. Não foi atribuído ao tmpfs. Quatro execuções focadas passaram em1,39–1,42s; a reprodução integral exata voltou a153/154 com o mesmo caso9,44s.
- Instrumentação temporária da fixture registrou a rota e eventos dos sockets sem headers/segredos. Com pausa determinística de7.500ms na primeira escrita sintética, o caso falhou no primeiro GET/api/conversations depois do seed:gap8.339ms e timeout dos dois sockets ao retomar o event loop. O cliente fetch e o servidor de teste compartilham esse loop;260 escritas SQLite síncronas sob carga adiam timers/I/O e deixam o próximo GET concorrer com expiração de conexões idle.
- A hipótese de bodies não consumidos foi rejeitada por A/B: consumir bodies manteve o reset no repro nativo e na fixture. Nenhuma mudança de consumo foi mantida.
- Correção `c772a24`:somente comentário e uma volta de setImmediate após o seed, antes de reiniciar consultas HTTP. Instrumentação removida; nenhum retry, timeout, header, produto ou assertiva alterado.
- Repro controlado antes:1/1 vermelho com ECONNRESET e rastreamento da rota; depois:1/1 verde9,07s, e novamente no diff final sem instrumentação:1/1 verde9,14s sob a mesma pausa7.500ms.
- Suíte final no mesmo Node24.21.0/TMPDIR do orquestrador, sem flags/env adicionais: **154/154, zero fail/cancel/skip/todo,102,974s**. O caso corrigido passou naturalmente sob carga em12,23s. Logs e preload diagnóstico sintético preservados no diretório privado do pós-wave; nenhum dado real acessado.
- Nenhuma alteração em transporte/consumo MCP:tracer real anterior permanece válido e não foi repetido. STATE/ROADMAP não foram avançados de novo; plano atual continua2.

## Self-Check: PASSED

Arquivos criados presentes; commits originais e02a28df são ancestrais do HEAD. evaluation-scope original resolveu os quatro commits de implementação; o follow-up de fixture está identificado acima e o ledger foi medido novamente. Nenhum arquivo de dado, chave ou sessão foi versionado.

## Next Phase Readiness

Tracer e feedback gate passaram. Pronto para03-02, mantendo somente consultas locais e o arquivo privado. Operação final na VPS segue fase4.

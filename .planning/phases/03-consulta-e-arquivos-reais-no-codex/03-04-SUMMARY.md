---
phase: 03-consulta-e-arquivos-reais-no-codex
plan: "04"
subsystem: testing
tags: [mcp, codex, tls, acceptance, provenance, privacy, sqlite]
requires:
  - phase: 03-03
    provides: Quatro ferramentas autenticadas, contexto, snapshots e originais verificados
provides:
  - Aceite real atual no Codex com SQL/site/bytes independentes e rejeição de replay
  - Cobertura de muitos lotes resumida explicitamente sem bloquear o envelope limitado
  - Ledger de oito tarefas, cinco requisitos, vinte decisões e ameaças com instruções de uso/rotação
affects: [03-verification, 04-operacao-e-restauracao-na-vps]
actuals:
  tokens: 26224
  tasks: 2
  commits: 4
commits: 4
plan_head_before: ecaafbb4149195ae8a78eb1c81449b4ee09ecfc2
plan_head_after: 95273153e89034dfe09001dec81680501847122d
tech-stack:
  added: []
  patterns: [Contexto de execução em WeakSet não serializável, correlação Codex e transporte atual, oráculos SQL/ICU/site/disco independentes, cobertura explícita agregada]
key-files:
  created: [scripts/phase3-acceptance.mjs, test/mcp-acceptance.test.ts, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-red1.json, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-04-red-coverage.json, .planning/phases/03-consulta-e-arquivos-reais-no-codex/deferred-items.md]
  modified: [src/mcp.ts, test/mcp.test.ts, README.md, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-ACCEPTANCE.md, .planning/phases/03-consulta-e-arquivos-reais-no-codex/03-VALIDATION.md, .planning/WINDOWS.md]
key-decisions:
  - "Contagens/intervalos/historyStatuses permanecem; batchSummary agrega lotes com referência explícita ao status autenticado, sem alterar DTOs ou orçamento32KiB."
  - "Recibo depende de processo/calls/protocolo/TLS atuais e arquivos novos; JSON desserializado não recria a instância de execução."
  - "Oráculo web usa HTTP exclusivamente loopback no mesmo clone; MCP/originais usam TLS verificado e login HTTPS do site permanece pendência da fase4."
requirements-completed: [MCP-01, MCP-02, MCP-03, MCP-04, MCP-05]
coverage:
  - id: REAL-CODEX
    description: Codex instalado consulta recorte paginado e contexto com proveniência e recupera dois originais íntegros por TLS
    verification:
      - kind: e2e
        ref: "scripts/phase3-acceptance.mjs --mode real-codex; 03-ACCEPTANCE.md, rodada2026-10-12T17:13:27.794Z"
        status: pass
    human_judgment: false
  - id: RECEIPT-GATE
    description: Replay, fake/sintético, canal/protocolo/oráculo ausentes e destino antigo/parcial/corrupto não autorizam aceite
    verification:
      - kind: integration
        ref: "test/mcp-acceptance.test.ts; scripts/phase3-acceptance.mjs --mode self-test"
        status: pass
    human_judgment: false
  - id: BATCH-COVERAGE
    description: Muitos lotes não impedem o menor resultado e a cobertura permanece conferível com orçamento limitado
    verification:
      - kind: integration
        ref: "test/mcp.test.ts#MCP resume muitos lotes sem bloquear consultas nem perder cobertura observada"
        status: pass
      - kind: e2e
        ref: "scripts/phase3-acceptance.mjs#SQL/site batchSummary oracle"
        status: pass
    human_judgment: false
  - id: PRIVACY-REGRESSION
    description: Regressão integrada e ledger de uso/rotação com dados privados fora do Git e endpoint transitório encerrado
    verification:
      - kind: integration
        ref: "mise exec node@24.21.0 -- npm test; 177/177 em115158ms"
        status: pass
      - kind: other
        ref: "git diff --check; ledger8tasks/20decisions/5requirements; artifacts0600 e0outros MCP"
        status: pass
    human_judgment: false
duration: 72min
completed: 2026-10-12
status: complete
---

# Phase 3 Plan 4: Aceite real no Codex com oráculos independentes Summary

**Codex0.162.1 completou12chamadas reais por TLS, com busca/contexto iguais a SQL/site e dois originais novos de4200/271485bytes com SHA iguais ao disco.**

## Performance

- Início registrado após inicialização:2026-10-12T16:17:19Z; fechamento de execução/documentos:2026-10-12T17:29:36Z,72min.
- Tarefas:2/2. Actuals26224tokens por chars/4 do diff realizado de104893caracteres, nunca tokens do harness.
- Quatro commits medidos do ledger persistido até9527315; SUMMARY e tracking são posteriores a essa medição.
- Execução sequencial no checkout fixado/main com override permitido pelo projeto e isolamento none registrado pelo orquestrador. Não mudou ramo/worktree, fonte/coletor original ou milestone.lock.

## Accomplishments

- Roteiro `real-codex` invoca executável nativo instalado, observa initialize/client/protocolo/TLS, requests/resultados e eventos do cliente atuais. Argumentos/structuredContent são correlacionados por chamada; arquivos novos são conferidos contra SQL/disco e bytes HTTP. Não aceita JSON antigo como nova instância, fixture/SDK, metadata/URL ou arquivo parcial como entrega.
- Rodada final real exit0 às17:13:27.794Z:1find_conversations,3search_messages,6get_context e2get_attachment. Treze resultados de3páginas consecutivas de um recorte128;20referências distintas de contexto, antes/depois e casos reais de citação, edição e instante desconhecido. Todos campos observados, filtros/UTC/offset/cobertura comparados com SQL/ICU/site;2revisões edit nas janelas. Nulls foram preservados, sem inventar texto citado, original faltante ou data.
- Codex negociou initialize2025-06-18/client codex-mcp-client; HTTPS localhost confiado positivo e recusa sem CA antes de initialize. Helper GET autenticado executado pelo Codex salvou4200/271485bytes,2/2 tamanhos e SHA iguais ao original independente. Pequeno retornou inline, maior download_required; ambos foram gravados por GET explícito, sem afirmar renderização/gravação automática de inline.
- Maior envelope real32587/32768bytes. Cobertura completa de lotes antes exigia232809bytes mesmo para1candidato; resumo explícito de contagens/intervalo/estados permitiu consulta sem reduzir DTOs ou aumentar orçamento. Detalhes por lote permanecem no status autenticado do site e a agregação foi conferida por SQL/site.
- Recibos/transcripts/casos/IDs/arquivos privados ficaram externos0700/0600. Inspeção da rodada:0outros MCP e1comando helper; TOML original preservado byte a byte. Bearer foi recusado após revogação, arquivo temporário removido e listeners encerrados; senhas/config/sessões web do clone restauradas, sem novo coletor/QR.
- README e03-VALIDATION ligam8tarefas/5MCP/20decisões/ameaças aos comandos, resultados e tempos. Requisitos globais seguem Pending e probes/proibições descriptor-less seguem flagged-unverified; revisão/verificação independentes decidem o veredito.

## Task Commits

1. 03-04-01 RED — `46d9bbe`: gate de recibo novo, destinos e whitelist pública.
2. 03-04-01 RED da regressão real — `e93a15e`: muitos lotes bloqueavam a menor resposta.
3. 03-04-01 GREEN — `f90509a`: roteiro/prova atual, correção de coverage e evidência sanitizada.
4. 03-04-02 — `9527315`: ledger/uso/rotação/limites e regressão integrada documentados.

## Verificações

- RED1:4assertions falharam; classificador RED_EVIDENCE_OK. Target executado e falha na rejeição ausente do verifier, não import/setup. REDcoverage:1target com600lotes falhou em isError true; classificador RED_EVIDENCE_OK. Registros completos em03-04-red1.json/03-04-red-coverage.json.
- Build+MCP/receipt33/33 em14,184s. Verify da tarefa1: build+receipt4/4 em0,385s e self-test exit0. Refactor somente endureceu correlação/whitelist/brand durante GREEN; nenhum commit de refactor necessário.
- Real final12calls exit0, oráculos atuais e destinos íntegros; base anterior9calls exit0 às17:02:05Z preservada. Tempo por caso real em03-VALIDATION; não é teto/latência garantida do cliente.
- Verify tarefa2: `mise exec node@24.21.0 -- npm test`,177/177, exit0, zero fail/cancel/skip/todo,115,158s; self-test exit0 após atualização dos docs. Logs locais ignorados em dist/03-04-full.log e dist/03-04-real-final.log.
- git diff --check, ledger8/20/5, checagem de permissões/cleanup e inspeção de diff/escopo passaram. evaluation-scope resolveu os4commits alcançáveis deste plano. Nenhum teste skipped/todo, stub ou verify prescrito pendente.

## TDD Gate Compliance

Os dois REDs intencionais foram classificados e inspecionados antes do GREEN. A tarefa2 alterou somente documentos e executou verificações existentes, portanto não adicionou comportamento nem exigiu tdd/behavior novo. Houve test→feat na mesma plan; sem feature commit antes dos REDs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule1 — Bug] Cobertura de muitos lotes tornava consultas reais impossíveis**
- Encontrado no aceite real da tarefa1: find_conversations requeria232809bytes mesmo com1candidato, acima32768.
- Fix: queryCoverage agrega count/received/confirmed/failed/pending/completed/inProgress/stalled e mantém os demais campos, com referência explícita ao status autenticado do site. Mensagens e orçamento inalterados.
- Arquivos diretamente necessários acrescentados ao ownership:src/mcp.ts/test/mcp.test.ts. RED600lotes e comparação real SQL/site passaram. Commitf90509a; WINDOWS12 fixed.

**2. [Rule3 — Blocking] Oráculo web autenticado usa seu canal loopback atual**
- Login em TLS nativo com Origin HTTPS retornou403; createWebAuth.csrf preexistente usa http://Host. Não foi alterado auth compartilhado para adaptar a prova.
- Fix do harness: listener HTTP exclusivamente loopback no mesmo serviço offline para o oráculo do site; MCP/originais mantêm HTTPS verificado. Arquivo scripts/phase3-acceptance.mjs; commitf90509a.
- Pendência concreta fase4 em deferred-items.md/WINDOWS13 open: confirmar Origin/canal/proxy antes da operação final. Nenhuma inferência sobre produção.

## Issues Encountered

Tentativas encadeadas excederam240s por processo. Logs de transporte mostraram chamadas HTTP concluídas, mas faltou encerramento completo do Codex; nenhuma recebeu recibo de sucesso. Driver final usa invocações curtas atuais com cursores/grant compartilhados, mantendo correlação estrita e mesmo orçamento. Certificado público0644 foi lido como certificado, enquanto chave/CA/caso permanecem privados; testes de Host fixam SNIlocalhost para distinguir recusa HTTP de recusa TLS. Artefatos de falha foram preservados privadamente.

## User Setup Required

Nenhuma intervenção humana indispensável para concluir este plano. Endpoint de aceite era transitório e foi encerrado; ativação útil exige canal deliberadamente vigente descrito no README, sem token/URL mortos no config. Não foi implantado serviço na VPS.

## Deferred Issues

Login do site sob TLS nativo com Origin HTTPS retornou403. Revisar Origin/canal/proxy na fase4; WINDOWS13 permanece aberto. VPS/supervisão/backup externo recorrente/restore operacional final, conexão autenticada atual da fonte, renderização visual inline e dispositivos físicos não foram comprovados por esta execução. Não há promessa de histórico integral.

## Requirement Status

`requirements-completed` copia o escopo do PLAN por contrato do SUMMARY; REQUIREMENTS.md não foi marcado completo. As cinco linhas MCP continuam Pending até verificação independente, e as três proibições/probes unclassified permanecem flagged-unverified.

## Next Phase Readiness

Planos da fase3 têm evidências para revisão padrão e verificação independentes. Nenhuma tarefa da fase4 foi executada. Fontes/casos/transcripts completos permanecem disponíveis externamente para inspeção privada.

## Self-Check: PASSED

Arquivos criados/listados existem; os quatro commits acima são ancestrais de HEAD e o resolver de escopo os reconhece neste ramo. Suíte/aceite real/cleanup foram conferidos antes de fechar este SUMMARY.

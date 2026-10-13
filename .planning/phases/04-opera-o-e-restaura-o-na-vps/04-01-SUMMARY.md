---
phase: 04-opera-o-e-restaura-o-na-vps
plan: "01"
subsystem: infra
tags: [inventory, ssh, privacy, capacity, tdd]
requires:
  - phase: 03-consulta-e-arquivos-reais-no-codex
    provides: arquivo local e MCP verificados
provides:
  - descoberta read-only com recibo privado blocked e relatório público por allowlist
  - capacidade atual por metadata, identidade estrita e rejeição de replay
  - dependências remotas acionáveis sem backend inventado
affects: [04-02, 04-03, 04-04, 04-05, 04-06]
tech-stack:
  added: []
  patterns: [fixed argv, known SSH host key, current probes, private evidence]
key-files:
  created: [scripts/phase4-environment.mjs, test/environment.test.ts, ops/README.md]
  modified: []
key-decisions:
  - "Recibo antigo nunca autoriza operação; assert-ready sempre repete probes."
  - "Nenhum backend cifrado foi observado; SSH e chave legível não provam acesso desde a VPS ou decrypt."
  - "OPS-01/02 continuam Pending e A1/A2 unresolved; implementações locais seguintes podem continuar."
requirements-completed: []
requirements-related: [OPS-01, OPS-02]
coverage:
  - id: D-01
    description: inventário executável privado, separado de aceite VPS
    verification:
      - kind: unit
        ref: test/environment.test.ts
        status: pass
      - kind: other
        ref: node scripts/phase4-environment.mjs --mode discover
        status: pass
    human_judgment: false
  - id: D-07
    description: cálculo de capacidade corrente, fila ZIP, cinco conjuntos, bytes/inodes e reserva
    verification:
      - kind: unit
        ref: test/environment.test.ts#reserva exige acervo, cinco cópias, fila ZIP e inodes atuais
        status: pass
    human_judgment: false
  - id: D-10
    description: bloqueio explícito por destino ou chave independente não comprovados
    verification:
      - kind: unit
        ref: test/environment.test.ts#chave apenas na VPS ou acesso dependente do notebook permanece unverified
        status: pass
    human_judgment: false
actuals:
  tokens: 7617
  tasks: 2
  commits: 4
plan_head_before: 4c235711eb06c28e1f388a2e755559880485b448
plan_head_after: a12a8e55dca1c34696b5fd00e7c95694699ed492
duration: 6min
completed: 2026-10-13
status: complete
---

# Phase 4 Plan 1: Inventário privado de operação Summary

**Descoberta read-only com identidade/timeout/capacidade estritos e recibo blocked, preservando o coletor e impedindo aceite por JSON salvo.**

## Performance

- Início registrado: 2026-10-13T00:14:17Z; final: 2026-10-13T00:19:59Z.
- Duas tarefas; três arquivos de implementação/teste/documentação.
- Quatro commits RED/GREEN medidos pelo ledger antes deste commit de documentação; tokens calculados por chars/4 do diff desses três arquivos, não tokens do harness.

## Accomplishments

- `discover`, `assert-ready`, `self-test`; arquivos privados0600/diretórios0700 fora do checkout, sem symlinks; stdout por allowlist de códigos/status sem erro bruto.
- SSH não interativo com host key conhecida, identidade explícita, sem autoaccept/configuração livre. Probes limitados10s, abortáveis, saída limitada, argv fixos; metadata de disco e inventário de processos restrito ao projeto. Nenhuma leitura de conteúdo de mensagens/mídias/chaves.
- SQLite/FTS em memória, runtime/identidade atuais, supervisor/User/MainPID e autostart, proxy/digest/topologia previamente conferida, mount/ownership/permissões, bytes/inodes atuais e reserva. Chave local na VPS e destino dependente do notebook não liberam operação.

## Task Commits

| Tarefa | RED | GREEN | Resultado |
|---|---|---|---|
| 04-01-01 — descoberta sem mutação | 0caf975 | ff2261d | blocked privado válido, identidade/timeout/SSH testados |
| 04-01-02 — capacidade/dependências | 83d568f | a12a8e5 | cálculo, sanitização/replay, chave independente e roteiro |

## Verification

- Build Node24.21.0 passou.
- `node --test dist/test/environment.test.js`: 7/7, zero fail/cancelled/skipped/todo.
- Tracer: build + foco + discover passaram e foram repetidos antes de expansão; blocked é o resultado válido previsto.
- `node scripts/phase4-environment.mjs --mode self-test`: `{passed:true}`.
- `discover` sem configuração: recibo privado version1 gravado, exit0, oito dependências missing/configuration_missing no relatório público. `assert-ready` recusa o caminho e regrava fatos atuais quando encontra JSON saved/stale.
- Inspeção de stubs: nenhum TODO/FIXME/placeholder ou componente sem fonte de dados. Nenhum arquivo rastreado excluído. Nenhum pacote/pin/global alterado.

## TDD Gate Compliance

| Tarefa | Evidência TAP | Avaliação semântica | Gate |
|---|---|---|---|
| 04-01-01 | `.planning/research/.cache/04-01-red-1.json` | teste executou e falhou na assertion de status unimplemented vs blocked; sem falha import/fixture/sintaxe | RED_EVIDENCE_OK |
| 04-01-02 | `.planning/research/.cache/04-01-red-2.json` | teste executou e falhou na assertion sufficient undefined vs true; predicado de chave também falhou intencionalmente | RED_EVIDENCE_OK |

Ambos REDs precederam implementação GREEN. Relatórios TAP integrais e comandos/status reais preservados no cache ignorado. REFACTOR separado não necessário.

## Inventário real e dependências externas

Descoberta restrita ao checkout/documentação, estado dos processos deste projeto e inventário de abas existentes. Um processo atual do projeto foi encontrado e os metadados atuais da origem foram medidos read-only por probe limitado, com SQLite/FTS em memória. Processo ativo não comprova sessão WhatsApp autenticada. Nenhum processo foi parado, reiniciado, habilitado ou conectado.

Inventário integral e `environment.json` ficam fora do checkout em diretório0700. Locator interno não versionado em `.git/gsd-phase4-inventory-locator`; não publicar seu valor. Não houve referência `ZAP_OPERATION_CONFIG_FILE`, configuração SSH pessoal nem painel remoto relevante observado nas sessões de navegador disponíveis. Isso não prova inexistência de uma VPS/conta externa.

| Dependência | Estado real atual | Próximo fato necessário |
|---|---|---|
| source | observed local no inventário privado | confirmar supervisor/autostart e exclusividade no handoff; medir novamente antes de mutação |
| target | missing | identidade da VPS por canal conhecido e acesso privado verificável |
| publicOrigin | missing | origem HTTPS corrente ligada à VPS correta |
| proxy | missing | produto/version/topologia/config existente conferidos |
| supervisor | missing | unidade existente, User/MainPID/autostart e versão da VPS |
| persistentVolume | missing | mount privado persistente fora releases e capacidade corrente |
| offsite | missing | backend oficial existente e acesso direto desde VPS sem notebook |
| recoveryKeyReference | missing | kit/chave fora VPS, acesso independente e decrypt real |

Offsite configurado com mero SSH mantém `target_offsite_access_unverified`; arquivo de chave legível mantém `recovery_decryption_unverified`. Nenhum adapter ou upload foi criado para um produto não observado. A ampliação concreta dos probes precisa acompanhar o backend realmente inventariado nos planos04-04/05/06; até lá `assert-ready` permanece blocked mesmo que as referências SSH básicas sejam preenchidas.

A1 (runtime/volume VPS) e A2 (acessos/destino existentes) continuam **unresolved**. Não marcar OPS-01/OPS-02 concluídos por esta ferramenta ou pelos testes.

## Deviations from Plan

Nenhuma alteração estrutural ou mutação remota. Conforme instrução do orquestrador, os handlers de STATE/ROADMAP/REQUIREMENTS ficam sob responsabilidade dele após este SUMMARY comprometido; este executor não alterou esses documentos compartilhados.

## Next Phase Readiness

Planos04-02–04 locais podem continuar. Planos remotos dependem dos fatos listados; nenhuma contratação, escolha de produto ausente ou aceite OPS foi inferido. Não há login remoto tentado nem gate de autenticação que possa ser atribuído a uma conta conhecida.

## Self-Check: PASSED

Três artefatos existem, quatro commits são ancestrais de HEAD, focos/build/self-test/discover executados com sucesso; SUMMARY contém somente metadados sanitizados e dependências. Requisitos OPS permanecem pendentes.

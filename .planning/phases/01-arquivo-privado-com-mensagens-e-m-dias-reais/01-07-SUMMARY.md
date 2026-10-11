---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "07"
subsystem: collector
tags: [private-pilot, qr, baileys, checkpoint, web-browser]
requires:
  - phase: "01-06"
    provides: Snapshot/restore autenticado, recibo do perfil fonte e preflight
provides:
  - Perfil persistente privado novo com cópia e restauração conferidas antes do socket
  - QR real emitido pelo serviço normal e renderizado no navegador autenticado local
  - Correção mínima da identificação de protocolo recusada antes do QR
affects: [phase-1-pilot, phase-2]
tech-stack:
  added: []
  patterns: [exclusive-collector, authenticated-loopback-qr, private-operational-evidence]
key-files:
  created: [.planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-07-CHECKPOINT.md]
  modified: [src/whatsapp.ts, test/collector.test.ts, README.md, .planning/STATE.md]
key-decisions:
  - "WEB_BROWSER Chrome corrige recusa428 do Desktop DARWIN no perfil/pin reais; syncFullHistory permanece true."
  - "QR e preparo técnico não concluem tarefa01-07-01 nem requisitos; pareamento pelo celular é blocking-human."
requirements-completed: []
requirements-supported: [PRIV-01, PRIV-02, PRIV-03, SYNC-01]
coverage:
  - id: D1
    description: Perfil privado preparado, snapshot/restore e preflight conferidos antes do coletor
    verification:
      - kind: integration
        ref: CLI profile-init/owner-set/backup/verify-backup/preflight no perfil persistente novo
        status: pass
    human_judgment: false
  - id: D2
    description: Identificação WEB_BROWSER preserva pedido de full sync e QR real chega ao browser autenticado
    verification:
      - kind: integration
        ref: test/collector.test.ts#QR atual expira sem extensão, FULL e eventos persistem sem expor sessão
        status: pass
      - kind: other
        ref: Serviço normal serve --collect; HTTP QR200/generation atual e DOM privado com imagem carregada
        status: pass
    human_judgment: false
  - id: D3
    description: Pareamento, amostras/conversa/grupo/quatro originais e restart/offline reais
    verification: []
    human_judgment: true
    rationale: Usuário ainda precisa ler QR no celular e conferir material conhecido da própria conta.
actuals:
  tokens: 1853
  tasks: 0
  commits: 1
commits: 1
plan_head_before: c83f753678641c261438520149abfb5798cf75ea
plan_head_after: f61e1786cd9372028ec6ec1860107120d3bfe3ab
duration: checkpoint
completed: 2026-10-10
status: halted
---

# Phase 1 Plan 7: Preparo privado e checkpoint de pareamento Summary

**Perfil persistente com restauração autenticada conferida e QR real privado, após corrigir a identidade Desktop recusada pelo servidor. O plano permanece aberto no celular.**

## Resultado e limite

- **Tarefas concluídas: 0/3.** Tarefa01-07-01 preparada; QR ainda não lido e connection.open não observado. Nenhum requisito concluído e nenhuma fase seguinte iniciada.
- O perfil padrão não existia e não havia ZAP_DATA_DIR configurado; criado perfil novo fora do checkout sem sobrescrever sessão/senha anterior. Diretórios0700, bancos/recibo/senha0600; senha aleatória por stdin, sem argv/chat/log.
- Snapshot privado do perfil realmente usado, verify-backup com SQL/FK/schema/contagens/hash e login HTTP offline passou. Nenhum coletor na cópia restaurada. Recibo autenticado do perfil fonte e preflight passaram antes de QR.
- Serviço normal `serve --collect` do produto final, com um coletor, supervisão systemd user, loopback127.0.0.1 e saídas desabilitadas para impedir logs privados. Navegador visível separado já autenticado; somente exibe site, sem WhatsApp Web no coletor.
- QR real HTTP200, geração atual, validade futura e imagem DOM carregada observados depois do restart do serviço normal. Nenhum payload/imagem/cookie/conteúdo real em Git ou relatório público.
- Segundo processo recusado pela trava antes do socket; GET/HEAD/Range sem sessão recusados401 em status/QR/conversas/original. Checks no perfil real de preparo, ainda sem conta vinculada.

## Commit de correção

- `f61e178`: fix(01-07): corrigir identificação recusada antes do QR — src/whatsapp.ts, test/collector.test.ts e README.md.
- Contagem medida do ledger até plan_head_after:1. Tokens=ceil(7409 caracteres do diff/4)=1853; tarefas do plano completas0. Documentos do checkpoint não entram na medida do próprio relatório.

## Verification

- Build Node24.21.0 passou. Suíte após correção:79/79, zero failures/skips/todos,12.13s; relatório sintético fora do checkout.
- Regressão antes da correção falhou na asserção de registro: WebSubPlatform DARWIN3 versus WEB_BROWSER0. Depois passou e confere DeviceProps.requireFullSync=true; não apenas uma string de configuração.
- Revisão/QA sintéticos anteriores foram preservados. Sem nova UI ou download alterado; não repetidos. Esta etapa não converte essas evidências em aceite da conta.
- Preparo e HTTP privado/exclusividade passaram; a instrução da verificação humana do plano continua pendente. Tarefas01-07-02/03 ainda não iniciadas, sem dados reais para comparar/reiniciar/restaurar.

## Deviations from Plan

**1. [Rule1 — Bug] Desktop interrompia conexão antes do QR.**
- Encontrado durante preparo01-07-01: socket real com macOS Desktop recebia428/Connection Terminated em aproximadamente0.5s, sem QR. Fetch live de versão Web sozinho não resolveu.
- Fonte rc14 getWebInfo combina platformWEB com subplatformDARWIN quando Desktop/fullSync; relato primário [upstream2677](https://github.com/WhiskeySockets/Baileys/issues/2677) descreve esse comportamento.
- Probe exclusivo no mesmo perfil/pin e versão default, mudando somente browser para macOS Chrome, emitiu QR real. Aplicada uma linha no coletor, preservando syncFullHistory/predicate e pin; nenhum browser executado pelo coletor.
- Regressão verifica payload de registro e pedido full sync; suíte79/79 e serviço normal após restart confirmaram QR. Commitf61e178. Cobertura real com essa identidade ainda precisa comparação no celular.

## Checkpoint e continuidade

Ver [01-07-CHECKPOINT.md](01-07-CHECKPOINT.md). `status: halted` registra a interrupção prevista por gateblocking-human; não é plano concluído. STATE permanece no plano7/7 com requisitoPending. Somente handlers SDK de sessão/blocker/decisão foram usados; sem advance-plan, mark-complete ou roadmapComplete.

Evidência operacional durável, credencial, snapshot, restore e perfil de navegador ficam privados fora do checkout. Serviço e navegador permanecem disponíveis; validade do QR deve ser conferida ao retomar. Se o budget de reconnect terminar enquanto o usuário estiver ausente, retomar o mesmo serviço/perfil após parada graciosa; nunca criar outro coletor, resetar auth ou substituir QR por fixture.

## Pendências reais

Ler QR no celular, observar conexão real, conferir recorte/conversa/grupo/direções e quatro originais, depois restart/backup/offline. VPS/domínio, backup externo recorrente e Codex-MCP seguem nas fases previstas. Proibições descriptor-less continuam flagged-unverified para julgamento no aceite; nenhuma fixture altera esse status.

## Self-Check: PASSED

Fonte/teste/README e checkpoint existem, commitf61e178 é ancestral de HEAD, ledger mede1 commit. Serviço normal/PIDs vivos, autenticação/QR real e exclusividade observados. Nenhum stub funcional, teste omitido, exclusão inesperada ou conteúdo privado no diff. Milestone.lock desconhecido preservado.

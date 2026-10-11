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
  - Conta vinculada, conexão real e diário recebido recuperado com autoria explícita
  - Quatro originais reais íntegros em HTTP, restauração offline e reinício do perfil fonte
affects: [phase-1-pilot, phase-2]
tech-stack:
  added: []
  patterns: [exclusive-collector, authenticated-loopback-qr, private-operational-evidence]
key-files:
  created: [.planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-07-CHECKPOINT.md]
  modified: [src/whatsapp.ts, src/archive.ts, src/media.ts, test/collector.test.ts, test/archive.test.ts, test/media.test.ts, README.md, .planning/STATE.md]
key-decisions:
  - "WEB_BROWSER Chrome corrige recusa428 do Desktop DARWIN no perfil/pin reais; syncFullHistory permanece true."
  - "QR e preparo técnico não concluem tarefa01-07-01 nem requisitos; pareamento pelo celular é blocking-human."
  - "Pareamento confirmado conclui somente tarefa1; proprietário ainda não conseguiu comparar o grupo no celular."
  - "Histórico rc14 contém participant no envelope WEBMessage; replay usa esse campo explícito e conserva referências e IDs anteriores."
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
    description: Conexão real, quatro originais e restore/restart comprovados; comparação humana permanece pendente
    verification:
      - kind: integration
        ref: HTTP privado do perfil fonte/restaurado e quatro IDs/bytes/SHA256 iguais
        status: pass
    human_judgment: true
    rationale: Proprietário vinculou o QR e indicou um grupo conhecido; respondeu que ainda não conseguiu comparar os itens com o celular.
actuals:
  tokens: 5483
  tasks: 1
  commits: 9
commits: 9
plan_head_before: c83f753678641c261438520149abfb5798cf75ea
plan_head_after: 9f8d2e6fbf1a595da6fef15fae095c81f3f74b47
duration: checkpoint
completed: 2026-10-10
status: halted
---

# Phase 1 Plan 7: Conta vinculada, originais restaurados e comparação pendente Summary

**Conta vinculada com ingestão real e quatro originais conferidos no disco, HTTP, restore offline e reinício sem QR. O proprietário ainda não conseguiu comparar o grupo no celular; plano permanece aberto.**

## Resultado e limite

- **Tarefas concluídas: 1/3.** Tarefa01-07-01 concluída: humano leu QR e connection.open/HTTP conectado/ingestão observados. Tarefa2 tecnicamente preparada, comparação humana pendente. Tarefa3 tem prova técnica independente de restore/restart, mas sua condição de comparação conhecida não foi satisfeita. Nenhum requisito concluído e nenhuma fase seguinte iniciada.
- O perfil padrão não existia e não havia ZAP_DATA_DIR configurado; criado perfil novo fora do checkout sem sobrescrever sessão/senha anterior. Diretórios0700, bancos/recibo/senha0600; senha aleatória por stdin, sem argv/chat/log.
- Snapshot privado do perfil realmente usado, verify-backup com SQL/FK/schema/contagens/hash e login HTTP offline passou. Nenhum coletor na cópia restaurada. Recibo autenticado do perfil fonte e preflight passaram antes de QR.
- Serviço normal `serve --collect` do produto final, com um coletor, supervisão systemd user, loopback127.0.0.1 e saídas desabilitadas para impedir logs privados. Navegador visível separado já autenticado; somente exibe site, sem WhatsApp Web no coletor.
- QR real HTTP200/DOM carregado observados no preparo anterior. Após leitura pelo proprietário, HTTP autenticado confirmou conectado, QR409/sem pareamento e ingestão; após dois reinícios necessários ao reparo/prova, mesmo perfil conectado sem novo QR. Nenhum payload/imagem/cookie/conteúdo real em Git ou relatório público.
- Segundo processo recusado pela trava antes do socket no preparo. Na conta vinculada, GET/HEAD/Range sem sessão recusados401 nos quatro IDs reais; download autenticado200 e Range206 conferidos por bytes/hash no perfil fonte e cópia offline.

## Evidência real da continuação

- Lote inicial:8.924 recebidos,8.924 confirmados,0falhas,0pendentes;8.679 mensagens distintas após recuperar6edições de grupo do diário original.470 itens reprocessados sem acrescentar lote fictício. As8.673 referências e1.668 IDs de anexos anteriores continuam presentes; alterações recuperadas acrescentam suas próprias revisões/descritores.
- Grupo indicado privadamente pelo proprietário:486 mensagens,426recebidas/60enviadas e3autores explicitamente recebidos;486 registros paginados pelo HTTP sem repetição. Nenhum nome/ID/texto real publicado. Identificação do grupo pelo humano não confirma integralidade nem comparação de cada item.
- Quatro originais reais preservados: áudio62.831B, imagem199.071B, vídeo8.304.865B e documento118.382B. SHA256 local, hash recebido da origem e bytes de GET autenticado iguais; HEAD/Range privados e Range206 conferidos. Todos eram disponíveis na fila normal após correção, sem download manual inserido no arquivo.
- Snapshot consistente posterior contém8.680 mensagens e190 originais disponíveis; fonte parada durante backup/verify/restore e consulta da cópia. Cópia serve somente `serve`, status desconectado/collectorEnabledfalse, sem socket. Mesmos4IDs/referências/bytes/hashes e486mensagens do grupo conferidos no HTTP offline. Clone parado antes de retomar único coletor fonte.
- Reinício do perfil fonte após restore: conectado sem novo QR, mesmos4originais ainda íntegros e baixáveis. Uma mensagem adicional efetivamente recebida explica8.680 no snapshot, não duplicação dos486registros do grupo. Acervo completo e categorias/chaves privadas conferidos por verify-backup, validade remota confirmada somente no perfil fonte.
- Snapshot registra17anexos indisponíveis individualmente,2retry_wait e1480pendentes; fila continua depois da retomada. Quatro amostras não aceitam todo o histórico/mídia. Alguns locators externos responderam403; outros do grupo200. Renovação suportada404/410 permanece no adapter;403 isolado não prova indisponibilidade definitiva. Nenhum bypass/viewOnce/importador.
- Evidências duráveis e scripts operacionais ficam privados fora do checkout. Provas de fonte/restaurado/reinício foram comparadas automaticamente pelos mesmos4IDs, referências, tamanhos e hashes.

## Commit de correção

- `f61e178`: fix(01-07): corrigir identificação recusada antes do QR — src/whatsapp.ts, test/collector.test.ts e README.md.
- `0315319`: RED do contrato DNS Node24; `6b8337c`: transporte fixa família4 já validada.
- `8a2fd6f`: RED de autoria/replay de envelope; `72ee356`: normaliza participante recebido e enriquece registro legado conservando referência/mídia.
- `00d4e38`: conclusão tarefa1 no README; `9f8d2e6`: quatro originais e restore/restart reais no README.
- Contagem medida do ledger até plan_head_after:9, incluindo os commits documentais anteriores76a60f8/eccac59 no intervalo. Actualtokens=5483 por chars/4 no diff das fontes/testes/README/evidências RED realizadas; não é contador do harness, nem inclui o próprio SUMMARY. Tarefas completas1.

## Verification

- Build Node24.21.0 passou. Suíte final após correções do piloto:82/82, zero failures/skips/todos,11.82s; inclui todos os alvos dos automated de tarefas2/3. Relatório completo privado fora do checkout.
- Regressão antes da correção falhou na asserção de registro: WebSubPlatform DARWIN3 versus WEB_BROWSER0. Depois passou e confere DeviceProps.requireFullSync=true; não apenas uma string de configuração.
- Revisão/QA sintéticos anteriores foram preservados. Sem nova UI ou download alterado; não repetidos. Esta etapa não converte essas evidências em aceite da conta.
- Arquivo/mídia23/23 e archive/revisions16/16 passaram nos checks focados. REDs DNS e envelope classificados RED_EVIDENCE_OK; asserções reais falharam no comportamento pretendido antes do GREEN. Sem refactor necessário.
- Preflight passou antes das retomadas. Perfil fonte HTTPconectado; cópia real HTTPoffline/semcoletor; hashes/contagens/IDs conferidos, latência de headers dos4originais~1.7–12.5ms nos ensaios locais. Isso não mede VPS nem aceitação humana.

## Deviations from Plan

**1. [Rule1 — Bug] Desktop interrompia conexão antes do QR.**
- Encontrado durante preparo01-07-01: socket real com macOS Desktop recebia428/Connection Terminated em aproximadamente0.5s, sem QR. Fetch live de versão Web sozinho não resolveu.
- Fonte rc14 getWebInfo combina platformWEB com subplatformDARWIN quando Desktop/fullSync; relato primário [upstream2677](https://github.com/WhiskeySockets/Baileys/issues/2677) descreve esse comportamento.
- Probe exclusivo no mesmo perfil/pin e versão default, mudando somente browser para macOS Chrome, emitiu QR real. Aplicada uma linha no coletor, preservando syncFullHistory/predicate e pin; nenhum browser executado pelo coletor.
- Regressão verifica payload de registro e pedido full sync; suíte79/79 e serviço normal após restart confirmaram QR. Commitf61e178. Cobertura real com essa identidade ainda precisa comparação no celular.

**2. [Rule1 — Bug] DNS validado recusado pelo contrato Node24.** Todos4tipos falhavam com ERR_INVALID_IP_ADDRESS antes do HTTP; HTTPS habilitava seleção automática de família e exigia array no lookup. Fixfamily4 mantém pinDNS/allowlist/SSRF/abort sem opção nova. RED0315319, GREEN6b8337c;4downloads reais e23testes confirmados.

**3. [Rule1 — Bug] Autor explícito do histórico ficava desconhecido e edições falhavam.** WEBMessage rc14 entrega participant no envelope; history.js preserva esse campo e não o copia para key. Fix usa fallback somente para valor recebido, conserva key.participant quando presente e perspectiva fromMe do envelope, sem copiar a perspectiva sender-relative da chave interna. Replay legado identifica participante no payload existente antes de reutilizar referência, conserva IDs/mídia e SQL/FK. RED8a2fd6f, GREEN72ee356;6falhas recuperadas e16testes passam. Reparação privada foi precedida por snapshot/restore conferidos.

O primeiro assert operacional exigia igualdade exata de IDs anexos e recusou descritores novos de edições recuperadas. Corrigido para exigir preservação de todos os IDs anteriores, mais integridade/FK; nenhuma exclusão ocorreu e não se repetiu o replay por esse assert.99jobs que haviam esgotado tentativas no transporte defeituoso foram recolocados uma única vez após o fix, sem tocar originais disponíveis.

## Checkpoint e continuidade

Ver [01-07-CHECKPOINT.md](01-07-CHECKPOINT.md). `status: halted` registra gateblocking-human da comparação da conta, não QR pendente. Humano respondeu “Ainda não consegui comparar”; não é aprovação. STATE permanece no plano7/7 e requisitosPending; sem advance-plan, mark-complete ou phaseComplete.

Evidência operacional durável, credencial, snapshot, restore e navegador ficam privados fora do checkout. Mesmo serviço/perfil permanece conectado após prova. Conservar um único coletor e os snapshots; novo QR só se houver invalidade real da sessão, nunca por presumir que o checkpoint de comparação pede pareamento.

## Pendências reais

Conferir privadamente grupo/conversa/direções/autoria/alterações e4originais existentes com o celular; falta identificação de conversa individual conhecida e comparação humana. Provas técnicas de tarefa3 já realizadas são independentes; fechamento depende do recorte aceito. VPS/domínio, backup externo recorrente e Codex-MCP seguem nas fases previstas. Proibições descriptor-less continuam flagged-unverified para julgamento no aceite; nenhuma fixture altera esse status.

## Self-Check: PASSED

Fonte/testes/README e checkpoint existem; todos os commits registrados são ancestrais de HEAD e ledger mede9 antes deste fechamento documental. Provas privadas de fonte/restaurado/reinício têm mesmos4IDs/referências/bytes/hash; clone sem coletor foi parado, perfil fonte conectado. Nenhum stub funcional, teste omitido, exclusão inesperada ou conteúdo privado no diff. Milestone.lock desconhecido preservado. Comparação humana continua explicitamente pendente.

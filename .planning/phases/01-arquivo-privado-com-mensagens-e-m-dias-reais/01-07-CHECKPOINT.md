# Checkpoint01-07-02 — comparação privada com o celular

**Type:** human-action
**Gate:** blocking-human
**Plan:** 01-07
**Progress:** 1/3 tasks complete
**Status:** proprietário ainda não conseguiu comparar as amostras

## Completed Tasks

| Task | Nome | Commit | Arquivos |
|---|---|---|---|
| 1 | QR lido, conexão e ingestão reais confirmadas | 00d4e38 | README.md |

Pareamento realizado pelo humano; HTTP privado conectado, QR409/indisponível e ingestão observados. Não pedir outro QR sem invalidade real da sessão.

## Trabalho pronto

- Lote inicial8.924 itens confirmados,0falhas/pendentes após reparo do diário recebido;8.679mensagens distintas.470itens reprocessados com participant explícito do envelope rc14, conservando8.673referências e1.668IDs anteriores. Grupo conhecido indicado pelo humano:486mensagens,426recebidas/60enviadas e3autores recebidos.
- Quatro originais do grupo disponíveis: áudio62.831B, imagem199.071B, vídeo8.304.865B e documento118.382B. Bytes/tamanho/SHA256 de origem, arquivo local e GET autenticado iguais. GET/HEAD/Range sem sessão401; Rangeautenticado206.
- Snapshot privado posterior8.680mensagens/190originais disponíveis restaurado com fonte parada. Mesmos4IDs/referências/bytes/hash e486mensagens conferidos em HTTP offline com collectorEnabledfalse. Clone parado; perfil fonte reconectou sem QR e repetiu4downloads com hashes iguais.
-82/82 testes, zero failures/skips/todos; build e preflight passaram. Fixes mínimos DNS0315319/6b8337c e envelope8a2fd6f/72ee356, com RED_EVIDENCE_OK.
- Navegador privado visível e autenticado, grupo aberto com100mensagens da página inicial; botão de mensagens anteriores conserva o restante. Detalhes da evidência mostram participante/direção/data/histórico recebido; “Baixar original” oferece os arquivos disponíveis.

## Current Task

**Task 2:** conferir conversa, grupo, direções/autoria e quatro originais conhecidos.
**Status:** aguardando comparação humana.
**Blocked by:** humano respondeu “Ainda não consegui comparar”. A indicação do grupo e as provas técnicas não substituem conhecimento do celular. Conversa individual conhecida ainda não identificada/conferida.

Ação indispensável, quando disponível: comparar privadamente os itens existentes do grupo aberto com o WhatsApp no celular, indicar divergência/faltantes ou confirmar a correspondência; conferir áudio/imagem/vídeo/documento e uma conversa individual conhecida. Não publicar conteúdo, números ou arquivos no chat público. Nenhuma mensagem precisa ser enviada para fabricar amostra.

Tarefa3 tem provas técnicas independentes de backup/restore/restart/offline já feitas, mas permanece não concluída até satisfazer a comparação conhecida e o fechamento do aceite. Não repetir por ritual testes já comprovados sem nova alteração/divergência.

## Continuidade

- Fonte local: http://127.0.0.1:3000, `zap-mcp-pilot.service`, mesmo perfil e único coletor.
- Tela privada: `zap-mcp-pilot-browser.service`, grupo aberto e sessão autenticada. Browser apenas apresenta o site; coletor não executa navegador.
- Dados, credencial, diário, snapshots e provas ficam privados fora do checkout. Checkpoint operacional persistente registra caminhos/PIDs e provas sem imprimi-los publicamente.
- SUMMARY mantém `status: halted`, requisitosPending e fase1 aberta. Limites individuais de mídia continuam explícitos; snapshot registra17indisponíveis, não indisponibilidade definitiva da conta. VPS/domínio, backup externo e Codex-MCP ainda não validados.

O SDK conta um SUMMARY `halted` como plano resumido e deriva 7/7 nos contadores, embora reconheça o plano07 como interrompido. Os marcadores locais de conclusão foram corrigidos para6/7, conservando a sessão/decisões atualizadas pelos handlers. Não usar existência do SUMMARY ou esse contador derivado como aceite: o plano07 tem1/3 tarefas concluídas e exige a comparação humana registrada acima.

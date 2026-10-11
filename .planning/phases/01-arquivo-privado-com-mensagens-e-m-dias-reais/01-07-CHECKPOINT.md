# Checkpoint01-07-01 — pareamento pelo celular

**Type:** human-action
**Gate:** blocking-human
**Plan:** 01-07
**Progress:** 0/3 tasks complete
**Status:** aguardando leitura do QR pelo proprietário

## Trabalho preparado

Perfil persistente privado novo, senha forte por stdin e arquivos privados; snapshot/restore do perfil fonte e preflight passaram antes do socket. Um serviço normal Node24/Baileysrc14 supervisionado em loopback, navegador visível já autenticado e QR real atual renderizado. HTTP sem sessão e processo concorrente recusados. Evidências/credenciais/QR permanecem privadas fora do checkout.

Correçãof61e178 troca somente a identidade de protocolo recusada pelo servidor, preserva fullSync e coleta sem navegador;79/79 testes passam. A tarefa do plano ainda não concluiu: conexão da conta não observada, amostras/restart reais pendentes. SUMMARY tem statushalted e requirements-completed[].

## Serviço de retomada

- URL local: http://127.0.0.1:3000
- Serviço: `zap-mcp-pilot.service`; comando normal `mise exec node@24.21.0 -- node dist/src/main.js serve --collect`.
- Navegador privado já autenticado: `zap-mcp-pilot-browser.service`.
- A supervisão local permanece disponível nesta sessão; não é implantação/aceite na VPS. O agente confere unit/PID e QR vigente antes de retomar. Se o QR/budget expirar, o agente renova o mesmo serviço/perfil sem remover a trava nem iniciar segundo coletor.

## Ação indispensável

No WhatsApp do celular: **Dispositivos conectados → Conectar dispositivo → ler o QR vigente na tela privada já aberta**. Responder quando tiver sido lido; o agente confere connection.open/estado e início de ingestão. QR ou pareamento isolado não aceitam os requisitos de sincronização/mídia.

Depois, o plano pede comparação privada de conversa/grupo/direções e quatro originais existentes conhecidos; somente então testes de restart/offline/novo backup. Nenhuma mensagem enviada/editada/apagada ou marcada como lida pelo Zap MCP.

## Limites

Tarefas01-07-02/03 não iniciadas. Conta/cobertura/quatro originais/restart remoto e VPS/Codex reais ainda não validados. A disponibilidade do celular é satisfeita pelo proprietário no checkpoint; não foi presumida como conexão já realizada.

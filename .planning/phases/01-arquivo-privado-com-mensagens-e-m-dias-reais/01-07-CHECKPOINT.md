# Continuidade do plano 01-07

Atualizado em 2026-10-11. **Três tarefas operacionais concluídas; verificação final da meta pendente. Nenhuma intervenção do proprietário pendente.**

## Instrução atual

O usuário autorizou comparar autonomamente com WhatsApp Web já vinculado no Chrome e dispensou a conferência manual no celular. D-20, Plano07 e SYNC-03 refletem essa instrução posterior. Não pedir a comparação pelo celular novamente. O QR já foi lido e a conexão confirmada.

## Evidência concluída

- Conversa individual indicada: 26 mensagens comuns correlacionadas por ID;21 textos coincidem,20 datas originais coincidem e23 direções comparáveis coincidem. Uma edição não recebeu o instante original; horário da alteração coincide com Web e permanece separado. Uma notificação de fixação e três posições de mídia sem direção visível não foram aprovadas por inferência.
- Grupo indicado:27 IDs correlacionados; dez datas e sete identidades de autores comparáveis conferidas. Oito de dez corpos coincidem literalmente; duas diferenças de apresentação envolvem menção/nome e formatação/trecho expandido. Texto bruto e citação recebidos permanecem preservados, sem prometer igualdade literal com renderização do Web.
- Áudio, imagem, vídeo e documento encontrados no Web pelos mesmos IDs de origem e controles do respectivo tipo; horários visíveis de áudio/vídeo coincidem. Tamanho/hash recebido da origem, disco, HTTP autenticado e restore comprovam os quatro originais. Bytes baixados diretamente do Web não foram confirmados; duas tentativas de captura do download do documento expiraram.
- Reparo de repetição de originais:244 projeções recuperadas ao reprocessar313 itens já recebidos, preservando referências, revisões, IDs de anexos e828 originais disponíveis; dois conflitos reais ou sem prova de equivalência continuam explícitos. Backup privado conferido precedeu o reparo.
- Download após o reparo no Chrome normal: áudio de33.529 bytes, hash igual ao acervo e página ainda funcionando. Rótulo de direção corrigido para “Enviada por você”, sem inferir dispositivo de envio.
- Nova cópia pós-reparo:8.684 mensagens e828 originais disponíveis. Todos os registros comparados de mensagens/revisões/anexos/fila/lotes/itens iguais à fonte parada; SQL/FK, login, paginação e downloads autenticados offline conferidos. Quatro IDs/referências/tamanhos/hashes originais preservados. Nenhum segundo coletor na restauração.
- Três mensagens novas entre cópias: duas enviadas pela própria conta e uma recebida, sem envio pelo Zap MCP. Único coletor reiniciou no mesmo perfil, conectado sem novo QR.
- Suíte completa anterior à mudança textual:86/86. Revisão incremental atual:12/12 testes e29 verificações adversariais, nenhum achado novo. Ledger anterior: cinco corrigidos, zero abertos.

## Crash e navegador

O coredump de Chromium pertence ao navegador auxiliar separado usado para apresentar o piloto. SIGSEGV confirmado; nenhum OOM encontrado, símbolos insuficientes para determinar a causa nativa exata. Não houve alteração global de Chrome/GPU. O auxiliar não deve ser relançado; usar Chrome do proprietário para o site e Web somente como referência de comparação. O coletor continua Baileys sem navegador.

A política de navegação recusou chrome://downloads/ por admitir HTTP/HTTPS; não houve contorno por CDP/perfil/histórico. Capturas de tela do cabeçalho por API suportada expiraram; nenhuma imagem foi rotulada como evidência.

## Retomada

Fonte local: http://127.0.0.1:3000, zap-mcp-pilot.service, um coletor. Caminhos, credencial, PIDs, snapshots e provas detalhadas estão no checkpoint operacional privado fora do checkout; não imprimir ou versionar seu conteúdo. O browser auxiliar foi retirado das instruções operacionais.

Próxima etapa: controles Nyquist/segurança/UI e verificação da meta da fase, depois reconciliar requisitos/ROADMAP/STATE com o veredito. Não repetir QR, reparo ou planos01–06. Não avançar à fase2 antes dos controles; VPS, backup externo e MCP continuam nas fases respectivas. Limites de histórico e mídia permanecem explícitos.

Controles prévios ao verificador: Nyquist validado com zero lacunas automatizadas;17 ameaças planejadas mitigadas/zero abertas no nível1; UI22/24 sem blocker, dois warnings menores corrigidos e assertivas CUA atuais passaram. Build atual e13 testes auth/HTTP/security/readonly passaram em6,92s. Gate TDD:4 planos, zero violações. Gate de regressão cruzada não aplicável à primeira fase.

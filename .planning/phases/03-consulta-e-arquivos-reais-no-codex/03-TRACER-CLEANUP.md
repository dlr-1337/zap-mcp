# Correção do cleanup do tracer — fase 03

O primeiro verificador encontrou um resíduo concreto no clone offline: o tracer posterior ao aceite integrado deixava bearer temporário válido e seu arquivo após encerrar o listener. Não houve exposição pública identificada, e a revogação do recibo integrado17:13 permaneceu comprovada. O resíduo posterior não foi omitido nem tratado como configuração permanente.

## Correção e RED/GREEN

- RED99988d5: cinco caminhos executaram o callback compilado atual do tracer com SQLite/serviço reais e falharam na assertion de bearer ainda ativo. O controle de retorno normal pula o corpo do cliente e nunca fabrica recibo real.
- Um sexto caso, leitura do token, também falhou antes do ajuste final; evidência adicional em03-tracer-cleanup-red.json. AmbosREDs receberam classificação semântica RED_EVIDENCE_OK.
- GREENe6040da: propriedade dos recursos coberta desde a primeira mutação. Captura o estado MCP anterior, restaura esse estado no finally, remove o token publicado mesmo quando a leitura falha, verifica autenticação recusada e HTTP401 antes de encerrar o listener. Serviço/listener fecham independentemente da falha anterior. Grant anterior deliberado é preservado.
- Seis controles: inspeção do original, TLS, publicação do token, leitura do token, falha do Codex e retorno normal. Verificam bearer recusado, arquivo removido, lock/banco/listener fechados e estado anterior preservado. Fixtures sintéticas não contam como conta/cliente real.

## Evidência real e recuperação

Em2026-10-12T19:46:36.692Z foram removidas3chaves temporárias e6arquivos de token dos diretórios de tentativa; o bearer correspondente recebeuHTTP401. A nova execução real terminou em2026-10-12T19:51:23.244Z: Codex0.162.1/protocolo2025-06-18,TLSpositivo/negativo,dois originais4200/271485bytes com SHA iguais,1/1test,exit0normal conforme retorno do executor antes da interrupção. O próprio finally comprovouauthnull/HTTP401,baseline0 e arquivo ausente.

A recuperação do daemon encontrou a alteraçãoGREEN e o resultado concluídos, semcommit/resumo de fechamento. A suíte antiga não estava em execução; foi repetida independentemente no checkout atual:190/190,exit0normal,zero fail/cancel/skip/todo,96806,345933ms,timeout600s/TMPDIRprivadohome. Focused46/46em9832,89881ms; logdoexecutorfull190/190em98587,451819ms. Logs privados/ignorados: dist/03-tracer-cleanup-focused.log,dist/03-tracer-cleanup-full.log,dist/03-tracer-cleanup-real.log e suite-root-cleanup-recovery.log.

Uma conferência posterior ao reinício encontrou2tokens de protótipos anteriores fora dos diretóriosattempt,ambos já inválidos com0chaves no banco. Foram removidos em2026-10-12T20:03:41.692397Z, sem remover outros artefatos. Conferência atual em toda a área de prova:0chavesMCP e0arquivos token-*.

Archive/projeções primárias,whatsapp_profile/keys,webowner/config e TOMLglobal permaneceram iguais aos snapshots privados anteriores. Casos,CA/certificados necessários à reprodução,recibos,transcrições e binários foram preservados. Nenhum acesso de escrita à fonte viva/socket,novo coletor/pareamento ou endpoint permanente foi criado. O recibo integrado12calls às17:13 foi preservado; as consultas/produto não mudaram e não foi representado como nova execução desta correção.

Evidência sanitizada:03-TRACER-CLEANUP.json. A prova completa e os snapshots ficam privados. A verificação independente final ainda decide a fase; nenhuma linha MCP foi marcada neste fechamento.

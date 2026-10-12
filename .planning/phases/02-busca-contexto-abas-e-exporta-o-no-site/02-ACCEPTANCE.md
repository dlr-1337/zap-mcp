# Phase 2 — Aceite executado, evidência sanitizada

Este relatório registra execução do agente; o veredito independente da fase permanece pendente. Nenhum conteúdo, identidade, nome de arquivo, caminho de operação ou hash real deve entrar neste documento/Git.

## Arquivo real offline

- Snapshot privado da Phase1 validado: 8.684 mensagens. Recibo autenticado e perfil vinculado conferidos somente em memória; fonte original intacta.
- Restauração nova privada (0700), relatório0600 fora do checkout; `createService` sem coletor/socket/QR, somente loopback. Senha alterada exclusivamente na cópia descartável.
- Caso real selecionado por SQL independente: conversa1.037 mensagens; período civil explícito inclui1.028, excluindo nove instantes desconhecidos. Busca paginada e contexto bidirecional conferidos por sequência de referências e metadados; candidato selecionado porID, termo e filename recebidos localizados.
- ZIP1.028mensagens,190originais,112faltantes,1.088revisões e40citações. Conjunto exato de entradas, cada tamanho/SHA contra bytes do snapshot, filtro UTC/calendário independente ICU, versões/vínculos/PN-LID/ordem e `unzip -t` conferidos. Texto conserva todas as referências. Campos indisponíveis continuam explícitos; nenhum negócio foi inferido só por termo.
- Quatro downloads HTTP reais (imagem/áudio/vídeo/documento) conferidos por bytes/tamanho/hash. Autenticação ausente401 em busca/contexto/período/original. Snapshot revalidado ao terminar; nenhum segundo coletor.
- O exemplo João existe entre os candidatos; o roteiro usa amostra real conhecida selecionada por SQL para cobrir formatos/faltantes. Presença do nome não identifica uma negociação ou confirma acordo.
- Self-check sintético2/2: origem sintética, falta de prova, recorte<=100/truncado/duplicado, metadados divergentes, faltante omitido, tamanho/hash incorreto e coletor ativo são recusados. Fixture serve apenas para validar o roteiro.

Prova privada rotulada **P2-OFFLINE**: report.json e offline.zip no diretório novo privado da execução; índice privado latest-real-offline.json ao lado do caso. Apenas agregados são públicos. O restore descartável foi removido após fechar servidor/banco/trava.

## Browser real

- Chromium152.0.7977.82/Playwright do bundle existente, sem instalar dependência. Mesma cópia privada sem coletor; candidato porID→termo/período→âncora com UTC original.
- Duas conversas reais conservaram texto/DOM e scroll próprios; setas/Home/End moveram foco, Enter ativou e Delete fechou. Conteúdo não foi persistido em localStorage/sessionStorage. Zero GET de preview antes de ação.
- JPEG real decodificado; áudio em containerOgg e vídeoMP4 reais reproduzidos por controles nativos com currentTime>0 e videoWidth>0. Documento seguiu download. Esses containers/MIME foram conferidos no caso privado; não se afirma suporte universal a seus codecs. Quatro downloads nativos concluídos (`download.failure()===null`, saveAs) com tamanho/SHA igual aos originais preservados.
- ZIP do browser, além da página visível:1.028mensagens/190arquivos/112faltantes, mesmas refs/UTC/citações/versões/bytes e conjunto exato conferidos contra SQL/files; unzip -t0.
- Layout sem overflow do documento em320/768/1280 e fonte200%. Capturas reais0600 privadas; não publicadas. Fonte200% não é zoom nativo; nenhum dispositivo físico foi testado.
- Logout venceu resposta real de contexto retida, limpando abas/resultados/players/src/downloads. Estados hostis/faults/TTL/bfcache/codecs deliberadamente não suportados são cobertos pelas fixtures, discriminadas na matriz final.
- Prova privada **P2-BROWSER**: report.json, browser.zip, quatro originais efetivamente baixados e capturas do diretório de execução; índice latest-real-browser.json ao lado do caso. Nenhum aceite humano ou avaliação semântica de negociação é presumido.
- Self-check3/3 e focados acceptance/ui16/16 passaram. O primeiro browser-run parou por seletor do roteiro consultar preview no resultado em vez do leitor; seletor confinado a #messages corrigido e prova real repetida passou. Produto intacto.

## Limites

Cobertura limitada ao que foi recebido; não é histórico integral. MCP/Codex, VPS/HTTPS e backup externo são fases posteriores. Dados sintéticos não validam conta real. Requisitos globais permanecem pendentes do verificador.

## Atualização local recuperável

- Serviço original identificado antes de alterar, comando/ambiente/propriedades guardados privadamente. SIGTERM/encerramento limpo, MainPID0 e service.lock ausente precederam backup; nenhuma coleta concorrente.
- Novo snapshot validado:8.771mensagens/853originais. Restore isolado sem coleta conferido e aplicação anterior da Phase1 compilada em diretório privado para recuperação. Sete tabelas primárias comparadas integralmente com a fonte parada; nenhuma divergência.
- A unidade temporária systemd-run desapareceu ao parar; recriada com mesmo nome, comando Node24/serve --collect, ambiente, diretório e propriedades originais. Perfil e credenciais originais preservados. Um MainPID ativo; nenhum segundo coletor.
- Todas referências antigas presentes após iniciar, contagem8.771 preservada, índice/derivados FTS presentes, JS da fase2 entregue e cinco rotas novas401 sem sessão. Senha do proprietário e chave da identidade iguais ao backup.
- A senha original não estava disponível e havia zero sessões web válidas. Login/consulta autenticada e mídia da cópia offline foram verificados; o status/conexão/reconexão da instância original não foi autenticadamente observado. Dados salvos da sessão estão presentes, mas isso não prova conexão atual nem retomada sem QR. Não houve reset da senha original, bypass, rota administrativa nova ou novo QR.
- Prova privada **P2-SERVICE**: service-result.json, recovery.json, snapshot atual/restore e aplicação anterior; foraGit. Falha inicial de start registrada privadamente e resolvida pela recriação da unidade transitória. Dados fonte/backup nunca removidos.

## Matriz de decisões e requisitos

| IDs | Prova executada | Origem / limite |
|---|---|---|
| D-01..D-04 / WEB-02 | candidato porID, termo/filename/período e sequência exata de páginas; homônimos/ANDliteral/revisões separadas | SQL+HTTP+browser reais; homônimos e revisão conflitante também fixtures search/ui |
| D-05..D-07 / EVID-02,WEB-03 | limites UTC por calendárioICU independente, noveunknown excluídos, instante original e páginas completas | real; DST23/25h, empates/retroativo/merge em search/context/export fixtures |
| D-08 / WEB-03 | contexto1.037refs, âncoraUTC,40citações e1.088versões no recorte exportado | real SQL/HTTP/DOM; redirects/restricted/cursor/TTL nas fixtures |
| D-09..D-12 / WEB-04 | duas conversas reais, scroll/hashDOM, foco/teclado/close, storagevazio, logout vence contexto retido | real browser; demais races/expire/bfcache/refreshB fixtures ui/context/auth |
| D-13..D-16 / WEB-05 | imagem decodificada, áudio/vídeo reproduzidos,4downloads completos/hashigual, faltantes separados | real; MPEG-4Part2 sem suporte, HTML/SVG/MIME/Range/fd abort fixtures preview/ui |
| D-17..D-20 / EXP-01,EXP-02,EXP-03 | ZIP além da página,1.028refs/190originais/112faltantes, ordem/UTC/vínculos/revisões/conjunto/bytes conferidos | real SQL/files/HTTP/browser; nomes iguais/CRC/ENOSPC/7faultpoints/SIGKILL3pontos fixtures export |
| PRIV-02/PRIV-03 revalidados | authdireta/CSRF/Origin/sessão/XSS/traversal/readonly, zero operações WhatsApp | rotas reais401 e cópias sem coletor; tentativas negativas/fault com fixtures |

## UC-01..UC-49 — trilha DOM executada

Os critérios normativos permanecem em02-UI-SPEC.md. Cada grupo abaixo identifica todos os IDs e o teste executado; estados impossíveis de exigir de uma conta real são marcados como fixture.

| IDs | Evidência | Origem |
|---|---|---|
| UC-01,UC-02,UC-03,UC-04,UC-05,UC-06,UC-07,UC-08 | ui: DOM candidatos zero um falha buscas loading termos inválidos e logout recusam resposta antiga; contatos homônimos e estadosUC01aUC22 | fixture DOM; candidato real porID/populado/reflow |
| UC-09,UC-10,UC-11,UC-12,UC-13,UC-14 | ui: contatos homônimos e estadosUC01aUC22; search: calendário estrito limites abertos originalnull eDate.max | fixture; alcance/períodoUTC/reflow real |
| UC-15,UC-16,UC-17,UC-18,UC-19,UC-20,UC-21,UC-22 | ui: site encontra termo literal em evidência congelada; contatos homônimos e estadosUC01aUC22; search empates/continuação | fixture; resultados/paginação/âncora real |
| UC-23,UC-24,UC-25,UC-26,UC-27,UC-28,UC-29,UC-30 | ui: resultado distante abre âncora e duas leituras independentes; abas usam teclado foco separado fechamento scroll e reflowUC23aUC34 | fixture; contextoUTC/citação/posição real |
| UC-31,UC-32,UC-33,UC-34 | ui: resposta retida deA não ativaA sobreB; logout vence resposta de contexto retida e bfcache exige sessão atual; teclado/reflowUC23aUC34 | fixture; A/Bscroll,teclado,Delete,logoutretido e reflow reais |
| UC-35,UC-36,UC-37,UC-38,UC-39 | ui: players nativos sob ação fallback e estadosUC35aUC39; HEADretido close switch logout expiração e pagehide impedem GETtardio | fixture; JPEG/áudio/vídeo reais e quatrooriginais/hash |
| UC-40,UC-41,UC-42,UC-43,UC-44,UC-45 | ui: exportação mostra período efetivo e recupera polling sem misturar abasUC40aUC49 | fixture; formulário/período próprio UTC,ZIP completo/reflow real |
| UC-46,UC-47,UC-48,UC-49 | ui: logout vence status de exportação retido; exportação mostra período efetivo e recupera polling sem misturar abasUC40aUC49; export SIGKILL/fault | fixture; statusready somente apósZIP conferido e downloadfinished real |

## Fechamento executado

`mise exec node@24.21.0 -- npm test`:130/130,0fail/skip/todo,39,740s; log sintético ignorado dist/02-05-full-tests.log. Self-checks3/3; subsetacceptance/ui16/16,31,335s. Ambos modos reais executados no checkout corrente; browser final repetido após confinar seletores ao leitor e fortalecer completude do oráculo. Nenhuma instalação, push/PR, VPS ou fase seguinte. Ledger15tarefas/42edges/49UC e7proibições rastreáveis em02-VALIDATION.md; code/security/UI review e gsd-verifier independentes ficam com o orquestrador.

## Apêndice final após correções da revisão — 2026-10-11

Fonte integrada `79faf03`, incluindo `a4e3c66` (bloqueio de restrições atuais em leitores/originais/ZIP), `b7a41c9` (retomada de leituras e exportação idempotente por requestId) e `79faf03` (localização Unicode NFC/NFD/pt-BR). O histórico de130 testes acima permanece como prova da primeira entrega; o resultado atual é **138/138,0fail/skip/todo,58,871s**, executado pelo orquestrador no checkout principal, log ignorado `dist/02-final-tests.log`.

O roteiro existente foi repetido uma vez em cada modo com o build integrado, sem alterar script/testes/oráculo: real-offline encerrou2026-10-12T01:15:44.959Z e real-browser2026-10-12T01:16:40.511Z (dia11 emAmerica/Sao_Paulo). Snapshot conhecido revalidado8.684mensagens; consulta/ZIP preservam **1.028mensagens/190originais/112faltantes,1.088versões/40citações**, referência/ordem/UTC/citações/versões/conjunto exato e SHA/tamanho de cada entrada contra SQL/files independentes. Quatrooriginais HTTP/browserfinished/hashigual, JPEG decodificado/Ogg eMP4 reproduzidos/documentdownloadonly, A/Bscroll/DOM/teclado/logoutretido/storage/reflow e ZIP além da página passaram. Nenhum segundo coletor/QR na cópia; nenhuma inferência de negócio. Provas finaisP2-OFFLINE/P2-BROWSER substituem apenas os índices privadoslatest-real-*; relatórios/ZIP/capturas antigos continuam preservados0600 foraGit.

O backend local, que mantinha módulos anteriores em memória, foi reiniciado após novo encerramento limpo/MainPID anterior encerrado/trava liberada. Antes de aplicar o build, foi criado e validado snapshotfresh **8.775mensagens/853originais**, restaurado isoladamente sem coleta e compilada a aplicação anterior às correções para recuperação. Sete tabelas primárias iguais ao snapshot com a fonte parada. Unidade transitória recriada com **comando,Environment,WorkingDirectory,Restart eTimeoutStop exatamente iguais** aos registros prévios; perfil original preservado.

Após iniciar: todas referências anteriores presentes, primeira contagem8.775, senha do proprietário e chave da identidade iguais ao backup, **853binários conferidos novamente por tamanho/SHA**, um processo coletor exato para o mesmo perfil e cincoGETs privados401; POST/api/exports comrequestId e sem credencial também401. Backend atual contém os caminhos requestId/unicode_lower/bloqueio de restrição, já exercitados na cópia e testes. Contagem posterior8.778: mensagens/origins/revisions/batches/batch_items receberam três linhas adicionais; attachments1840 emedia_jobs1839 permaneceram iguais. Isso não altera o recorte de aceite congelado nem comprova histórico integral/status autenticado da conexão.

Prova operacional final **P2-SERVICE-REVIEW**: service-reviewed-result.json, recovery-reviewed.json, configuração anterior e snapshot/restore/aplicação de recuperação privados. Senha original indisponível e status da conexão/reconexão original continuam **sem confirmação autenticada**; não houve reset/bypass ou novoQR. Apenas estes dois documentos receberam apêndice; STATE/ROADMAP/SUMMARY/requisitos não foram evoluídos nesta rodada. Sem VPS/push/PR/fase seguinte.

## Reteste final das correções adicionais — 2026-10-11

O código final `1a5b7c8` inclui revogação durante streaming do ZIP (`ca234cb`/CR-03), retomada da exportação após redirects de conversa (`5c796eb`/WR-02) e bloqueio também do consumo de originais/previews já em buffer (`1a5b7c8`/CR-04). As suítes anteriores de 130 e 138 testes permanecem históricas. Resultado atual confirmado no checkout principal: **143/143, zero falhas/cancelados/skips/todos, 38,366s**, em `dist/02-final-tests.log`. A suíte foi executada pelo orquestrador; esta rodada operacional não a repetiu nem alterou produto/testes/oráculo.

**P2-OFFLINE-FINAL / P2-BROWSER-FINAL:** roteiro existente aprovado uma vez em cada modo, com os mesmos caso e snapshot privados conhecidos, encerrando respectivamente 2026-10-12T02:30:25.884Z e02:31:23.271Z (dia 11 local). Snapshot de 8.684 mensagens; consulta/ZIP preservam **1.028 mensagens, 190 originais, 112 faltantes, 1.088 versões e 40 citações**. SQL/ICU/bytes independentes conferiram referências, IDs, ordem, UTC, versões, citações, PN/LID, entradas exatas e cada tamanho/SHA. Quatro downloads HTTP/nativos, imagem decodificada, áudio/vídeo reproduzidos, documento por download, duas leituras/scroll/teclado/logout retido/storage vazio/reflow e ZIP além da página passaram. Ambas cópias ficaram sem coletor/socket/QR; fonte e snapshot preservados. Relatórios, arquivos e capturas 0600 permanecem privados, com destinos 0700 fora do checkout; índices latest-real-* atualizados e provas anteriores preservadas.

A primeira tentativa offline no destino temporário anterior foi recusada antes da produção de prova, com mensagem genérica. Checagens de leitura do snapshot/reciboHMAC/digest/identidade/período/âncora passaram; a causa interna não foi registrada pelo roteiro e **não está comprovada**. A hipótese operacional de espaço motivou destino novo na partição/home com reserva suficiente, sem reduzir checks ou apagar backups. A execução nesse destino passou; nenhuma falha foi convertida em aceite e os modos aprovados não foram repetidos novamente.

**P2-SERVICE-FINAL:** fallback da versão realmente em execução antes destas correções (`79faf03`) compilado/inventariado em privado antes da mudança. Encerramento limpo do processo original e liberação normal da trava precederam snapshot fresh validado **8.792 mensagens/856 originais**. Snapshot e restauração nova ficaram na partição/home, em diretórios privados; restore conferido sem segundo coletor. Sete tabelas primárias iguais com a fonte parada. A unidade transitória foi recriada com comando/argumentos, Environment, WorkingDirectory, Restart  e TimeoutStop exatamente preservados.

Verificação após reinício encerrada 2026-10-12T02:34:24.124Z, exit 0: **8.792 mensagens**, todas as referências antigas e seus rowids preservados, IDs/chaves primárias das sete tabelas preservados, índice pronto, **856 originais disponíveis conferidos por SHA/tamanho/owner/permissões privadas**, senha/salt/hash do proprietário e chave de identidade iguais ao backup. Um único processo coletor exato; cinco GETs privados  e POST export com requestId retornaram 401 sem credencial. A verificação inicial adicional produziu falso negativo porque `SELECT rowid,*` devolve a coluna como `id` emINTEGER PRIMARY KEY; alias explícito no script privado confirmou todos os IDs, sem perda ou alteração de acervo. O serviço permaneceu ativo durante essa correção do diagnóstico; não houve segundo reinício.

Provas operacionais são identificadas por service-final-result.json, recovery-final.json e configuração/fallback privados, preservando também a recusa inicial e o diagnóstico. **Conexão/reconexão original continuam sem confirmação autenticada**: senha original indisponível, sem reset/bypass/novo pareamento; processo, sessão salva e contagens não substituem essa prova. Sem VPS/MCP, escrita WhatsApp, instalação, push ou mudança em STATE/ROADMAP/SUMMARY/requisitos. Zoom nativo e dispositivos físicos continuam sem teste. Estes dois documentos registram evidência para o verificador independente e não fecham a fase.

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
- Imagem real decodificada; áudio e vídeo reais reproduzidos por controles nativos com currentTime>0 e videoWidth>0. Documento seguiu download. Quatro downloads nativos concluídos (`download.failure()===null`, saveAs) com tamanho/SHA igual aos originais preservados.
- ZIP do browser, além da página visível:1.028mensagens/190arquivos/112faltantes, mesmas refs/UTC/citações/versões/bytes e conjunto exato conferidos contra SQL/files; unzip -t0.
- Layout sem overflow do documento em320/768/1280 e fonte200%. Capturas reais0600 privadas; não publicadas. Fonte200% não é zoom nativo; nenhum dispositivo físico foi testado.
- Logout venceu resposta real de contexto retida, limpando abas/resultados/players/src/downloads. Estados hostis/faults/TTL/bfcache/codecs deliberadamente não suportados são cobertos pelas fixtures, discriminadas na matriz final.
- Prova privada **P2-BROWSER**: report.json, browser.zip, quatro originais efetivamente baixados e capturas do diretório de execução; índice latest-real-browser.json ao lado do caso. Nenhum aceite humano ou avaliação semântica de negociação é presumido.
- Self-check3/3 e focados acceptance/ui16/16 passaram. O primeiro browser-run parou por seletor do roteiro consultar preview no resultado em vez do leitor; seletor confinado a #messages corrigido e prova real repetida passou. Produto intacto.

## Limites

Cobertura limitada ao que foi recebido; não é histórico integral. MCP/Codex, VPS/HTTPS e backup externo são fases posteriores. Dados sintéticos não validam conta real. Requisitos globais permanecem pendentes do verificador.

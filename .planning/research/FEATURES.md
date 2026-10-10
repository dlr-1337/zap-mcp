# Pesquisa de funcionalidades — Zap MCP

**Domínio:** arquivo privado de WhatsApp, uma conta e um proprietário, com consulta pelo site e MCP.
**Pesquisado em:** 2026-10-10
**Confiança:** MEDIUM, conforme `classify-confidence` para Context7 e pesquisa web verificada. Requisitos vêm de PROJECT.md; comportamentos propostos abaixo são critérios de produto, não capacidades já implementadas.

## Direção recomendada

Construir um arquivo consultável com evidências suficientes para responder: “Leia minha conversa com João, encontre o orçamento e me diga o que ficou combinado”. O produto entrega registros e contexto; o Codex do usuário faz a interpretação. Busca textual, autoria, respostas citadas e anexos disponíveis resolvem esse caso sem um chatbot próprio. A clarificação mais recente prioriza exclusivamente o Codex no v1; Claude fica como compatibilidade futura opcional.

O WhatsApp informa que nem todas as mensagens e conversas sincronizam para dispositivos vinculados. Portanto, a primeira e a última mensagem observadas delimitam o acervo recebido, sem provar continuidade ou completude. A disponibilidade na conta real precisa ser medida no piloto. [WhatsApp — histórico em dispositivos vinculados](https://faq.whatsapp.com/653480766448040/).

Os mantenedores do Baileys documentam sincronização inicial e solicitação adicional de histórico ao dispositivo principal. Documentam também download de mídia e tentativa de renovação quando outro dispositivo ainda a possui; isso não garante recuperar um arquivo ausente. A aplicação deve guardar os bytes recebidos e registrar falhas. [Histórico](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/history-sync.md), [mídias](https://github.com/WhiskeySockets/Baileys/blob/master/README.md#downloading-media-messages).

## Requisitos explícitos — capacidades mínimas do v1

Todos são P1. Complexidade representa o trabalho esperado, não uma estimativa de prazo.

| ID / capacidade | Por que é necessária | Complexidade | Comportamento observável para aceite | Dependências |
|---|---|---|---|---|
| F1 — Vincular sem navegador | Receber dados da conta pessoal na VPS | Alta | Pareamento pelo celular conecta o serviço sem Chromium/WhatsApp Web aberto; reiniciar o serviço mantém a sessão ou informa claramente a necessidade de novo vínculo | Persistência privada da sessão; celular disponível no pareamento |
| F2 — Sincronizar e continuar arquivando | Criar o acervo e receber novas mensagens | Alta | Histórico efetivamente entregue e atualizações aparecem; repetir um lote/reconectar não duplica mensagens; estado distingue conexão ativa, importação em andamento e falha | F1; identidade estável; persistência |
| F3 — Preservar contexto e autoria | Evitar atribuir a João uma proposta enviada pelo proprietário | Alta | Mensagens recebidas e enviadas mostram autor, conversa e data; grupos distinguem participantes; respostas citadas apontam ao original disponível ou indicam original ausente | F2; contrato de evidência descrito abaixo |
| F4 — Guardar áudio, imagem, vídeo e documento reais | Conservar orçamento em PDF e material negociado | Alta | Um arquivo disponível de cada categoria pode ser baixado depois de desconectar o WhatsApp; seu vínculo à mensagem persiste; download interrompido não é marcado como concluído | F2/F3; armazenamento; estados de disponibilidade |
| F5 — Buscar contato, texto e período | Encontrar o orçamento sem reler todo o acervo | Média | Busca por João permite distinguir contatos homônimos; filtros combinados retornam apenas mensagens da conversa/período escolhidos; resultado abre a mensagem com contexto anterior/posterior | F3; índices; paginação; regras de fuso |
| F6 — Ler conversas em várias abas | Comparar negociações mantendo a posição | Média | Abrir João e outra conversa em abas do site preserva seleção e posição de cada uma; fechar uma não fecha a outra; URL da mensagem também abre em nova aba do navegador | F5; navegação por conversa e mensagem |
| F7 — Visualizar e baixar anexos | Inspecionar o material encontrado | Média | Imagens e formatos de áudio/vídeo suportados pelo navegador são exibidos/reproduzidos; documentos e formatos não suportados têm download do original; arquivo ausente mostra seu estado | F4; acesso autenticado a arquivos |
| F8 — Exportar mensagens COM arquivos disponíveis | Levar o contexto e os documentos juntos | Média | Exportar uma conversa ou período gera ZIP com mensagens legíveis, arquivos e manifesto ligando cada anexo à mensagem; nenhuma mídia faltante desaparece silenciosamente do relatório | F3/F4; recorte definido; exportação completa do recorte, não só da página visível |
| F9 — Consultar por MCP autenticado e somente leitura | O Codex do usuário analisar o mesmo acervo | Alta | No Codex instalado do usuário, localizar João, buscar orçamento, ler contexto e recuperar um anexo funciona; credencial inválida é recusada; não há ferramentas de enviar, editar, apagar ou marcar mensagens como lidas | F3–F5; autenticação; respostas limitadas; validação com o Codex real |
| F10 — Manter arquivo privado e recuperável | Continuar consultando apesar de queda ou atualização | Média | Sem login não se obtém conversa, QR, anexo ou exportação; queda do WhatsApp mantém consulta aos dados salvos; reinício e restauração de backup recuperam mensagens e arquivos | Persistência; proteção das superfícies; backup de banco, arquivos e sessão |

Busca no v1 cobre textos recebidos, legendas e nomes de arquivo quando fornecidos. Não pesquisar palavras faladas em áudios nem texto dentro de imagens/PDFs sem mecanismo de extração; a interface deve tornar esse alcance claro.

## Salvaguardas necessárias — fazem parte do MVP

São decisões derivadas do valor central e dos limites documentados, separadas dos pedidos explícitos. Têm prioridade P1.

| Salvaguarda | Critério verificável | Dependência / consequência |
|---|---|---|
| Identidade da origem | Site, exportação e MCP preservam ID da mensagem na origem, identidade da conversa e do autor; nomes iguais não mesclam pessoas; reprocessamento mantém o mesmo registro | F2/F3; não usar nome de exibição como identidade |
| Contexto citado | A referência da resposta e o trecho citado recebido são preservados; se o original não existe no acervo, isso aparece explicitamente | F3; trecho citado não equivale a recuperar o original integral |
| Datas sem ambiguidade | Instante da mensagem é preservado; UI usa America/Sao_Paulo e indica o fuso; exportação/MCP entregam data com offset ou UTC e fuso do filtro; mensagem à meia-noite entra no período correto | F3/F5/F8/F9; data de ingestão não substitui data da mensagem |
| Cobertura observada | Mostrar última sincronização bem-sucedida, extremos observados e falhas conhecidas; busca vazia diz “não encontrado no acervo”; terminar a importação não produz selo “histórico completo” | F2/F5/F9; não detectar uma lacuna não prova ausência dela |
| Estado de mídia | Separar disponível, pendente, falha recuperável e indisponível/não recuperada; guardar motivo conhecido e tentativa; só disponível permite afirmar que os bytes foram persistidos | F4/F7/F8/F9; thumbnail e URL remota não substituem arquivo |
| Paginação explícita | Busca e leitura retornam limite aplicado e continuação; percorrer páginas em um recorte estável não pula nem repete mensagens; fim do recorte não é fim do histórico do WhatsApp | F5/F9; cursor/ordem estável; novas chegadas não podem deslocar páginas silenciosamente |
| Correções e tipos desconhecidos | Edição/revogação recebida é identificada com momento de observação; tipo sem suporte aparece como tal em vez de virar texto vazio ou desaparecer; política de retenção de versões precisa ser definida antes da ingestão | F2/F3; resultado analítico não deve tratar conteúdo alterado como atual sem aviso |
| Privacidade e leitura efetiva | Todo acesso aos dados/arquivos valida autenticação; abrir conversa não envia confirmação de leitura; IDs/URIs não permitem obter caminhos arbitrários da VPS; logs e exemplos não incluem conversas ou chaves | F7–F10; anotação MCP não é bloqueio de escrita |
| Limites sem descarte | Falta de espaço, anexo grande e resposta excessiva produzem estado/erro legível; mensagens já arquivadas permanecem consultáveis | F4/F8/F9/F10; controlar volumes sem apagar dados silenciosamente |

### Contrato mínimo de evidência para site, exportação e MCP

Cada mensagem precisa fornecer: referência estável do arquivo; ID e chave recebidos da origem; conversa; autor identificado e direção enviada/recebida; instante original e fuso usado na exibição; tipo; texto/legenda recebidos; referência/trecho de resposta citada; anexos e seus estados; indicação de edição/revogação quando observada; link autenticado para reabrir a mensagem no site. Não inventar telefone, autor ou data quando ausentes.

O protocolo recebido inclui campos de chave da mensagem e de contexto citado. Preservá-los evita reconstruir identidade e vínculos a partir apenas de texto. Participantes atuais de um grupo não provam quem integrava o grupo no passado; retornar participantes conhecidos e sua origem/observação. [Definições mantidas pelo Baileys](https://github.com/WhiskeySockets/Baileys/blob/master/WAProto/WAProto.proto).

Toda página de consulta informa filtros efetivos, ordem, continuação, recorte consultado e limites conhecidos de cobertura. Busca de contato retorna candidatos quando houver ambiguidade. Busca de mensagens entrega trechos e referências; leitura de contexto expande ao redor de uma referência; consulta de arquivo devolve metadados/estado e acesso protegido aos bytes quando disponíveis. A IA deve conseguir citar, por exemplo, conversa + autor + data + ID e abrir essa evidência.

O MCP oferece resultados estruturados e recursos binários, mas não garante que um cliente interprete qualquer PDF, áudio ou vídeo. `readOnlyHint` descreve comportamento; o servidor precisa efetivamente restringir capacidades. Paginação de `tools/list`/`resources/list` não implementa paginação dos resultados da busca: esta integra o contrato do Zap MCP. [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources), [anotações](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/).

## Exportação recomendada

Um ZIP por conversa/recorte com mensagens em formato legível e manifesto estruturado contendo IDs, autores, datas/fuso, vínculos de citação, período solicitado, período observado, arquivos incluídos e anexos não recuperados com seus motivos. Arquivos com nomes iguais não podem sobrescrever uns aos outros. Falha ao gerar o pacote precisa ser visível; pacote parcial não pode ser rotulado como concluído. Exportação não substitui backup restaurável.

Essa distinção também existe no produto nativo: o WhatsApp documenta exportação de texto com mídia recente e informa que ela não equivale a backup reimportável. O Zap MCP exporta o seu acervo persistido, sem prometer ampliar a cobertura obtida na sincronização. [WhatsApp — exportação](https://faq.whatsapp.com/1180414079177245/).

## Dependências e ordem sugerida

1. Privacidade/persistência + F1/F2 + contrato de identidade → piloto de cobertura real.
2. F3/F4 + estados de mídia → contexto e anexos armazenados independentemente da conexão.
3. F5/F6/F7 → consulta humana verificável e navegação por evidência.
4. F8 e F9 usam o mesmo recorte, IDs e regras de leitura → exportação e análise pelos clientes.
5. F10 atravessa todas as etapas; restauração e aceite com a conta real e o Codex do usuário encerram o MVP.

F8 e F9 não devem nascer sobre um índice que omite autoria, citação ou disponibilidade. Valide cedo a conversa de referência com João: se o orçamento não chega, registre a limitação antes de investir na interface completa.

## Diferenciais que já pertencem ao v1

Consulta disponível quando a integração cai; anexos binários próprios; evidências compartilhadas entre site, exportação e IAs; limites de cobertura explícitos. São diferenciais alinhados ao pedido, não novos recursos comerciais.

| Referência do ecossistema | Capacidade documentada | Decisão para Zap MCP |
|---|---|---|
| Dispositivo vinculado WhatsApp | Histórico recebido pode ser parcial | Mostrar acervo observado e atualização; validar cobertura real |
| Exportação nativa WhatsApp | Texto e mídia recente; não é backup | ZIP do arquivo próprio com manifesto de disponibilidade |
| Cliente MCP Claude Code | Conexão a servidor remoto HTTP com autenticação | Referência de compatibilidade futura; não adicionar outro cliente ou sistema de autenticação ao v1 |

O aceite obrigatório usa o Codex do usuário. Para uma futura integração Claude, não presumir que Claude Code, Claude Desktop e Claude web têm configuração idêntica. A documentação consultada comprova HTTP autenticado no Claude Code, não o funcionamento do Zap MCP nesses clientes. [Claude Code — MCP](https://code.claude.com/docs/en/mcp).

## Depois de validar — propostas opcionais v2

| Proposta | Valor | Custo / prioridade | Gatilho para considerar |
|---|---|---|---|
| Favoritos locais de mensagens e filtros salvos | Voltar aos mesmos acordos | Baixo / P3 | Uso repetido justificar; não escrever favoritos no WhatsApp |
| Compatibilidade com Claude | Consultar o mesmo acervo em outra IA | Médio / P3 | Usuário solicitar depois de validar Codex; reutilizar o MCP existente sem outro sistema de autenticação |
| Ação local “tentar recuperar mais histórico” por conversa | Repetir uma tentativa suportada com status visível | Médio / P2 | Piloto mostrar que solicitação adicional aumenta cobertura; não prometer completude |
| Importação reconciliada de exportação do celular | Cobrir lacunas comprovadas | Alto / P3 | Caso João ficar inviável pela integração; exige outra fonte, deduplicação e evidência de proveniência |

Nenhuma proposta opcional bloqueia o MVP. Se a integração não entregar a conversa necessária, rever a viabilidade/escopo com essa evidência; não declarar sucesso apenas porque o pareamento funcionou.

## Anti-features — fora do escopo

| Recurso | Motivo para evitar | Alternativa suficiente |
|---|---|---|
| SaaS, vários usuários/contas, CRM e funil | Não atendem o uso pessoal delegado | Uma conta, um proprietário, busca por contato |
| Envio, resposta, edição, exclusão e marcação de leitura | Rompem a consulta somente leitura | Ferramentas de consulta sobre o arquivo |
| IA paga/chatbot embutido, resumos automáticos persistidos | Criam custo e outra fonte de conclusões | Codex interpreta registros citáveis |
| Transcrição, OCR, embeddings e busca semântica | Não foram solicitados e complicam o primeiro aceite | Busca textual e recuperação dos arquivos para análise no cliente |
| Prometer histórico integral/anexos sempre recuperáveis | Contradiz os limites da fonte | Cobertura/indisponibilidade explícitas |
| Tratar miniatura ou URL como mídia arquivada | Dá falsa sensação de preservação | Bytes persistidos ou estado de ausência |

## Aceite decisivo e incertezas materiais

O fluxo de referência deve ser executado no site e no Codex do usuário: selecionar o João correto, achar orçamento por termo/período, ler proposta e mensagens posteriores de confirmação/alteração, conferir anexo disponível, e produzir resposta com referências verificáveis. “Foi proposto” e “foi aceito” são conclusões diferentes; quando não houver confirmação no recorte disponível, a resposta deve reconhecer isso. Um ensaio sintético não valida cobertura da conta.

Ainda não verificados: antiguidade/volume de histórico recebido na conta; recuperação adicional; anexos antigos/expirados; formatos e tamanhos utilizáveis no Codex do usuário; eventos de mensagens temporárias, visualização única, edições e revogações realmente recebidos. Não extrapolar cobertura de apps oficiais para Baileys. O protocolo MCP consultado é a revisão 2026-07-28; escolher a revisão suportada pelo Codex instalado durante a integração, sem exigir novidade desnecessária. Claude não bloqueia esse aceite.

## Fontes e confiança

- Contexto: `.planning/PROJECT.md`, requisitos diretos e exclusões do usuário; não substitui validação técnica.
- WhatsApp Help — [histórico em dispositivos vinculados](https://faq.whatsapp.com/653480766448040/) e [exportação](https://faq.whatsapp.com/1180414079177245/): MEDIUM. Conteúdo localizado via índice de busca primário; acesso direto ao primeiro artigo falhou no navegador de pesquisa. Sem garantia quantitativa inferida.
- Mantenedores Baileys — [history-sync.md](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/history-sync.md), [README](https://github.com/WhiskeySockets/Baileys/blob/master/README.md), [WAProto](https://github.com/WhiskeySockets/Baileys/blob/master/WAProto/WAProto.proto): MEDIUM. Consultados via Context7 e fontes primárias em 2026-10-10; páginas não fornecem contrato de completude.
- MCP — [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources), [Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization): MEDIUM. Revisão atual obtida pelo redirecionamento de `latest`.
- MCP mantenedores — [anotações são dicas, não garantias](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/): MEDIUM; publicado em 2026-03-16, consultado em 2026-10-10.
- Anthropic — [Claude Code MCP](https://code.claude.com/docs/en/mcp): MEDIUM; documentação primária consultada em 2026-10-10, apenas para a proposta futura opcional. Não fundamenta compatibilidade com Codex; esta depende da documentação e do teste do cliente instalado na fase de integração.

---
Pesquisa de funcionalidades para Zap MCP. Sem implementação, implantação ou pareamento realizado.

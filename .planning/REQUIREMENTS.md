# Requirements: Zap MCP

**Defined:** 2026-10-10
**Core Value:** Recuperar uma conversa e seus anexos com contexto verificável, pelo site ou pelo Codex, a partir de um arquivo privado sob controle do usuário.

## v1 Requirements

### Acesso privado

- [x] **PRIV-01**: O proprietário pode entrar e sair do site com uma sessão privada; uma pessoa não autenticada não obtém dados do acervo.
- [x] **PRIV-02**: QR de pareamento, conversas, buscas, anexos, exportações e MCP exigem a credencial apropriada em todos os caminhos de acesso, incluindo requisições diretas por ID ou URL.
- [x] **PRIV-03**: Credenciais e chaves de WhatsApp, segredos de login e token MCP ficam fora do Git, logs, exportações e respostas das interfaces; mensagens e arquivos recebidos não são executados como código ou instruções privilegiadas.

### Sincronização sem navegador

- [x] **SYNC-01**: O proprietário pode vincular sua conta pessoal por QR em uma tela privada, sem executar navegador ou WhatsApp Web, e ver o estado da conexão.
- [x] **SYNC-02**: O proprietário pode consultar as mensagens de histórico que o dispositivo vinculado efetivamente receber, sem omitir itens de um lote recebido.
- [x] **SYNC-03**: Novas mensagens recebidas e enviadas pela própria conta são arquivadas nas conversas individuais e de grupo quando entregues pela integração, sem envio pelo Zap MCP. A origem não permite inferir qual dispositivo enviou a mensagem; comparação com WhatsApp Web autorizada pelo proprietário em 2026-10-11.
- [x] **SYNC-04**: Reinício e reconexão preservam as credenciais e todas as categorias de chaves da sessão; uma sessão ainda válida retoma com um único coletor ativo, sem exigir novo QR por perda de estado local.
- [x] **SYNC-05**: Reprocessar ou receber eventos repetidos ou fora de ordem não duplica mensagens, mescla contatos homônimos nem desfaz uma atualização mais recente; identidades PN/LID são conciliadas apenas com evidência recebida.
- [x] **SYNC-06**: Edições e revogações recebidas aparecem com indicação e momento de observação, preservando o conteúdo anteriormente capturado como registro histórico identificado; tipo desconhecido ou conteúdo temporário não recuperado aparece explicitamente.
- [x] **SYNC-07**: O proprietário vê última sincronização, intervalo observado e falhas conhecidas; o site e o MCP descrevem ausência como “não encontrado no acervo” e não apresentam conclusão de lote como histórico integral da conta.

### Evidência e consulta básica

- [x] **EVID-01**: Cada mensagem arquivada preserva referência estável, chave de origem, conversa, autor/direção, instante original, tipo, texto/legenda, citação recebida e estados dos anexos; campos desconhecidos não são inventados.
- [x] **EVID-02**: Datas permanecem no instante original e filtros por período usam America/Sao_Paulo de forma explícita; site, exportação e MCP permitem conferir UTC ou offset sem trocar a data da mensagem pela data de ingestão.

### Arquivos reais

- [x] **MEDIA-01**: A ingestão inicia a preservação de áudios, imagens, vídeos e documentos acessíveis junto com as mensagens, salvando bytes originais disponíveis em armazenamento privado, em vez de apenas URLs ou miniaturas.
- [x] **MEDIA-02**: Cada anexo distingue pendente, disponível, falha recuperável e indisponível; só um binário finalizado e verificado por tamanho/hash é declarado disponível e permanece acessível sem WhatsApp conectado.
- [x] **MEDIA-03**: Downloads interrompidos podem retomar de uma fila persistente com tentativas e concorrência limitadas; falha de mídia ou falta de espaço é informada e preserva as mensagens e os arquivos já armazenados.

### Consulta pelo site

- [x] **WEB-01**: O proprietário pode listar e reabrir conversas com mensagens e anexos já arquivados em uma interface privada básica, inclusive com o coletor WhatsApp desconectado.
- [x] **WEB-02**: O proprietário pode combinar busca por contato, palavra e período sobre texto, legendas e nomes de arquivo recebidos; nomes homônimos aparecem como candidatos distintos e o alcance da busca fica explícito.
- [x] **WEB-03**: O proprietário pode percorrer mensagens por páginas e abrir o contexto de um resultado por referência estável; um recorte paginado não pula nem repete registros quando novas mensagens chegam.
- [x] **WEB-04**: O proprietário pode manter pelo menos duas conversas abertas em abas independentes dentro do site, alternando entre elas sem perder a conversa e o ponto de leitura de cada aba.
- [x] **WEB-05**: O proprietário pode visualizar os formatos suportados de imagem/áudio/vídeo e baixar qualquer anexo disponível por acesso privado, com indicação clara de arquivo ausente ou sem visualização integrada.

### Exportação com anexos

- [x] **EXP-01**: O proprietário pode escolher uma conversa e período para exportar todo o recorte arquivado correspondente, incluindo as mensagens além da página atualmente visível.
- [x] **EXP-02**: A exportação produz ZIP com mensagens legíveis, manifesto estruturado e arquivos disponíveis, relacionando cada binário à mensagem de origem e listando anexos não recuperados; nomes iguais não sobrescrevem arquivos.
- [x] **EXP-03**: Falha ou interrupção da exportação é informada e um pacote incompleto não é rotulado como concluído; caminhos e nomes recebidos não permitem ler arquivos arbitrários da VPS.

### MCP no Codex do usuário

- [x] **MCP-01**: O Codex instalado do usuário consegue inicializar e usar o MCP remoto por transporte protegido com token privado revogável; token ausente, inválido ou revogado é recusado sem expor o acervo.
- [x] **MCP-02**: O Codex pode localizar contatos/conversas e pesquisar mensagens por contato, termo e período, recebendo limites, filtros efetivos e continuação explícitos em respostas com tamanho controlado.
- [x] **MCP-03**: O Codex pode recuperar um trecho ou contexto por referência de mensagem, com os mesmos IDs, autoria, datas, citações, alterações e limites de cobertura apresentados pelo site.
- [x] **MCP-04**: O Codex do usuário consegue efetivamente recuperar um arquivo disponível ou fazer seu download autorizado, com bytes/hash conferíveis; listar um recurso ou devolver somente uma URL não comprova entrega, e formato/tamanho sem suporte produz limite explícito.
- [x] **MCP-05**: As interfaces públicas oferecem apenas consultas ao acervo: não existe caminho de enviar, editar, apagar ou marcar mensagens como lidas no WhatsApp; anotações MCP não substituem o bloqueio efetivo e conteúdo de conversa continua tratado como dado não confiável.

### Operação e aceite

- [x] **OPS-01**: Na VPS, o serviço funciona com supervisão e HTTPS, preserva banco, anexos e sessão durante reinícios/atualizações e permite consultar o acervo quando a integração está indisponível.
- [x] **OPS-02**: O proprietário tem backup privado e consistente de banco, arquivos e estado necessário da sessão; uma cópia recuperável existe antes de acumular dados reais, e a operação final mantém cópia fora da VPS com proteção dos segredos.
- [x] **OPS-03**: Restaurar o backup em um diretório limpo recupera mensagens, índice e arquivos com integridade conferida, permitindo consultar o acervo sem iniciar um segundo coletor; a validade da sessão WhatsApp restaurada é avaliada separadamente.
- [x] **OPS-04**: O fluxo “encontrar João, localizar orçamento, ler contexto e conferir anexo” passa no site e no Codex do usuário com uma conversa real conhecida, distinguindo proposta de confirmação e citando evidências ou limitações; testes sintéticos ou pareamento isolado não contam como esse aceite.

## v2 Requirements

Propostas fora do roadmap atual; não condicionam o primeiro aceite.

- **CLIENT-01**: Validar o mesmo MCP em uma superfície Claude escolhida pelo usuário, acrescentando autenticação específica somente se essa superfície exigir.
- **IMPORT-01**: Considerar importação reconciliada de uma exportação do celular se o piloto comprovar lacunas essenciais que a integração não consegue recuperar; manter a origem adicional identificada.

## Out of Scope

| Recurso | Motivo |
|---|---|
| Envio, resposta, edição, exclusão ou confirmação de leitura no WhatsApp | V1 pessoal somente leitura |
| Histórico integral garantido e recuperação garantida de mídia antiga | O dispositivo recebe apenas o que a fonte disponibiliza; evidência de ausência é limitada ao acervo |
| Contornar visualização única ou mensagens temporárias indisponíveis | Não ampliar o acesso além do material disponibilizado; registrar metadados/limites conhecidos |
| SaaS, múltiplos proprietários/contas, CRM e disparos | Não são necessários para o uso pessoal descrito |
| Chatbot/IA hospedada, transcrição, OCR, embeddings e busca semântica | A consulta pedida é textual; análise acontece no Codex cliente |
| OAuth/IdP e bridge adicionais no v1 | Cliente obrigatório é Codex com token; só adicionar se uma incompatibilidade demonstrada exigir |
| Favoritos, filtros salvos e importadores preventivos | Não foram solicitados e não desbloqueiam o arquivo básico |

## Definition of Done

Todos os requisitos v1 têm fase e evidência de verificação. Há uma aplicação operante na VPS, consulta privada pelo site, exportação verificável, recuperação real de mensagens/arquivos disponíveis, MCP utilizável no Codex instalado e restauração demonstrada. A cobertura histórica observada e anexos não recuperados permanecem explícitos.

Na implementação, testes de replay, reconexão, autenticação, fuso/paginação, mídia interrompida, exportação completa, bloqueio de escrita e restore cobrem os riscos correspondentes. O piloto usa material da conta real sem publicá-lo nos artefatos do projeto. Este documento registra requisitos; nenhum deles está concluído apenas por ter sido planejado.

## Traceability

Complete significa evidência da fase responsável nas superfícies já implementadas. Privacidade/segredos/somente leitura devem ser verificados novamente quando busca/exportação/MCP/HTTPS forem adicionados nas fases seguintes.

Cada requisito v1 pertence a exatamente uma fase responsável. Requisitos transversais são verificados novamente nas integrações sem duplicar responsabilidade; privacidade e somente leitura valem desde a primeira exposição, e a cópia recuperável anterior ao piloto antecipa a proteção de OPS-02, cuja responsabilidade final é da Phase 4. Planejamento não conclui requisitos.

| Requirement | Phase | Status |
|---|---|---|
| PRIV-01 | Phase 1 | Complete |
| PRIV-02 | Phase 1 | Complete |
| PRIV-03 | Phase 1 | Complete |
| SYNC-01 | Phase 1 | Complete |
| SYNC-02 | Phase 1 | Complete |
| SYNC-03 | Phase 1 | Complete |
| SYNC-04 | Phase 1 | Complete |
| SYNC-05 | Phase 1 | Complete |
| SYNC-06 | Phase 1 | Complete |
| SYNC-07 | Phase 1 | Complete |
| EVID-01 | Phase 1 | Complete |
| EVID-02 | Phase 2 | Complete |
| MEDIA-01 | Phase 1 | Complete |
| MEDIA-02 | Phase 1 | Complete |
| MEDIA-03 | Phase 1 | Complete |
| WEB-01 | Phase 1 | Complete |
| WEB-02 | Phase 2 | Complete |
| WEB-03 | Phase 2 | Complete |
| WEB-04 | Phase 2 | Complete |
| WEB-05 | Phase 2 | Complete |
| EXP-01 | Phase 2 | Complete |
| EXP-02 | Phase 2 | Complete |
| EXP-03 | Phase 2 | Complete |
| MCP-01 | Phase 3 | Complete |
| MCP-02 | Phase 3 | Complete |
| MCP-03 | Phase 3 | Complete |
| MCP-04 | Phase 3 | Complete |
| MCP-05 | Phase 3 | Complete |
| OPS-01 | Phase 4 | Complete |
| OPS-02 | Phase 4 | Complete |
| OPS-03 | Phase 4 | Complete |
| OPS-04 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32/32 (100%)
- Unmapped: 0
- Duplicate phase assignments: 0
- Requirement status: 15 Complete (Phase1 local),17 Pending (Phases2–4); verificação88/88 registrada em01-VERIFICATION.md

---
*Requirements defined: 2026-10-10*
*Last updated: 2026-10-11 após piloto real e verificação da Phase1*

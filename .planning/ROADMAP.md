# Roadmap: Zap MCP

## Overview

O v1 entrega um arquivo privado de uma conta pessoal de WhatsApp, consultável pelo site e pelo Codex do usuário. Primeiro, comprova a captura de mensagens e arquivos reais com leitura básica, privacidade e recuperação após reinício; depois, completa busca, abas e exportação, valida a entrega de anexos no Codex instalado e demonstra operação e restauração na VPS. As quatro fases têm modo `mvp` e granulação `coarse`; nenhum requisito está concluído por este planejamento.

## Phases

- [x] **Phase 1: Arquivo privado com mensagens e mídias reais** - Vincular sem navegador, preservar o material acessível e reabrir o acervo após desconexão ou reinício. (completed 2026-10-11)
- [x] **Phase 2: Busca, contexto, abas e exportação no site** - Encontrar evidências, comparar conversas e exportar o recorte completo com seus arquivos. (completed 2026-10-11)
- [x] **Phase 3: Consulta e arquivos reais no Codex** - Usar o MCP privado no Codex instalado e comprovar recebimento ou download dos binários. (completed 2026-10-12)
- [ ] **Phase 4: Operação e restauração na VPS** - Manter o serviço supervisionado, backup privado fora da VPS e o fluxo real verificável após restauração.

## Phase Details

### Phase 1: Arquivo privado com mensagens e mídias reais

**Goal:** As a proprietário da conta, I want to vincular minha conta sem navegador no coletor e consultar um arquivo privado durável de mensagens e anexos efetivamente recebidos, so that eu possa recuperar esse material inclusive sem conexão com o WhatsApp.
**Mode:** mvp
**Depends on**: Nothing (primeira fase)
**Requirements**: PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, EVID-01, MEDIA-01, MEDIA-02, MEDIA-03, WEB-01
**Success Criteria** (o que deve ser observável):

1. O proprietário entra e sai da interface privada, vincula a conta pelo QR no celular sem navegador no coletor e vê o estado da conexão; acesso sem credencial ao QR ou ao acervo, inclusive por ID/URL direto, é recusado. Credenciais e chaves não aparecem no Git, logs ou respostas, e conteúdo recebido é tratado como dado sem execução privilegiada.
2. Em uma conversa real conhecida, a comparação autorizada com WhatsApp Web confere as mensagens de cada lote recebido e novas mensagens individuais/de grupo, recebidas ou enviadas pela própria conta, com referência estável, chave de origem, autoria/direção, data original, tipo, texto/legenda, citação e estados de anexos; campos desconhecidos ficam explícitos e homônimos ou identidades PN/LID não são mesclados sem evidência.
3. O proprietário reabre conversas e anexos já arquivados com o WhatsApp desconectado; após reinício/reconexão, uma sessão ainda válida retoma sem novo QR por perda de chaves locais, mantém um único coletor e conserva mensagens sem duplicação ou regressão de atualizações quando eventos são repetidos ou chegam fora de ordem.
4. Áudios, imagens, vídeos e documentos acessíveis começam a ser preservados junto da ingestão e seus bytes originais ficam disponíveis offline somente após conferência de tamanho/hash; o proprietário distingue pendência, falha recuperável e indisponibilidade, observa retomada após interrupção com tentativas/concorrência limitadas e não perde material já salvo quando uma mídia falha ou o disco fica sem espaço.
5. O proprietário vê última sincronização, intervalo observado, falhas, edições/revogações com momento de observação e o conteúdo anteriormente capturado identificado como histórico; tipos desconhecidos e conteúdo temporário não recuperado permanecem explícitos. A comparação com WhatsApp Web registra a cobertura realmente observada, e ausência é descrita como “não encontrado no acervo”, sem promessa de histórico integral. O usuário dispensou a comparação manual pelo celular em 2026-10-11.

**Plans**: 0 (não planejados)
- [x] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [x] 01-03-PLAN.md
- [x] 01-04-PLAN.md
- [x] 01-05-PLAN.md
- [x] 01-06-PLAN.md
- [x] 01-07-PLAN.md

**UI hint**: yes

**Condições do piloto:** Preparar e conferir uma cópia privada recuperável antes de vincular a conta ou acumular dados reais, antecipando a proteção de OPS-02 sem duplicar sua responsabilidade final. O pareamento exige o celular do usuário para ler o QR. Fixtures não substituem a conversa e as mídias reais conhecidas; uma lacuna essencial deve ser registrada e ter sua viabilidade resolvida antes de avançar à interface completa. Revalidar a tag/release Baileys recomendada, `7.0.0-rc14` fixada e ainda prerelease, suas correções, persistência de todas as chaves, PN/LID e semântica dos eventos antes de instalar e pilotar. Definir a retenção de alterações e conteúdo temporário antes da ingestão; visualização única ou material indisponível não será contornado.

### Phase 2: Busca, contexto, abas e exportação no site

**Goal:** As a proprietário do acervo privado, I want to encontrar mensagens e anexos com contexto verificável, comparar conversas em abas e exportar todo o recorte escolhido, so that eu possa recuperar e conferir minhas conversas e arquivos arquivados.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: EVID-02, WEB-02, WEB-03, WEB-04, WEB-05, EXP-01, EXP-02, EXP-03
**Success Criteria** (o que deve ser observável):

1. O proprietário combina contato, palavra e período sobre texto, legendas e nomes de arquivos recebidos, distingue contatos homônimos e vê o alcance da busca; filtros usam America/Sao_Paulo explicitamente e as datas originais podem ser conferidas em UTC ou offset, também na exportação.
2. O proprietário percorre páginas e abre o contexto de qualquer resultado por referência estável, sem pular nem repetir registros do recorte quando chegam mensagens novas, preservando autoria, citações, alterações e limites conhecidos.
3. O proprietário mantém pelo menos duas conversas em abas independentes na interface e alterna entre elas sem perder a conversa nem o ponto de leitura de cada aba.
4. O proprietário visualiza os tipos suportados de imagem, áudio e vídeo e baixa qualquer anexo disponível por acesso privado; arquivo ausente ou sem visualização integrada recebe indicação clara, e o binário salvo continua acessível com o coletor desligado.
5. Ao escolher conversa e período, o proprietário recebe um ZIP com todas as mensagens arquivadas do recorte, além da página visível, mensagens legíveis, manifesto estruturado e arquivos ligados à origem, inclusive faltantes listados e nomes iguais sem sobrescrita. Interrupção/falha é explícita e não gera pacote rotulado como concluído; nomes/caminhos recebidos não permitem incluir arquivos arbitrários da VPS nem segredos.

**Plans**: 0 (não planejados)
- [x] 02-06-PLAN.md
- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [x] 02-03-PLAN.md
- [x] 02-04-PLAN.md
- [x] 02-05-PLAN.md

**UI hint**: yes

**Verificação da entrega:** Localizar o João correto e seu orçamento, abrir o contexto, comparar duas conversas e conferir o ZIP offline. Revalidar PRIV-02/PRIV-03 nas rotas de busca, preview, download e exportação, inclusive acessos diretos sem sessão; os mesmos IDs, instantes originais e estados de mídia do arquivo continuam canônicos.

### Phase 3: Consulta e arquivos reais no Codex

**Goal:** As a proprietário do acervo privado, I want to consultar no Codex instalado o mesmo acervo privado por MCP somente leitura e receber ou baixar anexos com integridade verificável, so that eu possa recuperar e conferir conversas e originais arquivados.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05
**Success Criteria** (o que deve ser observável):

1. O Codex realmente instalado inicializa e usa o MCP remoto por transporte protegido com bearer privado revogável, com protocolo negociado registrado sem segredos; token ausente, inválido ou revogado é recusado sem revelar dados.
2. O Codex encontra contatos/conversas e busca mensagens por contato, termo e período, recebendo filtros efetivos, alcance/limites e continuação explícitos em respostas com tamanho controlado.
3. Ao pedir um trecho ou contexto por referência, o Codex recebe os mesmos IDs, autoria, datas originais/fuso, citações, alterações, estados de anexo e cobertura conhecidos no site; ausência continua sendo “não encontrado no acervo”.
4. Em uma conversa real conhecida, o Codex efetivamente recebe um anexo disponível ou conclui seu download autorizado, e os bytes/tamanho/hash conferem com o arquivo preservado; listagem de recurso ou URL isolada não conta como entrega, e tipo/tamanho sem suporte recebe limite explícito.
5. As consultas pelo site e pelo Codex não enviam, editam, apagam nem marcam mensagens como lidas no WhatsApp; não existe operação pública que permita essas ações. Conteúdo de conversa é tratado como dado não confiável, sem instruções privilegiadas ou exposição de chaves, e anotações MCP não são usadas como único bloqueio.

**Plans**: 0 (não planejados)
- [x] 03-01-PLAN.md
- [x] 03-02-PLAN.md
- [x] 03-03-PLAN.md
- [x] 03-04-PLAN.md

**Prova de compatibilidade:** Começar com uma prova curta de autenticação, negociação e entrega binária no Codex do usuário. Usar a recomendação pesquisada do SDK MCP v2 oficial estável e Streamable HTTP, revalidando versões e o protocolo realmente negociado antes de ampliar ferramentas. Testar arquivo pequeno e o caminho de download para arquivos maiores conforme suporte real do cliente; Claude, OAuth/IdP e bridges adicionais não condicionam o v1. PRIV-02/PRIV-03 e EVID-02 são novamente verificados nesta superfície, sem duplicar o mapeamento de responsabilidade.

### Phase 4: Operação e restauração na VPS

**Goal:** O proprietário mantém o arquivo consultável na VPS e consegue recuperá-lo de backup fora dela, demonstrando o fluxo real no site e no Codex sem depender de um coletor ativo.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04
**Success Criteria** (o que deve ser observável):

1. Na VPS identificada, o proprietário acessa o serviço privado por HTTPS com supervisão; reinícios/atualizações preservam banco, anexos e sessão, e o site e o MCP continuam consultando o acervo quando a integração WhatsApp está indisponível.
2. O proprietário dispõe de backup privado consistente de banco, arquivos e estado necessário da sessão, com segredos protegidos e cópia recuperável fora da VPS; a proteção inicial anterior ao piloto é conferida e a operação final mantém essa recuperação.
3. A restauração em diretório limpo recupera mensagens, índice de busca e binários com contagens/integridade/hash conferíveis e permite consultar/exportar o acervo offline pelo site e MCP sem iniciar um segundo coletor. A validade da sessão WhatsApp restaurada é avaliada separadamente, com a instância original parada antes de eventual reconexão.
4. Com uma conversa real conhecida, o proprietário completa “encontrar João, localizar orçamento, ler contexto e conferir anexo” no site e no Codex instalado, distingue proposta de confirmação e confere evidências ou limitações. O fluxo permanece verificável no acervo restaurado; pareamento isolado ou dados sintéticos não substituem esse aceite.

**Plans**: 0 (não planejados)

**Dependências de execução:** Identificar VPS, domínio/proxy, supervisão, espaço/persistência e destino privado de backup com chave recuperável antes da implantação; reutilizar o ambiente existente quando adequado. Essas informações não impedem o planejamento inicial. A restauração do arquivo não promete que a sessão remota ainda será válida nem autoriza dois coletores.

## Condições transversais e de aceite

- Uma conta, um proprietário e um coletor; todas as superfícies de dados exigem a credencial apropriada desde a primeira exposição, com transporte protegido e anexos sem URLs públicas permanentes.
- O produto inteiro é somente leitura no WhatsApp desde a Phase 1. PRIV-01/02/03 têm responsabilidade inicial na Phase 1, MCP-05 tem responsabilidade na Phase 3 e seus controles voltam a ser verificados em cada nova interface e na implantação.
- OPS-02 tem responsabilidade final na Phase 4, mas sua cópia privada recuperável anterior aos dados reais é condição obrigatória do piloto da Phase 1.
- Site, exportação e MCP consultam o arquivo persistido e preservam os mesmos IDs, proveniência, instantes originais, alterações, disponibilidade de mídia e limites de cobertura; uma queda do WhatsApp só impede novas capturas.
- Capturar apenas material efetivamente disponibilizado; falha de mídia não apaga mensagens, e conteúdo temporário/visualização única indisponível permanece limitado. Sem transcrição, OCR, embeddings, IA hospedada paga ou recuperação integral prometida.
- Um serviço e armazenamento local são a direção pesquisada; versões e compatibilidade ainda precisam de verificação. Pesquisa, planejamento e testes sintéticos não comprovam integração, cobertura da conta, entrega binária no Codex ou operação na VPS.

## Progress

**Execution Order:** Phase 1 → Phase 2 → Phase 3 → Phase 4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Arquivo privado com mensagens e mídias reais | 7/7 | Complete    | 2026-10-11 |
| 2. Busca, contexto, abas e exportação no site | 6/6 | Complete    | 2026-10-12 |
| 3. Consulta e arquivos reais no Codex | 4/4 | Complete    | 2026-10-12 |
| 4. Operação e restauração na VPS | 0/0 | Not started | - |

**Coverage:** 32/32 requisitos v1 mapeados exatamente uma vez; 0 órfãos e 0 duplicações. Status de todos: Pending. Planos ainda não criados; progresso de execução: 0%.

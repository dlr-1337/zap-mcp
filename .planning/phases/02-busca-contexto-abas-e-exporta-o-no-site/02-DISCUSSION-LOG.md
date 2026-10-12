# Phase 2: Busca, contexto, abas e exportação no site - Discussion Log

> Registro de auditoria humana; não usar como entrada para pesquisa/planejamento/execução. Decisões canônicas em 02-CONTEXT.md.

**Date:** 2026-10-11
**Phase:** 2
**Modo:** `--all --auto`; todas as escolhas são recomendações automáticas do agente autorizadas pela invocação, sem perguntas ou respostas individuais do usuário.
**Areas discussed:** Busca e identificação do contato, Período, paginação e contexto, Abas independentes e leitura, Visualização e download privados, Exportação completa e verificável

Baseline: Phase 1 Complete/passed; sem SPEC, contexto existente ou checkpoint de Phase 2, sem todos correspondentes, sem advisor profile, sem hooks pre ativos. Nenhuma capacidade acrescentada ao roadmap.

## Busca e identificação do contato

### D-01: Como combinar os filtros?

| Opção | Selecionada |
|---|---|
| Busca global com filtros combináveis | Sim, recomendação automática |
| Busca apenas na conversa aberta | Não |

**Escolha do agente:** Contato/conversa, termos simples e período se combinam por AND; sem contato selecionado, procurar em todo o acervo e mostrar o alcance efetivo.

### D-02: Como distinguir homônimos?

| Opção | Selecionada |
|---|---|
| Candidatos por identidade | Sim, recomendação automática |
| Primeiro nome encontrado | Não |

**Escolha do agente:** Mostrar candidatos distintos com nome recebido, tipo, identidade disponível e referência; seleção usa o ID canônico, nunca apenas o nome.

### D-03: Qual conteúdo entra na busca?

| Opção | Selecionada |
|---|---|
| Conteúdo arquivado com origem do match | Sim, recomendação automática |
| Somente texto atual | Não |

**Escolha do agente:** Pesquisar texto, legenda e nome de arquivo recebido; conteúdo anterior capturado pode corresponder como evidência histórica identificada, sem confundir edição/revogação com estado atual. Não pesquisar envelopes privados.

### D-04: Como apresentar os resultados?

| Opção | Selecionada |
|---|---|
| Lista cronológica com contexto | Sim, recomendação automática |
| Ranking opaco por relevância | Não |

**Escolha do agente:** Lista paginada em ordem cronológica determinística, mais recentes primeiro; mostrar trecho seguro, conversa, autoria/direção, data original e referência, com ação Abrir contexto. Termos são texto simples, sem linguagem SQL/FTS livre.

## Período, paginação e contexto

### D-05: O que significam as datas do filtro?

| Opção | Selecionada |
|---|---|
| Dias locais com fuso explícito | Sim, recomendação automática |
| Datas UTC implícitas | Não |

**Escolha do agente:** Datas de calendário inclusivas em America/Sao_Paulo, convertidas para início inclusivo e início do dia seguinte exclusivo respeitando regras históricas do fuso; limites abertos permitidos e intervalo inválido recusado. Sem instante original, informar desconhecido e não inventar data de ingestão.

### D-06: Como conferir o instante da mensagem?

| Opção | Selecionada |
|---|---|
| Local com UTC conferível | Sim, recomendação automática |
| Somente data formatada | Não |

**Escolha do agente:** Exibir horário local e disponibilizar o instante original em UTC/offset nas mensagens e no manifesto; filtros efetivos trazem fuso e limites UTC. A data de ingestão nunca substitui a original.

### D-07: O que acontece quando entram mensagens durante a paginação?

| Opção | Selecionada |
|---|---|
| Recorte estável e atualização explícita | Sim, recomendação automática |
| Offset sobre conjunto vivo | Não |

**Escolha do agente:** Congelar o conjunto/limite observado da consulta, usar ordem com desempate por referência e continuação vinculada aos filtros; novas mensagens ficam para atualização explícita. Testar mensagem retroativa, timestamp igual e alterações/identidade reconciliada, sem repetir nem pular o recorte.

### D-08: Como abrir o contexto de um resultado?

| Opção | Selecionada |
|---|---|
| Janela ancorada na referência | Sim, recomendação automática |
| Abrir apenas as últimas mensagens | Não |

**Escolha do agente:** Abrir por referência estável, destacar a mensagem e mostrar vizinhas anteriores/posteriores mesmo quando ela está fora da página inicial. Preservar citações, autoria, revisões e faltantes; continuar em ambas as direções. Referência ausente recebe Não encontrado no acervo.

## Abas independentes e leitura

### D-09: O que cada aba preserva?

| Opção | Selecionada |
|---|---|
| Uma aba por conversa com leitura preservada | Sim, recomendação automática |
| Uma conversa global compartilhada | Não |

**Escolha do agente:** Conversa canônica, mensagens carregadas, recorte/cursor, âncora e posição de leitura independentes; alternar entre pelo menos duas abas não reinicia a leitura. Reabrir a mesma conversa ativa a aba existente.

### D-10: As abas sobrevivem a fechar o site?

| Opção | Selecionada |
|---|---|
| Estado da sessão da página | Sim, recomendação automática |
| Persistência de conteúdo no navegador | Não |

**Escolha do agente:** Manter estado em memória durante a sessão da página. Não persistir conteúdo privado no localStorage nem acrescentar restauração entre dispositivos/reaberturas neste v1.

### D-11: Como funcionam em tela estreita e teclado?

| Opção | Selecionada |
|---|---|
| Abas acessíveis e responsivas | Sim, recomendação automática |
| Somente layout desktop | Não |

**Escolha do agente:** Barra de abas acessível com seleção/foco visíveis, alternância por teclado e fechamento explícito; permitir rolagem horizontal em tela estreita. Lista, busca e leitor continuam utilizáveis no celular.

### D-12: Como lidar com logout e respostas atrasadas?

| Opção | Selecionada |
|---|---|
| Isolamento e invalidação por sessão/aba | Sim, recomendação automática |
| Atualização global automática | Não |

**Escolha do agente:** Logout/expiração esvaziam todas as abas, resultados e previews. Respostas antigas não restauram conteúdo nem alteram a aba errada; atualizar uma aba mantém as demais e anuncia disponibilidade de mensagens novas.

## Visualização e download privados

### D-13: Quais arquivos são visualizados no site?

| Opção | Selecionada |
|---|---|
| Preview nativo seguro e download alternativo | Sim, recomendação automática |
| Transcodificar e renderizar todo tipo | Não |

**Escolha do agente:** Imagem raster e áudio/vídeo suportados pelo navegador com controles nativos; outros tipos, inclusive conteúdo ativo HTML/SVG e documentos sem suporte, recebem download e explicação clara. Falha de codec/preview mantém o original baixável.

### D-14: Quando carregar previews?

| Opção | Selecionada |
|---|---|
| Preview sob demanda | Sim, recomendação automática |
| Carregamento automático de toda mídia | Não |

**Escolha do agente:** Carregar sob ação do proprietário, sem baixar todos os binários ao listar mensagens; manter nome/tipo/estado e botão de download visíveis.

### D-15: Qual caminho entrega o original?

| Opção | Selecionada |
|---|---|
| Reutilizar leitura verificada e privada | Sim, recomendação automática |
| URLs públicas permanentes | Não |

**Escolha do agente:** ID interno autenticado e openVerifiedAttachment existente; Range/HEAD quando necessário e MIME permitido somente no preview. Download preserva bytes, tamanho/hash e filename apenas sanitizado como metadado.

### D-16: Como mostrar arquivos faltantes ou sem suporte?

| Opção | Selecionada |
|---|---|
| Estado explícito com fallback | Sim, recomendação automática |
| Ocultar o anexo que não abre | Não |

**Escolha do agente:** Preservar mensagem e estado/motivo seguro de pendente, falha recuperável ou indisponível; separar falta do binário de formato/codec não visualizável. Originais disponíveis funcionam sem coletor ativo.

## Exportação completa e verificável

### D-17: O que é selecionado para exportar?

| Opção | Selecionada |
|---|---|
| Conversa e período congelados | Sim, recomendação automática |
| Apenas mensagens carregadas na tela | Não |

**Escolha do agente:** Uma conversa por ID e período opcional explícito, incluindo todas as mensagens arquivadas do recorte, além da página visível. Congelar seleção e evidência ao iniciar, para edições/ingestão posteriores não mudarem o pacote silenciosamente.

### D-18: O que contém o ZIP?

| Opção | Selecionada |
|---|---|
| TXT + manifesto JSON + originais | Sim, recomendação automática |
| Somente texto ou links | Não |

**Escolha do agente:** mensagens.txt legível em ordem cronológica, manifest.json estruturado e arquivos disponíveis em arquivos/. Manifesto liga referência/chave sanitizada, autor/direção, instante original/fuso, texto/legenda, citações/revisões e cada anexo ao caminho incluído, estado, motivo, tamanho/hash; inclui cobertura observada, filtros efetivos e faltantes. Sem HTML ativo, sessão, media keys ou envelopes.

### D-19: Como evitar sobrescrita e inclusão de arquivos arbitrários?

| Opção | Selecionada |
|---|---|
| IDs únicos e leitura fechada do acervo | Sim, recomendação automática |
| Caminhos derivados de filename recebido | Não |

**Escolha do agente:** Nomes internos únicos por ID de anexo, nome original como metadado e sufixo seguro opcional; nenhuma entrada ZIP absoluta, com traversal ou calculada a partir de caminho recebido. Ler exclusivamente originais verificados do acervo; não exportar banco/auth/backup.

### D-20: Como informar conclusão e interrupção?

| Opção | Selecionada |
|---|---|
| Job privado finalizado e conferido | Sim, recomendação automática |
| Stream rotulado concluído antes da finalização | Não |

**Escolha do agente:** Uma geração por vez com estado consultável de preparando/pronto/falhou; temporário privado só fica pronto após finalizar e conferir ZIP/manifesto. Falha, cancelamento do processo ou disco insuficiente não produz sucesso; retomada/limpeza de derivados nunca apaga o acervo. Sessão obrigatória para criar, consultar estado e baixar; informar todos os faltantes mesmo em pacote válido.

## Discrição do agente

Implementação, biblioteca mínima se necessária, parâmetros operacionais e testes ficam para pesquisa/plano, dentro das decisões registradas.

## Deferred Ideas

Somente os itens fora de escopo já relacionados no CONTEXT; nenhuma ideia nova.

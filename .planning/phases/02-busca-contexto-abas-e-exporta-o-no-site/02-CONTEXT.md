# Phase 2: Busca, contexto, abas e exportação no site - Context

**Gathered:** 2026-10-11
**Status:** Ready for planning
**Modo:** `2 --all --auto`; as 20 decisões abaixo foram escolhidas pelo agente conforme autorização não interativa, não são respostas individuais do proprietário.

<domain>
## Phase Boundary

Encontrar mensagens/anexos no acervo privado por contato, palavra e período, abrir contexto verificável por referência, comparar conversas em abas independentes, visualizar/baixar originais e exportar todo o recorte escolhido em ZIP verificável. Responsabilidade: EVID-02, WEB-02/03/04/05 e EXP-01/02/03. Revalidar PRIV-02/03 em cada nova rota. MCP pertence à fase 3; implantação/HTTPS e backup externo recorrente à fase 4.

A Phase 1 consta Complete no STATE/ROADMAP/REQUIREMENTS e passed em 01-VERIFICATION.md. Trechos antigos do PROJECT/README/01-CONTEXT ainda dizem piloto pendente: tratá-los como histórico superado pela verificação final, sem repetir pareamento nem reabrir a comparação já dispensada. Nenhum requisito desta fase está concluído por esta discussão.
</domain>

<decisions>
## Implementation Decisions

### Decisões anteriores mantidas
- Uma conta, um proprietário, um coletor; nenhuma operação de envio/edição/exclusão/confirmação de leitura no WhatsApp.
- Consultas usam exclusivamente o arquivo local e projeções sanitizadas, inclusive com coletor desligado.
- Preservar IDs canônicos, PN/LID apenas com evidência, autoria, citações, instantes originais, alterações observadas e estados de anexo. Campo desconhecido permanece explícito.
- Senha/sessão privadas existentes; conteúdo recebido é dado não confiável. Não expor chaves, sessão, URLs temporárias remotas, envelopes brutos nem caminhos internos.
- Não encontrado no acervo descreve ausência; cobertura observada não comprova histórico integral.
- Usar Node 24.21.0 do projeto por mise exec, sem mudar Node global. Reutilizar Express/SQLite/JS/CSS nativos já existentes; infraestrutura extra somente por limitação demonstrada.

### Busca e identificação do contato
- **D-01:** Contato/conversa, termos simples e período se combinam por AND; sem contato selecionado, procurar em todo o acervo e mostrar o alcance efetivo.
- **D-02:** Mostrar candidatos distintos com nome recebido, tipo, identidade disponível e referência; seleção usa o ID canônico, nunca apenas o nome.
- **D-03:** Pesquisar texto, legenda e nome de arquivo recebido; conteúdo anterior capturado pode corresponder como evidência histórica identificada, sem confundir edição/revogação com estado atual. Não pesquisar envelopes privados.
- **D-04:** Lista paginada em ordem cronológica determinística, mais recentes primeiro; mostrar trecho seguro, conversa, autoria/direção, data original e referência, com ação Abrir contexto. Termos são texto simples, sem linguagem SQL/FTS livre.

### Período, paginação e contexto
- **D-05:** Datas de calendário inclusivas em America/Sao_Paulo, convertidas para início inclusivo e início do dia seguinte exclusivo respeitando regras históricas do fuso; limites abertos permitidos e intervalo inválido recusado. Sem instante original, informar desconhecido e não inventar data de ingestão.
- **D-06:** Exibir horário local e disponibilizar o instante original em UTC/offset nas mensagens e no manifesto; filtros efetivos trazem fuso e limites UTC. A data de ingestão nunca substitui a original.
- **D-07:** Congelar o conjunto/limite observado da consulta, usar ordem com desempate por referência e continuação vinculada aos filtros; novas mensagens ficam para atualização explícita. Testar mensagem retroativa, timestamp igual e alterações/identidade reconciliada, sem repetir nem pular o recorte.
- **D-08:** Abrir por referência estável, destacar a mensagem e mostrar vizinhas anteriores/posteriores mesmo quando ela está fora da página inicial. Preservar citações, autoria, revisões e faltantes; continuar em ambas as direções. Referência ausente recebe Não encontrado no acervo.

### Abas independentes e leitura
- **D-09:** Conversa canônica, mensagens carregadas, recorte/cursor, âncora e posição de leitura independentes; alternar entre pelo menos duas abas não reinicia a leitura. Reabrir a mesma conversa ativa a aba existente.
- **D-10:** Manter estado em memória durante a sessão da página. Não persistir conteúdo privado no localStorage nem acrescentar restauração entre dispositivos/reaberturas neste v1.
- **D-11:** Barra de abas acessível com seleção/foco visíveis, alternância por teclado e fechamento explícito; permitir rolagem horizontal em tela estreita. Lista, busca e leitor continuam utilizáveis no celular.
- **D-12:** Logout/expiração esvaziam todas as abas, resultados e previews. Respostas antigas não restauram conteúdo nem alteram a aba errada; atualizar uma aba mantém as demais e anuncia disponibilidade de mensagens novas.

### Visualização e download privados
- **D-13:** Imagem raster e áudio/vídeo suportados pelo navegador com controles nativos; outros tipos, inclusive conteúdo ativo HTML/SVG e documentos sem suporte, recebem download e explicação clara. Falha de codec/preview mantém o original baixável.
- **D-14:** Carregar sob ação do proprietário, sem baixar todos os binários ao listar mensagens; manter nome/tipo/estado e botão de download visíveis.
- **D-15:** ID interno autenticado e openVerifiedAttachment existente; Range/HEAD quando necessário e MIME permitido somente no preview. Download preserva bytes, tamanho/hash e filename apenas sanitizado como metadado.
- **D-16:** Preservar mensagem e estado/motivo seguro de pendente, falha recuperável ou indisponível; separar falta do binário de formato/codec não visualizável. Originais disponíveis funcionam sem coletor ativo.

### Exportação completa e verificável
- **D-17:** Uma conversa por ID e período opcional explícito, incluindo todas as mensagens arquivadas do recorte, além da página visível. Congelar seleção e evidência ao iniciar, para edições/ingestão posteriores não mudarem o pacote silenciosamente.
- **D-18:** mensagens.txt legível em ordem cronológica, manifest.json estruturado e arquivos disponíveis em arquivos/. Manifesto liga referência/chave sanitizada, autor/direção, instante original/fuso, texto/legenda, citações/revisões e cada anexo ao caminho incluído, estado, motivo, tamanho/hash; inclui cobertura observada, filtros efetivos e faltantes. Sem HTML ativo, sessão, media keys ou envelopes.
- **D-19:** Nomes internos únicos por ID de anexo, nome original como metadado e sufixo seguro opcional; nenhuma entrada ZIP absoluta, com traversal ou calculada a partir de caminho recebido. Ler exclusivamente originais verificados do acervo; não exportar banco/auth/backup.
- **D-20:** Uma geração por vez com estado consultável de preparando/pronto/falhou; temporário privado só fica pronto após finalizar e conferir ZIP/manifesto. Falha, cancelamento do processo ou disco insuficiente não produz sucesso; retomada/limpeza de derivados nunca apaga o acervo. Sessão obrigatória para criar, consultar estado e baixar; informar todos os faltantes mesmo em pacote válido.

### Discrição do agente
- Pesquisar e definir mecanismo mínimo de índice, migração/rebuild, snapshot estável, cursores autenticados, conversão histórica de fuso, geração/verificação ZIP e limites de tamanho/concorrência/validade; sem congelar uma biblioteca antes de conferir runtime e dependências.
- Estruturar contratos de consulta compartilháveis com o MCP futuro, sem implementá-lo nesta fase nem refatorar o coletor sem necessidade.
- Manter a linguagem visual e acessibilidade da Phase 1, criando contrato visual da fase conforme workflow. Não fazer redesign completo nem adicionar favoritos, filtros salvos, transcrição, OCR, embeddings ou chatbot.
- Verificação automatizada cobre índice após ingestão/edição/replay, homônimos, acentos, limite à meia-noite/fuso histórico, timestamps iguais, entrada retroativa durante paginação, contexto distante, race de abas/logout, auth direta, MIME/traversal, originais/ZIP/faltantes e interrupção. Aceite usa recorte real conhecido, com evidência sanitizada; testes sintéticos não o substituem.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e critérios
- `AGENTS.md` — escopo, autorização e critérios de entrega.
- `.planning/PROJECT.md` — escopo, autorização e critérios de entrega.
- `.planning/REQUIREMENTS.md` — escopo, autorização e critérios de entrega.
- `.planning/ROADMAP.md` — escopo, autorização e critérios de entrega.

### Pesquisa e riscos
- `.planning/research/SUMMARY.md` — arquitetura pesquisada, contratos de evidência e riscos; recomendações técnicas precisam ser revalidadas.
- `.planning/research/STACK.md` — arquitetura pesquisada, contratos de evidência e riscos; recomendações técnicas precisam ser revalidadas.
- `.planning/research/ARCHITECTURE.md` — arquitetura pesquisada, contratos de evidência e riscos; recomendações técnicas precisam ser revalidadas.
- `.planning/research/PITFALLS.md` — arquitetura pesquisada, contratos de evidência e riscos; recomendações técnicas precisam ser revalidadas.
- `.planning/research/FEATURES.md` — arquitetura pesquisada, contratos de evidência e riscos; recomendações técnicas precisam ser revalidadas.

### Baseline da fase anterior
- `.planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-CONTEXT.md` — decisões herdadas, verificação final e linguagem visual existente; a verificação final resolve notas antigas de pendência.
- `.planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-VERIFICATION.md` — decisões herdadas, verificação final e linguagem visual existente; a verificação final resolve notas antigas de pendência.
- `.planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-UI-SPEC.md` — decisões herdadas, verificação final e linguagem visual existente; a verificação final resolve notas antigas de pendência.

Não há SPEC/ADR externo específico desta fase. As fontes técnicas citadas na pesquisa são referências a consultar, não evidência de build/operação.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/archive.ts`: `openArchive`, DTO sanitizado por referência, redirects, `readConversation`, `listConversations`, revisões, anexos e cobertura; estender consultas sem acessar payload privado.
- `src/main.ts`: autenticação/CSRF, limitador de página, cursores HMAC vinculados a tipo/escopo, identidade distinta de conversas e rota de original com Range/HEAD.
- `src/media.ts`: `openVerifiedAttachment`, descritor verificado e reconciliação; usar também na exportação/preview.
- `src/auth.ts`: sessão existente; novas rotas protegidas antes da consulta/geração/stream.
- `public/app.js`, `public/index.html`, `public/style.css`: leitor nativo, textContent, invalidação de respostas por sessão/navegação e carregamento anterior preservando âncora.
- `test/archive.test.ts`, `test/http.test.ts`, `test/auth.test.ts`, `test/security.test.ts`, `test/readonly.test.ts`, `test/revisions.test.ts`, `test/media.test.ts`, `test/backup.test.ts`: padrões de fixtures, temporários privados, HTTP autenticado e integridade existentes.

### Established Patterns
- Banco, binários, credenciais e dados reais fora do checkout; repositório público contém apenas código/documentação sanitizados.
- Consultas parametrizadas, mensagens projetadas de fonte canônica, IDs seguros para acessar arquivos e erros sem dados internos.
- Stack atual é TypeScript ESM, Express e better-sqlite3; frontend JS/CSS nativo. FTS/busca, contexto ancorado, abas e ZIP ainda precisam ser implementados. Não há mapas em .planning/codebase/.
- Datas locais já usam Intl/ America/Sao_Paulo; a nova conversão de filtros precisa conferir limites históricos, sem assumir offset constante.

### Integration Points
- Estender API e camada de arquivo com filtros/continuação/contexto; preservar contratos básicos e autenticação existentes.
- Transformar o leitor único em abas com estado independente, anexando busca, previews e exportação à página atual.
- Gerar ZIP privado derivado de DTOs/arquivos verificados; manter sessão/socket WhatsApp fora da superfície de consulta/exportação.
- Preservar o perfil real e exclusividade do coletor. Testar sobre fixtures e cópia privada isolada/offline; reinício necessário segue encerramento limpo.
</code_context>

<specifics>
## Specific Ideas

- Fluxo de referência do roadmap: localizar o João correto e seu orçamento, abrir contexto, comparar duas conversas e conferir ZIP offline. João é exemplo de fluxo; se não existir no recorte recebido, usar conversa real conhecida e declarar a ausência, sem inventar pessoa ou conteúdo.
- Evidência real permanece privada. Documentação pública usa contagens, estados e hashes seguros sem texto de negociação, identidade pessoal, credencial ou caminho operacional sensível.
- O ZIP deve conservar faltantes e versões capturadas, sem criar aparência de histórico integral nem confundir proposta com confirmação.
</specifics>

<deferred>
## Deferred Ideas

Nenhuma capacidade nova adicionada à discussão. Mantidos: MCP/entrega binária no Codex (fase 3), operação final na VPS/backup externo/restore completo (fase 4), Claude e importação apenas por necessidade comprovada (v2). Não adicionar persistência de conteúdo de abas no navegador, exportação multiconversa, favoritos/filtros salvos, transcodificação preventiva, OCR/transcrição/busca semântica.
</deferred>

---
*Phase: 02-busca-contexto-abas-e-exporta-o-no-site*
*Context gathered: 2026-10-11*

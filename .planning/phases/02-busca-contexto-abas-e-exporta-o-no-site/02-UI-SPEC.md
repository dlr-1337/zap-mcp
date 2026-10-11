---
phase: "2"
slug: "busca-contexto-abas-e-exporta-o-no-site"
status: approved
shadcn_initialized: false
preset: none
created: "2026-10-11"
reviewed_at: "2026-10-11"
---

# Fase 2 — Contrato visual e de interação

Fonte de verdade para EVID-02, WEB-02/03/04/05 e EXP-01/02/03. Herda D-01–D-20 de `02-CONTEXT.md`, arquitetura de `02-RESEARCH.md` e tokens de `01-UI-SPEC.md` confirmados por leitura de `public/index.html`, `public/style.css` e `public/app.js`. Padrões adicionais são escolhas do agente sob `--auto`, sem respostas individuais do proprietário. Este documento não comprova UI renderizada, codec, conta real ou exportação.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | Não aplicável |
| Component library | HTML semântico, CSS e JS nativos existentes |
| Icon library | Nenhuma; rótulos textuais |
| Font | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |

Detecção em 2026-10-11: `rg --files --hidden -g 'components.json' -g 'tailwind.config.*' -g 'postcss.config.*' -g '*.tsx' -g '!.git' -g '!node_modules'` sem resultados; `package.json` confirma frontend nativo. Gate shadcn não aplicável; inventário de pacote omitido por Tool: none. Diretórios locais `.codex/skills/` e `.agents/skills/` ausentes; `agent_skills` vazio. Preservar login, estado/cobertura e QR existentes; acrescentar capacidades ao leitor atual sem redesign ou framework.

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Rótulo/valor |
| sm | 8px | Controles, abas e metadados |
| md | 16px | Mensagens, anexos e margem móvel |
| lg | 24px | Painéis e grupos do formulário |
| xl | 32px | Grade e margem desktop |
| 2xl | 48px | Separação de áreas principais |
| 3xl | 64px | Respiro do login herdado |

Sem exceções para gaps/padding/margens. Alvos de controles: mínimo 48×48px; borda 1px; raio 4px; foco 2px com offset 2px. Dimensões herdadas: página até 1280px, lista lateral 288px, leitor `minmax(0,1fr)`; breakpoint 767px. Em 320/768/1280px e zoom, somente a barra de abas pode rolar horizontalmente; formulários refluem, textos quebram e mídias respeitam 100% da largura.

## Typography

Exatamente quatro tamanhos e dois pesos, herdados; rem respeita zoom, sem fonte externa.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px / 1rem | 400 | 1.5 |
| Label / metadados | 14px / .875rem | 600 / 400 | 1.5 |
| Heading | 20px / 1.25rem | 600 | 1.2 |
| Display | 28px / 1.75rem | 600 | 1.2 |

Botões: 16px/600. Mensagens: 16px/400, `white-space:pre-wrap`, `overflow-wrap:anywhere`, `dir=auto`. Referências, datas e nomes completos selecionáveis; detalhes técnicos ficam no disclosure herdado.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F5F6F7 | Fundo e respiros |
| Secondary (30%) | #FFFFFF | Lista, busca, leitor e exportação |
| Accent (10%) | #155E75 | CTA Buscar mensagens, login herdado, downloads disponíveis, aba/conversa ativa, âncora e foco |
| Destructive | Não aplicável | Nenhuma ação destrutiva |
| Texto / metadados | #17212B / #4B5563 | Conteúdo e explicações |
| Controle / separador | #66717F / #D7DCE1 | Bordas funcionais / decorativas |

Accent reserved for: os elementos listados acima, no máximo 10% aproximado da área. Branco sobre CTA preenchido; demais botões neutros. Seleção e âncora usam borda de 4px e rótulo; estados usam texto, nunca apenas cor. Não introduzir cor semântica adicional para arquivo faltante, revogação ou sucesso.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Buscar mensagens |
| Busca — campos | Contato ou conversa / Termos / De / Até |
| Contato — ações | Localizar conversa / Usar na busca / Buscar em todo o acervo |
| Contato — carregando/vazio/erro | Localizando conversas… / Não encontrado no acervo. Confira o nome ou a identidade. / Não foi possível localizar conversas. Tente localizar novamente. |
| Contato não selecionado | Escolha uma conversa da lista ou limpe o campo para buscar em todo o acervo. |
| Busca — ajuda | Busca em texto, legendas e nomes de arquivos recebidos. Termos simples combinados; sem OCR ou transcrição. |
| Período — ajuda | Dias inclusivos em America/Sao_Paulo. Deixe um limite vazio para manter esse lado aberto. |
| Período inválido | Confira as datas. A data inicial deve ser igual ou anterior à final. |
| Alcance | Todo o acervo / Conversa: {nome} · {identidade} · {referência}; período: {limites locais}; fuso: America/Sao_Paulo |
| Limites verificáveis | Ver limites em UTC |
| Busca inicial | Combine conversa, termos e período e selecione Buscar mensagens. Campos vazios buscam todo o acervo. |
| Empty state heading | Não encontrado no acervo |
| Empty state body | Nenhuma mensagem corresponde aos filtros. Ajuste a conversa, os termos ou o período e busque novamente. |
| Busca — carregando/contagem | Buscando mensagens… / {n} resultado carregado / {n} resultados carregados |
| Error state | Não foi possível buscar mensagens. Tente buscar novamente. |
| Busca — continuação/fim | Carregar resultados seguintes / Todos os resultados deste recorte foram carregados. |
| Busca — atualizar/recorte expirado | Atualizar busca / Este recorte expirou. Atualize a busca para criar um novo recorte. |
| Resultado — contexto/histórico | Abrir contexto / Correspondência em conteúdo anteriormente capturado — registro histórico |
| Contexto — loading/erro | Carregando contexto… / Não foi possível carregar o contexto. Tente abrir novamente. |
| Contexto — ausente/âncora | Não encontrado no acervo. Volte aos resultados. / Mensagem localizada |
| Contexto — continuação/fim | Carregar mensagens anteriores / Carregar mensagens posteriores / Não há mais mensagens arquivadas nesta direção. |
| Abas — título/fechar/vazio | Conversas abertas / Fechar conversa: {nome} · {referência} / Abra uma conversa ou um resultado para ler o contexto. |
| Abas — atualização | Há novas mensagens arquivadas. Atualizar conversa |
| Retorno móvel | Voltar à busca e às conversas |
| Anexo — controles | Visualizar imagem / Ouvir áudio / Assistir vídeo / Fechar visualização / Baixar original |
| Preview — loading/erro | Carregando visualização… / Não foi possível visualizar este formato. Baixe o original para abrir em outro aplicativo. |
| Preview não integrado | Sem visualização integrada para este formato. Baixe o original para abrir em outro aplicativo. |
| Mídia ausente | Pendente — o original ainda não foi preservado. / Falha recuperável — {motivo seguro}. / Indisponível — {motivo seguro}. A mensagem permanece no acervo. |
| Download — pedido/erro | Download solicitado ao navegador. Confira a conclusão nos downloads. / Não foi possível baixar o arquivo. Confira sua disponibilidade e tente novamente. |
| Exportação — título/CTA | Exportar conversa / Gerar ZIP |
| Exportação — seleção/ajuda | Conversa: {nome} · {identidade} · {referência} / De / Até / Exporta todo o recorte arquivado, além da página visível, com originais disponíveis e faltantes listados. |
| Exportação — preparando | Preparando ZIP… Você pode continuar lendo. |
| Exportação — pronto | ZIP pronto — {n} mensagens, {a} arquivos incluídos, {f} anexos faltantes. / Baixar ZIP |
| Exportação — falha/repetir | Não foi possível preparar o ZIP. {motivo seguro}. Confira o período e tente gerar novamente. / Gerar ZIP novamente |
| Exportação — concorrência/expiração | Já há uma exportação sendo preparada. Aguarde a conclusão. / Este ZIP não está mais disponível. Gere novamente. |
| Exportação — recorte vazio | Não encontrado no acervo. Não há mensagens nesse período. Ajuste as datas antes de gerar o ZIP. |
| Sessão expirada | Sua sessão expirou. Entre novamente para acessar o acervo. |
| Campo desconhecido | Não informado pela origem |
| Destructive confirmation | Não aplicável. Fechar aba e sair do site não apagam o acervo; sem confirmação. |

Copy de login, cobertura, autor/direção, citações, originais e revisões permanece no contrato da fase 1. Motivos são sanitizados; nomes e conteúdo nunca entram em HTML ativo. Contagens usam singular/plural correto, não estimativas nem promessa de histórico integral.

## Layout e interação

- Hierarquia: cabeçalho/cobertura herdados → busca e alcance → resultados → abas/leitor → exportação da conversa ativa. A busca tem o CTA preenchido da fase; exportação e preview usam botões neutros. Desktop mantém lista lateral e leitor; resultados ficam no painel de busca acima da grade. No celular, busca/lista/resultados e leitor alternam pela navegação já existente; o retorno preserva filtros, resultados e posição, sem fechar abas.
- Contato: input nativo + ação Localizar conversa + lista de candidatos com nome, tipo, identidade disponível e referência. Cada candidato tem Usar na busca; seleção guarda ID canônico e mostra rótulo completo. Texto digitado sem seleção nunca vira escopo silencioso. Buscar em todo o acervo limpa a seleção e o texto. Localização e busca só ocorrem por ação explícita; nenhum combobox customizado.
- Busca: AND dos filtros, datas abertas ou inclusivas; mostrar filtros efetivos retornados e limites UTC em `details`. Resultados mais recentes primeiro, ordenados pelo servidor; trecho seguro, versão correspondente, conversa, autor/direção, data local, referência e Abrir contexto. Mostrar 50 por página, máximo 100 conforme baseline; não informar total sem contagem retornada. Paginação preserva o recorte congelado; atualizar cria recorte novo de forma explícita.
- Contexto: ativar/reusar aba da conversa canônica, manter resultado histórico separado do estado atual e carregar vizinhas em ambas as direções. Abrir contexto foca a mensagem/âncora com `tabindex=-1`, marca Mensagem localizada e revela histórico correspondente. Falha preserva a leitura anterior; referência ausente não inventa vizinhas. Acrescentar páginas mantém âncora e deslocamento; não salta automaticamente para novas mensagens.
- Abas: estado independente de dados/DOM, snapshot, cursores, âncora, scroll e geração; alternar restaura a posição de cada conversa, inclusive duas simultaneamente abertas. Reabrir conversa ativa a existente; abrir novo contexto nela reposiciona explicitamente. Apenas painel ativo visível, pausa áudio/vídeo ao sair dele. Fechar libera players e dados dessa aba; ativa e foca a próxima, ou anterior, ou a lista se nenhuma restar. Sem localStorage ou persistência de conteúdo.
- Teclado: `tablist` rotulada Conversas abertas, `tab` com `aria-controls/aria-selected`, `tabpanel` com `aria-labelledby`; roving tabindex, setas esquerda/direita e Home/End movem foco, Enter/Espaço ativam. Fechar por Delete e botão separado do botão de aba, rotulado para aquela conversa; nunca aninhar botões. Seleção visível difere de foco. Sem autoplay, foco preso ou animação obrigatória. Referência técnica: [W3C APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), consultada em 2026-10-11.
- Preview: somente após ação, imagem raster com alt de identificação do anexo, áudio/vídeo com controles nativos, `preload=none`, sem autoplay e sem iframe/object/SVG/HTML ativo. Nome/tipo/estado e Baixar original continuam visíveis. Falha de codec não muda disponibilidade do original. Fechar visualização pausa, remove src e devolve foco ao acionador; mídias se ajustam ao painel. Transcrição/legenda gerada fica fora do escopo; texto recebido permanece acessível.
- Exportação: formulário no painel ativo, conversa fixa por ID e datas próprias inicialmente vazias; não inferir recorte do resultado ou da página. Antes de gerar, mostrar conversa e período efetivos; durante geração congelar rótulos e desabilitar nova geração em todas as abas, mantendo leitura/busca disponíveis. Estado preparando/pronto/falhou consultável sem percentual fictício. Download habilitado somente após ZIP conferido; faltantes sempre quantificados, incluindo zero. Erro do polling preserva último estado conhecido, indica impossibilidade de conferir e oferece Tentar conferir novamente; nunca anuncia pronto. Recorte vazio não gera ZIP vazio rotulado como sucesso.
- Segurança/feedback: `role=status` para andamento/conclusão e `role=alert` para erros, `aria-busy` no painel afetado; erro de campo associado por `aria-describedby/aria-invalid` e foco no primeiro inválido. Respostas conferem sessão e geração de busca/aba/job; antigas não renderizam. Logout/expiração removem resultados, candidaturas, abas, filtros privados, previews/src e estados de exportação; revalidar sessão antes de mostrar página restaurada. Falha de rede mantém dados já exibidos com aviso de possível desatualização, sem apagar o acervo ou pedir novo QR.

## UI Considerations

Probe compilado aplicado a oito superfícies; classificação ampliada pelo agente sob --auto. Resoluções explícitas são critérios de aceite, não evidência de execução.

| ID | Elemento | Categoria | Status | Verification | Critério observável |
|---|---|---|---|---|---|
| UC-01 | UI-01 | empty | resolved | explicit | Usar copy de estado vazio correspondente; busca sem filtros cobre todo acervo, lista/contexto vazios não inventam dados e arquivo ausente mantém mensagem; exportação vazia pede novo período. |
| UC-02 | UI-01 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-03 | UI-01 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-04 | UI-01 | populated | resolved | explicit | Item exibe identidade/ref/data e estado reais; resultados abrem âncora; preview tem controles e download; ZIP informa mensagens/arquivos/faltantes reais. |
| UC-05 | UI-01 | partial | resolved | explicit | Exibir campos desconhecidos e limites abertos explicitamente, histórico separado do atual e faltantes; não inferir conteúdo ou restringir contato digitado sem seleção. |
| UC-06 | UI-01 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-07 | UI-01 | zero-one-many | resolved | explicit | Zero usa copy vazia, um usa singular e item completo, muitos usam plural/paginação; duas abas mantêm leitura independente sem limite silencioso de duas. |
| UC-08 | UI-01 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-09 | UI-02 | empty | resolved | explicit | Usar copy de estado vazio correspondente; busca sem filtros cobre todo acervo, lista/contexto vazios não inventam dados e arquivo ausente mantém mensagem; exportação vazia pede novo período. |
| UC-10 | UI-02 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-11 | UI-02 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-12 | UI-02 | partial | resolved | explicit | Exibir campos desconhecidos e limites abertos explicitamente, histórico separado do atual e faltantes; não inferir conteúdo ou restringir contato digitado sem seleção. |
| UC-13 | UI-02 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-14 | UI-02 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-15 | UI-03 | empty | resolved | explicit | Usar copy de estado vazio correspondente; busca sem filtros cobre todo acervo, lista/contexto vazios não inventam dados e arquivo ausente mantém mensagem; exportação vazia pede novo período. |
| UC-16 | UI-03 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-17 | UI-03 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-18 | UI-03 | populated | resolved | explicit | Item exibe identidade/ref/data e estado reais; resultados abrem âncora; preview tem controles e download; ZIP informa mensagens/arquivos/faltantes reais. |
| UC-19 | UI-03 | partial | resolved | explicit | Exibir campos desconhecidos e limites abertos explicitamente, histórico separado do atual e faltantes; não inferir conteúdo ou restringir contato digitado sem seleção. |
| UC-20 | UI-03 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-21 | UI-03 | zero-one-many | resolved | explicit | Zero usa copy vazia, um usa singular e item completo, muitos usam plural/paginação; duas abas mantêm leitura independente sem limite silencioso de duas. |
| UC-22 | UI-03 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-23 | UI-04 | empty | resolved | explicit | Usar copy de estado vazio correspondente; busca sem filtros cobre todo acervo, lista/contexto vazios não inventam dados e arquivo ausente mantém mensagem; exportação vazia pede novo período. |
| UC-24 | UI-04 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-25 | UI-04 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-26 | UI-04 | populated | resolved | explicit | Item exibe identidade/ref/data e estado reais; resultados abrem âncora; preview tem controles e download; ZIP informa mensagens/arquivos/faltantes reais. |
| UC-27 | UI-04 | partial | resolved | explicit | Exibir campos desconhecidos e limites abertos explicitamente, histórico separado do atual e faltantes; não inferir conteúdo ou restringir contato digitado sem seleção. |
| UC-28 | UI-04 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-29 | UI-04 | zero-one-many | resolved | explicit | Zero usa copy vazia, um usa singular e item completo, muitos usam plural/paginação; duas abas mantêm leitura independente sem limite silencioso de duas. |
| UC-30 | UI-04 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-31 | UI-05 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-32 | UI-05 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-33 | UI-05 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-34 | UI-05 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-35 | UI-06 | empty | resolved | explicit | Usar copy de estado vazio correspondente; busca sem filtros cobre todo acervo, lista/contexto vazios não inventam dados e arquivo ausente mantém mensagem; exportação vazia pede novo período. |
| UC-36 | UI-06 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-37 | UI-06 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-38 | UI-06 | populated | resolved | explicit | Item exibe identidade/ref/data e estado reais; resultados abrem âncora; preview tem controles e download; ZIP informa mensagens/arquivos/faltantes reais. |
| UC-39 | UI-06 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-40 | UI-07 | empty | resolved | explicit | Usar copy de estado vazio correspondente; busca sem filtros cobre todo acervo, lista/contexto vazios não inventam dados e arquivo ausente mantém mensagem; exportação vazia pede novo período. |
| UC-41 | UI-07 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-42 | UI-07 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-43 | UI-07 | partial | resolved | explicit | Exibir campos desconhecidos e limites abertos explicitamente, histórico separado do atual e faltantes; não inferir conteúdo ou restringir contato digitado sem seleção. |
| UC-44 | UI-07 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-45 | UI-07 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |
| UC-46 | UI-08 | loading | resolved | explicit | Status textual e aria-busy no painel afetado; desabilitar apenas ação duplicada em voo e permitir leitura/navegação; preview só após ação e geração ZIP sem percentual fictício. |
| UC-47 | UI-08 | error | resolved | explicit | Erro com copy e ação de repetição; manter leitura anterior, fallback para download no codec, e nunca anunciar ZIP pronto após falha; sessão inválida limpa toda superfície privada. |
| UC-48 | UI-08 | overflow | resolved | explicit | Página tem cursor estável 50/100, ancoragem preservada; somente tablist rola horizontalmente em320/768/1280 e mensagens/painéis quebram textos longos. |
| UC-49 | UI-08 | long-text | resolved | explicit | Textos/nomes/referências ficam completos e selecionáveis com overflow-wrap:anywhere, dir=auto e reflow; não gerar HTML de conteúdo recebido. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Nenhum | Nenhum | Não aplicável — Tool: none; frontend nativo confirmado em 2026-10-11 |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** approved 2026-10-11 — 7/7 dimensões; QA renderizada pendente de execução

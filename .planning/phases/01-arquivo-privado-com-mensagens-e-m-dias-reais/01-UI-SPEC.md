---
phase: "1"
slug: "arquivo-privado-com-mensagens-e-m-dias-reais"
status: approved
reviewed_at: "2026-10-10T20:21:06Z"
shadcn_initialized: false
preset: none
created: "2026-10-10"
---

# Fase 1 — Contrato visual e de interação

Contrato prescritivo para o arquivo privado básico do Zap MCP. As decisões visuais sem definição anterior são padrões escolhidos pelo agente sob `gsd-ui-phase 1 --auto`; não constituem respostas individuais do proprietário nem evidência de implementação.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | Não aplicável |
| Component library | Nenhuma; HTML semântico, CSS próprio e APIs nativas do navegador |
| Icon library | Nenhuma; ações com rótulos textuais |
| Font | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |

**Detecção em 2026-10-10:** `rg --files --hidden -g '!.git' -g '!node_modules' -g '!.planning/**'` encontrou somente README.md, AGENTS.md e .gitignore. Não existem código de UI, dependências instaladas, CSS, tokens, components.json, Tailwind ou componentes a reutilizar. Diretórios locais `.codex/skills/` e `.agents/skills/` ausentes; `agent_skills` vazio no config. Gate shadcn não aplicável: a arquitetura definida usa UI nativa, sem React/Next/Vite. Inventário de pacote omitido por `Tool: none`.

### Proveniência e limite

| Fonte | Decisões usadas |
|-------|----------------|
| AGENTS.md e REQUIREMENTS.md | Privacidade, somente leitura, dados não confiáveis, evidências, campos desconhecidos e estados de mídia |
| ROADMAP.md e STATE.md | Fase 1 atual; critérios de piloto e separação das fases seguintes |
| 01-CONTEXT.md D-01–D-04 | Senha de um proprietário, sessão privada, logout local e recuperação operacional |
| 01-CONTEXT.md D-05–D-08 | QR atual privado e seis estados de conexão; reconexão sem apagar o acervo |
| 01-CONTEXT.md D-09–D-12 | Cobertura observada, alterações retidas, temporárias e visualização única |
| 01-CONTEXT.md D-13–D-20 | Quatro originais, fila e falhas, uma conversa, proveniência, cópia antes do QR e piloto real |
| 01-RESEARCH.md Standard Stack e Patterns 2–6 | Site nativo, DTO seguro, consultas limitadas, QR efêmero, verificação dos arquivos e gate pré-piloto |
| Discrição do contexto + invocação --auto | Espaçamento, tipografia, cores, layout, limites iniciais de páginas e copy abaixo |
| components.json | Ausente; não inicializar biblioteca visual |
| Respostas individuais nesta etapa | 0; decisões operacionais autônomas |

Inclui login/logout, estado da conexão e QR privado, cobertura e falhas, lista de conversas, leitor único e download privado do original. Busca/filtros, abas de comparação, preview integrado completo, exportação, MCP e painéis de gestão da fila permanecem nas fases previstas. Não incluir envio, edição, exclusão, confirmação de leitura, cadastro ou recuperação por e-mail.

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Separação entre rótulo e valor |
| sm | 8px | Linhas de metadados e controles adjacentes |
| md | 16px | Padding de itens, mensagens e margem da página no celular |
| lg | 24px | Padding dos painéis e grupos de formulário |
| xl | 32px | Gutter da grade e margem da página no desktop |
| 2xl | 48px | Separação entre áreas principais |
| 3xl | 64px | Respiro superior do login em telas largas |

Exceptions: nenhuma para gaps/margens/padding. Dimensões de layout não são espaçamento: controles com alvo mínimo de 48 × 48px; separadores e bordas com 1px, foco com outline de 2px e offset de 2px, cantos com raio de 4px. Links em linha podem ter alvo textual natural; controles de navegação e download usam 48px de altura mínima.

## Typography

Exatamente quatro tamanhos e dois pesos: 14/16/20/28px; 400/600. Declarar em rem equivalentes, com raiz padrão de 16px e respeito ao zoom. Não carregar fontes externas.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px / 1rem | 400 | 1.5 |
| Label e metadados | 14px / 0.875rem | 400; 600 para rótulos | 1.5 |
| Heading de seção/conversa | 20px / 1.25rem | 600 | 1.2 |
| Display / título da página | 28px / 1.75rem | 600 | 1.2 |

Botões usam 16px/600; texto recebido usa 16px/400. Referências e datas ficam selecionáveis, sem obrigar fonte monoespaçada. O conteúdo das mensagens mantém quebras com `white-space: pre-wrap`, `overflow-wrap: anywhere` e direção automática para o texto recebido.

## Color

Tema claro único. A distribuição 60/30/10 define hierarquia aproximada; acento ocupa no máximo a parcela indicada, sem preencher áreas para atingir uma porcentagem.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F5F6F7 | Fundo geral e espaços entre áreas |
| Secondary (30%) | #FFFFFF | Login, lista, leitor e área do QR |
| Accent (10%) | #155E75 | CTA principal da tela, download disponível, marcador da conversa atual e foco |
| Destructive | Não aplicável | Nenhuma ação destrutiva nesta fase |
| Texto principal | #17212B | Mensagens, títulos, rótulos e estados |
| Texto secundário | #4B5563 | Metadados, ajuda e limites conhecidos |
| Borda de controle | #66717F | Input e limites identificáveis de botões secundários |
| Separador decorativo | #D7DCE1 | Divisão de mensagens/painéis; não indica estado sozinho |

Accent reserved for: botão “Entrar no acervo”, link “Baixar original”, barra de 4px da conversa selecionada e indicador de foco. Navegação secundária, conexão e falhas usam texto neutro explícito, sem cores adicionais. Branco sobre o acento; texto principal/secundário sobre as duas superfícies claras. Não usar verde como prova de cobertura, nem vermelho para revogação histórica. Estado e seleção sempre têm rótulo ou marca estrutural.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Entrar no acervo |
| Título do login | Zap MCP — arquivo privado |
| Campo do login | Senha |
| Ajuda do login | Acesso exclusivo do proprietário. |
| Senha vazia | Informe a senha para entrar. |
| Senha recusada | Não foi possível entrar. Confira a senha e tente novamente. |
| Login limitado | Muitas tentativas. Aguarde o prazo indicado e tente novamente. |
| Login em andamento | Entrando no acervo… |
| Sessão expirada | Sua sessão expirou. Entre novamente para acessar o acervo. |
| Logout | Sair do site |
| Ajuda do logout | Sair do site mantém o coletor e o acervo. |
| Logout com falha | Não foi possível encerrar a sessão. Tente sair novamente. |
| Empty state heading | Nenhuma conversa no acervo |
| Empty state body | As conversas aparecerão quando mensagens forem recebidas e arquivadas. Confira o estado da conexão. |
| Leitor sem seleção | Abra uma conversa da lista para ler as mensagens arquivadas. |
| Conversa vazia | Não encontrado no acervo. Esta conversa ainda não tem mensagens arquivadas. |
| Leitura em andamento | Carregando conversas… / Carregando mensagens… |
| Error state | Não foi possível carregar o acervo. Tente carregar novamente. |
| CTA de erro de leitura | Tentar carregar novamente |
| Erro de acesso à referência | Não encontrado no acervo. Volte à lista de conversas. |
| Destructive confirmation | Não aplicável; não há excluir, desvincular ou limpar acervo. Logout não pede confirmação. |
| QR — orientação | No WhatsApp do celular, abra Dispositivos conectados e leia este QR. |
| QR carregando | Aguardando um QR válido… |
| QR vencido | Este QR expirou. Aguarde um novo código. |
| QR antes da cópia conferida | Pareamento ainda indisponível. A preparação da cópia recuperável precisa ser concluída no host. |
| QR removido após conectar | Conta vinculada. O arquivo mostra apenas o material efetivamente recebido. |
| Sessão WhatsApp inválida | O vínculo precisa ser refeito no celular. O material já arquivado continua disponível. |
| Desconectado | WhatsApp desconectado. Você pode consultar o material já arquivado. |
| Reconectando | Reconectando ao WhatsApp. Novas capturas podem demorar; o acervo salvo continua disponível. |
| Falha de acesso ao servidor | Sem acesso ao servidor. O conteúdo exibido pode estar desatualizado. Tente carregar novamente quando a conexão voltar. |
| Conexão retomada no navegador | Acesso ao servidor restabelecido. Atualize os dados para conferir o estado atual. |
| Cobertura | Cobertura observada; este intervalo não garante histórico integral da conta. |
| Sem ingestão confirmada | Nenhuma ingestão confirmada ainda. |
| Intervalo ausente | Intervalo observado ainda desconhecido. |
| Lote concluído | Lote recebido concluído; a cobertura da conta continua limitada ao material recebido. |
| Contagem de lote | {arquivadas} de {recebidas} mensagens recebidas arquivadas neste lote. |
| Lote incompleto | Há itens deste lote ainda não arquivados. Confira as falhas conhecidas. |
| Falha de ingestão | A captura encontrou uma falha. Alguns itens recebidos podem não ter sido arquivados. O acervo anterior permanece disponível. |
| Falta de espaço | Sem espaço para novos arquivos. Downloads pausados; o material já salvo foi preservado. Libere espaço no host para permitir a retomada. |
| Sem falhas registradas | Nenhuma falha conhecida registrada. |
| Originais disponíveis | Disponível — arquivo finalizado e verificado. |
| CTA de anexo disponível | Baixar original |
| Anexo pendente | Pendente — o original ainda não foi preservado. |
| Anexo em andamento | Pendente — download em andamento. |
| Anexo recuperável | Falha recuperável — {motivo seguro}. Tentativas: {realizadas}/{limite}. |
| Fila aguardando conexão | A retomada aguarda conexão com o WhatsApp. |
| Anexo indisponível | Indisponível — {motivo seguro}. A mensagem permanece no acervo. |
| Download recusado/falho | Não foi possível baixar o original. Confira o estado do anexo e tente novamente se ele estiver disponível. |
| Nome de arquivo ausente | Nome original não informado |
| Campo desconhecido | Não informado pela origem |
| Autor desconhecido | Autor não informado pela origem |
| Conversa sem nome | Conversa sem nome recebido |
| Direções conhecidas | Recebida / Enviada pelo celular |
| Direção desconhecida | Direção não informada pela origem |
| Tipo desconhecido | Tipo não reconhecido; conteúdo disponível limitado aos campos recebidos. |
| Citação incompleta | Citação recebida; original ainda não relacionado/conferido. |
| Mensagem editada | Editada; alteração observada em {data}. |
| Mensagem revogada | Revogada no WhatsApp; revogação observada em {data}. |
| Histórico de alterações | Ver histórico recebido |
| Rótulo de conteúdo anterior | Conteúdo anteriormente capturado — registro histórico |
| Ordem incerta de alterações | Ordem das alterações incerta; os registros recebidos foram preservados. |
| Mensagem temporária | Mensagem temporária; conteúdo capturado enquanto disponível. |
| Visualização única | Visualização única — conteúdo indisponível; somente metadados recebidos. |
| Navegação básica | Voltar às conversas / Carregar conversas seguintes / Carregar mensagens anteriores |
| Novas mensagens | Há novas mensagens arquivadas. Atualizar conversa |
| Fim de janela | Não há mais mensagens arquivadas nesta direção. |

Variáveis só usam valores do DTO seguro. Se motivo/tentativas/contagem não vierem da fonte ou do estado interno confirmado, exibir a ausência correspondente; não preencher números fictícios, prazos de QR, nomes ou autoria. Quando login for limitado, apresentar prazo somente se fornecido pelo servidor.

## Layout e componentes nativos

**Prioridade visual:** durante o pareamento, QR vigente e instrução são a âncora principal; durante a leitura, título e conteúdo da conversa são a âncora principal. Cobertura e estado permanecem visíveis como evidência auxiliar, sem dominar o leitor.

| Elemento | Contrato |
|----------|----------|
| Formulário de login | Card de largura máxima 400px, margem lateral 16px; um `form`, `label` visível, `input type=password` com `autocomplete=current-password` e botão submit. Sem e-mail, cadastro ou botão de recuperação. |
| Cabeçalho autenticado | Nome Zap MCP, subtítulo “Arquivo privado”, ação “Sair do site”; permite quebra de linha. Link inicial “Ir para as mensagens”. |
| Estado e cobertura | Seção acima da leitura com estado textual, última ingestão confirmada, intervalo observado, lotes e falhas conhecidas. Usar `dl` e lista simples; sem dashboard, gráficos ou percentuais de histórico. |
| QR | Aparece somente autenticado, quando vínculo precisa de QR e cópia pré-piloto foi conferida. Imagem de lado 256px incluindo margem branca do encoder, `max-width:100%`, sem interpolação que borre os módulos. Texto alternativo descreve a função, nunca o payload. |
| Lista de conversas | `nav` com nome “Conversas arquivadas” e `ul` de links; cada item mostra nome, tipo individual/grupo se conhecido, identidade segura recebida e última data original conhecida. Nomes iguais ficam como itens distintos com referência própria. Sem avatar remoto, busca ou filtro. |
| Leitor | Uma `section` rotulada pelo título da conversa, mensagens em `ol`, cada mensagem como `article` com cabeçalho de autoria/direção/data, texto/legenda, citação e anexos. Lista cronológica dentro da janela. Aparência de documento com divisores, sem composer ou balões que sugiram conversa ao vivo. |
| Evidência por mensagem | Referência estável e tipo visíveis; `details` “Detalhes da evidência” contém chave de origem em campos permitidos, identidade recebida PN/LID quando presente, instante original UTC/offset, recebimento, tamanho/hash disponíveis e limitações. Nunca envelope bruto, chave criptográfica, caminho de arquivo ou URL de origem da mídia. |
| Histórico | Estado editada/revogada e momento de observação visíveis; `details` com rótulo “Ver histórico recebido” mantém conteúdo anterior identificado e datas de observação próprias. Revogada não aparece como texto atual; histórico anterior nunca inclui conteúdo restrito de visualização única. |
| Citação | `blockquote` com autoria/texto recebidos e qualificação da ausência do original; não fabricar navegação ou anexos citados. Texto recebido permanece texto. |
| Anexo | Bloco textual: tipo, nome recebido ou ausência, estado, tamanho conhecido, motivo seguro e tentativas quando disponíveis. Link privado por ID interno apenas se o estado for disponível. Nenhum player, thumbnail remoto ou preview integrado nesta fase. |
| Controles secundários | Botões/links com texto, borda neutra, altura mínima 48px. Acesso a anexo pendente/indisponível é substituído pelo estado textual; não usar link inoperante ou botão que dispare bypass. |

**Desktop ≥768px:** container de até 1280px, margem externa 32px; grade de lista de 288px + gutter de 32px + leitor `minmax(0,1fr)`. Texto da mensagem limitado a 80ch. Painéis brancos com separadores, sem sombras decorativas. Cabeçalho/status seguem o fluxo da página, sem sobrepor o foco.

**Celular <768px:** margem de 16px e uma coluna; na lista nenhuma conversa está aberta. Abrir uma conversa mostra o leitor único e link “Voltar às conversas”; voltar preserva o ponto da lista durante a sessão autenticada. Status/cobertura continua acessível antes da leitura; QR fica acima da lista quando necessário. Sem drawer, tabs ou modal. Usar navegação real ou History API somente para lista/leitor; cookies de sessão permanecem exclusivamente sob controle do servidor.

**Leitura limitada:** padrão inicial de 50 conversas por janela e 100 mensagens por janela, nunca todo o acervo. Leitor abre a janela mais recente, em ordem cronológica com referência como desempate; “Carregar mensagens anteriores” percorre o cursor retornado sem inventar fim ou perder o ponto atual. Cursores e limites são validados pelo backend. Não criar busca, paginação numerada ou contrato completo de resultados da fase 2. Novas mensagens não deslocam leitura/foco: exibir a ação “Atualizar conversa” somente quando informadas pelo servidor.

## Interação, estados e privacidade

- **Login:** senha vazia recebe erro junto ao campo; submit em andamento mostra rótulo próprio e impede duplicação. Erro não recarrega acervo nem imprime a senha. Após sucesso, abrir lista privada; após logout confirmado, mostrar login e remover conteúdo privado do DOM/memória da página. Falha de logout informa que a sessão não foi encerrada.
- **Sessão expirada:** qualquer resposta de autenticação negada em consulta/status/QR/download encerra a visualização privada e leva ao login com copy de sessão expirada. Não confundir com conversa inexistente; não revelar títulos de conversa na página pública. Não persistir acervo/QR em localStorage, sessionStorage, IndexedDB, service worker ou cache offline próprio.
- **Conexão:** renderizar os seis estados recebidos: “Aguardando pareamento”, “Conectando”, “Conectado”, “Reconectando”, “Desconectado”, “Sessão inválida”. Não inferir estado pelo número de conversas. Reconexão é operacional e automática; UI só consulta. “Conectado” não altera cobertura para completa.
- **QR:** usar QR atual e validade informados pelo servidor; remover a imagem ao expirar, trocar geração/socket, conectar ou perder sessão. Enquanto aguarda substituição, mostrar copy de QR vencido/carregando sem reutilizar código antigo. Falha ao conferir atualidade oculta o QR até confirmação. Não salvar, copiar, imprimir, logar ou mostrar payload como texto. Consulta de status/QR não desloca foco; não inventar contador de validade.
- **Pré-piloto:** sem comprovação da cópia recuperável, mostrar bloqueio informativo do pareamento. Não criar botão que dispense esse gate nem tela de backup.
- **Cobertura:** mostrar última ingestão duravelmente confirmada separada de estado de conexão; intervalo usa datas originais mín/máx conhecidas. Lotes mostram recebidos/arquivados e falhas, com conclusão qualificada; relógio de edição/ingestão não substitui instante original. Falhas parciais permanecem acima do leitor sem apagar dados já carregados.
- **Offline:** WhatsApp desconectado com servidor disponível mantém lista, mensagens e originais salvos operantes. Falta de conexão navegador–servidor mantém somente a leitura já renderizada com aviso de desatualização, oculta QR e permite nova tentativa; não promete download ou acervo offline no navegador. Ao retomar rede, consultar o servidor para validar sessão/estado, sem deduzir autenticação ou conexão pelo evento de rede.
- **Originais:** disponibilidade exige finalização e integridade confirmadas pelo backend. Mostrar hash local e resultado da comparação com a origem separadamente; hash de origem ausente fica explícito. Download é resposta autenticada com `Content-Disposition: attachment`, inclusive para HTML/SVG; nunca abrir conteúdo ativo na origem do app. Falha não marca sucesso nem altera a mensagem.
- **Campos/datas:** todas as datas exibidas em `dd/MM/yyyy HH:mm:ss`, 24h, com rótulo visível “America/Sao_Paulo” no leitor/cobertura e ISO original/UTC nos detalhes. Preservar instante; não usar data de ingestão como substituto. Ausência recebe copy explícita. IDs/nome/PN/LID não se fundem por semelhança. Autoria de grupo usa participante recebido; direção enviada deve dizer “Enviada pelo celular”.
- **Conteúdo:** inserir texto com escape/textContent; sem HTML de conversa, autoexecução, embeddeds remotos, imagens de perfil ou linkificação automática. Mensagens temporárias comuns recebidas são identificadas; visualização única tem apenas metadados permitidos e nenhum botão de recuperação. Erros mostram motivos sanitizados, sem stack trace, caminho do host, sessão ou segredo.

## Acessibilidade e verificação visual

Idioma `pt-BR`, hierarquia h1/h2, landmarks `header/nav/main`, labels associados e `time datetime` com instante original. Tab percorre ações na ordem visual; Enter ativa links/botões e o formulário; `details/summary` usa comportamento nativo. Seleção atual usa `aria-current` e marcador textual/estrutural. Ao abrir conversa, mover foco ao título com `tabindex=-1`; ao voltar, retornar ao item correspondente da lista. Sem captura do teclado ou foco automático em mensagens novas.

Foco usa outline de 2px #155E75 com offset de 2px, visível nas superfícies claras. Erros de submit/carregamento usam `role=alert` apenas ao surgir; mudanças resumidas de conexão e loading usam `role=status`/`aria-live=polite`. Não anunciar o conteúdo inteiro do leitor ou cada consulta de status. Regiões em carregamento usam `aria-busy`; manter dimensões e texto simples, sem skeleton/animador. Respeitar `prefers-reduced-motion`; não usar scroll suave obrigatório ou flashes.

Texto tem contraste mínimo de 4,5:1; foco/limites de controle pelo menos 3:1. A meta do projeto de 48px para controles excede o mínimo WCAG e mantém ações confortáveis. Referências oficiais consultadas em 2026-10-10: [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [tamanho de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [foco visível](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html). Esses critérios orientam os checks; este documento não certifica conformidade.

Verificação na execução: 320px, 768px e 1280px; zoom de 200%; teclado completo; nome/arquivo/ID sem espaços; texto multilinha extenso; 0/1/muitas conversas; desconhecidos; edição/revogação/citação incompleta; quatro estados de anexo; QR atual/vencido; logout e sessão expirada; WhatsApp offline com servidor disponível e navegador sem acesso ao servidor. Evidência só sintética nos artefatos públicos; piloto real permanece privado.

## UI Considerations

Probe determinístico executado após revisão: 45 considerações resolvidas explicitamente. Em `--auto`, o agente conferiu os tipos múltiplos por overrides. Critérios abaixo são propostos para execução e não provam UI implementada; copy permanece em Copywriting Contract.

| Element ID | Elemento / tipos | Categoria | Status | Verification | Truth |
|---|---|---|---|---|---|
| E1 | Formulário de login (form, interactive-control) | empty | resolved | explicit | E1: Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. |
| E1 | Formulário de login (form, interactive-control) | loading | resolved | explicit | E1: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E1 | Formulário de login (form, interactive-control) | error | resolved | explicit | E1: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E1 | Formulário de login (form, interactive-control) | partial | resolved | explicit | E1: Campos/citações desconhecidos e lotes incompletos têm indicação explícita; nenhuma ausência é preenchida por inferência. |
| E1 | Formulário de login (form, interactive-control) | long-text | resolved | explicit | E1: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |
| E2 | Cabeçalho autenticado e navegação (nav, interactive-control, static-content) | loading | resolved | explicit | E2: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E2 | Cabeçalho autenticado e navegação (nav, interactive-control, static-content) | error | resolved | explicit | E2: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E2 | Cabeçalho autenticado e navegação (nav, interactive-control, static-content) | overflow | resolved | explicit | E2: Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. |
| E2 | Cabeçalho autenticado e navegação (nav, interactive-control, static-content) | long-text | resolved | explicit | E2: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |
| E3 | Estado e cobertura (list-collection, static-content) | empty | resolved | explicit | E3: Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. |
| E3 | Estado e cobertura (list-collection, static-content) | loading | resolved | explicit | E3: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E3 | Estado e cobertura (list-collection, static-content) | error | resolved | explicit | E3: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E3 | Estado e cobertura (list-collection, static-content) | populated | resolved | explicit | E3: Conteúdo usa o elemento semântico do contrato, IDs e estados recebidos; anexos só têm link quando finalizados e verificados. |
| E3 | Estado e cobertura (list-collection, static-content) | partial | resolved | explicit | E3: Campos/citações desconhecidos e lotes incompletos têm indicação explícita; nenhuma ausência é preenchida por inferência. |
| E3 | Estado e cobertura (list-collection, static-content) | overflow | resolved | explicit | E3: Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. |
| E3 | Estado e cobertura (list-collection, static-content) | zero-one-many | resolved | explicit | E3: Zero usa estado vazio; um mantém o mesmo item; muitos usam janelas/cursor e limites 50/100, com pluralização correta. |
| E3 | Estado e cobertura (list-collection, static-content) | long-text | resolved | explicit | E3: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |
| E4 | QR (media, static-content) | empty | resolved | explicit | E4: Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. |
| E4 | QR (media, static-content) | loading | resolved | explicit | E4: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E4 | QR (media, static-content) | error | resolved | explicit | E4: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E4 | QR (media, static-content) | populated | resolved | explicit | E4: Conteúdo usa o elemento semântico do contrato, IDs e estados recebidos; anexos só têm link quando finalizados e verificados. |
| E4 | QR (media, static-content) | overflow | resolved | explicit | E4: Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. |
| E4 | QR (media, static-content) | long-text | resolved | explicit | E4: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |
| E5 | Lista de conversas (list-collection, nav) | empty | resolved | explicit | E5: Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. |
| E5 | Lista de conversas (list-collection, nav) | loading | resolved | explicit | E5: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E5 | Lista de conversas (list-collection, nav) | error | resolved | explicit | E5: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E5 | Lista de conversas (list-collection, nav) | populated | resolved | explicit | E5: Conteúdo usa o elemento semântico do contrato, IDs e estados recebidos; anexos só têm link quando finalizados e verificados. |
| E5 | Lista de conversas (list-collection, nav) | partial | resolved | explicit | E5: Campos/citações desconhecidos e lotes incompletos têm indicação explícita; nenhuma ausência é preenchida por inferência. |
| E5 | Lista de conversas (list-collection, nav) | overflow | resolved | explicit | E5: Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. |
| E5 | Lista de conversas (list-collection, nav) | zero-one-many | resolved | explicit | E5: Zero usa estado vazio; um mantém o mesmo item; muitos usam janelas/cursor e limites 50/100, com pluralização correta. |
| E5 | Lista de conversas (list-collection, nav) | long-text | resolved | explicit | E5: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | empty | resolved | explicit | E6: Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | loading | resolved | explicit | E6: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | error | resolved | explicit | E6: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | populated | resolved | explicit | E6: Conteúdo usa o elemento semântico do contrato, IDs e estados recebidos; anexos só têm link quando finalizados e verificados. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | partial | resolved | explicit | E6: Campos/citações desconhecidos e lotes incompletos têm indicação explícita; nenhuma ausência é preenchida por inferência. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | overflow | resolved | explicit | E6: Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | zero-one-many | resolved | explicit | E6: Zero usa estado vazio; um mantém o mesmo item; muitos usam janelas/cursor e limites 50/100, com pluralização correta. |
| E6 | Leitor, evidência, histórico e citação (list-collection, static-content, interactive-control) | long-text | resolved | explicit | E6: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |
| E7 | Anexo e controles secundários (media, interactive-control, nav, static-content) | empty | resolved | explicit | E7: Estado vazio usa o rótulo correspondente de Copywriting Contract; sem dados não fabrica conversa, campos ou QR. |
| E7 | Anexo e controles secundários (media, interactive-control, nav, static-content) | loading | resolved | explicit | E7: Carregamento usa Copywriting Contract; submissões não duplicam e atualizações não movem foco ou leitura. |
| E7 | Anexo e controles secundários (media, interactive-control, nav, static-content) | error | resolved | explicit | E7: Erro usa Copywriting Contract; consulta falha preserva leitura anterior; autenticação negada remove dados privados e QR não confirmado é ocultado. |
| E7 | Anexo e controles secundários (media, interactive-control, nav, static-content) | populated | resolved | explicit | E7: Conteúdo usa o elemento semântico do contrato, IDs e estados recebidos; anexos só têm link quando finalizados e verificados. |
| E7 | Anexo e controles secundários (media, interactive-control, nav, static-content) | overflow | resolved | explicit | E7: Painéis e controles quebram linha em uma coluna no celular, com minmax(0,1fr), sem truncar evidências nem causar rolagem horizontal. |
| E7 | Anexo e controles secundários (media, interactive-control, nav, static-content) | long-text | resolved | explicit | E7: Texto, IDs, hashes e nomes longos quebram com overflow-wrap:anywhere; mensagens mantêm quebras, controles refluem e senha mantém máscara. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Nenhum | Nenhum | Não aplicável — Tool: none; verificado em 2026-10-10; sem inicialização shadcn, registry ou bloco terceiro |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: FLAG não bloqueante — prioridade visual explicitada após revisão
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** approved 2026-10-10 — checker: 6 PASS + 1 FLAG não bloqueante (hierarquia visual agora explicitada)

**Limite da entrega:** contrato aprovado para planejamento; nenhuma UI, integração, conta real ou VPS validada por este documento.

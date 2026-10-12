# Fase 2 — UI Review

## Reauditoria do delta G-02-6 — 2026-10-12

**Fonte auditada:** `e0d921c`, delta de produto desde `1a5b7c8`; `public/app.js`, `public/style.css` e `test/ui.test.ts` sem alterações locais no momento da leitura. Baseline: `02-UI-SPEC.md` aprovado. Histórico abaixo preservado.

**Screenshots:** capturadas anteriormente pelo harness sintético e inspecionadas em pixels nesta reauditoria: `dist/02-02-ui-320.png`, `dist/02-02-ui-768.png`, `dist/02-02-ui-1280.png` e `dist/02-02-ui-zoom200.png`, geradas em `test/ui.test.ts:345-346`. Nenhuma captura nova ou de conversa privada feita pelo auditor. `git check-ignore` confirmou `dist/`; `.planning/ui-reviews/.gitignore` já contém os oito padrões de proteção. Detecção atual: localhost:3000 HTTP 200, 5173/8080 HTTP 000; não capturar a instância privada foi uma restrição explícita desta revisão.

**Interaction captures:** off (`interaction_capture: false`). Imagens pós-interação do harness e prova CUA upstream são fontes distintas; o driver de interaction capture não foi executado.

### Pillar Scores — resultado atual

| Pillar | Score | Evidência específica do delta |
|---|---|---|
| Copywriting | 4/4 | Nenhuma string de produto alterada; nomes completos permanecem no texto da aba e no nome acessível de Fechar (`public/app.js:327-328`). Imagens mantêm Fechar, referências e Exportar conversa legíveis. |
| Visuals | 4/4 | Barra branca opaca, seleção por borda e três abas distintas na imagem 1280; Fechar permanece abaixo de cada nome. Em 320/768 há rolagem horizontal local prevista, sem corte do documento. `public/style.css:48-51`; foco alcançável e contorno de 2px verificados na matriz (`test/ui.test.ts:364-369`). |
| Color | 4/4 | Delta acrescenta somente branco contratual à barra; nenhuma cor nova ou novo uso de accent. Accent aparece em cinco regras CSS (`public/style.css:15,17,29,43,51`), reservado a CTA/download/seleção/foco; distribuição aproximada visual, sem mensuração pixel a pixel. |
| Typography | 4/4 | Permanecem quatro tamanhos/400 e 600; white-space/pre-wrap, dir=auto e seleção de texto preservados. Imagem 200% mostra reflow do nome e Fechar; restante do nome é acessível por scroll local, não eliminado/truncado no DOM (`public/style.css:50`; `test/ui.test.ts:380-387`). |
| Spacing | 4/4 | Gap 8px, padding 4px e margem 16px conservam escala; 50vh e a fórmula de altura são dimensões de contenção, não novos tokens de gap. Scroll-margin inclui 16px da escala. Matriz confirma barra ≤ metade do viewport e Fechar ≥48×48 sem obstrução (`test/ui.test.ts:378-390`). |
| Experience Design | 4/4 | Restauração por gesto nativo <2px, foco separado de seleção, Enter/Espaço, Delete/Fechar e âncora alinhada ao início demonstrados; guard/tickets e estado por aba preservados (`public/app.js:414`; `test/ui.test.ts:352-399`). |

**Overall atual: 24/24. BLOCKERs: 0. WARNINGs: 0.** Nenhum defeito concreto novo encontrado neste delta; notas preservadas com evidência atual, sem elevar pontuação por média. Não há três correções de produto a inventar: prioridades abertas 0 e recomendações menores abertas 0. Os três fixes históricos resolvidos permanecem abaixo.

### UC-23 a UC-34 e evidência de interação

- **UC-23/24/25/26/27 (vazio, loading, erro, preenchido e parcial):** delta não altera copy/estados, renderContext nem guards de sessão/geração. Fixture em `test/ui.test.ts:313-351` mantém leitura anterior após erro HTTP, atualização explícita de B sem alterar A, âncora e prepend; loading e respostas tardias continuam cobertos por `:254-312`. Estes estados conservam a avaliação anterior, sem atribuir nova execução real a cada um.
- **UC-28/30/33/34 (overflow e nomes longos):** quatro imagens inspecionadas mostram nomes Unicode/RTL, conteúdo quebrado, barra restrita ao leitor e fechamento visível. O nome extremo ocupa parte da tela, com limite de metade do viewport e rolagem local para ler o texto completo. `overscroll-behavior: contain` evita propagar wheel ao documento no fim do nome. O corte momentâneo de conteúdo sob uma barra sticky durante leitura não demonstra falha de abertura da âncora; a imagem 1280 foi capturada após navegação/refresh/erro e reposicionamento da tablist, não no instante de abertura do contexto.
- **UC-29 (zero/um/muitos) e UC-31/32 (loading/erro de abas):** teste mantém três abas, reuso, isolamento e fechamento sucessivo até devolver foco à lista, sem conteúdo no storage. Loading/erro não ganha estado ou rota nova. Dados/DOM/referências e cursores por conversa seguem independentes.
- **Geometria sintética separada de pixels:** matriz de `test/ui.test.ts:359-394`, 320/768/1280×480 com fonte100/200%, comprova início da âncora top255,59375/256,1875, abaixo da barra bottom239 e dentro do viewport. Mensagens chegam a861px de altura. `focus({preventScroll:true})` seguido de `scrollIntoView({block:'start'})` em `public/app.js:414` evita centralização que ocultava o início. Essas seis combinações têm assertions de geometria; as quatro imagens inspecionadas são capturas de altura900, não screenshots dessa matriz480.
- **CUA real upstream, não execução deste auditor:** `02-06-SUMMARY.md` registra prova autônoma do parent em cópia real offline, viewport1280×720, fonte `e0d921c`: A/B/A56463→56463 e B/A/B45583→45583 por clique físico nas abas visíveis; setas movem foco sem ativar/deslocar; Enter/Delete/Fechar e logout aprovados. Âncora top375,59375 > barra bottom194; snapshot e hash da senha original preservados. Sem confirmação humana atribuída e sem ler conversas privadas nesta auditoria.
- **Divergência da ferramenta preservada:** caminho locator.click da CUA deslocou287px; clique físico produziu delta0. Causa interna não confirmada. Não ampliar threshold nem classificar o locator como prova aprovada. Playwright instalado usa clique nativo na matriz sintética com limite estrito <2px.

### Verificação terminal e limites

Logs existentes lidos, sem repetir testes: `dist/02-06-ui-focused.log` **19 testes/19 pass/0 fail/0 cancelled/0 skipped/0 todo, EXIT_CODE=0**; `dist/02-06-full-tests.log` **144 testes/144 pass/0 fail/0 cancelled/0 skipped/0 todo, EXIT_CODE=0**, fonte final `e0d921c`. A primeira regressão142/144 e a tentativa inválida de TMPDIR continuam registradas no SUMMARY; não foram apagadas nem usadas como GREEN. Nenhum registry: `components.json` ausente, contrato declara Nenhum; auditoria de blocos não aplicável.

Fonte raiz200% é aumento de fonte CSS, não zoom físico/nativo do navegador. Pixels, assertions geométricas e prova real1280×720 não demonstram dispositivos físicos, todas as conversas da conta, zoom nativo, coletor conectado, VPS ou MCP. O auditor não instalou dependência, repetiu suíte, abriu browser privado, implementou correção, modificou metadados globais ou criou commit; ownership limitado a este relatório.

**Arquivos/evidências adicionais auditados:** `02-06-PLAN.md`, `02-06-SUMMARY.md`, diff `1a5b7c8..e0d921c`, fontes e testes mencionados, dois logs terminais e quatro capturas sintéticas. Planos/summaries anteriores, contrato e histórico deste relatório foram consultados como baseline, não revalidação integral da fase.

**Audited:** 2026-10-11 (America/Sao_Paulo)
**Baseline:** 02-UI-SPEC.md aprovado; frontend HTML/CSS/JS nativo.
**Screenshots:** capturas sintéticas existentes inspecionadas: `dist/02-04-ui-{320,768,1280}.png`, `dist/02-04-ui-zoom200.png` e `dist/02-03-ui-320.png`. Origem: `test/ui.test.ts:57-58,110`. Não foram feitas novas capturas; porta 3000 respondeu HTTP 200, 5173/8080 indisponíveis. `dist/` ignorado confirmado com git check-ignore; gate `.planning/ui-reviews/.gitignore` executado antes de qualquer captura nova.
**Interaction captures:** off (interaction_capture: false). As capturas existentes são estados pós-interação do harness sintético, não capturas novas do driver. Evidência real P2-BROWSER considerada pelo relatório sanitizado 02-ACCEPTANCE, sem abrir/copiar imagens ou conteúdo privado.

## Recheck das correções — resultado atual

**Revisão:** 2026-10-11, diff `f517054 → 9f55deb`, após 02-UI-FIX.md. Apenas os quatro avisos e os três pilares afetados foram reavaliados. **Overall atual: 24/24; nenhum BLOCKER/WARNING aberto neste escopo.** A nota inicial 21/24 e seus achados permanecem abaixo como histórico.

| Pillar | Inicial | Atual | Evidência da disposição |
|---|---|---|---|
| Copywriting | 3/4 | 4/4 | UI-01 resolvido: Exportar conversa/Gerar ZIP e “ZIP pronto — 1 mensagem, 0 arquivos incluídos, 0 anexos faltantes” visíveis nas capturas regeneradas 320/768/1280; strings e flexões conferidas em public/app.js:18,26,42,45,62. |
| Visuals | 4/4 | 4/4 | Nota mantida; capturas regeneradas preservam hierarquia e reflow. |
| Color | 4/4 | 4/4 | Nota mantida; nenhuma alteração de paleta. |
| Typography | 4/4 | 4/4 | Nota mantida; nenhuma alteração dos tamanhos/pesos. |
| Spacing | 3/4 | 4/4 | UI-02 resolvido: public/style.css:8 agora usa margin: 0 0 16px; título da exportação e seu espaçamento conferidos nas três capturas atuais. |
| Experience Design | 3/4 | 4/4 | UI-03/UI-04 resolvidos: IDs de erro/período por conversa e aria-describedby em public/app.js:43-55; alert em falhas e status na retomada em :217-235,371-397. As duas provas DOM reforçadas em test/ui.test.ts verificam associação/foco e transições reais HTTP/rede/repetição. |

Reinspecionadas por view_image as três `dist/02-04-ui-{320,768,1280}.png` regeneradas pelo harness, com texto novo e h3 corrigido; imagens permanecem sintéticas/ignoradas. Aumento de nota visual/spacing não depende só de assertions: a correção renderizada foi inspecionada. Associação acessível e papéis de live regions foram conferidos no diff/código e nas assertions DOM executadas, propriedades que screenshots não demonstram.

02-UI-FIX registra UI 15/15 e alvos reforçados 2/2; `dist/02-ui-fix-full-tests.log` foi lido e confirma regressão 132/132, zero fail/skip/todo. Nenhum teste foi repetido neste recheck. Seletor Gerar ZIP em scripts/phase2-acceptance.mjs atualizado; não houve novo aceite real após a correção. **Prioridades abertas: 0; recomendações menores abertas: 0.** Interaction capture permanece off; zoom nativo/dispositivos físicos e conexão WhatsApp atual continuam fora da prova.

## Pillar Scores — auditoria inicial (histórico)

| Pillar | Score | Key Finding |
|---|---|---|
| Copywriting | 3/4 | Exportação diverge dos rótulos contratados e imprime singular incorreto. |
| Visuals | 4/4 | Hierarquia, âncora textual e controles identificáveis comprovados nas capturas; sem defeito específico encontrado. |
| Color | 4/4 | Paleta e reservas do accent preservadas; sem defeito específico encontrado. |
| Typography | 4/4 | Quatro tamanhos e dois pesos; conteúdo completo e reflow observados. |
| Spacing | 3/4 | h3 herda margem de navegador de 1em, fora da escala de espaçamento. |
| Experience Design | 3/4 | Erro de período de exportação sem associação ao campo; alguns erros anunciados como status. |

**Overall: 21/24** — nenhum BLOCKER identificado; quatro WARNINGs abaixo. Notas 4 representam ausência de falha demonstrada neste escopo, não prova universal.

## Top 3 Priority Fixes — histórico, resolvidas no recheck

1. **Associar o erro de datas de exportação aos inputs** — ao retornar foco ao campo inválido, o leitor de tela precisa reencontrar a mensagem — dar ID único ao feedback de cada aba e incluí-lo em aria-describedby.
2. **Usar copy contratada e singular/plural na exportação** — o usuário deve reconhecer Gerar ZIP e suas contagens — trocar strings locais, sem alterar geração ou API.
3. **Usar role=alert nos erros de contexto e preview** — preservar status para andamento e tornar falhas prontamente anunciáveis — ajustar os ramos de falha e restaurar role=status ao iniciar nova operação.

## Detailed Findings — histórico anterior a 9f55deb

### Pillar 1: Copywriting (3/4)

- **WARNING UI-01:** `public/app.js:40,42` usam “Exportar recorte”/“Preparar exportação” em vez de “Exportar conversa”/“Gerar ZIP”. `:24,26` usam “Preparando exportação…”/“Exportação pronta e conferida.” e concatenação fixa “mensagens”, visível como “1 mensagens” na captura sintética. Contrato: tabela Copywriting, exportação e plural correto. Correção mínima: rótulos contratados e seleção singular/plural nas três contagens; falha/repetição/expiração em `:24,28,59-60` também devem usar o vocabulário ZIP previsto. Não há promessa falsa de histórico integral.
- Busca, vazio, contato ambíguo, referência ausente e limitação de codec têm texto orientado à próxima ação (`public/index.html:43-62`; `public/app.js:89-105,200-206`). Não foram encontrados os padrões genéricos Submit/Click Here/No data.

### Pillar 2: Visuals (4/4)

- Evidência específica: CTA preenchido de busca, títulos diferenciados, mensagens separadas e âncora com rótulo “Mensagem localizada” e borda visível (`public/index.html:40,54`; `public/app.js:247-264,343-351`; `public/style.css:5-8,33,49`). Botões são textuais e fechar aba tem nome acessível completo (`public/app.js:295`).
- Capturas 320/768/1280 mostram conteúdo sem corte lateral fora da tablist, hierarquia busca→leitor→exportação e nomes completos quebrados. O nome sintético extremo torna a aba alta, mas a preservação integral do texto é requisito explícito; não se recomenda truncamento ou redesign.

### Pillar 3: Color (4/4)

- Evidência específica: `public/style.css:1,12-18,23-24,29,42,49,51` usa somente os sete valores contratados. Accent #155e75 aparece em sete declarações: CTA, foco, seleção e downloads; nenhum estado depende apenas de cor. Fundo #F5F6F7, painéis brancos e accent pequeno são coerentes com distribuição aproximada 60/30/10 nas capturas; proporção não foi medida pixel a pixel.
- Nenhum registry/componente de terceiros: components.json ausente; Registry Safety do contrato declara Nenhum. Auditoria de registry não aplicável.

### Pillar 4: Typography (4/4)

- Evidência específica: `public/style.css:1,5-9,13,16,24,31` define 1rem, .875rem, 1.25rem e 1.75rem, pesos 400 herdado/600 e alturas 1.5/1.2. Font system-ui; botão herda fonte; mensagens pre-wrap/anywhere (`:34`). Referências e nomes não são truncados.
- Captura com fonte raiz 200% mantém leitura e reflow. É aumento de fonte via CSS do harness, não zoom nativo do navegador; screenshot reduzido no visualizador não serve para medir tamanho físico de letra.

### Pillar 5: Spacing (3/4)

- **WARNING UI-02:** `public/style.css:8` define h3 sem margin. A folha do navegador deixa margin-block de 1em; com tamanho 1.25rem/20px resulta em 20px, fora de 4/8/16/24/32/48/64px. Afeta títulos de vazio, anexo e exportação (`public/index.html:60`; `public/app.js:40,197`). Correção mínima: margem explícita da escala, por exemplo `margin: 0 0 16px`, mantendo os gaps dos contêineres.
- Demais gaps/paddings/margens explícitos seguem a escala (`public/style.css:3,19-27,36-57`), grade 288px/minmax e breakpoint 767px conferidos. Controles têm min-height 48px e padding suficiente; mídia limitada à largura. Capturas móveis confirmam respiro 16px e rolagem horizontal reservada às abas.

### Pillar 6: Experience Design (3/4)

- **WARNING UI-03:** `public/app.js:41,52,57,59` coloca aria-invalid/foco no input de exportação, mas aria-describedby só aponta para export-help; feedback não tem ID. Contrato Segurança/feedback exige erro associado por aria-describedby/aria-invalid. Correção: ID por conversa para feedback e referência em ambos os inputs. Verificação mínima em `test/ui.test.ts`: período invertido preserva leitura e campo focado descreve a mensagem de erro.
- **WARNING UI-04:** `public/app.js:296,376,381,392` escreve falha de contexto no status com role=status; preview HEAD/catch em `:214,221,232` também conserva role=status, embora erro de decode em `:228` já use alert. Contrato distingue andamento/status de erro/alert. Correção: role=alert nos ramos de falha e role=status ao reiniciar/obter sucesso; não criar componente novo.
- Cobertura presente em código e testes: loading/aria-busy, duplicação desabilitada, vazio, falhas preservando conteúdo, navegação roving/Enter/Delete, âncora/prepend/scroll por aba, nenhuma persistência privada no storage, previews sob ação e limpeza de src/timers/DOM após logout (`public/app.js:13-61,96-158,195-245,290-404`; `test/ui.test.ts`). Fechar e logout não são destrutivos para o acervo; confirmação não é exigida.
- 02-ACCEPTANCE/02-05-SUMMARY relatam 130/130 testes e browser real offline: duas leituras, UTC, teclado/fechamento, JPEG/Ogg/MP4, quatro downloads originais e ZIP com 1.028 mensagens/190 arquivos/112 faltantes. Estes resultados são evidência upstream, não execução repetida deste auditor. Não reexecutei a suíte integral nem autentiquei a instância original.

## Files Audited

- `AGENTS.md`, `.planning/config.json` e bootstrap agent-skills (mapping vazio; diretórios locais de skills ausentes).
- `02-CONTEXT.md`, `02-UI-SPEC.md`, cinco `02-0N-PLAN.md`/`02-0N-SUMMARY.md` e `02-ACCEPTANCE.md` (contratos, estados e evidências relevantes).
- `public/index.html`, `public/app.js`, `public/style.css`, `test/ui.test.ts` e as cinco capturas sintéticas descritas acima.

**Recommendation Count inicial:** 3 prioridades (UI-01/UI-03/UI-04); 1 recomendação menor (UI-02). Todas resolvidas no recheck acima. Este relatório não altera produto nem metadados de conclusão.

**Limites:** não houve zoom nativo, dispositivo físico, inspeção de imagens reais privadas ou validação da conexão WhatsApp atual. Evidência offline e fixtures não comprovam esses pontos; nenhum dado privado foi incluído no relatório.

# Fase 2 — UI Review

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

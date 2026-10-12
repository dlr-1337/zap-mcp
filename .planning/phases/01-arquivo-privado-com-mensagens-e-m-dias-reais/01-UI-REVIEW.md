# Fase 1 — UI Review

**Audited:** 2026-10-11
**Baseline:** 01-UI-SPEC.md aprovado; exceção de seleção em .impeccable/config.json
**Screenshots:** não capturados nesta auditoria. Evidência sintética anterior do plano 01-05 inspecionada visualmente: reader-320, reader-1280 e session-expired.
**Interaction captures:** off (interaction_capture:false). Interações anteriores registradas no QA do plano 01-05; DOM/download atuais relatados pelo orquestrador, sem pixels atuais.

## Evidência e limites

O servidor respondeu HTTP 200 em localhost:3000; 5173 e 8080 não responderam. A autorização desta auditoria restringe navegador à CUA operada pelo orquestrador: não foi executado Playwright, criado browser ou acessada conta real por este auditor. As tentativas atuais de screenshot CUA tiveram timeout, conforme relato do orquestrador. Nenhuma imagem anterior é apresentada como captura atual. Não houve nova captura nem cópia de imagens; o gate de armazenamento não precisou ser aplicado e nenhum conteúdo privado foi gravado.

`/tmp/zap05-browser-result.json` registra 13 capturas sintéticas, zero erros, viewports 320/768/1280, reflow 200%, teclado, paginação, estados e download. Nesta revisão foram efetivamente abertos reader-320, reader-1280 e session-expired. Os demais cenários são evidência documental anterior, sem reinspeção de seus pixels. As imagens do leitor estão roladas, portanto não provam a hierarquia da primeira dobra completa. Fontes HTML/CSS mantêm a estrutura do plano 01-05; a mudança atual de direção é textual.

O orquestrador informou verificação CUA atual: Conectado, 100 mensagens, “Enviada por você” presente, rótulo antigo ausente e download de áudio concluído com hash igual ao acervo. Essa verificação sustenta comportamento/DOM; não comprova aparência atual. A comparação autorizada com WhatsApp Web e os quatro formatos reais estão no 01-07-SUMMARY; não foram repetidos pelo auditor.

## Pillar Scores

| Pilar | Nota | Achado principal |
|-------|------|------------------|
| 1. Copywriting | 3/4 | Contagem de lote não flexiona singular; demais estados e direção seguem o contrato. |
| 2. Visuals | 4/4 | Sem divergência identificada na estrutura atual e nos pixels sintéticos inspecionados. |
| 3. Color | 4/4 | Paleta e quatro usos de acento restritos aos elementos autorizados. |
| 4. Typography | 4/4 | Quatro tamanhos e dois pesos declarados, com texto longo legível. |
| 5. Spacing | 4/4 | Espaçamento na escala e grade/reflow nos valores contratados. |
| 6. Experience Design | 3/4 | Voltar à lista mantém aria-current do item anterior, apesar de encerrar a seleção. |

**Overall: 22/24.** Sem BLOCKER identificado. Notas visuais referem-se à evidência disponível; não são certificação de pixels atuais nem de todos os navegadores.

## Top 3 Priority Fixes

1. **WARNING — limpar seleção semântica ao voltar** — o leitor é fechado, mas a conversa anterior continua marcada como página atual — remover `aria-current` dos links em `back()`, conservando restauração de foco/scroll. Não alterar a borda sancionada da conversa enquanto ela está aberta.
2. **WARNING — flexionar contagem de lote** — um lote de uma mensagem aparece como “1 de 1 mensagens recebidas arquivadas” — selecionar singular quando `batch.received === 1`, mantendo números reais e indicação de lote incompleto.
3. **Verificação pendente, não defeito de produto** — obter pixels atuais por CUA quando a captura responder, usando somente fixture para armazenamento público. Conferir leitor e direção atual; não reabrir pareamento nem repetir comparação no celular. A indisponibilidade de pixels atuais não deve virar afirmação de regressão ou aprovação visual nova.

## Detailed Findings

### Pilar 1: Copywriting (3/4)

- **WARNING C1:** `public/app.js:153` concatena sempre “mensagens recebidas arquivadas neste lote”, inclusive recebidas=1. O inventário zero-one-many do UI-SPEC e 01-05-PLAN exige pluralização correta. A leitura continua possível; a falha é de precisão da copy. Corrigir somente essa flexão e conferir casos 0/1/muitos.
- Copy conforme: login/erro junto ao campo e CTA específico em `public/index.html:13-19`; vazios/ações de navegação em `public/index.html:47-63`; sessão expirada e servidor indisponível em `public/app.js:2-3`; anexos com ausência e indisponibilidade explícitas em `public/app.js:57-72`.
- `public/app.js:79` usa “Enviada por você” para fromMe=true e ausência explícita para direção desconhecida, sem inferir dispositivo. DOM atual confirmado pelo orquestrador. Não há promessa de histórico integral (`public/index.html:36`) ou download concluído antes do navegador confirmar (`public/app.js:71`).

### Pilar 2: Visuals (4/4)

- **Conforme, sem WARNING/BLOCKER visual identificado:** reader-320 mostra título de conversa, autoria/data, conteúdo e referências em hierarquia distinta; reader-1280 mantém lista/leitor e divisão documental, sem composer. Os nomes sintéticos longos quebram sem truncamento nos pixels inspecionados. Isso não demonstra a primeira dobra nem a aparência com conta real atual.
- `public/index.html:44-64` fornece nav, seção rotulada, ol e ações textuais; `public/app.js:76-93` cria article, time, blockquote e details. Não existem botões somente por ícone que careçam de nome acessível.
- Sessão expirada anterior mostra só login, mensagem de recuperação e foco na senha; ausência de conteúdo privado é coerente com `public/app.js:8-18`.

### Pilar 3: Color (4/4)

- **Conforme, sem WARNING/BLOCKER de cor identificado:** sete cores CSS são precisamente a paleta declarada, sem estados inventados por verde/vermelho. `public/style.css:1,12,15,17-19,23,26,29,31-32,37-39` conserva fundo, superfícies, texto, bordas e acento.
- Há quatro seletores com acento: CTA de login, foco, conversa atual e download (`public/style.css:15,17,29,39`). Nas imagens inspecionadas o acento permanece localizado, sem grandes superfícies decorativas. A distribuição 60/30/10 é aproximada pelo contrato, não uma cota de área a preencher; não foi medida por segmentação de pixels.
- A borda esquerda de 4px em `public/style.css:29` está expressamente autorizada no UI-SPEC e .impeccable/config.json. O problema E1 abaixo é a permanência do estado após voltar, não o desenho dessa borda.

### Pilar 4: Typography (4/4)

- **Conforme, sem WARNING/BLOCKER tipográfico identificado:** `public/style.css:1,5-9,13,16,24,31,35` usa raiz 100%, corpo herdado 1rem, .875rem, 1.25rem e 1.75rem; pesos 400 implícito e 600 explícito. H1/H2/H3 1.2 e corpo 1.5 correspondem ao contrato.
- Texto recebido conserva quebras e direção automática (`public/style.css:33,37`; `public/app.js:51,84,89`). O nome longo e os IDs permanecem legíveis nas duas capturas de leitor inspecionadas. Reflow 200% é prova documental do QA anterior, não novo teste desta auditoria.

### Pilar 5: Spacing (4/4)

- **Conforme, sem WARNING/BLOCKER de espaçamento identificado:** os valores não nulos de margin/padding/gap são 4/8/16/24/32/64px, todos na escala; 0 e auto não são tokens arbitrários. `public/style.css:3,5-7,12,16,19-28,32-43,45,48-55` sustenta essa análise.
- Grade 288px + 32px + minmax(0,1fr), container até1280 e breakpoint767 são os números do contrato (`public/style.css:21,25,47-55`). 1px de borda, 2px de foco, 4px de raio/seleção, QR256 e controles48 são dimensões/exceções declaradas.
- Nos pixels reader320/1280 não foi identificada rolagem horizontal ou sobreposição do conteúdo visível. Ausência global de overflow e preservação do ponto durante paginação são evidência do QA anterior.

### Pilar 6: Experience Design (3/4)

- **WARNING E1:** `public/app.js:124` marca o link aberto com aria-current=page; `back()` em `public/app.js:135-140` fecha leitor e limpa `selected`, mas não remove esse atributo. Resultado derivado do código: a lista conserva a marca de uma conversa que já não está aberta e anuncia página atual incorreta a tecnologia assistiva. Remover o atributo ao voltar; preservar foco no último link e ponto da lista. Não capturado em interação nesta auditoria.
- Carregamento, erro, vazio e indisponibilidade têm cobertura explícita: `public/app.js:30-33,95-112,114-133,184-197`. Login/paginação/logout impedem duplicação; download usa aria-busy com guarda (`public/app.js:64-73`). Nenhuma ação destrutiva existe; confirmação destrutiva não é aplicável.
- Nova mensagem oferece atualização explícita sem substituir a leitura (`public/app.js:173-176,208`); falha de consulta mantém DOM, enquanto 401 limpa dados privados (`public/app.js:20-24`). Eventos de rede/pagehide/pageshow revalidam a sessão (`public/app.js:213-225`). QR é removido por validade/geração e não persiste em armazenamento do navegador (`public/app.js:7,159-170`).
- O momento observado do recebimento original existe no histórico via revisions.observedAt (`src/archive.ts:338`; `public/app.js:46-50`); não foi tratado como campo ausente. Sem antecipar filtros, preview, exportação ou MCP das próximas fases.

## Registry Safety

Auditoria de registries não aplicável: components.json ausente; UI-SPEC declara Tool:none e nenhum registry/bloco terceiro. Nenhum npx shadcn ou download de componente executado.

## Files Audited

- AGENTS.md; .impeccable/config.json; .planning/config.json (agent_skills vazio; diretórios locais de skills ausentes).
- public/index.html, public/app.js, public/style.css; src/archive.ts (projeção/histórico); src/main.ts (consulta de projeção).
- 01-UI-SPEC.md, 01-CONTEXT.md; 01-01 a 01-07 PLAN/SUMMARY, com foco em 01-05 e 01-07.
- /tmp/zap05-browser-result.json; pixels /tmp/zap05-reader-320.png, /tmp/zap05-reader-1280.png, /tmp/zap05-session-expired.png.

**Recomendações:** duas correções menores e uma verificação de evidência atual. Nenhuma fonte, teste, dado ou documento adicional foi alterado; nenhum commit. Não foram testados outros navegadores, leitor de tela real ou pixels atuais; risco residual limitado à cobertura de verificação descrita, sem blocker de conclusão do fluxo identificado.

## Disposição posterior — 2026-10-11

Os warnings C1 e E1 foram corrigidos pelo orquestrador após a auditoria. A nota22/24 acima é a avaliação original, sem reatribuição de nota por inferência. Em public/app.js, Voltar remove aria-current do link selecionado antes de conservar foco; contagem usa singular quando batch.received===1. Verificação CUA atual com assertivas: abertura marca exatamente1 link, Voltar deixa0 marcas e restaura foco no mesmo link;143 lotes reais unitários apresentam singular. node --check e git diff --check passaram. Sem mudanças de CSS/layout; a lacuna de pixels atuais permanece explicitamente registrada. Nenhum warning de produto permanece aberto.

# Fase 04 — UI Review

**Auditado:** 2026-10-13
**Baseline:** padrões abstratos dos seis pilares, proporcionais ao escopo operacional; sem UI-SPEC específico da fase 04. Decisões D-04/D-12 do CONTEXT também foram confrontadas com a implementação.
**Screenshots:** não capturados nesta rodada (nenhum servidor nas portas locais 3000, 5173 ou 8080). Captura privada existente do login permanente inspecionada, com campo vazio e foco visível; imagem não publicada.
**Interaction captures:** off (workflow.ui_interaction_capture is false)

Nenhuma captura nova foi realizada, portanto o gate de armazenamento não foi acionado nem arquivos de captura foram criados. O escopo de escrita desta revisão foi somente este relatório. Não foram abertos dados pessoais, configurações privadas, cookies ou outras abas; nenhum acesso à produção foi realizado pelo auditor. A evidência visual direta limita-se ao login desktop. Mobile/tablet e estados autenticados são avaliados pelo código, sem declaração de verificação renderizada. O fluxo privado conhecido anterior foi informado pelo orquestrador; não foi reproduzido nem usado como captura atual.

---

## Pillar Scores

| Pilar | Nota | Achado principal |
|---|---|---|
| 1. Copywriting | 3/4 | Texto de pareamento associa todo coletor desligado à preparação incompleta. |
| 2. Visuals | 4/4 | Login observado tem foco inequívoco, rótulo e ação principal legíveis. |
| 3. Color | 4/4 | Superfícies neutras e acento restrito a ações, foco e seleção; sem desvio encontrado. |
| 4. Typography | 4/4 | Quatro tamanhos e dois pesos coerentes, sem desvio encontrado. |
| 5. Spacing | 4/4 | Escala 4/8/16/24/32/64 consistente; adaptação mobile declarada. |
| 6. Experience Design | 2/4 | Estado de backup entregue pela API nunca aparece no site. |

**Overall: 21/24**

As notas 4 indicam ausência de defeito específico encontrado no alcance disponível; não constituem certificação das telas autenticadas ou dos breakpoints sem captura. Nenhum BLOCKER de conclusão das tarefas de consulta foi demonstrado. As lacunas operacionais abaixo precisam ser corrigidas para atender D-04/D-12 na interface, sem alterar os gates independentes OPS.

---

## Top 3 Priority Fixes

1. **WARNING — Exibir saúde do backup no status existente.** Hoje uma cópia atrasada ou falha não aparece na página. Consumir `data.backup` em `refreshStatus`, exibindo último sucesso conferido em America/Sao_Paulo, idade/atraso e falha traduzida a partir da allowlist; distinguir ausência de sucesso de backup válido. Preservar a consulta durante falhas e não publicar IDs, caminhos ou segredos.
2. **WARNING — Distinguir coleta pausada de preparação incompleta.** `collectorEnabled: false` não comprova que falta backup. Representar modo offline/pausado e motivo seguro explicitamente, exibindo instruções de pareamento somente quando aplicáveis; não instruir novo QR para uma sessão preservada.
3. **WARNING — Separar recusa de transporte de senha incorreta no login.** O handler trata qualquer resposta não 429 como sugestão para conferir senha. Para 403/5xx, oferecer mensagem de solicitação recusada/serviço indisponível e nova tentativa, mantendo 401 genérico e sem revelar detalhes de autenticação.

---

## Detailed Findings

### Pilar 1: Copywriting (3/4)

- **WARNING C-01 — Orientação incorreta no modo offline.** `public/app.js:472` sempre diz que a preparação da cópia recuperável precisa ser concluída no host quando o coletor está desligado. Um restore de consulta ou pausa coordenada legítimos usam esse mesmo estado. `src/main.ts:104` também fornece diagnóstico padrão semelhante; o frontend nem consome o diagnóstico superior. Corrigir a semântica com estado explícito, sem inferir uma falha de backup a partir da coleta desligada.
- **WARNING C-02 — Recuperação de login pouco específica.** `public/app.js:500` orienta conferir senha inclusive para 403 e 5xx. O transporte retorna 403 (`src/transport.ts:38`), e a fase tem justamente autenticação HTTPS entre seus objetivos. Mapear classe de erro sem expor internals; não acusar senha quando o pedido foi recusado antes da autenticação.
- **Evidência positiva:** CTA específico “Entrar no acervo” (`public/index.html:18`); empty state acionável (`:60`); limites de cobertura (`:32`), fuso (`:53`) e exportação (`:77`) explícitos. O login capturado coincide com o texto implementado.

### Pilar 2: Visuals (4/4)

- **Observação justificadora V-01 — Sem defeito encontrado no login inspecionado.** Cartão delimitado, título de 1,75rem, rótulo de senha e único botão primário tornam a tarefa identificável; a imagem mostra outline íntegro no campo vazio. `public/style.css:5,12,17,19-20` sustentam esse resultado.
- No código, busca, navegação e leitor possuem títulos e regiões explícitas (`public/index.html:39,64-85`), e a seleção usa borda além de cor (`public/style.css:51`). Não há botão de ícone sem nome na estrutura examinada. A hierarquia do acervo cheio não foi observada em captura nesta rodada.

### Pilar 3: Color (4/4)

- **Observação justificadora CO-01 — Sem defeito encontrado no alcance disponível.** CSS usa seis cores hexadecimais distintas: texto `#17212b`, fundo `#f5f6f7`, superfície `#fff`, borda `#66717f`, divisão `#d7dce1` e acento `#155e75`; texto secundário acrescenta `#4b5563` (sete cores no total). São regras CSS diretas, não um projeto Tailwind; a existência de literais não é isoladamente um defeito.
- Acento em seis seletores/grupos de regras (`public/style.css:15,17,29,43,51,52`); a linha 52 fornece espaçamento ao elemento já selecionado, sem nova cor. Cinco regras efetivamente declaram acento, destinadas a CTA, foco, seleção e download. A captura do login confirma dominância neutra. Não há contrato numérico 60/30/10; distribuição exata no acervo não foi medida, e quantidade de instâncias dinâmicas não foi presumida.

### Pilar 4: Typography (4/4)

- **Observação justificadora T-01 — Sem defeito encontrado.** Quatro tamanhos de texto: base 1rem, secundário/rótulos .875rem, h2/h3 1.25rem e h1 1.75rem; pesos regular e 600 (`public/style.css:1,5-16,24,31,35`). Botões e campos herdam a fonte; corpo usa line-height 1,5. O título quebra em duas linhas no login observado sem cortar palavras ou colidir com o texto seguinte.
- O limite de 80ch para conteúdo de mensagem (`public/style.css:33`) é adequado à leitura, mas não foi verificado sobre conversas reais nesta revisão.

### Pilar 5: Spacing (4/4)

- **Observação justificadora S-01 — Sem defeito encontrado.** Padding/margin/gap repetem 4, 8, 16, 24, 32 e 64px (`public/style.css:3-66`). Login observado preserva separação entre título, instrução, rótulo, campo e ação; não há colisão.
- Valores 288px para coluna, 400px para login, 200px para abas e 48px para alvos são dimensões funcionais, não espaçamento arbitrário. Breakpoint 767px troca grade por fluxo e reduz gutters a 16px (`public/style.css:64-75`). Mobile/tablet não foram capturados; não se atribui aprovação renderizada ao breakpoint.

### Pilar 6: Experience Design (2/4)

- **WARNING E-01 — Saúde do backup invisível no site.** `src/main.ts:104` retorna `backupStatus`, mas `public/app.js:450-487` só usa conexão, cobertura, mídia e pareamento; `public/index.html:28-36` não tem destino para backup. `src/offsite.ts:55-60` já entrega último sucesso, idade, atraso de 24h, resultado e código seguro. A lacuna deixa sucesso/falha/atraso indistinguíveis para quem usa o site, contrariando D-12. É uma lacuna de qualidade operacional; não prova falha do backup nem impede por si só busca/consulta.
- **Evidência positiva:** login bloqueia envio duplo e anuncia progresso (`public/app.js:494-503`); logout trata recusa e revalida sessão (`:505-513`); rede offline informa desatualização (`:522`); retorno valida a sessão (`:523-534`); ZIP tem preparação, falha, expiração e retomada (`:14-43`). São evidências derivadas do código, não interações capturadas.
- Autenticação protege status e originais antes das rotas (`src/main.ts:72-79`); CSRF/cookie/logout estão integrados em `src/auth.ts:62-101`. Revisão de código clean e segurança 18/18 são artefatos consultados, com limites próprios; não substituem a verificação visual ou operacional.

---

## Files Audited

- `AGENTS.md` e configuração pública do workflow.
- `04-CONTEXT.md`, seis `04-01` a `04-06-PLAN.md` e cinco `04-01` a `04-05-SUMMARY.md` da fase 04.
- `public/index.html`, `public/style.css`, `public/app.js`.
- `src/main.ts`, `src/transport.ts`, `src/auth.ts`; função `backupStatus` em `src/offsite.ts`.
- `04-REVIEW.md` e `04-SECURITY.md` (evidências documentais delimitadas pelos próprios relatórios).
- Captura privada segura de login desktop, sem ponteiro pessoal ou imagem versionada.

**Recommendation Count:** três correções prioritárias; zero recomendações cosméticas adicionais. A revisão não executou update, backup, restauração ou cliente real; OPS-01 a OPS-04 não são encerrados por este relatório.

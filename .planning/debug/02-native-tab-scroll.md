---
status: diagnosed
trigger: "G-02-6: clique nativo entre abas após rolar perde630px; posição45596 torna-se44966. Conteúdo/âncora permanecem, mas a posição de leitura é perdida."
created: 2026-10-12T10:33:00Z
updated: 2026-10-12T10:37:41Z
goal: find_root_cause_only
symptoms_prefilled: true
scope: diagnosis-only; ownership of this file only; no commits
---

## Current Focus

bug_class: bohrbug
hypothesis: barra no fluxo sai do viewport; rolagem necessária para alcançar o controle antecede activateTab, que sobrescreve a posição de leitura com essa rolagem de navegação.
test: rastreamento estático de todos os chamadores/gravadores de scroll e contraste entre reprodução CUA nativa fornecida e acionamento programático dos testes existentes.
expecting: captura e restauração explicam o recuo630px sem perda de DOM; DOM-click suprime o passo necessário para um controle nativo fora da tela.
next_action: entregar ROOT CAUSE FOUND ao parent para gap planning; não implementar, executar browser/suíte ou arquivar como resolvido.
reasoning_checkpoint:
  hypothesis: "A combinação da barra fora do viewport e da captura em activateTab faz a navegação até o botão substituir a posição de leitura que deveria voltar."
  confirming_evidence:
    - "public/style.css:48 não fixa a barra; public/index.html:78 a coloca no fluxo anterior ao painel; reprodução fornecida a encontra343.40625px acima da tela."
    - "public/app.js:333/349/360 liga clique a captura de window.scrollY e depois restaura exatamente tab.scroll; não há captura anterior do estado de leitura."
    - "Aritmética da observação fornecida: recuo de scroll630px e avanço da barra630px, mantendo posição no documento45252.59375; conteúdo e âncoras preservados."
    - "ui.test:330–332 e aceite:185/200–204 usam el.click(); asserts nativos existentes verificam conteúdo, não a posição após rolar."
  falsification_test: "Refutaria este mecanismo observar, no gesto nativo antes da troca, previous.scroll salvo como45596, sem rolagem anterior à captura, e A retornando44966 apesar de poder alcançar45596 com mesmo layout. Isso indicaria clamp/alteração posterior; a rodada não instrumenta o navegador."
  fix_rationale: "Manter a barra alcançável no viewport durante leitura elimina a necessidade de recuar o documento antes da amostra, preservando o mecanismo já existente de tab.scroll para pointer e teclado. Limitar sua altura é indispensável para nomes longos/font200. Direção não aplicada."
  blind_spots: "Sem novo browser, probe de eventos, suite, bisect ou avaliação runtime da correção. Preview removido, mutação posterior de altura e clamp em outros cenários não foram instrumentados; não explicam a necessidade observada de alcançar a barra, mas merecem regressão. Caminho de dom.js de Playwright não disponível; comportamento de scroll-before-click vem da reprodução do parent, sem falsa leitura da biblioteca."
  candidate_causes:
    - "code: CSS permite controle fora da tela e JS captura a rolagem somente na ativação — confirmado."
    - "environment: navegação nativa/actionability exige alvo na tela — condição observada, comportamento esperado, sem falha específica do IAB provada."
    - "data: paginação/IDs duplicados — refutado pela conferência450/450 do parent e Map/reuso porID; nomes longos amplificam altura, sem necessidade de corrupção de dados."
    - "config: ancestral com scroll interno impedindo sticky — não encontrado no CSS vigente; risco de implementação, não causa atual."
  and_gate: "sim — barra fora da tela + navegação até o controle antes do handler + amostra somente na ativação. As duas causas de produto confirmadas são placement no fluxo e captura tardia; o gesto nativo esperado é o trigger."

## Symptoms

expected: alternating A/B/A through a native clickable tab after scrolling preserves each conversation's content and reading position; WEB-04/D-11 and UC-23..UC-34.
actual: parent reports two native IAB reproductions; content and anchors survive but A scroll45596 becomes44966, a loss of630px; tab bar top changes from -343.40625 to286.59375 in a720px viewport.
errors: no JavaScript error reported; functional loss of reading position.
reproduction: in the parent's isolated authenticated real archive copy, open two conversations with messages, scroll A so the tab bar is above the viewport, use native tab clicks A/B/A, compare window.scrollY before and after. Browser driving is reserved to parent.
started: observed during autonomous Phase2 UAT; source product1a5b7c8 with inherited HEAD8ef08a0. No introducing revision proven.
environment: private restored copy reported as8792 messages and856 originals without collector; no account, session, password, service or source modification authorized here. No private names, IDs, contents or screenshots are retained.

## Eliminated

- hypothesis: perda de conteúdo/novo carregamento ao alternar abas explica a perda630px.
  evidence: reprodução fornecida conserva conteúdo e âncoras; activateTab troca hidden/IDs e usa DOM já existente sem fetch ou renderContext; public/app.js:347–360.
  timestamp: 2026-10-12T10:37:00Z

- hypothesis: paginação duplicou conversas e o clique abriu outra instância de A.
  evidence: parent conferiu450 IDs distintos em450 itens; tabs usa Map por conversation.id e reabre a existente em public/app.js:433/440. Nenhum dado duplicado é necessário para produzir o salto.
  timestamp: 2026-10-12T10:37:00Z

- hypothesis: salvar no mousedown/pointerdown do botão recuperaria a posição anterior ao autoscroll.
  evidence: alcançar um alvo fora do viewport antecede inclusive o pointerdown; um usuário também precisa rolar até o controle. Mover a mesma amostragem para outro evento no botão ainda a executaria tarde, e não alcançaria toda navegação por teclado.
  timestamp: 2026-10-12T10:37:00Z

## Evidence

- timestamp: 2026-10-12T10:33:00Z
  checked: parent-supplied native reproduction and02-UAT.md test6/G-02-6
  found: autonomous UAT records16pass/1issue; native A/B/A loses630px while content and anchors remain. Parent separately reports450 distinct conversation IDs among450 listed.
  implication: UI reading-position defect is reproducible according to parent; no evidence of duplicated conversation pagination or lost tab content. This diagnosis does not claim a new browser run.

- timestamp: 2026-10-12T10:35:00Z
  checked: required application/CSS/phase-contract reads and skill bootstrap
  found: activateTab assigns previous.scroll from window.scrollY, preserves panel DOM and finally restores tab.scroll. Tab creation binds native click directly to activation; keyboard arrows explicitly call scrollIntoView before Enter activation. CSS has horizontal tab overflow but no sticky positioning. Config agent_skills is empty and local skill directories are absent; no MemPalace tools or local knowledge-base.md are available.
  implication: leading state-management/ordering hypothesis has direct code support; Phase0 has no known-pattern candidate. SBFL and bisect are skipped because this scoped diagnosis forbids new test/browser execution, has no per-test failing coverage, and already has a deterministic reproduction supplied by parent.

- timestamp: 2026-10-12T10:37:00Z
  checked: public/app.js:333,341–342,347–360,371,414,433,440,446–448; all activateTab callers and scroll assignments searched with rg.
  found: clique ativa diretamente; setas/Home/End fazem focus(preventScroll) e depois scrollIntoView, antes de Enter/Espaço. previous.scroll é salvo apenas na ativação/back; não há observador de scroll nem captura prévia de intenção. A restauração usa imediatamente o valor salvo. Fechar/reabrir/novo contexto usam a mesma função; contexto novo usa restore=false e foco deliberado na âncora.
  implication: hipótese confirmada por ordem síncrona explícita. preventScroll no foco não cancela o scrollIntoView seguinte; o mesmo problema potencial alcança navegação por teclado fora da área visível. Não é uma race assíncrona.

- timestamp: 2026-10-12T10:37:00Z
  checked: public/index.html:64–85; public/style.css:25–26,48–50,64–75; contratos D-09/D-11 e02-UI-SPEC.
  found: tablist fica no fluxo de #reader, após título e ajudas, antes de conversation-panels; página usa rolagem do documento, sem sticky/height/overflow no leitor ou seus ancestrais. A barra tem apenas overflow-x:auto. Botões exibem nome/identidade/referência completos com white-space:pre-wrap; altura é ilimitada. No celular o mesmo leitor alterna via .reading, sem outra barra.
  implication: ao ler abaixo da barra, o controle deixa de estar alcançável sem recuar a página. Uma correção local de posicionamento na barra pode impedir a etapa que corrompe a amostra, mas sticky sem limite de altura não cobre nomes longos/font200 e pode ocultar a leitura.

- timestamp: 2026-10-12T10:37:00Z
  checked: comparação aritmética independente das coordenadas fornecidas pelo parent.
  found: 45596−44966=630; 286.59375−(−343.40625)=630; scrollY+barTop=45252.59375 antes e depois.
  implication: ao retornar à mesma A, a barra ocupa a mesma coordenada do documento, enquanto o viewport recua exatamente630px. Isso sustenta rolagem para revelar o controle, sem evidência de deslocamento estrutural630px da própria barra. Não é nova medição de navegador.

- timestamp: 2026-10-12T10:37:00Z
  checked: test/ui.test.ts:313–347 e scripts/phase2-acceptance.mjs:185,200–204.
  found: asserts de posições B/A (<2px) em ui.test:329–332 usam evaluate(el=>el.click()); o aceite real encapsula exatamente o mesmo acionamento em activate. Cliques nativos de ui.test:336/339 conferem conteúdo, não posição. Teclado319–326 confere foco/seleção antes das rolagens; reflow342–343 confere somente largura do documento e chama scrollIntoViewIfNeeded explicitamente para screenshots.
  implication: cobertura histórica comprova isolamento de DOM e restauração de uma amostra que não foi movida pelo gesto; não cobre a navegação nativa após rolar, nem a combinação teclado/mobile/font200+posição. O falso negativo do teste é causa da ausência de detecção, não origem do comportamento de produto.

- timestamp: 2026-10-12T10:37:00Z
  checked: inicialização e limites desta rodada.
  found: HEAD confirmado8ef08a0e1349444e04eee5d540000652f433dd56; só este debug está untracked. Runtime agent-skills imprime definição do papel; config confirmadoagent_skills:{} sem skills adicionais. Não há MemPalace/KB. Tentativa de ler implementação Playwright no caminho declarado pelo fixture/runtime não encontroudom.js; nenhuma dependência foi instalada nem navegador iniciado. Memória consultada apenas para contrato histórico de abas em memória, confirmado nos documentos atuais.
  implication: diagnóstico apoia código de produto/testes e reprodução nativa fornecida, sem fingir novo teste, inspeção da biblioteca, aceite humano, ambiente físico ou verificação da correção.

## Resolution

root_cause:
  - "A barra de abas no fluxo normal do documento deixa de estar alcançável ao rolar o leitor (public/index.html:78; public/style.css:48–50). Um clique nativo exige rolar até ela antes da ativação."
  - "activateTab salva previous.scroll=window.scrollY somente no handler de ativação, depois da navegação até o botão, e retorna posteriormente a esse valor já deslocado (public/app.js:333,349,360). Teclado341–342 também pode mover o documento antes da amostra."
fix: "Não aplicado; diagnóstico apenas. Direção mínima não vinculante: barra sticky no viewport, altura limitada e controles/foco/fechar acessíveis mesmo com nomes longos/font200, conservando mecanismo atual de restauração; ajustar somente o necessário para alvo/âncora não ficar encoberto. Não criar sistema paralelo de scroll ou workaround de clique programático."
verification:
  diagnosis: "Rastreamento de código completo, todos os chamadores e posições gravadas; contraste dos testes existentes e do script real; igualdade independente dos deslocamentos630px. Reprodução nativa duas vezes é evidência fornecida pelo parent, não nova execução deste agente."
  bug_reproduced_here: false
  new_tests_or_browser_runs: false
  fix_verified: false
  guardrail_verdict: not-applicable-diagnosis-only
  oracle_type: specified
  oracle_contract: "WEB-04, D-09/D-11,02-UI-SPEC e02-02-PLAN exigem posição independente e acesso nativo/teclado/tela estreita, sem reduzir asserts para aceitar o salto."
  why_not_caught: "Testes com asserts exatos de scroll e aceite real usam evaluate(el=>el.click()), eliminando actionability/scroll para o botão. Cliques nativos e teclado verificam seleção/conteúdo separadamente; reflow só verifica largura, não altura/posição durante troca."
files_changed: [".planning/debug/02-native-tab-scroll.md"]
artifacts:
  - public/app.js:333,341–342,349,360,371,414,433,440,446–448
  - public/style.css:25–26,48–50,64–75
  - public/index.html:72–79
  - test/ui.test.ts:313–347
  - scripts/phase2-acceptance.mjs:185,200–204
  - .planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-UAT.md:test6/G-02-6
suggested_regression_scope:
  - "Troca A/B/A por clique nativo após rolar: captura antes do gesto, retorno com diferença<2px e igualdade de conteúdo/âncora; incluir controles visíveis sem recuar o documento."
  - "Teclado nativo: setas/Home/End só foco, Enter/Espaço ativa e Delete/Fechar mantém destino previsível após rolar; aba horizontal fora da área inicial."
  - "320/768/1280, viewport baixo, fonte200%, zero/uma/muitas abas, Unicode/RTL e nome completo muito longo: barra e Fechar alcançáveis, rótulo selecionável, altura que não cubra a área de leitura e sem overflow horizontal do documento."
  - "Âncora de resultado/foco e prepend; abas com alturas diferentes; back/lista, reabrir, refresh local, fechar última; limpeza de mídia/respostas tardias preservada."
ui_risks:
  - "Sticky sem limite de altura falha quando label alto ocupa quase toda a tela; preservar48px de alvo, nomes completos, branco#FFFFFF e tokens4/8/16/24/32, sem truncar a referência."
  - "Fundo opaco e empilhamento mínimo precisam impedir mistura de texto sob a barra e preservar foco2px/offset2px; âncora/resultado recém-focado não pode ficar coberto."
  - "Overflow dos próprios rótulos/barra e scrollIntoView de teclado devem ser conferidos em ação real; limitar altura da barra isoladamente não comprova que o centro do tab alto e Fechar são alcançáveis."
  - "Não mudar as20 decisões ou49UC para acomodar a perda; nenhuma decisão exige controles desaparecerem durante a leitura."
specialist_hint: general

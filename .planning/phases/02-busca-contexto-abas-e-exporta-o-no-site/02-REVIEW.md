---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
reviewed: 2026-10-12T00:54:34Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - package.json
  - public/app.js
  - public/index.html
  - public/style.css
  - scripts/phase2-acceptance.mjs
  - src/archive.ts
  - src/auth.ts
  - src/export.ts
  - src/main.ts
  - src/media.ts
  - test/acceptance.test.ts
  - test/context.test.ts
  - test/export.test.ts
  - test/http.test.ts
  - test/media.test.ts
  - test/preview.test.ts
  - test/readonly.test.ts
  - test/search.test.ts
  - test/security.test.ts
  - test/ui.test.ts
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Fase 2: Code Review Report

**Profundidade:** standard. **Resultado:** dois BLOCKERs e um WARNING reproduzidos.

## Summary

Revisão dos 20 arquivos de código/configuração/testes da lista explícita fornecida; package-lock.json excluído conforme o filtro do workflow. O resolver de escopo foi informado como **degraded** por não interpretar tabelas legadas de commits; a lista explícita é o escopo desta revisão, sem pressupor recuperação perfeita de todos os commits. Base informada: `8da0c9d5114759c0f9fc6298a2c05c8aa77443ae`.

Consultados AGENTS, contratos/planos/relatórios da fase e os caminhos conectados de sessão, leitura, mídia e exportação. Revisão proporcional à operação de uma conta; sem fallow ou lane externa. Os quatro avisos antigos da revisão visual estão resolvidos e não são reabertos. Os resultados anteriores 132/132, security 23/23 e UI 24/24 não substituem a análise dos casos abaixo.

## Narrative Findings (AI reviewer)

### CR-01: BLOCKER — Contexto e preview ainda expõem conteúdo de mensagem marcada como restrita

**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/archive.ts:459`; raiz compartilhada em `src/archive.ts:363-367,453` e `src/media.ts:65-73`; consumidores `src/main.ts:69-90,194-205` e `public/app.js:266,354`.

**Issue:** Após preservar uma mensagem comum e seu PNG, receber a mesma chave com `isViewOnce=true` marca a mensagem `restricted=true`. Busca nova e seleção de exportação anulam conteúdo/revisões/anexos, mas `openContext` materializa o DTO sem essa proteção. O leitor básico também usa o DTO bruto. Revisões anteriores continuam com texto; anexos continuam expostos, e `openVerifiedAttachment` autoriza o arquivo apenas pelo estado/hash, sem verificar a restrição da mensagem. Além disso, `matchedEvidence` reaproveita texto do snapshot de busca anterior mesmo quando a âncora atual é restrita, chegando ao DOM.

**Trigger/evidence:** Fixture sintética descartável, Node24.21.0, sem coleta real: PNG comum com legenda → download concluído → busca por legenda → mesma chave com `isViewOnce=true` → contexto novo com `sourceSnapshotId`. HTTP confirmou `restricted=true` com a legenda anterior em `revisions[0].text` e `matchedEvidence[0].text`, mais um anexo; `/messages` básico também devolveu revisão/anexo. Original e `/preview`, em GET/HEAD com `Range: bytes=0-0`, retornaram **206**, e os GETs entregaram um byte. A seleção de exportação no mesmo estado devolve revisões com texto nulo, demonstrando a inconsistência.

**Impact/required property:** A superfície nova fornece conteúdo/binário que ela declara indisponível. D-11 da fase1 exige metadados e indisponibilidade para visualização única; D-03 da fase2 permite histórico recebido, e D-10 da fase1 exige preservar o armazenamento. A correção deve uniformizar a projeção/acesso sem apagar evidência primária nem tratar edição/revogação comum como restrição. Não há bypass da autenticação web neste achado.

**Fix:** Aplicar a sanitização de mensagens restritas na projeção compartilhada usada por contexto e leitor básico, conservando só metadados permitidos; impedir que `matchedEvidence` restaure conteúdo de âncora restrita; conferir `messages.restricted` em `openVerifiedAttachment` antes de abrir o binário, cobrindo download, preview e empacotamento. Preservar bytes/revisões privados existentes. Acrescentar um teste com a transição comum→restrita, tanto diretamente quanto após redirect, e testar texto/anexos/GET/HEAD/Range. As regras de snapshot estável continuam válidas para edições/revogações permitidas; não devem autorizar exposição restrita em um contexto novo.

### CR-02: BLOCKER — Voltar de página suspensa deixa busca e exportação permanentemente bloqueadas

**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/public/app.js:506`; guardas de limpeza em `public/app.js:94,139,164-165,64`; retomada em `public/app.js:495-502`.

**Issue:** `pagehide` incrementa `readVersion`, invalidando respostas em andamento, mas limpa somente os estados de contexto/players. Busca, candidatos/listagem e criação de exportação conservam seus flags de loading. Os respectivos `finally` recusam a limpeza porque a versão mudou. `pageshow` autentica novamente e revela a página, porém não desfaz esses locks. Na criação de exportação, a resposta com `jobId` também é descartada; `exportCreating=true` continua desabilitando todas as ações Gerar ZIP.

**Trigger/evidence:** Chromium/Playwright com serviço e acervo sintéticos: reter resposta de `/api/search`, disparar `pagehide` persistido, liberar resposta e disparar `pageshow` persistido com sessão válida. Após revalidação, `search-panel` permanece `aria-busy="true"`, Buscar permanece disabled e o status permanece “Buscando mensagens…”. Repetição com POST `/api/exports` confirmou formulário `aria-busy="true"` e Gerar ZIP disabled após retornar. É o mesmo mecanismo de lifecycle já utilizado nos testes existentes, sem dados reais.

**Impact/required property:** Busca/geração deixam de funcionar até recarregar a página, contrariando a retomada com sessão válida de 02-02-02 e a recuperação explícita de jobs. Não basta impedir renderização tardia: cancelar uma geração deve liberar os controles que ela possuía.

**Fix:** Ao invalidar requisições no lifecycle, limpar os flags/loading/disabled de busca, candidatos/listagem e criação de exportação, mantendo os dados já carregados. Para POST aceito cujo `jobId` se perde, conservar uma maneira mínima de recuperar seu estado após challenge válido, ou informar a operação desconhecida e permitir retry sem lock permanente; não criar geração concorrente. O callback antigo continua sem poder renderizar ou limpar uma operação nova. Adicionar teste de pagehide/pageshow com busca e POST retidos; cobrir também logout recusado, que incrementa a mesma versão mas conserva a página autenticada.

### WR-01: WARNING — Localização de contatos falha com maiúsculas acentuadas

**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/archive.ts:534`.

**Issue:** O filtro usa `lower()` do SQLite para nome e termo. A implementação padrão dobra apenas ASCII; nomes recebidos como `ÁLVARO` não correspondem a `álvaro`, embora o código tente oferecer busca sem distinção de caixa. O fluxo pode dizer “Não encontrado no acervo” para um contato existente, antes de permitir selecioná-lo por ID.

**Trigger/evidence:** Fixture sintética com contato `ÁLVARO`: `listConversations({q:'ÁLVARO'})` retorna um candidato e `listConversations({q:'álvaro'})` retorna zero. Reproduzido no SQLite/runtime instalado, sem acesso ao acervo real.

**Fix:** Normalizar NFC e caixa Unicode de nome/query pela mesma função JavaScript, registrada como função SQLite determinística ou aplicada no caminho existente, preservando paginação e ID canônico. Não é necessário adicionar busca aproximada ou dependência. Testar `ÁLVARO`/`álvaro`, `JOÃO`/`joão` e formas composta/decomposta, além de homônimos.

## Verificação e limites

Todos os achados têm reprodução sintética curta; os três comandos de autoverificação terminaram com exit0 e produziram as divergências descritas. Temporários removidos, servidores/browsers fechados. Nenhum código/teste, perfil, serviço real, STATE/ROADMAP ou commit foi alterado pelo reviewer; somente este relatório foi criado.

Não repeti a suíte completa nem o aceite real, não executei benchmark, MCP/VPS/dispositivo físico ou varredura externa de dependências. Segurança/integração real anterior continuam limitadas às evidências próprias; esta revisão não confirma a conexão atual do WhatsApp original.

_Reviewer: gsd-code-reviewer · standard · 2026-10-12T00:54:34Z_

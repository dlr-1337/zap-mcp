---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
reviewed: 2026-10-12T01:49:27Z
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
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Fase 2: Code Review Report

**Reviewed:** 2026-10-12T01:49:27Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Revisão posterior aos fixes a4e3c66, b7a41c9 e 79faf03, integrados no checkout principal; HEAD observado 8bcaa2aa0bd076f833eec9ba23ee804019ce4fab. Mantido o escopo explícito anterior de 20 arquivos. package-lock.json foi consultado para conferir pins, excluído da contagem pelo filtro do workflow. O resolver anterior estava degraded; esta rodada usa a lista explícita e não infere commits adicionais. Sem substrate fallow ou lane externa.

Os três gatilhos anteriores foram corrigidos: CR-01 tem projeções restritas e matchedEvidence mascarados inclusive em snapshots/redirects, gate no original/preview e sua transmissão, e invalidação de ZIP pronto/preparando; CR-02 tem lifecycle liberando controles e requestId para recuperar criação; WR-01 tem candidatos normalizados por NFC/caixa Unicode. Os achados originais estão preservados em 02-REVIEW.iter2.md e não são reapresentados como achados novos.

A análise dos consumidores encontrou duas lacunas adjacentes na exportação, reproduzidas abaixo. O log final existente registra 138/138 testes, zero falhas/skips; o aceite posterior aos fixes registra 1.028 mensagens, 190 originais, 112 faltantes e browser/offline. Essas evidências não abrangem os dois gatilhos restantes.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-03: BLOCKER — Revogar o ZIP não interrompe seu descritor já entregue ao stream HTTP

**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/main.ts:148`; abertura em `src/export.ts:155-158`, revogação em `src/export.ts:114-117`.

**Issue:** O gate de restrição do ZIP é conferido apenas em openExport/getExportJob. A rota entrega o fd a createReadStream sem verificar novamente a seleção. Se a mesma mensagem se torna restrita durante um download, getExportJob marca o job failed e remove o caminho .zip, mas unlink não revoga o inode aberto: o stream existente continua entregando bytes restantes, incluindo conteúdo que a superfície agora declara indisponível. Diferentemente do stream de original corrigido, o ZIP não aplica o gate atual a cada chunk.

**Trigger/evidence:** Probe sintético descartável no Node24.21.0: gerar ZIP ready com mensagem comum, chamar openExport, ingerir a mesma chave com isViewOnce=true, chamar getExportJob. O job passa a failed e o pacote é removido; readSync no fd retornado ainda lê todos os 2.404 bytes do ZIP. O consumidor HTTP em main.ts:148 usa precisamente esse fd em stream sem validação adicional. Nenhum byte foi lido pelo probe antes da restrição. Um download maior/lento permite a mesma interleaving após início da resposta HTTP.

**Impact/required property:** A exceção de privacidade atual ao congelamento e a indisponibilidade de visualização única precisam bloquear bytes de ZIP ainda não enviados. Bytes já transferidos antes da restrição não podem ser recolhidos; o achado exige bloquear/abortar somente a entrega futura. Novas requisições são negadas corretamente; a lacuna está no stream iniciado antes da transição. Não há bypass de autenticação.

**Fix:** Fazer o manager fornecer stream ou guarda vinculada ao job/sessão e à seleção original aberta. Conferir restrição atual antes de cada chunk emitido e interromper resposta/fd quando o job ficar inválido. Não confiar apenas no selection.messages esvaziado pela revogação, que perde a lista necessária à guarda. Reutilizar o padrão de streamVerifiedAttachment com o controle compartilhado, preservando fechamento/abort/autoClose e primários. Adicionar regressão com fd/stream aberto, restrição antes do próximo chunk e confirmação de que nenhum chunk posterior é entregue; cobrir também revogação pelo polling durante download.

## Warnings

### WR-02: WARNING — Recuperação idempotente recusa a mesma solicitação por ID redirecionado

**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/export.ts:128`; seleção canônica em `src/archive.ts:494-509`, recuperação em `public/app.js:47-64,517-524`.

**Issue:** A primeira criação aceita conversationId antigo porque freezeExportSelection resolve conversation_redirects e grava o ID canônico em effectiveFilters. Ao repetir o mesmo requestId, create compara esse ID canônico com o ID antigo literal do POST. Solicitação idêntica da mesma sessão/período retorna 409 “Solicitação já usada para outro recorte”. O frontend conserva o ID original durante suspensão/falha de rede; na retomada trata o 409 como exportação concorrente, descarta exportRequest e não recupera o job criado.

**Trigger/evidence:** Mesmo probe sem HTTP/rede/acervo real: criar conversas PN e LID, registrar ID LID, reconciliar por ingestContacts, criar exportação usando ID LID antigo e requestId UUID. A primeira chamada retorna preparing com effectiveFilters.conversationId do PN; repetição imediata com parâmetros idênticos retorna status409. O job original chega a ready. Testes existentes cobrem idempotência e redirects separadamente.

**Impact:** Referências antigas continuam válidas por reconciliação recebida e snapshots/abas podem conservá-las. Se a resposta de criação se perde, a retomada não localiza o ZIP e permite gerar outro pacote em vez de recuperar a mesma solicitação. Estado/download pelo jobId conhecido seguem úteis; não ocorre acesso entre sessões nem perda do acervo.

**Fix:** Comparar identidades canônicas equivalentes usando o resolver compartilhado, ou conservar o conversationId solicitado na identidade idempotente do job. Resolver ambos os lados também quando reconciliação ocorrer depois da criação, sem reconstruir/mudar o recorte congelado; manter conflito para conversa efetivamente distinta, período diferente e sessão diferente. Adicionar repetição idêntica após redirect anterior à criação e após merge entre criação/retomada, incluindo POST retido e recuperação do mesmo jobId.

## Verificação e limites

Consultados AGENTS, bootstrap/configuração de skills, contexto/UI-SPEC, revisão anterior, fix report, código/consumidores/testes conectados, ACCEPTANCE/VALIDATION atuais e pins. Sem skills locais em .codex/skills ou .agents/skills. Respeitados arquivos ignorados e limites de uma conta/um proprietário.

O probe curto terminou com exit0 e confirmou os dois resultados divergentes; banco/derivados temporários fechados e removidos. A leitura após revogação usa a fronteira fd do consumidor; não foi simulado novo download HTTP sob backpressure nesta rodada. Suíte completa e aceites reais não foram repetidos: logs/relatórios existentes foram consultados e assertions dos novos testes conferidas contra os caminhos corrigidos.

Somente este relatório foi alterado pelo reviewer. Sem implementação/testes, STATE/ROADMAP, serviço, perfil, acervo, commits ou publicação. Não executados benchmark, scan externo de dependências, MCP, VPS ou dispositivo físico. Conexão autenticada do WhatsApp original permanece fora da evidência disponível; esta revisão não a confirma.

_Reviewer: gsd-code-reviewer · standard · 2026-10-12T01:49:27Z_

---
status: complete
phase: 03-consulta-e-arquivos-reais-no-codex
source: ["03-01-SUMMARY.md","03-02-SUMMARY.md","03-03-SUMMARY.md","03-04-SUMMARY.md"]
started: 2026-10-12T21:04:24Z
updated: 2026-10-12T21:07:26.051Z
execution_mode: autonomous
human_confirmation: false
scope: local-protected-offline-clone
---

## Current Test

[testing complete]

## Tests

### 1. Inicialização isolada e originais reais no Codex
expected: "Iniciar uma instância nova do serviço na cópia real restaurada offline, sem coletor; o Codex conecta por HTTPS válido e salva dois originais íntegros. Canal sem CA é recusado e a credencial temporária deixa de funcionar ao encerrar."
result: pass
source: autonomous
human_confirmation: false
verification_refs: ["test/mcp.test.ts#tracer real: Codex TLS negociado e dois originais no destino"]
technical_evidence: "Rodada nova em2026-10-12T21:03:34.968Z; Node24.21.0/Codex0.162.1; tracer1/1,exit0,57570.858276ms,zero fail/cancel/skip/todo. TLS positivo e negativa sem CA; duas chamadas get_attachment e dois novos destinos4200/271485bytes iguais ao disco/SQL/SHA. Finally comprovou bearer inválido eHTTP401 antes de fechar,token removido e grant anterior restaurado."
post_run_evidence: "Inspeção readonly independente: receipt da rodada atual, dois destinos regulares privados byte-a-byte iguais aos originais, zero chavesMCP/arquivos token-* em toda área de prova, service.lock ausente, TOMLglobal igual ao baseline pré-cleanup e zero calls de outros MCP."

### 2. Codex instalado negocia por TLS validado e salva dois originais com integridade
expected: "Codex instalado negocia por TLS validado e salva dois originais com integridade"
result: pass
source: automated
coverage_id: MCP-TRACER
coverage_summary: 03-01-SUMMARY.md
verification_refs: ["test/mcp.test.ts#tracer real: Codex TLS negociado e dois originais no destino"]

### 3. Bearer independente, schemas fechados e revogação no consumo
expected: "Bearer independente, schemas fechados e revogação no consumo"
result: pass
source: automated
coverage_id: MCP-ACCESS
coverage_summary: 03-01-SUMMARY.md
verification_refs: ["test/mcp.test.ts; test/readonly.test.ts; test/auth.test.ts; test/media.test.ts; test/export.test.ts"]

### 4. Candidatos separados e busca AND/calendário iguais às projeções Archive
expected: "Candidatos separados e busca AND/calendário iguais às projeções Archive"
result: pass
source: automated
coverage_id: MCP-QUERY
coverage_summary: 03-02-SUMMARY.md
verification_refs: ["test/mcp.test.ts#MCP candidatos preservam homônimos grupo e identidades recebidas; MCP busca AND legenda filename histórico e calendário reutiliza oráculo Archive"]

### 5. Sequência congelada, HMAC/TTL/escopo, envelope bounded e guard vigente no consumo
expected: "Sequência congelada, HMAC/TTL/escopo, envelope bounded e guard vigente no consumo"
result: pass
source: automated
coverage_id: MCP-CONTINUATION
coverage_summary: 03-02-SUMMARY.md
verification_refs: ["test/mcp.test.ts; test/search.test.ts; test/context.test.ts"]

### 6. Âncora e proveniência compartilhadas com site, busca histórica e continuação canônica congelada
expected: "Âncora e proveniência compartilhadas com site, busca histórica e continuação canônica congelada"
result: pass
source: automated
coverage_id: MCP-CONTEXT
coverage_summary: 03-03-SUMMARY.md
verification_refs: ["test/mcp.test.ts#MCP contexto preserva âncora e DTOs web com páginas congeladas bidirecionais; MCP contexto reutiliza busca histórica e redirect sem perder unknowns ou sanitização"]

### 7. Restrição/rotação vencem buffer, mensagens adversariais permanecem dados e operações WhatsApp são recusadas
expected: "Restrição/rotação vencem buffer, mensagens adversariais permanecem dados e operações WhatsApp são recusadas"
result: pass
source: automated
coverage_id: MCP-READONLY-CONTEXT
coverage_summary: 03-03-SUMMARY.md
verification_refs: ["test/mcp.test.ts#MCP contexto revalida âncora histórico e vizinha após formar buffer; MCP contexto bloqueia continuação bufferizada por restrição e rotação; MCP instruções fixas não promovem mensagem adversarial a ferramenta ou segredo","test/readonly.test.ts#HTTP privado status/QR/leitor/logout é somente leitura e funciona offline"]

### 8. Codex instalado consulta recorte paginado e contexto com proveniência e recupera dois originais íntegros por TLS
expected: "Codex instalado consulta recorte paginado e contexto com proveniência e recupera dois originais íntegros por TLS"
result: pass
source: automated
coverage_id: REAL-CODEX
coverage_summary: 03-04-SUMMARY.md
verification_refs: ["scripts/phase3-acceptance.mjs --mode real-codex; 03-ACCEPTANCE.md, rodada2026-10-12T17:13:27.794Z"]

### 9. Replay, fake/sintético, canal/protocolo/oráculo ausentes e destino antigo/parcial/corrupto não autorizam aceite
expected: "Replay, fake/sintético, canal/protocolo/oráculo ausentes e destino antigo/parcial/corrupto não autorizam aceite"
result: pass
source: automated
coverage_id: RECEIPT-GATE
coverage_summary: 03-04-SUMMARY.md
verification_refs: ["test/mcp-acceptance.test.ts; scripts/phase3-acceptance.mjs --mode self-test"]

### 10. Muitos lotes não impedem o menor resultado e a cobertura permanece conferível com orçamento limitado
expected: "Muitos lotes não impedem o menor resultado e a cobertura permanece conferível com orçamento limitado"
result: pass
source: automated
coverage_id: BATCH-COVERAGE
coverage_summary: 03-04-SUMMARY.md
verification_refs: ["test/mcp.test.ts#MCP resume muitos lotes sem bloquear consultas nem perder cobertura observada","scripts/phase3-acceptance.mjs#SQL/site batchSummary oracle"]

### 11. Regressão integrada e ledger de uso/rotação com dados privados fora do Git e endpoint transitório encerrado
expected: "Regressão integrada e ledger de uso/rotação com dados privados fora do Git e endpoint transitório encerrado"
result: pass
source: automated
coverage_id: PRIVACY-REGRESSION
coverage_summary: 03-04-SUMMARY.md
verification_refs: ["mise exec node@24.21.0 -- npm test; 177/177 em115158ms","git diff --check; ledger8tasks/20decisions/5requirements; artifacts0600 e0outros MCP"]

### 12. Confirmação autônoma do conjunto entregue
expected: "Localizar a conversa correta, buscar termos e período, continuar páginas, abrir contexto com autoria/citações/alterações e recuperar o original disponível; ausência e limites permanecem explícitos, sem escrita no WhatsApp."
result: pass
source: autonomous
human_confirmation: false
verification_refs: ["03-VERIFICATION.md","03-ACCEPTANCE.md","03-TRACER-CLEANUP.md"]
technical_evidence: "Dez entregas auto-covered, gate API e janelas de commits conferidos; owner verification.status continua passed com fingerprint vigente. Verificador independente conferiu as12calls preservadas contra SQL/site/ICU/disco,13mensagens em3páginas de128 e6contextos. Prova curta nova confirmou cliente/HTTPS/originais/cleanup; fonte e implementação não foram alteradas. Confirmação por delegação, sem resposta humana presumida."

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Método e limites

UAT executada por delegação conforme a autorização de autonomia do usuário e o padrão de 02-UAT.md; nenhuma resposta manual ou julgamento humano foi presumido. Os dez registros source:automated vêm do classificador canônico uat.classify-coverage (2+2+2+4, todos auto-covered, errors:[]). A confirmação única do conjunto é executada pelo agente e permanece identificada como autônoma.

- Gate verify:pre passou: COVERAGE.md com 17 capacidades, oito integrate e nove opt-out.
- Reconciliação dos quatro SUMMARYs pelas próprias janelas plan_head_before..plan_head_after: 8/8,7/7,4/4,4/4 commits; todos os HEADs finais são ancestrais do ramo atual.
- UI: zero checkpoints nesta fase MCP; não há UI-SPEC ou frontend novo. A seção automatizada foi avaliada, sem alegar inspeção visual no Codex.
- Referências históricas 154/164/172/177 nos SUMMARYs descrevem suas rodadas. A regressão mais recente está em 03-VERIFICATION.md:190/190, exit0. Não é nova execução nesta UAT.
- O aceite integrado de 12 chamadas e oráculos SQL/site/ICU/disco é evidência preservada, conferida pelo verificador independente; não será apresentado como nova execução deste roteiro.
- A prova nova usa somente o clone offline. Não reinicia, apaga cache, limpa sessão ou altera o coletor/acervo original. Endpoint e bearer são temporários; VPS, HTTPS/login web operacional, backup externo e restauração final permanecem na fase4.
- Build atual passou. O cold start usou processo novo e createService sobre o clone offline sem listener/lock vigente; não apagou banco, mídia ou sessão. É prova de inicialização do serviço e consulta de dados reais, sem afirmação de reboot físico, supervisor ou implantação na VPS.
- Tracer novo1/1 e auditoria readonly passaram; logs/recibo/transcrições/binários permanecem privados fora do Git. Zero resíduo de bearer/lock; a comparação de TOML usou o baseline anterior à recuperação, além da comparação byte-a-byte interna do tracer.
- Hooks verify:post após fingerprint não repetidos: VALIDATION/SECURITY/UI-REVIEW já presentes; segurança atual threats_open:0. Não houve alteração de código, dependências, client config ou artefatos cobertos pela verificação.
- O item Origin403/WINDOWS13 continua explicitamente no registro da fase4. Não é requisito incompleto do aceite local da fase3; esta UAT não o fecha nem cria plano duplicado.


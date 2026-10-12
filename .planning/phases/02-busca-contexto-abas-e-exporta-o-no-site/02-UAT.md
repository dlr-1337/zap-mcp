---
status: complete
phase: 02-busca-contexto-abas-e-exporta-o-no-site
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-10-12T09:47:28Z
updated: 2026-10-12T10:31:25.273Z
---

## Current Test

[testing complete]

## Tests

### 1. Inicialização e confirmação autônoma do site
expected: Inicializar uma cópia privada real sem coletor, entrar pelo formulário protegido e consultar o acervo com os controles da fase2.
result: pass
source: autonomous
human_confirmation: false
technical_evidence: CUA login real na cópia restaurada8792, lista50, busca12 correspondências, âncora/UTC/fuso explícitos e duas abas; original permanece no login sem senha/sessão alteradas.
scope: isolated-real-copy; original authenticated login not claimed

### 2. busca por texto legenda e nome da mesma revisão, histórico explícito e freeze de paginação
expected: "busca por texto legenda e nome da mesma revisão, histórico explícito e freeze de paginação"
result: pass
source: automated
coverage_id: D1
coverage_summary: 02-01-SUMMARY.md
verification_refs: ["test/search.test.ts#busca HTTP encontra termo literal em evidência congelada","test/search.test.ts#mais de100 empates preservam sequência e DTOs após retroativo edição e merge"]

### 3. calendário histórico e instante original sem substituição por ingestão
expected: "calendário histórico e instante original sem substituição por ingestão"
result: pass
source: automated
coverage_id: D2
coverage_summary: 02-01-SUMMARY.md
verification_refs: ["test/search.test.ts#dias inclusivos respeitam23h e25h","test/search.test.ts#calendário estrito limites abertos original null e Date.max não viram ingestão"]

### 4. candidatos distintos feedback acessível segurança e reflow da busca
expected: "candidatos distintos feedback acessível segurança e reflow da busca"
result: pass
source: automated
coverage_id: D3
coverage_summary: 02-01-SUMMARY.md
verification_refs: ["test/ui.test.ts#contatos homônimos e estados UC01 a UC22 usam DOM acessível e recorte estável","test/ui.test.ts#DOM candidatos zero um falha buscas loading termos inválidos e logout recusam resposta antiga","test/search.test.ts#busca privada valida auth cursores limites termos literais homônimos e sentinelas"]

### 5. âncora distante, vizinhas bidirecionais congeladas e histórico separado do atual
expected: "âncora distante, vizinhas bidirecionais congeladas e histórico separado do atual"
result: pass
source: automated
coverage_id: D1
coverage_summary: 02-02-SUMMARY.md
verification_refs: ["test/context.test.ts#resultado distante abre âncora congelada e vizinhas nos dois sentidos","test/context.test.ts#contexto conserva correspondência histórica e resolve redirect recebido"]

### 6. três abas com leitura própria, teclado, fechamento e telas estreitas
expected: "três abas com leitura própria, teclado, fechamento e telas estreitas"
result: issue
source: autonomous
coverage_id: D2
coverage_summary: 02-02-SUMMARY.md
verification_refs: ["test/ui.test.ts#abas usam teclado foco separado fechamento scroll e reflow UC23 a UC34","test/ui.test.ts#resultado distante abre âncora e duas leituras independentes"]

reported: "Agent observed: clique nativo entre abas após rolar perde630px; posição45596 torna-se44966. Conteúdo/âncora permanecem, mas a posição de leitura é perdida."
severity: major

### 7. sessão e tickets impedem mistura de respostas e ressurgimento de conteúdo privado
expected: "sessão e tickets impedem mistura de respostas e ressurgimento de conteúdo privado"
result: pass
source: automated
coverage_id: D3
coverage_summary: 02-02-SUMMARY.md
verification_refs: ["test/ui.test.ts#resposta retida de A não ativa A sobre B e fechar A invalida sua geração","test/ui.test.ts#logout vence resposta de contexto retida e bfcache exige sessão atual","test/context.test.ts#expiração e reset eliminam snapshots privados além de recusar sessão velha","test/security.test.ts#HTTP privado nega HEAD/Range, paths e vazamentos; revalida expiração antes de responder QR"]

### 8. Preview privado classificado por bytes e MIME, sem conteúdo ativo inline
expected: "Preview privado classificado por bytes e MIME, sem conteúdo ativo inline"
result: pass
source: automated
coverage_id: D1
coverage_summary: 02-03-SUMMARY.md
verification_refs: ["test/preview.test.ts#allowlist de raster áudio vídeo exige MIME e assinatura coerentes","test/preview.test.ts#ativo divergente inconclusivo e vazio conservam download original sem inline"]

### 9. Imagem e players nativos sob ação mantêm original em fallback e limpam respostas tardias
expected: "Imagem e players nativos sob ação mantêm original em fallback e limpam respostas tardias"
result: pass
source: automated
coverage_id: D2
coverage_summary: 02-03-SUMMARY.md
verification_refs: ["test/ui.test.ts#players nativos sob ação fallback e estados preservam original UC35 a UC39","test/ui.test.ts#HEAD retido close switch logout expiração e pagehide impedem GET tardio"]

### 10. Auth, Range, symlink e abort preservam privacidade e fecham descritores
expected: "Auth, Range, symlink e abort preservam privacidade e fecham descritores"
result: pass
source: automated
coverage_id: D3
coverage_summary: 02-03-SUMMARY.md
verification_refs: ["test/preview.test.ts#preview range paths symlink e fd verificado até fechamento","test/preview.test.ts#stream de preview abortado fecha fd sem alterar original","test/security.test.ts#HTTP privado nega HEAD/Range, paths e vazamentos; revalida expiração antes de responder QR"]

### 11. ZIP inclui todas as páginas, versões e originais congelados com cobertura e faltantes
expected: "ZIP inclui todas as páginas, versões e originais congelados com cobertura e faltantes"
result: pass
source: automated
coverage_id: D1
coverage_summary: 02-04-SUMMARY.md
verification_refs: ["test/export.test.ts#ZIP HTTP inclui todas as páginas e um original congelado","test/export.test.ts#manifesto conserva versões Unicode citações faltantes e nomes iguais sem sobrescrever"]

### 12. Pacotes corrompidos ou interrompidos não ficam prontos, privados e derivados expiram
expected: "Pacotes corrompidos ou interrompidos não ficam prontos, privados e derivados expiram"
result: pass
source: automated
coverage_id: D2
coverage_summary: 02-04-SUMMARY.md
verification_refs: ["test/export.test.ts#verificação ZIP rejeita CRC SHA conjunto duplicata traversal e absoluto","test/export.test.ts#falhas ENOSPC stream conferência e publicação não anunciam pronto nem apagam acervo","test/export.test.ts#SIGKILL antes e após publicação recupera preparing como failed preservando original","test/security.test.ts#export POST status HEAD Range e download isolam sessão CSRF e geração do proprietário"]

### 13. Browser usa período próprio, mantém leitura entre abas e recupera polling com download conferido
expected: "Browser usa período próprio, mantém leitura entre abas e recupera polling com download conferido"
result: pass
source: automated
coverage_id: D3
coverage_summary: 02-04-SUMMARY.md
verification_refs: ["test/ui.test.ts#browser exporta conversa inteira além da página e conclui download ZIP","test/ui.test.ts#exportação mostra período efetivo e recupera polling sem misturar abas UC40 a UC49","test/ui.test.ts#logout vence status de exportação retido e impede restauração de conteúdo"]

### 14. acervo real offline com busca contexto e ZIP integral conferidos por SQL e bytes independentes
expected: "acervo real offline com busca contexto e ZIP integral conferidos por SQL e bytes independentes"
result: pass
source: automated
coverage_id: D1
coverage_summary: 02-05-SUMMARY.md
verification_refs: ["scripts/phase2-acceptance.mjs --mode real-offline; P2-OFFLINE","test/acceptance.test.ts#aceite recusa evidência sintética ou ZIP truncado"]

### 15. duas leituras reais e originais JPEG Ogg MP4 documento e ZIP baixados por browser
expected: "duas leituras reais e originais JPEG Ogg MP4 documento e ZIP baixados por browser"
result: pass
source: automated
coverage_id: D2
coverage_summary: 02-05-SUMMARY.md
verification_refs: ["scripts/phase2-acceptance.mjs --mode real-browser; P2-BROWSER","test/ui.test.ts#players nativos sob ação fallback e estados preservam original UC35 a UC39"]

### 16. relatório sanitizado com cobertura rastreável e regressão completa sem skips
expected: "relatório sanitizado com cobertura rastreável e regressão completa sem skips"
result: pass
source: automated
coverage_id: D3
coverage_summary: 02-05-SUMMARY.md
verification_refs: ["mise exec node@24.21.0 -- npm test; dist/02-05-full-tests.log"]

### 17. serviço local atualizado preservando arquivo credenciais e recuperação
expected: "serviço local atualizado preservando arquivo credenciais e recuperação"
result: pass
source: automated
coverage_id: D4
coverage_summary: 02-05-SUMMARY.md
verification_refs: ["P2-SERVICE service-result.json; snapshot/restore/primary-tables/source-routes"]

## Summary

total: 17
passed: 16
issues: 1
pending: 0
skipped: 0
blocked: 0

## Reconciliation

- Coverage classifier: coverage mode,16 auto-passed,0 present,0 classification errors.
- Source version unchanged from verified product1a5b7c8; canonical verification remains passed.
- Bounded commit windows:02-01=7,02-02=6,02-03=6,02-04=9,02-05=5; all after hashes remain ancestors.
- 02-01/02-02 lack top-level commits fields: legacy WARNING; actuals.commits agrees with the bounded measurements. No mismatch or source change.
- verify:pre api-coverage gate passed: no new external API integration detected.
- No Playwright/Puppeteer browser MCP available; live_dom_uat false. Existing automated coverage is reused; no new visual inspection claimed.
- Native zoom,physical devices,current authenticated original WhatsApp connection,MCP and VPS remain outside this acceptance evidence.
- No new full suite or real acceptance run; no owner password/session/collector/archive modification.
- User explicitly delegated these checks to the agent; autonomous observation replaces the manual checkpoint. No human pass/consent is claimed.

## Gaps

- gap_id: G-02-6
  truth: "Alternar abas por clique nativo preserva a posição de leitura após rolar a conversa."
  status: failed
  reason: "Agent observed: scroll45596→44966 ao alternarA/B/A; barra de abas estava343px acima do viewport antes do clique."
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""



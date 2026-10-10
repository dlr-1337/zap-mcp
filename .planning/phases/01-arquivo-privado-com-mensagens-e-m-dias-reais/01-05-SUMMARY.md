---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "05"
subsystem: ui
tags: [native-ui, express, sqlite-session, evidence, privacy, tdd, playwright]
requires:
  - phase: "01-04"
    provides: Arquivo durável, coletor encapsulado e originais verificados com fila recuperável
provides:
  - Leitor privado nativo com janelas50/100, autoria, instantes, citações, histórico e limites
  - Seis estados de conexão, QR vigente efêmero, cobertura e quatro estados de anexo
  - Gate HTTP uniforme e revalidação de sessão antes de responder QR assíncrono
affects: ["01-06", "01-07", phase-2, phase-3]
tech-stack:
  added: []
  patterns: [DOM-textContent, async-generation-fencing, SQLiteStore-revalidation, verified-original-download]
key-files:
  created: [test/http.test.ts, test/security.test.ts]
  modified: [src/main.ts, src/auth.ts, public/index.html, public/app.js, public/style.css, .planning/WINDOWS.md]
key-decisions:
  - "UI nativa reutiliza consultas e sessão existentes; sem framework, nova dependência ou superfície futura."
  - "Respostas privadas tardias são descartadas após logout/expiração; página restaurada permanece oculta até revalidar sessão."
  - "Browser plugin not available; Playwright previamente instalado fora do produto valida somente fixtures sintéticas."
  - "Requisitos v1 continuam Pending; nenhum teste sintético comprova a conta, VPS ou Codex."
requirements-completed: []
requirements-supported: [WEB-01, PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-06, SYNC-07, EVID-01, MEDIA-02, MEDIA-03]
coverage:
  - id: D1
    description: Janelas limitadas privadas com identidade recebida, empates, aliases e acesso offline ao arquivo.
    verification:
      - kind: integration
        ref: test/http.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Leitor nativo, estados, evidências, teclado, QR e download com bytes conferidos.
    verification:
      - kind: automated_ui
        ref: /tmp/zap05-browser-qa.mjs + /tmp/zap05-browser-result.json
        status: pass
      - kind: automated_ui
        ref: /tmp/zap05-reader-320.png + /tmp/zap05-reader-768.png + /tmp/zap05-reader-1280.png
        status: pass
    human_judgment: false
  - id: D3
    description: Sessão, HEAD/Range, conteúdo hostil, symlink, erro seguro e expiração durante geração do QR.
    verification:
      - kind: integration
        ref: test/security.test.ts + test/auth.test.ts + test/readonly.test.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Aceite de conta real e originais reais permanece reservado ao piloto.
    verification: []
    human_judgment: true
    rationale: Pareamento, cobertura conhecida e quatro originais da conta ainda não foram observados; plano01-06 prepara o gate.
actuals:
  tokens: 17582
  tasks: 2
  commits: 4
commits: 4
plan_head_before: ae8c910d66066dac463f4034859786ab0946d9d4
plan_head_after: 23b9fb2a4fe038ce466e54ff2469bed3400ac7bd
duration: 12min
completed: 2026-10-10
status: complete
---

# Phase 1 Plan 5: Leitura privada com estados e evidências Summary

**Leitor nativo com evidência original, QR efêmero e downloads privados; sessão revalidada antes de respostas assíncronas e DOM protegido após logout.**

## Performance

- Started: 2026-10-10T21:49:55Z
- Completed: 2026-10-10T22:01:45Z
- Duration: 12min
- Tasks: 2/2
- Arquivos de produto/teste: 7; evidências RED: 2; ledger de desvios: 1.
- Actual tokens: caracteres/4 do diff realizado antes deste SUMMARY, incluindo evidências RED e ledger; não é contador do harness.
- Commits medidos antes dos commits de documentação: 4.

## Accomplishments

- Uma conversa por vez com janela mais recente cronológica, cursor anterior, lista50 e mensagens100. Tipo/identidade recebidos, homônimos distintos, autoria/direção, data America/Sao_Paulo, ISO UTC, referências, PN/LID e detalhes selecionáveis.
- Histórico observado separado do conteúdo atual, revogação, ordem incerta, citação parcial, temporária, visualização única e campos ausentes explícitos. Nenhum HTML de mensagem, preview, composer ou link remoto.
- Seis estados de conexão, lotes/falhas/intervalo honestos e QR PNG efêmero: confirmado por geração/validade, ocultado em erro/rede/logout/expiração. Sem código bruto, contagem fictícia ou bypass do gate pré-piloto.
- Originais finalizados/verificados com download autenticado, estados pending/downloading/retry_wait/unavailable, tamanho/hash local, comparação de origem e motivo seguro. Falhas mantêm mensagens.
- Logout confirmado limpa dados privados do DOM/memória; falha mantém leitura. Respostas tardias, restauração da página e sessão expirada não reconstruíram acervo privado nos testes de navegador.

## Task Commits

1. 01-05-01: `d4c169f` test — janelas/identidade/limites; `46204db` feat — leitor nativo e evidências.
2. 01-05-02: `d426ff3` test — TTL durante resposta QR; `23b9fb2` feat — revalidação e fronteiras privadas.

## Verification

- `mise exec node@24.21.0 -- npm test`: **52/52**, zero falhas, skipped ou todo; 11,137s. Log externo: `/tmp/zap05-full-suite.log`.
- Alvos HTTP/cobertura/mídia e segurança/auth/readonly executados; build Node24, `node --check public/app.js` e `git diff --check` passaram.
- Browser plugin not available no catálogo. Fallback previsto na skill frontend-testing-debugging: Playwright já instalado no runtime externo; nenhuma dependência de browser entrou no package/lock.
- Chromium headless local, URL final sintética `http://127.0.0.1:36069` (servidor encerrado após QA), viewports320/768/1280, escala de texto200%. Página correta, conteúdo significativo, sem overlay, zero page errors/console errors relevantes. Erros HTTP500/rede intencionalmente injetados foram classificados como parte da verificação.
- Fluxos: login vazio/recusado/autorizado; lista50+6; leitor100+anteriores; detalhes por Enter; volta/foco; nova mensagem oferece ação sem mover leitura/foco; consulta500 mantém leitura; download500 informa falha; logout500 mantém leitura; logout200 remove DOM; resposta200 atrasada após logout é ignorada.
- Seis conexões simuladas, QR vigente/vencido/bloqueado e imagem real do encoder; WhatsApp offline mantém consulta, browser offline preserva só leitura renderizada/oculta QR. Retomada e pagehide/pageshow verificam sessão antes de revelar página. Expiração remove dados e retorna ao login.
- Zero/uma/muitas conversas/mensagens, conversa sem nome, conversa sem mensagens e ID desconhecido conferidos. Unicode/RTL, texto multilinha, nomes/IDs/hashes longos sem rolagem horizontal nos tamanhos testados.
- Download original HTML/SVG sintético passou por interação real, conferência de bytes e SHA-256 `97ba26a8d216233d97e356d624fcb0d04179c5e24cf6bc131e2d7a967266a273`; nenhum script/HTML recebido executou.
- Anônimo/cookie vazio/inválido/expirado/revogado negado antes de IDs/HEAD/Range. Range primeiro/último/sufixo, malformados e múltiplos; path/Unicode/SQL/symlink; headers/caches; payload/quote restritos e erros simultâneos sem sentinelas privadas em DTO/headers/logs.
- Evidência externa: `/tmp/zap05-browser-qa.mjs`, `/tmp/zap05-browser-result.json`; 13 screenshots `/tmp/zap05-{qr,reader,zoom}-{320,768,1280}.png`, `qr-expired.png`, `server-offline.png`, `session-expired.png`, `empty-320.png` com prefixo zap05. Somente dados sintéticos.

## UI Considerations — checklist dos45 pares

Verificação reúne HTTP/DOM/interações e inspeção dos screenshots sintéticos; cada grupo conserva explicitamente seus pares do contrato.

| Grupo | Pares | Evidência concreta |
|---|---|---|
| empty | E1.empty E3.empty E4.empty E5.empty E6.empty E7.empty | Senha vazia; ingestão/intervalo ausentes; QR bloqueado/vencido; zero conversas; leitor sem seleção/vazio; nome/tamanho/hash ausentes explícitos |
| loading | E1.loading E2.loading E3.loading E4.loading E5.loading E6.loading E7.loading | Login busy/submit bloqueado; atualização de estado; QR só após resposta confirmada; lista/leitor busy; download com status e bloqueio de repetição |
| error | E1.error E2.error E3.error E4.error E5.error E6.error E7.error | Senha recusada; logout500; acesso ao servidor falho; QR removido; consulta500 mantém dados; referência404; download500 mantém mensagem |
| partial | E1.partial E3.partial E5.partial E6.partial | Form apenas senha; lote parcial/falha/watchdog; nome/tipo desconhecido; citação sem original, campos ausentes e viewOnce |
| long-text | E1.long-text E2.long-text E3.long-text E4.long-text E5.long-text E6.long-text E7.long-text | Senha mascarada; controles/estado/orientação refluem; nome/identidade/UUID/texto/arquivo/hash com quebra; screenshots320/768/1280 e200% |
| overflow | E2.overflow E3.overflow E4.overflow E5.overflow E6.overflow E7.overflow | Sem scroll horizontal; header em fluxo; QR256 limitado; grade288/minmax0; celular lista/leitor separados; detalhes/anexos refluem |
| populated | E3.populated E4.populated E5.populated E6.populated E7.populated | Status/cobertura recebidos, QR do encoder, links50+6, mensagens100 cronológicas/evidência/histórico e somente quatro originais verificados com link |
| zero-one-many | E3.zero-one-many E5.zero-one-many E6.zero-one-many | Acervo0/1/56; mensagens0/1/100+anteriores, lote sem/único/múltiplos registros; formato e limites conservados |

## TDD Gate Compliance

- HTTP RED: alvo nomeado falhou por identidade ausente; companion QR passou. `01-05-http-red.json` conserva TAP íntegro, exit1 e inspeção semântica; seam retornou RED_EVIDENCE_OK antes do código.
- Security RED: depois de anonimato, path, HEAD/Range, arquivo ativo e sentinelas, o alvo executou/falhou por **200 versus401** após TTL durante encoder. `01-05-security-red.json` conserva TAP íntegro, exit1 e inspeção semântica; seam retornou RED_EVIDENCE_OK.
- Sequência test→feat em ambas as tarefas; GREEN comprovado por alvos e suíte completa. UI/glue não tiveram TDD artificial de CSS. Nenhum refactor adicional necessário.

## Decisions Made

Preservados schema5, migrações, arquivo/auth/coletor/mídia e contratos anteriores. Identidade exibida somente quando corresponde a PN/LID/grupo recebido; chaves internas legadas continuam privadas. Sem busca, filtro, abas, preview completo, exportação, MCP ou operação remota WhatsApp.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule1 - Bug] Expiração durante geração assíncrona do QR.** O gate anterior verificava apenas existência da linha após await. SQLiteStore agora revalida TTL, geração e revogação antes de iniciar a resposta. Arquivos: src/auth.ts/src/main.ts; prova RED/GREEN HTTP; commit23b9fb2. WINDOWS4 fixed.
2. **[Rule1 - Bug] DTO novo expunha source_id legado privado.** Teste existente de auth detectou o sentinel source-private. Projeção mantém ausência explícita para identificadores não reconhecidos, preservando identidade PN/LID/grupo recebida. Arquivo: src/main.ts; teste antigo verde; commit23b9fb2. WINDOWS5 fixed.

## Issues Encountered

- `mise exec --` sem pin usa Node global26; comandos de produto foram corrigidos para `mise exec node@24.21.0 --`, sem alterar runtime global.
- Fixtures de QA foram ajustadas para o ID real da conversa, PNG/currentQR e estados após reconcile; falhas de setup não foram registradas como RED semântico.
- Hook visual apontou img sem src: removido o elemento estático, imagem criada somente após confirmação do QR. Nenhuma supressão/ignore persistida e nenhum finding deixado aberto.

## Known Stubs

Nenhum stub impeditivo. Bloqueio de coleta/pareamento real representa o gate intencional que o plano01-06 ainda deve implementar e conferir, não dados fictícios de produto.

## User Setup Required

Nenhuma intervenção para este plano. Conta/celular/VPS/cópia continuam separados dos testes locais.

## Next Phase Readiness

Pronto para01-06: preparar snapshot/restore privado e o gate real. Não executado aqui. Todos requisitos v1 continuam Pending até a evidência real prevista; testes sintéticos não estabelecem cobertura histórica da conta nem integração no Codex.

Limites: Chromium local e escala de texto200%, sem certificação de acessibilidade ou prova de zoom/chrome nativo de outros browsers. O download por Blob mantém o original em memória no navegador até entrega/revogação; originais muito grandes e custo de hash do acervo não foram medidos em volume real. Nenhum dado/QR real foi coletado/publicado; temporários e screenshots permanecem fora do repositório. `.planning/milestone.lock` preexistente desconhecido foi preservado.

## Self-Check: PASSED

Arquivos de produto/teste/evidências presentes; quatro commits ancestrais de HEAD verificados pelo resolver evaluation-scope (plan-subjects). Build/testes/sintaxe/diff/browser verdes; nenhum arquivo rastreado removido. WINDOWS sem entradas abertas.

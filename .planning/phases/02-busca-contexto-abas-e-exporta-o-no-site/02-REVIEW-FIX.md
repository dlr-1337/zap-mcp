---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
fixed_at: 2026-10-12T01:11:04.703Z
review_path: .planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Fase 2: Code Review Fix Report

**Fixed at:** 2026-10-12T01:11:04.703Z
**Source review:** `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: BLOCKER — Contexto e preview ainda expõem conteúdo de mensagem marcada como restrita

**Files modified:** `src/archive.ts`, `src/media.ts`, `src/main.ts`, `src/export.ts`, `test/preview.test.ts`, `test/export.test.ts`
**Commit:** a4e3c66
**Status:** fixed: requires human verification
**Applied fix:** Projeção compartilhada mascara texto/citação/revisões/anexos de mensagem atualmente restrita, incluindo leitor básico, contexto novo, páginas de busca/contexto congeladas e referências redirecionadas. Evidência correspondente antiga não restaura conteúdo da âncora restrita. Gate atual no acesso ao original e verificação por chunk do stream impedem download/preview/empacotamento usando ID ou descritor anterior. Dados primários, revisões, digest e binários continuam preservados; estado local available continua significando original armazenado, não autorização de acesso.

**Exceção explícita ao congelamento:** Restrição de privacidade atual prevalece sobre conteúdo do recorte anterior; ordem, referências e cursores continuam congelados. Edição/revogação comum continuam expondo histórico permitido. ZIP antigo afetado fica failed, sem downloadURL, com motivo “O recorte contém conteúdo marcado como restrito. Gere novamente.”; limpeza atinge somente derivados. Preparação confere restrição antes de empacotar, durante bytes e antes de publicar. ZIP gerado posteriormente usa seleção sanitizada.

**Verification:** RED: 2/2 regressões falharam antes da implementação (revisão/anexo expostos e ZIP antigo ready). GREEN: 2/2; subset contexto/busca/preview/export: 28/28, zero skip. Testes abrangem transição comum→restrita direta e após reconciliação PN/LID, snapshots anteriores, matchedEvidence, leitor HTTP, original/preview GET/HEAD com e sem Range, ZIP pronto e restrição com descritor já aberto durante preparação. Arquivo binário e evidência original permanecem no disco/banco. Casos existentes confirmam preservação de edições/revogações comuns e recortes estáveis.

### CR-02: BLOCKER — Voltar de página suspensa deixa busca e exportação permanentemente bloqueadas

**Files modified:** `public/app.js`, `src/export.ts`, `src/main.ts`, `test/ui.test.ts`, `test/security.test.ts`
**Commit:** b7a41c9
**Status:** fixed: requires human verification
**Applied fix:** Invalidação compartilhada encerra loading de busca, candidatos, listagem, contexto e criação, restaura controles e incrementa versões em pagehide/logout. Resultados/abas/posição continuam em memória; callbacks anteriores não podem renderizar nem limpar requisição nova. Logout recusado revalida a mesma sessão e recupera job; logout efetivo/401 limpa os dados.

A criação mantém requestId UUID em memória, reutilizado como jobId no POST já existente. Repetir o mesmo requestId/recorte retorna o job original da mesma sessão, mesmo se já pronto; outro recorte é 409, outra sessão é 404, requestId inválido é 400. Não há nova rota, schema, dependência ou persistência de conteúdo no navegador. Revalidação válida retoma solicitação pendente; falha de rede/5xx mantém o mesmo identificador e uma ação “Tentar conferir novamente”, impedindo criação duplicada. Aba fechada não deixa callback manipular DOM removido. A retomada compara o CSRF anterior com o challenge atual e exige sessão autenticada.

**T-02-14 / T02-14:** A recuperação reutiliza POST /api/exports com requireOwner + sessão/ownerGeneration, auth.csrf/Origin e autorização de sessão no manager. Não oferece consulta cruzada nem recuperação após revogação; o caminho de status/download conserva os gates existentes.

**Verification:** RED browser: busca após pagehide continuou aria-busy=true e POST retido perdeu seu ZIP; RED HTTP: requestId foi recusado antes do suporte. GREEN inicial: 3/3. Subset UI/security/export final: 31/31, zero skip. Inclui buscas/candidatos/listagem retidos, logout recusado, POST retido, rede interrompida, aba fechada, 401/expiração, revalidação, mesma referência de ZIP e resposta antiga liberada enquanto uma nova busca permanece loading. Segurança verifica idempotência, isolamento entre sessões, requestId/recorte inválido, Origin/CSRF, geração do proprietário e HEAD/Range privados.

### WR-01: WARNING — Localização de contatos falha com maiúsculas acentuadas

**Files modified:** `src/archive.ts`, `test/search.test.ts`
**Commit:** 79faf03
**Status:** fixed: requires human verification
**Applied fix:** Função SQLite determinística JavaScript unicode_lower normaliza NFC e caixa pt-BR para nome, identidade e termo no mesmo filtro. Preserva nomes recebidos, ID canônico, ordenação e paginação; não adiciona aproximação, remoção de acentos nem fusão de homônimos.

**Verification:** RED: contatos Unicode retornaram apenas uma grafia quando três eram esperadas. GREEN: 1/1, zero skip. Percorre paginação de um candidato, cobre ÁLVARO/álvaro e JOÃO/joão em NFC/NFD, conserva grafias e IDs distintos e recusa alvaro sem acento.

## Verificação e limites

Todos os gates acima rodaram no **worktree isolado** `/home/otavio/Documents/ChatGPT/zap-mcp 2/.claude/worktrees/rf-02-1791766787564`, criado de `600958710f3c3ec3a6e5cc445bd5dd59b2a98d82` em `gsd-reviewfix/02-1791766787565`. Não foi criado node_modules nesse worktree; Node resolve as dependências existentes no checkout ancestral. Sem links/junções de dependências ou teardown manual.

- TypeScript: `mise exec node@24.21.0 -- node ../../../node_modules/typescript/bin/tsc -p tsconfig.json` passou.
- JavaScript: `mise exec node@24.21.0 -- node --check public/app.js` passou.
- Releitura de cada trecho alterado e `git diff --check` passaram. Um commit atômico por achado; relatório não commitado.
- Chromium 152 empacotado: `/home/otavio/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`; Playwright do bundle existente.
- Suíte completa única: `ZAP_BROWSER_EXECUTABLE=/home/otavio/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome mise exec node@24.21.0 -- npm test`: **138 testes, 137 PASS, 1 FAIL, 0 skip**, 48.285s. Log preservado em `dist/02-reviewfix-full-tests.log`.

A única falha da suíte é ambiental: `auth.test.ts`, “arquivos públicos funcionam sob diretório oculto sem expor arquivos privados”, copia o checkout para /tmp e cria symlink para resolve('node_modules'). Nesse worktree sem node_modules local, o checkout temporário não resolve express e o subprocesso termina com ERR_MODULE_NOT_FOUND. Não é falha de uma asserção dos três fixes. O teste não foi alterado nem ignorado; sua verificação no checkout principal com dependências existentes permanece para o orquestrador.

Nenhum perfil, acervo real, sessão WhatsApp, coletor, serviço, STATE, ROADMAP, SUMMARY ou estilos foi alterado. Não executei aceite da conta real, MCP, VPS, dispositivo físico, scan externo ou benchmark. Dados sintéticos provam estas regressões, não cobertura da conta. Conteúdo/bytes já entregues anteriormente ao navegador não podem ser recolhidos retroativamente. Os três achados de lógica ficam sinalizados para revisão humana/independente; não marcar fase completa por este relatório.

---

_Fixed: 2026-10-12T01:11:04.703Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_


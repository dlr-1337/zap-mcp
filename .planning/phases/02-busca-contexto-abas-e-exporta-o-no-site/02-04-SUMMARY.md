---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "04"
subsystem: export
tags: [zip, yazl, yauzl, crc32, sha256, snapshot, privacy, playwright]
requires:
  - phase: 02-03
    provides: DTOs sanitizados, calendário Temporal, abas privadas e originais por fd verificado
provides:
  - ZIP integral de conversa/período com evidência congelada e faltantes explícitos
  - jobs privados exclusivos com conferência integral antes de ready
  - seleção própria por aba, período UTC compartilhado, polling recuperável e download privado
affects: [02-05, mcp, backup]
tech-stack:
  added: []
  patterns: [freeze síncrono antes do stream, ZIP lazy e conjunto CRC SHA conferido, publicação exclusiva, jobs derivados por sessão]
key-files:
  created: [src/export.ts, test/export.test.ts]
  modified: [src/archive.ts, src/main.ts, public/app.js, public/index.html, public/style.css, test/ui.test.ts, test/security.test.ts]
key-decisions:
  - "freezeExportSelection lê toda conversa canônica e evidência sanitizada numa transação; filtros são independentes da página e busca."
  - "jobs.sqlite fica no diretório privado de derivados; ready exige releitura completa CRC/SHA/conjunto, fsync e hardlink exclusivo."
  - "GET privado /api/exports/period compartilha parsePeriod com o POST para prévia UTC sem duplicar DST no browser."
  - "close ocioso mantém o contrato síncrono existente; somente geração ativa exige aguardar o exportador."
requirements-completed: [EXP-01, EXP-02, EXP-03, EVID-02]
requirements-proof-scope: "IDs declarados pelo plano; requisitos globais permanecem pendentes de02-05 e superfícies futuras."
coverage:
  - id: D1
    description: ZIP inclui todas as páginas, versões e originais congelados com cobertura e faltantes
    verification:
      - kind: integration
        ref: test/export.test.ts#ZIP HTTP inclui todas as páginas e um original congelado
        status: pass
      - kind: integration
        ref: test/export.test.ts#manifesto conserva versões Unicode citações faltantes e nomes iguais sem sobrescrever
        status: pass
    human_judgment: false
  - id: D2
    description: Pacotes corrompidos ou interrompidos não ficam prontos, privados e derivados expiram
    verification:
      - kind: integration
        ref: test/export.test.ts#verificação ZIP rejeita CRC SHA conjunto duplicata traversal e absoluto
        status: pass
      - kind: integration
        ref: test/export.test.ts#falhas ENOSPC stream conferência e publicação não anunciam pronto nem apagam acervo
        status: pass
      - kind: integration
        ref: test/export.test.ts#SIGKILL antes e após publicação recupera preparing como failed preservando original
        status: pass
      - kind: integration
        ref: test/security.test.ts#export POST status HEAD Range e download isolam sessão CSRF e geração do proprietário
        status: pass
    human_judgment: false
  - id: D3
    description: Browser usa período próprio, mantém leitura entre abas e recupera polling com download conferido
    verification:
      - kind: automated_ui
        ref: test/ui.test.ts#browser exporta conversa inteira além da página e conclui download ZIP
        status: pass
      - kind: automated_ui
        ref: test/ui.test.ts#exportação mostra período efetivo e recupera polling sem misturar abas UC40 a UC49
        status: pass
      - kind: automated_ui
        ref: test/ui.test.ts#logout vence status de exportação retido e impede restauração de conteúdo
        status: pass
    human_judgment: false
actuals:
  tokens: 17873.5
  tasks: 3
  commits: 9
commits: 9
plan_head_before: 2a74a99021c1253c969e58b154887e8db0f68a9b
plan_head_after: be009eb9bd8415e79a5a2774536a69abf463d689
duration: 17min
completed: 2026-10-11
status: complete
---

# Phase 2 Plan 4: Exportação privada integral Summary

**Conversa/período exportam mensagens, versões, manifesto e originais por UUID; CRC32, SHA-256, tamanhos e conjunto exato são conferidos antes da publicação privada.**

## Performance

- Início registrado2026-10-11T23:41:37Z; fechamento aproximado23:58Z,17min.
-3/3 tarefas;9 arquivos de produto/testes. actuals.tokens mede caracteres/4 do diff realizado, sem tokens do harness;9 commits medidos antes dos metadados pelo ledger persistido.

## Accomplishments

- `freezeExportSelection` resolve conversa canônica e congela DTOs, origins/PN-LID, revisões/fingerprints/citações, disponibilidade e tamanho/hash esperado, filtros e cobertura numa transação síncrona antes do202. Ordem é instante original/referência ASC, desconhecidos por último e excluídos somente quando há período. Não utiliza limite100 da página nem termos/cursor da busca. Edição, retroativo, identidade reconciliada e recuperação posterior não alteram o recorte.
- `createExportManager` mantém jobs em `exports/jobs.sqlite`, separados do arquivo original, com claim único preparing e escopo HMAC de sessão/ownerGeneration do HTTP. POST CSRF/Origin, status e GET/HEAD download são privados. Respostas202/400/404/409/410/413/422/507 têm motivos seguros. Download ZIP ignora Range e retorna pacote completo200; HEAD não transmite bytes. Revogação/reset elimina derivados e expiração limpa DTOs/ZIP, conservando tombstone sem conteúdo por até24h para410.
- Limites internos:50000mensagens,64MiB de DTOs, orçamento total2GiB de derivados e reserva livre max(256MiB,5%filesystem), TTL30min ou término da sessão. Estimativa integral é recusada antes da geração; stream monitora bytes/reserva. Não há truncamento, expurgo de originais nem configuração adicional de produto.
- `buildZip` usa yazl lazy por original, `openVerifiedAttachment` e o mesmo fd com posição0, confrontando hash/tamanho congelados. Nomes `arquivos/<attachmentUUID>.bin`; nomes recebidos são apenas metadados. Pendente continua faltante mesmo recuperado depois; ausente/divergente ao abrir recebe motivo seguro e preserva o hash esperado. Falha de leitura interrompe o job. TextoUTF-8 cronológico e manifest schemaVersion1 mantêm evidência recebida, unknown/restricted, capturedState/packagingState, referência/revisionId, UTC/fuso, contagens e missing; completeAccount=false.
- `verifyZip` relê todas as entradas por yauzl lazy/strictFileNames/validateEntrySizes, verifica unicidade/conjunto exato/tamanhos/CRC32 via node:zlib e SHA-256, incluindo texto/manifesto. Pipeline observa erros deZipFile/output/fd. Fsync do temporário, hardlink exclusivo/unlink e fsync do diretório antecedem ready. Startup converte preparing anterior em failed e limpa somente nomes de derivados de IDs válidos, sem tocar banco/mídia/sessão.
- Formulários nativos por aba têm ID de conversa fixo e datas próprias inicialmente vazias; `/api/exports/period` usa o mesmo parsePeriod para prévia dos limites UTC. Job global conserva labels congelados, counts reais incluindo0, leitura durante preparo, polling com ticket de sessão/job, retry do mesmojob e logout/pagehide invalidando respostas. Download passa por HEAD autenticado e navegação nativa; a UI anuncia solicitação, não transferência concluída.

## Task Commits

| Tarefa | RED | GREEN | Evidência |
|---|---|---|---|
|02-04-01|42b7727|29a0502|HTTP404≠202;12/12GREEN e tracer12/12|
|02-04-02|efd4fef|52e1706|DTO privado permaneceu apósTTL;17/17GREEN|
|02-04-03|cec1b96|bf0d6e8|préviaUTC DOM0≠1;23/23GREEN|
|Compatibilidade close|cb73e13|c2acbc9|reopen imediatofalse≠true;63/63afetados|
|Fault real de fd|—|be009eb|streamEBADF real;1/1 reforçado após full, produto inalterado|

## TDD Gate Compliance

TAP íntegro/exit real/semanticAssessment estão nos arquivos ignorados `dist/02-04-01-red.json`, `02-04-02-red.json`, `02-04-03-red.json`, `02-04-close-red.json`, todos aceitos como RED_EVIDENCE_OK antes do respectivo GREEN. Fixture/login/browser executaram e assertions planejadas falharam. Relatórios preliminares com dumps longos/nested error foram rejeitados pelo classificador; assertions booleanas com cleanup completo foram repetidas antes da implementação. Nenhuma recusa autorizou GREEN. Três tarefas e correção têm RED antes do GREEN; nenhuma refatoração adicional.

## Verification

- Task1 build+export/ui12/12, repetido12/12 pelo tracer antes de expandir. HTTP e browser final baixam162mensagens além da página e um original; `download.failure()` null, unzip -t status0, manifesto/count/hash e bytes originais iguais.
- Task2 build+export/security/search17/17: UnicodeNFD/RTL, quote/restricted/revoke, duas versões com mesmofilename e entradas distintas, pending congelado, DST23h/limites/null/vazio,50001 recusado, orçamento3GiB recusado, auth/CSRF/Origin/sessão distinta/reset/HEAD/Range e paths hostis.
- CRC/SHA, entrada ausente, duplicata, nome absoluto/traversal e ZIP truncado rejeitados. Sete faultpoints claimed/stream/entry/written/verified/synced/published falham e preservam mensagens e bytes anteriores. SIGKILL real em claimed/verified/published recupera preparing como failed e conserva mensagem arquivada. Após full, o fault stream foi reforçado para fechar o fd verificado antes da leitura e provocar EBADF real:1/1 passou, original disponível/bytes intactos, sem nova mudança de produto.
- Task3 build+ui/readonly/export23/23: períodos independentes, labels congelados, leituraB com jobA global, polling falho sem download/retry sem novoPOST, zero arquivos/faltantes explícitos e logout vencendo status retido. Novo readonly de exportação usa socket sintético desligado e contadores de métodos proibidos0; `test/readonly.test.ts` existente somente executado.
- Full inicial117/129 revelou regressão do close introduzida nesta entrega; corrigida na origem e63/63afetados passaram. Full final `mise exec node@24.21.0 -- npm test`:127/127,0fail/skip/todo,40,747s; log ignorado `dist/02-04-full-tests-final.log`. `git diff --check` limpo.
- Chromium152/Playwright existentes, somente fixtures sintéticas efêmeras. Capturas `dist/02-04-ui-{320,768,1280}.png` e zoom200.png inspecionadas, sem overflow.200% corresponde a fonte/reflow, não zoom nativo/dispositivo físico. A primeira tentativa addStyleTag foi bloqueada pela CSP; o teste usa CSSOM da folha existente.
- Fontes oficiais consultadas por Context7: [yazl](https://github.com/thejoshwolfe/yazl) para addReadStreamLazy/size/errors/end; [yauzl](https://github.com/thejoshwolfe/yauzl) para lazyEntries/strictFileNames/validateEntrySizes/close. Nenhum pacote instalado ou atualizado.

## Deviations from Plan

1. **Adaptação autorizada de contrato:** préviaUTC exige `GET /api/exports/period`, registrada antes de `/:id`, autenticada e com allowlist from/to. main.ts já estava no escopo e compartilha parsePeriod; sem duplicação de DST no JS. Formulário/HTML/CSS e freeze mínimo chegaram na tarefa1 para provar o tracer; robustez e estados ficaram nas tarefas seguintes. WINDOW9 fixed.
2. **[Rule1 — Bug] Close ocioso assíncrono:** integrar exports.close como Promise em todos os casos atrasou liberação da trava e quebrou callers que fecham/reabrem imediatamente. Correção preserva fechamento síncrono semjob ativo e aguarda somente geração ativa. src/main.ts/src/export.ts; REDcb73e13/GREENc2acbc9;63/63afetados e127/127full. WINDOW8 fixed. Nenhum teste legado foi alterado para contornar o defeito.

## Issues Encountered

Tipos ReadableStream do yazl exigiram tipar o output como Readable para destroy; ajuste de fixtureHeaders TypeScript e CSSOM descrito acima. Primeiros TAPs extensos foram recusados e repetidos. Sem gates de autenticação, instalação ou arquitetura.

## Known Stubs

Nenhum stub essencial, teste skip/todo ou verify não executado. Nulls representam desconhecidos, faltantes ou contagens ainda não conferidas durante preparing. Todas as superfícies novas correspondem aos threatsT-02-14..18/T-02-SC previstos; a rota de período também é privada e não lê arquivo/socket.

## Next Phase Readiness

Pronto para02-05: aceite real de busca/contexto/abas/preview/ZIP e revisão final. Não houve acesso/alteração ao perfil/coletor real, novo pareamento, VPS, push ou implantação. requirements.ready-ids devolveu0/4, portantoEXP-01/02/03/EVID-02 globais não foram marcadosComplete. Dados sintéticos comprovam mecanismos, não cobertura da conta ou operação final.

## Self-Check: PASSED

Os nove arquivos existem; todos os nove commits são ancestrais deHEAD no checkout correto. Contagem9 medida do ledger2a74a990→be009eb, tokens17873.5chars/4; evaluation-scope resolve o plano nesta branch. Todos os verify tiveram testes descobertos semskip; artefatos/capturas são sintéticos e ignorados. SUMMARY versionado antes do avanço deSTATE/ROADMAP.

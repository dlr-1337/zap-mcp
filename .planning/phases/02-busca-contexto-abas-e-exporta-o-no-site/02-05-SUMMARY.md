---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "05"
subsystem: acceptance
tags: [real-archive, offline, sql-oracle, playwright, zip, privacy, recovery]
requires:
  - phase: 02-04
    provides: busca/contexto/abas/preview e exportação privada integral implementados
  - phase: 01-07
    provides: conta real vinculada e snapshot privado verificado
provides:
  - roteiro repetível que confere consulta e ZIP reais contra SQL e bytes independentes
  - leitura A/B, mídia e downloads reais comprovados em browser sobre restore offline
  - aceitação sanitizada e ledger15tarefas/42edges/49UC para revisão independente
  - atualização local com snapshot atual e recuperação preservados
affects: [phase-2-verification, mcp, operations]
tech-stack:
  added: []
  patterns: [oráculo SQL/files independente, somente agregados públicos, prova privada0600, restore sem coletor]
key-files:
  created: [scripts/phase2-acceptance.mjs, test/acceptance.test.ts, .planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-ACCEPTANCE.md]
  modified: [.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-VALIDATION.md]
key-decisions:
  - "Aceite real usa snapshot daPhase1 vinculado ao reciboHMAC; caso/ref/termo ficam privados e o oráculo não chama search/freeze/manifest do produto."
  - "Browser usa Playwright/Chromium existentes e relata JPEG/Ogg/MP4 efetivamente decodificados/reproduzidos; fixtures cobrem adversidades e codecs fora do suporte."
  - "Unidade local transitória foi recriada com comando/ambiente/perfil/propriedades preservados após desaparecimento ao parar; senha original nunca alterada."
  - "Conexão atual da fonte original não foi autenticadamente observada; consulta da cópia offline e atualização segura são provas distintas."
requirements-completed: [EVID-02, WEB-02, WEB-03, WEB-04, WEB-05, EXP-01, EXP-02, EXP-03]
requirements-proof-scope: "IDs declarados noPLAN; site/exportação reais comprovados, registro global e conclusão da fase aguardam revisão/verificador independentes."
coverage:
  - id: D1
    description: acervo real offline com busca contexto e ZIP integral conferidos por SQL e bytes independentes
    verification:
      - kind: integration
        ref: "scripts/phase2-acceptance.mjs --mode real-offline; P2-OFFLINE"
        status: pass
      - kind: unit
        ref: "test/acceptance.test.ts#aceite recusa evidência sintética ou ZIP truncado"
        status: pass
    human_judgment: false
  - id: D2
    description: duas leituras reais e originais JPEG Ogg MP4 documento e ZIP baixados por browser
    verification:
      - kind: automated_ui
        ref: "scripts/phase2-acceptance.mjs --mode real-browser; P2-BROWSER"
        status: pass
      - kind: automated_ui
        ref: "test/ui.test.ts#players nativos sob ação fallback e estados preservam original UC35 a UC39"
        status: pass
    human_judgment: false
  - id: D3
    description: relatório sanitizado com cobertura rastreável e regressão completa sem skips
    verification:
      - kind: integration
        ref: "mise exec node@24.21.0 -- npm test; dist/02-05-full-tests.log"
        status: pass
    human_judgment: false
  - id: D4
    description: serviço local atualizado preservando arquivo credenciais e recuperação
    verification:
      - kind: manual_procedural
        ref: "P2-SERVICE service-result.json; snapshot/restore/primary-tables/source-routes"
        status: pass
    human_judgment: false
actuals:
  tokens: 14288.25
  tasks: 3
  commits: 5
commits: 5
plan_head_before: 966c02552e2290d3c0c4ed0a3f1fe76c14ec4a96
plan_head_after: 4888ed734ffa53b2c5543e5a514bddd04b9368c5
duration: 18min
completed: 2026-10-11
status: complete
---

# Phase 2 Plan 5: Aceite real offline e browser Summary

**SQL e arquivos independentes conferem1.028mensagens,190originais e112faltantes no ZIP; browser real preserva duas leituras, reproduz mídia e conclui downloads sobre restore sem coletor.**

## Performance

Início registrado2026-10-12T00:04:13Z, fechamento2026-10-12T00:22Z (dia11 emAmerica/Sao_Paulo),18min.3/3tarefas,4arquivos de código/teste/documentação. Tokens são caracteres/4 do diff realizado;5commits medidos pelo ledger antes deste SUMMARY/metadados.

## Accomplishments

- `runAcceptance` valida snapshot privado e reciboHMAC da fonte, vínculo do mesmo snapshot e identidade já pareada; restaura em destino novo foraGit, modo0700, senha aleatória somente na cópia. `createService` não inicia coletor/QR/socket; status desconectado e rotas privadas conferidos. Snapshot revalidado e cópia descartável removida somente após fechar servidor/DB/trava. Fonte/snapshots/evidências preservados.
- Oráculo SQL parametrizado independente dos helpers lê mensagens/revisões/origins/PN-LID/anexos. CalendárioICU independente encontra a primeira epochms do dia; busca combina candidato canônico/termo/filename/período, percorre todas páginas e contexto bidirecional.1.037mensagens na conversa/contexto;1.028 no período e noveunknown excluídos. UTC/texto/autoria/direção/citação/revisões/referências/ordem conferidos. João existe entre candidatos; amostra escolhida por cobertura observável, sem inferir acordo.
- ZIPHTTP e browser incluem1.028mensagens/190originais/112faltantes,1.088revisões e40citações. Oráculo confere cada referência/revisionId/origin/UTC, cada tamanho/SHA contra bytes privados, todos faltantes e conjunto exato de entradas; TXT contém referências e fuso, unzip -t0. Original disponível não é substituído por miniatura. CapturedState/packagingState e faltantes preservados.
- Chromium152.0.7977.82 existente decodificou JPEG e reproduziu Ogg/MP4 reais com currentTime>0/videoWidth>0; documento por download. Quatro downloads nativos terminados e hashes iguais; ZIP além da página conferido. Duas abas preservaram DOM/texto/scroll, foco e tecladoArrow/Home/End/Enter/Delete; zero previewGET antes da ação/storagevazio;320/768/1280/fonte200%; logout venceu contexto real retido. Fixtures cobrem homônimos/races/TTL/HTMLhostil/codecMP4Part2/fault/crash.
- Atualização local autorizada preservou cópia atual8.771mensagens/853originais, restoreoffline e aplicação anterior compilada para recuperação. Fonte encerrada limpa/trava liberada antes do backup;7tabelas iguais com fonte parada. Todasrefs preservadas após índice/startup,senha/chaveidentidadeiguais,JSnovo/5rotas401 eMainPIDúnico. Status da conexão original não foi autenticadamente observado; sessão salva não é prova de conectado ou retomadasemQR.
- `02-ACCEPTANCE`/`02-VALIDATION` distinguem prova real/sintética e rastreiam15tarefas/42edges/49UC/7proibições. Full130/130semfail/skip/todo; nyquist/wave0 registrados com evidência, sujeitos à confirmação independente. Nenhum requisito global/phase.complete foi aplicado.

## Task Commits

| Tarefa | RED | GREEN / documentação | Prova |
|---|---|---|---|
|02-05-01|5e40b48|2209057|selfcheck2/2;real-offline/tracer repetido e finalpass|
|02-05-02|d1e9e1c|79d1f20|selfcheck3/3,focados16/16;browserreal repetido com4downloads/ZIP|
|02-05-03|—|4888ed7|full130/130;relatório/ledger/atualização local comlimite explícito|

## TDD Gate Compliance

REDs `dist/02-05-01-red.json` e `dist/02-05-02-red.json` preservam TAP íntegro/exit real1, alvo executado e semanticAssessment. Ambos receberamRED_EVIDENCE_OK antes dos commitsGREEN. Primeiro alvo recusava origem sintética e recorte falso; segundo recusava checklistbrowser incompleto. Import faltante foi tratado somente como ausência do validador no selfcheck, sem autorizarGREEN por erro de import/sintaxe/setup. Reforço detectou ausência de provas de arquivos com arrayvazio e foi corrigido exigindo contador independente exato; testes3/3 verdes. Sem refatoração adicional.

## Verificação executada

- BuildNode24.21.0 atual passou. Selfcheck3/3; acceptance/ui16/16semfail/skip,31,335s.
- Real-offline inicial, tracer repetido antes da expansão e execução final após reforçar oráculo passaram; real-browser após ajuste de seletor e repetição final passaram. Stdout somente agregados/checks; report/ZIP/capturas/IDs/hashes permanecem0600 foraGit. Rótulos privadosP2-OFFLINE/P2-BROWSER/P2-SERVICE discriminam a origem da prova.
- Full `mise exec node@24.21.0 -- npm test`:130/130,0fail/skip/todo,39,740s. Log sintético ignorado dist/02-05-full-tests.log. Browser/fixtures não usaram conta/socket real; roteiro real serviu exclusivamente a cópia restaurada.
- `git diff --check` limpo; evaluation-scope resolveu5commits nesta branch. Quatroarquivos declarados existem e commits são ancestrais deHEAD. Nenhuma deleção de arquivo rastreado ou dependência nova.

## Decisions Made

Reutilizados backup/restore/autenticação/exportação atuais; script.mjs não ampliou tsconfig/stack. Oráculo usa SQL/files/ICU, não implementação de search/freeze/manifest. Provas privadas não são copiadas aoGit. Credenciais originais preservadas; não criar bypass para confirmar conexão. Containers testados não prometem suporte universal decodec, fonte200% não é zoom nativo e não houve dispositivo físico/aceite humano presumido.

## Deviations from Plan

1. **[Rule3 — Blocking] Unidade transitória desapareceu após stop.** Comando/ambiente/propriedades já preservados privadamente; systemctlstart falhou porque a unidade foi coletada. Recriada com mesmonome/perfil/Node24/serve--collect epropriedades, sem segundo coletor. Snapshot/restore/fallback anteriores prontos; resultadoP2-SERVICE confirma preservação e rotas. Nenhuma mudança deproduto para contornar.
2. **[Rule2 — Missing critical] Completeness do selfcheck de arquivos.** Assertion sintética detectou que array vazio de digests passava emevery; validador exige expectedFileCount independente e exato. Roteiro também vincula snapshot fornecido ao recibo verificado da fonte. scripts/phase2-acceptance.mjs,test/acceptance.test.ts;79d1f20;3/3+real-browser final+offline finalpass.

Operação local foi extensão explicitamente autorizada pelo orquestrador; nenhum deploy/VPS/publicação/nextphase. STATE/ROADMAP/REQUIREMENTS de conclusão continuam com o orquestrador apósreview/verifier.

## Issues Encountered

Primeiro browser-run parou porque seletor de preview encontrava o link no resultado de busca; confinado ao leitor#messages e repetido, sem alterar oproduto. CredsBaileys jávinculadas têm me/account/signalIdentities mas registered não era true; identidade real é comprovada pelos campos/vínculo do recibo, não pelo flagisolado. Nenhum gate deautenticação para a cópia; senha original indisponível limita somente status da instânciafonte e é registrado sem redefini-la.

## Known Stubs

Nenhum stub essencial,skip,todo ouverify não executado. Os limites explicitados são ausência de prova da conexão original atual, zoomnativo/dispositivofísico e suporteuniversal decodec; não bloqueiam consulta/exportação do arquivo offline nesta fase. Superfícies do roteiro correspondem ao threat_model T-02-19..22/T-02-SC; nenhuma rota/endereço/schema de confiança nova foi introduzida no produto.

## Next Phase Readiness

Entregável pronto para controles independentes code-review/security/UI e gsd-verifier. Fonte local atualizada comrecuperação preservada; acervo real consultável/exportável sobrecópia offline. MCP/Codex,VPS/HTTPS/backup externo e conclusão global permanecemfora desta execução.

## Self-Check: PASSED

Quatroarquivos esperados existem;5commits medidos pelo ledger são ancestrais deHEAD e evaluation-scope estáresolved. Suíte130/130sem skips; ambos modos reais e subsetDOM passaram. Artefatos públicos contêm apenas agregados; dados/credenciais/capturasprivados foraGit. SUMMARY versionado antes de metadados de continuidade; nenhum avanço dephase.complete/requisitos foi realizado.

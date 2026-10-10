---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "06"
subsystem: recovery
tags: [sqlite-backup, offline-restore, sha256, private-receipt, collector-gate, tdd]
requires:
  - phase: "01-05"
    provides: Arquivo, auth, coletor exclusivo, originais e leitura privada autenticada
provides:
  - Snapshot offline consistente de bancos, originais finalizados e manifests privados
  - Restore isolado conferido por SQL, contagens, hashes e HTTP autenticado
  - Recibo do perfil fonte obrigatório antes do socket real e preflight somente leitura
affects: ["01-07", phase-4]
tech-stack:
  added: []
  patterns: [exclusive-offline-copy, SQLite-backup-API, staged-fsync-publication, HMAC-receipt, restored-offline-only]
key-files:
  created: [src/backup.ts, test/backup.test.ts, .env.example]
  modified: [src/main.ts, src/whatsapp.ts, src/media.ts, test/recovery.test.ts, README.md, .planning/WINDOWS.md]
key-decisions:
  - "Backup offline usa parada/drain/close e mesma service.lock; recusa escritor vivo."
  - "Snapshot imutável exige destino novo; schema/contagens/FK/SHA256 e manifests são conferidos antes de publicação."
  - "Recibo HMAC usa segredo privado existente, identidade pública do perfil e diretório fonte; clone restaurado permanece offline."
  - "Verificação usa login e downloads pelo HTTP loopback; troca somente senha web da cópia descartável."
  - "Requisitos v1 continuam Pending: fixture não prova conta, cobertura, sessão remota ou VPS."
requirements-completed: []
requirements-supported: [PRIV-02, PRIV-03, SYNC-04, MEDIA-02, MEDIA-03, WEB-01]
coverage:
  - id: D1
    description: WAL, auth, proveniência, FTS5 de fixture e quatro originais restaurados com hashes.
    verification:
      - kind: integration
        ref: test/backup.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Writer ativo, corrupção, paths, destino ocupado, SQL, ENOSPC e SIGKILL recusam sucesso indevido.
    verification:
      - kind: integration
        ref: test/backup.test.ts + test/recovery.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Restore HTTP autenticado emite prova e libera um socket; clone, recibo adulterado e snapshot inválido bloqueiam.
    verification:
      - kind: integration
        ref: test/recovery.test.ts#ramo real libera exatamente um socket após prova e bloqueia clone restaurado antes do socket
        status: pass
      - kind: other
        ref: /tmp/zap06-smoke.mjs + /tmp/zap06-cli-result.json
        status: pass
    human_judgment: false
  - id: D4
    description: Conta real, reinício remoto e quatro originais conhecidos aguardam plano01-07.
    verification: []
    human_judgment: true
    rationale: Nenhuma conexão WhatsApp iniciada; usuário precisa ler QR e comparar amostras da conta.
actuals:
  tokens: 17216
  tasks: 2
  commits: 7
commits: 7
plan_head_before: 6cc3d325be19277cd2424dcc32072126492d90cf
plan_head_after: c9e2901e9285384960681b48db5867b6f5a4e438
duration: 15min
completed: 2026-10-10
status: complete
---

# Phase 1 Plan 6: Cópia consistente e restauração offline antes do QR Summary

**Snapshot privado por API SQLite, restore isolado conferido por bytes e HTTP autenticado, e recibo do perfil fonte obrigatório antes do coletor real.**

## Performance

- Início de referência2026-10-10T22:08:36Z (mtime do bundle de dispatch); conclusão2026-10-10T22:23:26Z;15min.
- Tarefas2/2; produto/testes8 arquivos,3 evidências RED e2 documentos de defeitos.
- Actual tokens=ceil(68861 caracteres/4)=17216 sobre diff Git do ledger até plan_head_after, incluindo evidência/defeitos e excluindo SUMMARY/tracking para não medir o próprio relatório. Não é contador do harness.
- Sete commits medidos antes do fechamento documental; base/cabeça acima permitem repetir a medida.

## Accomplishments

- CLI profile-init, owner-set por stdin, backup, restore, verify-backup, preflight, serve offline e serve --collect ligado à prova. ZAP_PORT é a variável documentada/consumida; nenhum segredo por argv.
- Backup exige fonte parada e trava comum. Encerramento suspende geração do coletor, aborta/drena streams e só depois fecha bancos/libera a trava. Ingestão/keys usam transações síncronas sem await; instância viva recusada sem remover sua trava.
- SQLite.backup captura WAL sob exclusividade. Cópias usam journal DELETE para consultas sem sidecars. Manifest inclui versões/schema hash/contagens de todas tabelas e hashes dos arquivos. SQL integrity/FK, IDs UUID, paths/symlinks e permissões conferidos.
- Só originais disponíveis finalizados e seus manifests entram; arquivos desconhecidos/temporários/danificados permanecem na fonte. Reserva max(256MiB,5% volume), blocos64KiB, staging exclusivo e fsync/rename; destino novo preserva snapshot anterior.
- Restore publica diretório0700/arquivos0600 e marca consulta offline, sem segundo coletor. Verify confere bancos/auth/bytes, login, mensagens paginadas e downloads de4 fixtures pelo servidor restaurado. Recibo HMAC somente após sucesso, associado ao perfil/diretório fonte e manifesto. Startup reconcilia antes de socket/worker.
- Preflight confere runtime24, permissões, SQL/configuração do proprietário, reserva, exclusividade e recibo/snapshot. Ensaio confirmou preflight sem mutação de arquivos; saída CLI sem caminhos privados/credenciais/conteúdo/chaves.

## Task Commits

1. `1bd4737` test — RED snapshot/restore.
2. `e0e7947` feat — cópia/restore offline, CLI e documentação.
3. `3e43a58` test — RED gate/recibo.
4. `457d0c6` test — falso ENOSPC determinístico sob variação do disco.
5. `c0977f4` feat — prova HTTP/HMAC, preflight e socket real gated.
6. `d08d928` fix — reserva desconhecida depois dos compromissos conhecidos.
7. `c9e2901` fix — preflight exige proprietário e ledger corrigido.

## Verification

- Task01-06-01: build + backup/auth-state/media15/15, ~1.33s.
- Task01-06-02: build + backup/recovery/collector/http24/24, ~5.54s, antes da regressão extra de espaço; todos também na suíte final.
- Mídia/recuperação após fix19/19, ~5.35s; concorrência2/tentativas5/timeout120s, pausa ENOSPC/crash/preservação mantidos.
- Suíte padrão final `mise exec node@24.21.0 -- npm test`:60/60, zero skips/failures, ~10.78s; `/tmp/zap06-final-green.tap`.
- Falha intermediária58/59 no teste existente de tamanho/hash/Long após uma execução59/59. Runner sequencial59/59 ajudou diagnóstico e não foi usado como solução. Regressão reproduziu falso ENOSPC com4KiB de variação e quase1GiB livre; após fix suíte padrão paralela60/60 duas vezes (última após guard owner-set).
- SIGKILL antes de publicação do snapshot e antes do recibo: fonte/cópia anterior preservados e nenhum recibo. Trava órfã recuperada na retomada normal.
- Caminho real makeWASocket usa module mock do node:test, sem factory fornecida ao produto: prova válida libera um socket mock; segunda instância/clone recusados antes do socket. Nenhuma rede WhatsApp.
- `/tmp/zap06-smoke.mjs`: CLI real, perfil/senha sintéticos,4 originais, backup/restore/verify, download HTTP autenticado, preflight sem mutação e destino ocupado recusado. Dados privados temporários removidos; resultado agregado `/tmp/zap06-cli-result.json`.
- Diff/check/stub scan passaram. SDK evaluation-scope encontrou7 commits neste ramo. Sem stub funcional, teste omitido ou requisito v1 concluído.

## TDD Gate Compliance

- Snapshot RED: asserção de capacidade ausente; import capturado para não gerar falha de carregamento. `01-06-backup-red.json`, RED_EVIDENCE_OK; GREEN e0e7947.
- Gate RED: verifyBackup/assertCollectorReady ausentes; bloqueio incondicional temporário não era prova. `01-06-gate-red.json`, RED_EVIDENCE_OK; GREEN c0977f4.
- Reserva RED: available falhou por falso ENOSPC após4096bytes de variação controlada. `01-06-budget-red.json`, RED_EVIDENCE_OK; GREEN d08d928.
- Primeiro ensaio RED de snapshot tinha erro TypeScript da fixture Awaitable; corrigido antes da execução real/autorizar GREEN. Evidências válidas completas preservadas. Sem refactor adicional necessário.

## Deviations from Plan

1. **[Rule2 — Missing critical] Ligação src/whatsapp.ts:** placeholder real estava no módulo wave3, fora da lista original. Mudança mínima autorizada pelo orquestrador usa assertCollectorReady antes de makeWASocket; factories sintéticas internas preservadas. Module mock prova caminho real/exclusividade. c0977f4.
2. **[Rule1 — Bug] Ciclo CLI:** top-level await de main aguardava verify-backup que importava main para abrir restore; standalone saía13. CLI agora dispara promise com catch e permite finalizar avaliação do módulo. Subprocess CLI/ensaio protegem regressão. c0977f4.
3. **[Rule1 — Bug, scope autorizado pelo orquestrador] Reserva mídia:** unknown ocupava todo free medido apesar de variação/alocação, produzindo falso ENOSPC em known. Callers inspecionados; unknown cede capacidade variável após compromissos conhecidos, mantendo reserva/limites sem teto novo. src/media.ts e recovery;457d0c6/d08d928. WINDOWS#6 fixed e deferred-items resolved.
4. **[Rule2 — Missing critical] Preflight owner:** sem owner-set não declara pronto para QR privado; asserção e CLI smoke passam. c9e2901.

## Operational Assumptions and Limits

- Linux/filesystem local com mkdir exclusivo, fsync e rename; ownership boot/PID/starttime da trava existente, sem lock distribuído. Fonte offline, arquivos0700/0600 e proprietário confiável. NFS não validado.
- Nenhuma tabela FTS de busca do produto ainda: fixture FTS5 comprova preservação de tabela/índice existente pelo snapshot. Busca permanece fase2.
- Manifest privado limitado16MiB; restore de bytes não prova validade remota da sessão. Verificação muda apenas senha web da cópia descartável; consulta pessoal usa restore separado com senha original.
- Cópia técnica local; backup externo recorrente, destino/chave fora da VPS, HTTPS/supervisão/restore final pertencem fase4. VPS/domínio não acessados; conta real/QR/Codex-MCP não usados.

## Next Phase Readiness

Plano01-07 pode preparar perfil real em diretório persistente privado, definir senha por stdin e executar stop → backup DESTINO_NOVO → verify-backup SNAPSHOT RESTORE_NOVO → preflight. Só depois serve --collect e login privado; usuário lê QR no celular. Comparar conversa conhecida, grupo, ambas direções e4 originais acessíveis; leitura offline/reinício depois. Perfil sintético/restore de teste não prova conta. Falta de QR/amostra ou lacuna da integração mantém requisitos Pending. Plano01-07 não iniciado.

## Self-Check: PASSED

Arquivos criados presentes;7 commits de execução ancestrais de HEAD e evaluation-scope confirma escopo. Verificações do plano/suíte padrão sem omissões; dados/manifest/recibo reais fora do checkout. Milestone.lock desconhecido preservado.

---
phase: 04-opera-o-e-restaura-o-na-vps
plan: "04"
subsystem: offsite
tags: [age, ssh, pull, snapshot, sqlite, recovery, tdd]
requires:
  - phase: 04-03
    provides: snapshot coordenado, retomada segura e promoção/fence duráveis
provides:
  - produtor age1.3.2 na VPS e pull SSH iniciado pelo notebook
  - publicação exclusiva por ID, readback/decrypt/restore integral e ACK autenticado
  - último bom persistido e status autenticado com RPO pela data do snapshot
  - kit operacional cifrado separado do snapshot e recuperação offline
affects: [04-05, 04-06]
tech-stack:
  added: []
  patterns: [age fd3, strict SSH pull, immutable local publication, authenticated verification ACK, private fsync state]
key-files:
  created: [src/offsite.ts, test/offsite.test.ts]
  modified: [src/main.ts, ops/README.md]
key-decisions:
  - "O notebook inicia pull SSH da VPS; a VPS não conecta ao notebook nem depende dele para coletar/reiniciar."
  - "age1.3.2 oficial é a única cifra; recipient público na VPS e identidade privada independente no notebook."
  - "Somente readback, decrypt, validação integral e ACK por ID/digest avançam sucesso externo."
  - "RPO usa snapshotCreatedAt; notebook offline pode exceder24h e não há promessa de SLA ou autopurge."
requirements-completed: []
requirements-related: [OPS-02, OPS-03]
coverage:
  - id: D-09-D-11
    description: pull cifrado e imutável após retomada com preservação de último bom
    verification:
      - kind: integration
        ref: test/offsite.test.ts
        status: pass
    human_judgment: false
  - id: D-12
    description: status autenticado distingue tentativa, falha e idade real do snapshot
    verification:
      - kind: integration
        ref: test/offsite.test.ts
        status: pass
    human_judgment: false
  - id: D-13
    description: decrypt e restore offline com SQL/FK/schema/contagens/FTS e todos originais
    verification:
      - kind: integration
        ref: test/offsite.test.ts
        status: pass
    human_judgment: false
actuals:
  tokens: 16476
  tasks: 2
  commits: 4
plan_head_before: 3d741a3b68aa0b42634ed78de7c86692789877df
plan_head_after: 7a1e9310489997f0ee38d4e7777cc94d0efcf4f3
duration: 19min
completed: 2026-10-13
status: complete
---

# Phase 4 Plan 4: Backup cifrado por pull e recuperação independente Summary

**Snapshot consistente cifrado com age, recebido pelo notebook por SSH, publicado por ID exclusivo e confirmado na VPS somente após readback/decrypt/restore integral.**

## Performance

- Início registrado2026-10-13T01:42:40Z; último GREEN2026-10-13T02:01:38Z,19min. Preparação/leitura anterior não cronometrada.
- Duas tarefas; quatro arquivos de implementação/testes/documentação operacional.
- Tokens = ceil(chars/4) do diff realizado destes quatro arquivos, incluindo operações removidas. Quatro commits medidos do ledger antes desta documentação; não consumo do harness.
- Execução sequencial no checkout atual, main autorizada pelo config existente; nenhum worktree/config alterado. STATE/ROADMAP/REQUIREMENTS e WINDOWS ficam com o orquestrador neste despacho.

## Accomplishments

- `produceOffsiteCopy` reutiliza coordinatedSnapshot/mutex/journal, mede orçamento/espaço/inodes antes de stop, retoma consulta/coleta autorizada antes de cifrar/transmitir, cria snapshot por prefixo+UUID e ciphertext finalizado exclusivo. age1.3.2 recebe somente recipient público na VPS; identidade privada de decrypt fica no notebook, aberta em fd3. Ferramenta oficial, não cifra Node própria nem novo pacote.
- `runOffsiteBackup` usa um adapter concreto: notebook→VPS por OpenSSH com BatchMode, identidade explícita, host key pinada, configuração vazia, sem forwarding/autoaccept e argv remotos fixos/validados. O notebook recebe stream em temporário, fsync/publica ID.age sem sobrescrever, reabre mesmo ID, compara hash, decifra com key independente e extrai pacote allowlist em diretório novo. Nada depende de SSH de entrada no notebook.
- `recoverOffsiteCopy` verifica operação ID, conjunto, hashes de snapshot e recovery kit, SQL integrity/FK/schema/contagens/perfil, FTS e todos originais disponíveis. Usa restoreSnapshot para clone offline; nenhum socket/coletor é iniciado. Recuperação preserva autenticação do arquivo real; somente fixtures têm senha sintética.
- ACK limitado por stdin via SSH confere ID/digest/data/ciphertext com descriptor produtor antes de avançar lastVerifiedSuccess. ACK antigo não substitui operação nova; ACK do mesmo sucesso é idempotente. Reporte de falha contém apenas código allowlist e mantém último bom; rede indisponível deixa VPS pending/atrasada e falha local no notebook.
- Estado version1 privado com fsync/publicação atômica. `/api/status`401 sem cookie; autorizado retorna apenas lastAttemptAt, lastVerifiedAt, snapshotCreatedAt, ageSeconds, overdue24h, result e safeFailureCode. RPO deriva do snapshot, não do upload. Código externo arbitrário não aparece na resposta. Leitura do acervo permanece independente da saúde do backup.
- Crash após ciphertext publicado permite reconciliar somente a intenção/snapshot originais, revalidar e repetir decrypt/readback; não gera sucesso automático. Temporários incompletos não viram sucesso e não há expurgo automático. Kit `recovery/` conserva promotion-receipt/state/key, signed fence/public anchor quando promoção existe, separado de `snapshot/`; nunca inclui SourceSigner privado. Nova máquina/path permanece offline até nova promoção correta.

## Task Commits

| Tarefa | RED | GREEN |
|---|---|---|
| 04-04-01 — cópia cifrada e recuperação integral | a0bdd86 | b266371 |
| 04-04-02 — último bom, crash e status RPO | 91e10bb | 7a1e931 |

## Verification

- Build Node24.21.0 passou; pins/package-lock preservados, nenhum npm instalado.
- Tarefa1/tracer: offsite+backup7/7, repetido antes da expansão; age real1.3.2, SQL/FTS/sessão/original e clone offline exercidos com fixtures privadas descartáveis. O adapter SSH foi substituído por transporte de fixture nestes testes; não afirma acesso real à VPS.
- Foco final offsite+operation: **19/19**, zero falhas/cancelamentos/skips/todo,5,517s. Nove testes offsite cobrem partial, readback corrupto, chave errada/ausente, erro de transporte/auth injetado, três tentativas limitadas, timeout injetado, orçamento ENOSPC, symlink, destino ocupado, replay/ACK, concorrência, status401/200 e falha sanitizada.
- SIGKILL real em subprocessos: notebook publishing/readback/verified e produtor published/prepared. Último bom permanece, mesmo ID é retomado, ciphertext/descriptor exigem nova conferência e ACK. Snapshot/resume-crashes herdados continuam cobertos por operation10/10.
- Suíte padrão única `mise exec node@24.21.0 -- npm test`: **233/234**, um failure, zero cancelamentos/skips/todo,69,744s. Todos os nove testes offsite passaram. O resultado padrão **não** está verde.
- Falha fora do escopo: `test/media.test.ts:189`, PN/LID preserva bytes distintos, ENOENT lendo um final no segundo ciclo após drain/stop e assertion calls=4. Foco isolado media:23/23,31,923s. Causa não demonstrada; nenhum código/teste legado de mídia alterado nem suíte reduzida apresentada como substituta. Handoff em deferred-items.md para workflow debug do orquestrador.
- `git diff --check`, existência dos arquivos e ancestry dos quatro commits passaram. Sem exclusão de arquivo rastreado, TODO/FIXME/placeholder, skip/todo ou stub de produção nas capacidades locais.

Evidência integral privada ignorada em `.planning/research/.cache/04-04-red-1.json`, `04-04-red-2.json`, `04-04-full-suite.log` e `04-04-media-focus.log`, diretório0700/arquivos0600. Nenhum banco, conversa, sessão, chave real ou hostname privado está no Git. Testes reais de ferramenta com dados sintéticos não provam backup externo do acervo pessoal.

## TDD Gate Compliance

- RED1: fixture SQL/mídia e age-keygen executaram; assertion de API de pull/recuperação ausente falhou intencionalmente. Uma correção inicial de tipagem na fixture precedeu a captura válida; erro de build não foi usado como RED.
- RED2: fixture inicializada e módulo existente; assertion `backupStatus` function falhou por capability ausente. TAP completo e avaliação semântica preservados.
- Ambos relatórios receberam `RED_EVIDENCE_OK` antes do GREEN e tiveram commit test precedente. REFACTOR separado desnecessário.
- Dois defeitos no próprio teste durante GREEN2 foram corrigidos: teardown fechava serviço após remover fixture; o segundo ciclo de crash esperava null em vez de conservar o sucesso anterior. Foco final passou após os ajustes. A falha do teste legado na suíte completa foi preservada e diferida, sem correção fora do escopo.

## Deviations from Plan

1. **[Rule 2 — Topologia operacional real] Pull iniciado pelo notebook.** O inventário do parent confirmou ausência de outro destino existente sem credenciais/contratação novas e preferência anterior por backup diário no notebook. O produtor VPS não conecta ao notebook. Adicionados CLI offsite-produce/ack/failed com SSH estrito e identidade independente, dentro dos arquivos previstos. Commits b266371/7a1e931.
2. **[Rule 2 — Recovery kit essencial] Estado operacional fora do snapshot.** Pacote age carrega recovery separado para promoção/fence/public anchor; chave privada SourceSigner permanece fora da VPS. Readback também confere hashes/conjunto desses artefatos. Não transforma recibo antigo em autorização numa nova máquina. Commit7a1e931.
3. **[Deferred — teste legado fora do escopo]** Suíte padrão233/234 e media isolado23/23. Causa ainda não comprovada; registrado em deferred-items.md e enviado ao orquestrador. Nenhum arquivo de mídia alterado. Não repetir builds esperando resolução.

## Operational Contracts and Remaining Real Gate

- `SourceOffsiteConfig`: OperationConfig04-03 + role:source, recipientFile, maxBytes, reserveBytes, maxFiles opcional10000, recoveryFiles opcional com nomes fixos. recipientFile contém somente um recipient age X25519 público; age exatamente1.3.2 exigido. Snapshot prefixo destino é exclusivo por UUID.
- `PullOffsiteConfig`: role:pull, operationDir, destinationDir, identityFile age, maxBytes/reserveBytes/maxFiles e remote com host/user/port/SSH identity/knownHosts/nodePath/mainPath/configFile/dataDir previamente conferidos. Configs0700/0600 fora do checkout. Os paths remotos precisam ser absolutos e sem espaços/metacaracteres/..; nenhum comando livre.
- CLI: notebook offsite-backup, offsite-recover ID DESTINO_NOVO; source offsite-produce ID, offsite-ack e offsite-failed. Pull não precisa ZAP_DATA_DIR; source exige match do dataDir. `serve` recebe ZAP_BACKUP_STATE_FILE apontando ao operationDir/offsite-state.json. Valores reais ficam privados.
- Transferências possuem120s por tentativa e até dois retries; stop herda60s. Hash/SQL síncronos não prometem deadline estrito de toda validação nem janela curta: medir com acervo real. Fonte/backups ficam preservados; sem autopurge/WORM prometido. Artefatos interrompidos/corrompidos exigem reconciliação privada, não sobrescrita.
- Notebook offline significa nenhum novo backup externo e degradação acima24h; isso não impede coletor/reboot da VPS. A agenda diária America/Sao_Paulo/catch-up/pré-update será instalada em04-05 após janela medida. Não foi instalada por este executor.
- Ferramenta local concretamente observada: `/usr/bin/age`1.3.2, instalada pelo parent por pacote Arch extra assinado/SHA256+assinatura verificados. Docs oficiais consultadas: github.com/FiloSottile/age, manual age, documentação OpenSSH e yauzl via Context7/local lock. **age1.3.2 no produtor VPS ainda não comprovado/instalado por este plano.**
- Pendências reais exatas: acesso SSH confirmado e known-host/identidade autorizados; runtime/release e supervisor operacional coerentes com volume/PID namespace04-03; age1.3.2 verificado no produtor; key age independente e recipient provisionados sem expor privado na VPS; configs/budgets medidos; pull do acervo real até notebook e readback/decrypt/restore usando kit, com status após ACK. Implantação/login/proxy/persistência/agenda/cliente Codex e provas24h continuam04-05/06.
- Nenhum Chrome/VPS/collector real ou TOML Codex alterado, nenhum push, instalação remota, senha ou sessão real modificados. Não concluir OPS-02/03 por fixtures/descriptor/URL. Estes requisitos permanecem sem aceite real.

## Known Stubs

Nenhum stub de implementação local. O adapter real é concreto e falha fechado se tool/config/SSH/key estiver ausente; teste de transporte por fixture não substitui sua execução real. Real gate pendente descrito acima, sem skip/pass inventado.

## Self-Check: PASSED

src/offsite.ts, test/offsite.test.ts, ops/README.md e este SUMMARY existem. a0bdd86, b266371,91e10bb e7a1e931 são ancestrais de HEAD; ledger mede quatro commits com base/final explícitos. Sem exclusões rastreadas ou gerados untracked. Self-check confirma os artefatos e as afirmações limitadas acima; **não** converte233/234 em suíte verde nem conclui OPS.

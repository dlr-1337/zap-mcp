---
phase: 04-opera-o-e-restaura-o-na-vps
plan: "05"
subsystem: deployment
tags: [docker, traefik, private-volume, release, recovery, tdd]
requires:
  - phase: 04-03
    provides: snapshot coordenado e promoção/fence duráveis
  - phase: 04-04
    provides: age/pull/readback/restore/ACK independente
provides:
  - driver self-test/preflight/migrate/update/recover com configuração privada externa
  - imagem Node24.21.0 nativa e Compose contratual da topologia Docker/Traefik observada
  - helper administrativo limitado ao Zap sem socket ou root no app
  - tracer HTTPS e troca/falha/restart preservando owner/sessão/originais/dados recentes
affects: [04-06, OPS-01, OPS-02, OPS-03]
tech-stack:
  added: []
  patterns: [nonroot pidhost, same absolute private bind, bounded root helper, immutable releases, code-only rollback]
key-files:
  created: [scripts/phase4-deploy.mjs, test/deploy.test.ts, Dockerfile, .dockerignore, ops/zap-container-control.mjs, ops/compose.example.yml, ops/verify-dependencies.mjs]
  modified: [scripts/phase4-environment.mjs, test/environment.test.ts, src/operation.ts, ops/README.md, README.md, .env.example]
key-decisions:
  - "App UID12001 não root, pidhost e binds absolutos coerentes; coordenador host do mesmo UID usa apenas helper root limitado."
  - "Docker/Traefik são a topologia concretamente observada no painel; configuração e identidades reais permanecem privadas."
  - "Offsite readiness decripta uma cópia existente do perfil fonte; update produz nova cópia e repete probes antes de stop."
  - "Rollback troca somente código com schema atual compatível; migração ambígua não reativa a origem automaticamente."
requirements-completed: []
requirements-related: [OPS-01, OPS-02, OPS-03]
coverage:
  - id: local-release-tracer
    description: release offline via HTTPS, update/falha/restart e persistência fora do código
    verification:
      - kind: integration
        ref: test/deploy.test.ts
        status: pass
      - kind: other
        ref: scripts/phase4-deploy.mjs --mode self-test
        status: pass
    human_judgment: false
  - id: docker-fixture
    description: imagem oficial com SQLite FTS e container não root privado com controle limitado
    verification:
      - kind: other
        ref: .planning/research/.cache/04-05-docker-build.log
        status: pass
      - kind: integration
        ref: .planning/research/.cache/04-05-docker-smoke.log
        status: pass
    human_judgment: false
  - id: real-operation-pending
    description: implantação, migração, agenda, backup externo e update no endpoint permanente
    verification:
      - kind: other
        ref: 04-05-02 precondition/current environment gates
        status: unknown
    human_judgment: true
    rationale: "Acesso host/autorização específica, configs e provas reais ainda pendentes; fixtures não provam OPS."
actuals:
  tokens: 22536
  tasks: 1
  commits: 2
plan_head_before: 69a8344fb1c30356c9a4d00a363b0a756e7e6a74
plan_head_after: 478df8c6a0c34e45bfeb2644191e46eb7876dace
duration: 25min
completed: 2026-10-13
status: halted
---

# Phase 4 Plan 5: Preparo de deployment privado e checkpoint real Summary

**Imagem Node24/SQLite nativa, helper Docker restrito e tracer de releases/TLS preservam o acervo; migração real permanece em checkpoint antes de qualquer corte da origem.**

## Performance

- Uma de duas tarefas concluída:04-05-01.04-05-02 permanece pending por precondition.
- Duas commits medidos no ledger antes desta documentação; tokens=ceil(chars/4) do diff realizado90141chars, não tokens do harness. Duração aproximada25min da preparação à conclusão local; o primeiro RED possui timestamp próprio no cache.
- Execução sequencial main, autorizada pelo config existente; nenhuma mudança de isolamento/config, worktree, push ou arquivo compartilhado STATE/ROADMAP/REQUIREMENTS/WINDOWS. Esses artefatos e a operação real pertencem ao orquestrador.

## Accomplishments

- Self-test cria dados privados e dois releases reais separados fora do perfil, copia código compilado/public, inicia subprocesso CLI offline, proxy TLS com CA somente da fixture e forwarding sobrescrito, faz challenge/login Secure, status401/200, original/Range com bytes/hash iguais. Sem conta, QR ou collector real.
- Snapshot coordenado stop/drain/start usa operation/backup reais. Um registro recebido **depois** do primeiro snapshot permanece durante swap compatível, falha antes/depois da troca, rollback de código e restart. Comparações independentes SQL/integrity/FK/schema, owner, sessão/chaves, mensagens/origins/attachments e todos os originais disponíveis. Falha de ready/backup bloqueia antes de qualquer stop/swap.
- Driver real usa somente ZAP_OPERATION_CONFIG_FILE externo0600; notebook mantém key independente. Preflight repete inventário atual; update dispara pull/readback/decrypt/ACK atual, re-probe, fence, baseline posterior ao backup, candidato offline e HTTPS/login/originais. Rollback não restaura banco antigo; schema divergente deixa recovery obrigatório. Migração exige origem user-systemd/config/signer pinado e destino/config/candidatos preparados, snapshot final após fence e streams SSH fixos/allowlisted, restore vazio e promoteProfile; consulta fica offline até validade separada do coletor.
- Dockerfile fixa Node24.21.0 oficial amd64 por digest; metadata de243entradas do lock é revalidada no registry oficial antes npm ci, incluindo seis pins/SRI herdados03. Sem atualização nem novo pacote npm. Instalação ignore-scripts, rebuild better-sqlite3 explícito no destino, FTS/imports/runtime smoke e runtime final sem ferramentas de compilação.
- Helper root-owned oferece somente inspect/stop/start por commits/modes autorizados. Descoberta por label estável, UID/bind/PID/topologia reais; nenhum nome Coolify com sufixo presumido. Conta PIDs únicos de /proc+Docker, recusa outro writer/root/PID isolado/porta/socket, inibe restart só do Zap e limita restart on-failure:3. Docker não oferece a janela/delay de systemd; limite e dependência de medição são explícitos.
- App UID12001, pidhost, dataDir0700 no mesmo path absoluto, operationDir/snapshotRoot/machine-id read-only, root filesystem read-only/capabilities removidas/no-new-privileges; sem publicar backend nem conceder socket/grupo Docker/sudo ao app. Controller host do mesmo UID observa a mesma identidade/namespace e coordena snapshots. Config/hosts/paths/IDs/keys reais não entram no Git.
- Inventário ampliado somente para Docker/Traefik/pull notebook observados. Helper confere versão/peer/rede/header labels atuais; readiness offsite decripta e restaura ciphertext existente por ID em destino novo, exige perfil fonte correto/data até24h e key independente. JSON salvo não autoriza readiness; ausência continua blocked.

## Task Commits

| Tarefa | RED | GREEN | Situação |
|---|---|---|---|
|04-05-01 — release offline e recuperação|132eed5|478df8c|Concluída localmente|
|04-05-02 — implantação/migração/update reais|—|—|Pending; precondition não satisfeita|

## Verification

- TypeScript build Node24.21.0 passou. Foco deploy/environment/operation **22/22**, zero fail/cancel/skip/todo; primeira rodada5,825s e final6,493s após os guards finais do inventário/pull. Tracer self-test repetido e passou antes do handoff.
- Suíte padrão única `mise exec node@24.21.0 -- npm test`: **244/244**, zero fail/cancel/skip/todo,69,913s. Executada após implementação/guards do helper; guards finais JS de linkage/profile do readback foram verificados depois pelo foco22/22. Não apresentar foco como substituto da suíte padrão.
- Docker local disponível somente via sudo-n; build imagem **passou**. Audit atual243entradas +6 pins herdados, npm ci/rebuild/build/smoke/prune passaram. Smoke em container de fixture **passou**: UID12001, Node24.21.0, pidhost, bind absoluto0700, helper inspect/stop/start reais, restart limitado, zero portas publicadas. Container/temp criados neste ensaio foram removidos; nenhum outro serviço/volume alterado.
- `docker compose config --quiet` com referências de fixture passou na versão local observada; os binds adicionais machine-id/snapshotRoot foram incluídos e syntax revalidada. Isso não comprova versões/config/perm/rotas da VPS.
- CLI `--mode preflight` sem ZAP_OPERATION_CONFIG_FILE produziu exit1/blocked, sem segredo/path bruto e sem mutação; a checagem read-only da precondition também confirmou configuração ausente. Migrate/update/recover reais **não executados**.
- Diff whitespace, commits ancestrais e arquivos existentes conferidos. Sem exclusões rastreadas, pacotes/pins alterados, TODO/FIXME/placeholder de produção, test skip/todo ou dados pessoais versionados.

Evidência integral ignorada em `.planning/research/.cache/04-05-{red.json,red.log,green.log,focal.log,focal-final.log,full-suite.log,self-test.log,docker-build.log,docker-smoke.log}`. Fixtures/chaves TLS descartáveis, sem acervo/sessão/senha real. Público contém somente contratos/versionamento/contagens sintéticas.

## TDD Gate Compliance

- RED compilou e executou o target `release offline HTTPS troca código e recupera falha sem perder registros recentes`; assertion planejada de selfTest ausente falhou. Import opcional foi convertido em assertion da capacidade, sem erro de loader/fixture/sintaxe. TAP completo foi preservado.
- `gsd_run check tdd-red-evidence` retornou RED_EVIDENCE_OK antes de GREEN; RED commit precede o feat. GREEN executou o fluxo real de fixture, não booleanos inventados de operação remota. REFACTOR separado não necessário.
- Correção de fixture: CLI não imprime URL de readiness; self-test passou a sondar HTTPS real200 com deadline, preservando silêncio operacional. O primeiro GREEN attempt foi registrado, não alegado como pass.

## Deviations from Plan

1. **[Rule2 — Empacotamento crítico observado]** Dockerfile/.dockerignore/Compose e helper limitado necessários ao Docker/Traefik identificado pelo orquestrador. App root/pidhost e socket Docker foram excluídos; UID dedicado e helper root com configuração imutável permitem coordenador03 do mesmo UID. operation.ts aceita helperPath/release com host/path guard e deadlines. Commit478df8c.
2. **[Rule2 — Inventário incompatível com topologia escolhida]**04-01 aceitava somente nginx/caddy/systemd e deixava offsite permanentemente unverified. Adapter foi ampliado somente para Docker-helper/Traefik/local pull com decriptação da cópia existente/identidade fonte, não readiness por JSON/crypto fixture. Commit478df8c.
3. **[Rule3 — Build nativo bloqueado]** Primeiro build falhou porque stage slim não possui Python/make/g++. O pacote better-sqlite3/pin já havia passado revalidação; nenhuma alternativa foi instalada. Acrescentadas ferramentas oficiais Debian somente ao stage de build, mantendo runtime mínimo; rebuild nativo/FTS/imports passou no segundo build. Commit478df8c.

## Threat Flags

| Flag | Arquivo | Descrição |
|---|---|---|
| threat_flag: bounded-host-root-control | ops/zap-container-control.mjs | Helper root novo: instalação/config/sudoers root-owned, callerUID e allowlist devem ser conferidos na VPS antes de uso; app não recebe sudo/socket |
| threat_flag: host-pid-and-identity | ops/compose.example.yml | PID/machine-id do host e snapshot/operation RO são necessários aos gates herdados; UID exclusivo e caminhos/perms/peer precisam de prova real |

## Checkpoint04-05-02 e continuidade

**Gate blocking-human / precondition:** ZAP_OPERATION_CONFIG_FILE ainda não aponta à configuração privada válida; acesso SSH específico/pin autorizados, probes atuais e cópia real independente ainda não comprovados. Login do painel e preparo de app/domínio são fatos intermediários, não prova de acesso host/serviço/acervo.

O orquestrador possui os locators privados de inventário/deployment em .git. Completar configuração/UID/runtime/age, helper/sudoers limitado, volumes/identidade/path/read-only e middleware exclusivos; preparar releases exatos/schemas/config source/pull/promotion/SourceSigner pinado. ops/README.md descreve campos, comandos fixos, paths **contratuais**, sequência, rollback e timer notebook com Persistent/horário/fuso a verificar na versão instalada. Não publicar referências reais no SUMMARY.

Após autorização específica de acesso host, executar preflight atual. Sem destino/capacidade/fallback/backup/key/config completos, manter source/autostart intactos. Depois migrate e update reais, comparação atual de owner/sessão/SQL/todos originais/novos registros, pull/restore do kit, agenda real medida, consulta sem WhatsApp e cliente Codex04-06. Migração retorna offline; confirmar único modo autorizado/validade remota separadamente, QR só se invalidade real. Falha/ambiguidade exige reconciliação target parado/revogado; não remover marker/lock/proof nem restaurar banco antigo.

**OPS-01/02/03 não concluídos.** Não criar timer, alterar fonte, WhatsApp, TOML Codex, VPS ou painel por este executor. Registrar o verify real não executado em WINDOWS pelo orquestrador, proprietário desses arquivos compartilhados. Nenhum stub local impede04-05-01; os gates reais permanecem explícitos e não foram marcados skip/pass.

## Self-Check: PASSED

Treze arquivos de implementação/teste/config/documentação e este SUMMARY existem.132eed5 e478df8c são ancestrais de HEAD; ledger mede dois commits com base/final explícitos. Diff sem whitespace/deleções; árvore sem gerados untracked. Esta checagem confirma somente os artefatos e evidências locais, não as tarefas/requisitos reais pendentes.

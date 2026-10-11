---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "03"
subsystem: collector
tags: [baileys, sqlite, authentication, qr, reconnect, readonly, tdd]
requires:
  - phase: "01-02"
    provides: Arquivo transacional, projeção segura, recibos e cobertura offline
provides:
  - Credenciais e dez categorias de chaves com commit transacional e roundtrip
  - Trava de diretório anterior aos bancos e coletor encapsulado por geração
  - QR privado vigente, seis estados e reconexão limitada sem escrita remota pública
affects: ["01-04", "01-05", "01-06", "01-07", phase-3, phase-4]
tech-stack:
  added: []
  patterns: [SQLite synchronous FULL, BufferJSON e protobuf, ownership boot-PID-starttime, socket-generation fencing, HTTP sem socket]
key-files:
  created: [src/whatsapp.ts, test/auth-state.test.ts, test/collector.test.ts, test/readonly.test.ts]
  modified: [src/main.ts]
key-decisions:
  - "A mesma trava Linux protege bancos, sessões web e coletor; ownership ambíguo falha fechado."
  - "Callbacks de ingestão e auth são síncronos; drain não mantém SQL aberto durante await. Cada socket recebe credenciais isoladas."
  - "Coleta real fica recusada até o plano01-06 implementar e conferir recibo de snapshot/restore; fábrica fake somente em testes internos."
requirements-completed: []
requirements-supported: [SYNC-01, SYNC-03, SYNC-04, SYNC-05, PRIV-02, PRIV-03, WEB-01]
coverage:
  - id: D1
    description: Dez categorias, credenciais parciais, deleção null, rollback e reinício
    verification:
      - kind: integration
        ref: test/auth-state.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Exclusividade em processos, SIGKILL, QR atual, eventos e gerações isoladas
    verification:
      - kind: integration
        ref: test/collector.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Códigos de desconexão, orçamento e estabilidade com relógio fake
    verification:
      - kind: integration
        ref: test/collector.test.ts#códigos401/440/515/408/428/503/403/411/500 preservam auth e arquivo
        status: pass
    human_judgment: false
  - id: D4
    description: HTTP autenticado de status/QR/leitor e logout sem operações remotas
    verification:
      - kind: integration
        ref: test/readonly.test.ts#HTTP privado status/QR/leitor/logout é somente leitura e funciona offline
        status: pass
    human_judgment: false
actuals:
  tokens: 11455
  tasks: 2
  commits: 4
plan_head_before: ebe3ba14b0784cefca009edd41b870f3b77068ac
plan_head_after: 83a1c169db5785fd24094d7e570b02a0ed32a514
duration: 8min
completed: 2026-10-10
status: complete
---

# Phase 1 Plan 3: Sessão durável e coletor exclusivo Summary

**Auth SQLite persiste as dez categorias da rc14 e credenciais, com ownership exclusivo, QR autenticado vigente e reconexão limitada por geração.**

## Performance

- Started: 2026-10-10T21:21:58Z
- Completed: 2026-10-10T21:29:26Z
- Duration: 8min
- Tasks: 2
- Product files: 5; duas evidências RED adicionais em planejamento.
- Actual tokens: 11455, teto de45819 caracteres/4 do diff dos cinco arquivos de produto/testes. Commits4 medidos do ledger até o último GREEN; documentação posterior fica fora deste intervalo explicitamente registrado.

## Accomplishments

- `createAuthState` mantém schema privado próprio junto às sessões web, usa SQLite synchronous FULL e transações síncronas por `keys.set`. As categorias pre-key, session, sender-key, sender-key-memory, app-state-sync-key, app-state-sync-version, lid-mapping, device-list, tctoken e identity-key passam roundtrip. BufferJSON conserva buffers; app-state-sync-key volta por `proto.Message.AppStateSyncKeyData.fromObject`. Null repetido é deleção idempotente. Creds parcial só modifica o estado confirmado após persistência.
- Perfil novo exige autorização explícita interna. Perfil existente inválido ou corrompido nunca vira credencial nova. Falhas SQL de credenciais/chaves fazem rollback, propagam erro seguro e suspendem o coletor; conteúdo de erro não entra no snapshot.
- Trava nativa por diretório é adquirida antes de qualquer banco, inclusive no servidor sem coletor e no owner-set. Boot ID, PID, starttime e token distinguem proprietário vivo, PID reutilizado e órfão; recovery claim impede remoções concorrentes. Trava incompleta ou ambígua falha fechada. SIGKILL em subprocesso deixa auth confirmada recuperável. Stop encerra socket, cerca callbacks e só então permite fechamento dos bancos/liberação da trava.
- Coletor é o único proprietário do socket. FULL é habilitado por `syncFullHistory:true` e `shouldSyncHistoryMessage:()=>true`, browser de protocolo Desktop e `markOnlineOnConnect:false`; não inicia Chromium. Eventos de história/status/upsert/update/delete, contatos/chats/grupos/participantes e PN/LID alimentam o arquivo já existente. `getMessage` usa apenas conteúdo privado permitido. Ingestão/creds são síncronos; `drain()` confirma que não há callbacks de aplicação pendentes, sem transação SQL assíncrona.
- QR existe só na memória e na resposta autenticada `/api/qr`, convertido com qrcode. Timeout20s é configurado também no socket rc14, portanto usado pela biblioteca e pela validade servida. Leitura repetida não renova prazo nem abre socket. Geração, expiração, abertura, fechamento e logout web invalidam o código; após conversão assíncrona a geração/prazo são conferidos novamente. Snapshot nunca inclui o payload QR, auth ou socket.
- Seis estados explícitos usam retry exponencial com jitter, máximo seis retries por ciclo e teto60s. Budget só reseta após60s conectado. 401 informa sessão inválida/novo vínculo;440 interrompe por concorrência;515 recria uma vez por ciclo;408/428/503 repetem com limite;403/411/500 e códigos desconhecidos param com diagnóstico seguro. Timeout20s evita conexão sem progresso. Stop cancela timers; nenhuma falha apaga sessão ou acervo. Eventos, gravações de keys e mutações de creds de gerações antigas ficam isolados.
- HTTP real comprova status/QR/conversas/leitor negados sem sessão, inclusive HEAD, leituras repetidas e acervo offline. Logout revoga somente a sessão web e oculta QR; socket não recebe logout/read/played/send/typing. Rotas de operações remotas, MCP e export ainda não existentes retornam404.

## Task Commits

1. Task01-03-01 RED: `c260b9a` — persistência e ownership antes da implementação.
2. Task01-03-01 GREEN: `c86d0e6` — sessão transacional e coletor exclusivo.
3. Task01-03-02 RED: `31c256d` — reconexão limitada e HTTP somente leitura.
4. Task01-03-02 GREEN: `83a1c16` — classificação, orçamento e credenciais isoladas por geração.

## Verification

- Task1: `mise exec node@24.21.0 -- npm run build` e node --test --test-reporter=tap dist/test/auth-state.test.js dist/test/collector.test.js dist/test/archive.test.js: **13/13 pass**,1332ms.
- Task2: build e node --test --test-reporter=tap dist/test/collector.test.js dist/test/readonly.test.js dist/test/auth-state.test.js dist/test/auth.test.js: **21/21 pass**,8759ms após isolamento final de credenciais.
- Plano/suíte completa: `mise exec node@24.21.0 -- npm test`: **34 tests,34 pass,0 fail,0 skipped**,9363ms. Arquivos alvo foram executados; nenhum zero-test passou como êxito.
- `git diff --check` passou. Inspeção dos módulos não encontrou chamadas de sendMessage/chatModify/readMessages/sendReceipt/presença/logout WhatsApp, multifile auth ou TODO/FIXME. Logger de protocolo é silent; QR/payload/auth permanecem privados. Nenhuma dependência foi instalada ou alterada.
- `check evaluation-scope --plan01-03 --commits-only --raw` resolveu os quatro commits desta branch. Arquivos criados e ancestralidade dos quatro hashes conferidos.

## TDD Gate Compliance

- Task1 RED executou a asserção de ownership com PID reutilizado: esperado recuperar proprietário com starttime diferente; implementação anterior recusou como ativo. Report TAP completo em `01-03-auth-red.json`, exit1, classifier **RED_EVIDENCE_OK**, avaliação semântica confirma falha planejada sem import/setup.
- A primeira execução do Node TAP com `assert.doesNotThrow` gerou diagnóstico aninhado incompatível com o classifier; nenhum GREEN ocorreu naquele formato. O alvo foi repetido por assert de valor observável, sem modificar relatório, e passou o gate.
- Task2 RED em `01-03-retry-red.json`: após close408 esperado reconnecting/retry1; observado disconnected. Classifier **RED_EVIDENCE_OK** e avaliação semântica confirmados antes do GREEN.
- RED→GREEN está presente para cada tarefa. REFACTOR separado não foi necessário.

## Deviations from Plan

**1. [Rule1 - Bug] Isolar também o objeto de credenciais por socket.**
- Found during: Task01-03-02, verificação de geração antiga.
- Issue: cercar eventos e keys não basta se sockets compartilham o mesmo objeto mutável de creds; uma geração aposentada poderia alterar o objeto persistido pela nova.
- Fix: clone BufferJSON por geração, mescla/persistência do snapshot da geração vigente. Asserção adicional ficou RED com `stale-by-old-protocol` e GREEN após o isolamento.
- Files: src/whatsapp.ts, test/collector.test.ts.
- Commit: `83a1c16`.

**2. [Rule2 - Correção documental exigida por AGENTS.md] Evidência sintética não conclui requisitos v1.**
Requisitos do plano estão em requirements-supported; requirements-completed continua vazio e REQUIREMENTS.md permanece Pending. A regra local exige conta/piloto real, prevalecendo sobre a marcação automática do workflow.

## Issues Encountered

Nenhum bloqueio à capacidade deste plano. Trava depende de `/proc` e boot ID no Linux usado pelo projeto; falha de leitura ambígua é recusa segura. O arquivo desconhecido .planning/milestone.lock foi preservado.

## Known Limits / Next Phase Readiness

- Implementação/testes usam exclusivamente socket fake e conteúdo sintético. Não houve conexão WhatsApp, pareamento, conta real, QR real, download original, VPS ou restauração operacional validada.
- O gate real está fechado por código tanto no CLI `serve --collect` quanto no bootstrap do coletor. O plano01-06 deverá fornecer validação de snapshot/restore e conectar a fábrica Baileys real; nenhuma opção pública dispensa o gate. É a separação planejada, não prova de snapshot já realizado.
- Imagem QR e os seis estados têm API pronta; conferência visual dos estados fica para01-05. Mídia/reupload é responsabilidade do01-04, sem implementação antecipada.
- Snapshot/SQL/fixtures não comprovam sessão WhatsApp remotamente válida após restauração. 401 solicita intervenção operacional para novo vínculo conservando o perfil e o acervo.
- Pronto para01-04; piloto e requisitos globais continuam pendentes.

## Self-Check: PASSED

Os cinco arquivos existem; quatro commits de tarefa são ancestrais de HEAD; verification scope resolve01-03; build e34 testes passaram. Nenhuma exclusão de arquivo rastreado ocorreu.

---
phase: 04-opera-o-e-restaura-o-na-vps
plan: "03"
subsystem: operation
tags: [shutdown, snapshot, fencing, promotion, sqlite, ed25519, tdd]
requires:
  - phase: 04-02
    provides: transporte privado e origem HTTPS canônica
provides:
  - shutdown idempotente com prazo, abort e drain antes de DB/lock
  - snapshot coordenado com mutex/journal e retomada antes da transferência
  - promoção transacional de restore e fence durável da origem
affects: [04-04, 04-05, 04-06]
tech-stack:
  added: []
  patterns: [private fsync journal, operational fencing, signed durable handoff, single-use startup permit]
key-files:
  created: [src/operation.ts, src/promotion.ts, test/operation.test.ts, test/promotion.test.ts]
  modified: [src/main.ts, src/backup.ts, src/whatsapp.ts, test/collector.test.ts]
key-decisions:
  - "O modo observado antes do stop determina a retomada; gate de coleta ausente retorna consulta offline."
  - "O mutex permanece durante a transferência, mas o serviço retoma antes dela."
  - "A topologia notebook→VPS exige revogação durável da source, assinada e vinculada a um target; reboot/reconnect da VPS não exige notebook acessível."
  - "Restore mantém marker e geração no authDb; autorização e chaves operacionais são separadas do snapshot."
  - "Backend Docker pode optar por 0.0.0.0 somente com origem HTTPS canônica e peers IP exatos validados."
requirements-completed: []
requirements-related: [OPS-01, OPS-02, OPS-03]
coverage:
  - id: D-04
    description: shutdown limitado, idempotente e consulta disponível quando a coleta falha
    verification:
      - kind: integration
        ref: test/operation.test.ts
        status: pass
      - kind: integration
        ref: test/recovery.test.ts
        status: pass
    human_judgment: false
  - id: D-09
    description: stop snapshot resume antes da transferência e recuperação de interrupções
    verification:
      - kind: integration
        ref: test/operation.test.ts
        status: pass
    human_judgment: false
  - id: D-06-D-14
    description: restore offline e promoção com exclusividade e autorização autenticada
    verification:
      - kind: integration
        ref: test/promotion.test.ts
        status: pass
    human_judgment: false
actuals:
  tokens: 23293
  tasks: 3
  commits: 7
plan_head_before: 96f44fa2daca4bfc53ed4cab5eb2477a49077e73
plan_head_after: 27ce44d6d7bda658a23da5a37b4a8f79a1e82b12
duration: 30min
completed: 2026-10-13
status: complete
---

# Phase 4 Plan 3: Operação coordenada e promoção exclusiva Summary

**Shutdown drenado, snapshot com retomada antes da rede e promoção de restore por autorização privada, com origem duravelmente impedida de coletar.**

## Performance

- Início registrado: 2026-10-13T00:51:24Z; último commit de produção: 2026-10-13T01:21:24Z.
- Três tarefas; oito arquivos de código/teste. Tokens são chars/4 do diff realizado, não consumo do harness.
- Sete commits medidos pelo ledger antes deste documento. Execução sequencial no checkout atual, sem worktree, conforme despacho; configuração de projeto preservada.

## Accomplishments

- `shutdownService` inicia abort/close sem aguardar o callback HTTP, encerra conexões persistentes, drena coletor, downloads, exports e streams antes de DB/lock. Deadline padrão30s, faixa1–120s; falha operacional encerra a CLI com código1 sem fingir liberação limpa. Duplo signal/close é idempotente. Erro do collector deixa consulta e diagnóstico autenticado disponíveis.
- `coordinatedSnapshot` serializa backup/update com promoção/handoff por mutex privado, journal version1 e fsync/rename. Observa o modo anterior, verifica stop/PID/processos antes da cópia, reutiliza snapshot/validação, retoma em finally antes da rede e mantém o mutex durante a transferência. Retomada falha deixa journal recuperável e resultado nonzero. Snapshot admite AbortSignal; stop/probes são limitados. `recoverOperation` recupera mutex órfão e não religa source de handoff.
- `promoteProfile` compara SQL/conteúdo/owner/sessão/originais do target com o snapshot, verifica uma restauração descartável autenticada, revalida target e source antes de publicar e comprometer autorização. Não redefine senha do target. Marker offline permanece; geração/path/manifest/perfil e estado comprometido são exigidos. HMAC usa chave externa ao perfil/snapshot; permissões de socket são opacas, de uso único e limitadas no tempo. Reconexões repetem o gate.
- `fence-source` observa source parada e autostart inibido, grava revogação persistente de coleta no authDb com synchronous FULL, e assina prova Ed25519 para profile/path/machine/generation específicos. Chave privada fica fora do snapshot; chave pública é pinada pelo operador no config privado do target. A VPS verifica a prova e a revogação herdada localmente, sem conectar ao notebook em cada reboot/reconnect. Emissão interrompida é retomável sem retirar a revogação. `revokePromotion` revoga o target e confere parada antes de qualquer reconciliação posterior; não religa source automaticamente.

## Task Commits

| Tarefa | RED | GREEN |
|---|---|---|
| 04-03-01 — shutdown e consulta offline | c7eaa20 | a758a96 |
| 04-03-02 — snapshot e recuperação | 7bbb72a | 3e258b5 |
| 04-03-03 — promoção e fence durável | 0931c21, 6776234 | 27ce44d |

## Verification

- Build Node24.21.0 passou; pins e lockfile preservados, nenhuma dependência adicionada.
- Foco final `operation + promotion + backup + collector`: **32/32**, zero falhas/cancelamentos/skips/todo.
- Foco `promotion + recovery` após ajuste durável: **21/21**.
- Suíte completa final `npm test`: **225/225**, zero falhas/cancelamentos/skips/todo, 69,504s. Inclui os testes existentes de HTTP/MCP, mídia, ZIP, privacidade, recuperação e UI.
- A primeira suíte integrada teve221/222: uma recusa de restore retornava ENOENT onde o teste exigia diagnóstico offline. A mensagem foi corrigida e a suíte completa repetida após as mudanças finais.
- Controle positivo mocka somente `makeWASocket` no ramo real: gate explícito abre um socket e recusa segundo writer. Handoff durável reinicia duas vezes, sequencialmente, com source sem SSH acessível; um socket por processo. Clones copiados, HMAC/signature adulterados, replay/revogação, path/manifest alterados e source viva/inacessível são recusados.
- Nenhum segredo, perfil real ou serviço de produção foi usado nestes testes. Resultados de fixtures não concluem OPS.

## Crash-stage Matrix

| Fluxo | Estágios SIGKILL exercidos | Resultado conferido |
|---|---|---|
| Snapshot | intended, stopped, snapshotted, resumed | mutex órfão recuperado; nova operação exige recover; consulta retomada, owner e perfil preservados |
| Promoção | intended, fenced, verified, publishing, published | target permanece offline; zero sockets sem novo gate; source não é retomada |
| Promoção | committed | target continua offline por padrão; só autorização válida + fence/permit permite um socket |
| Fence durável | key, source-fenced, published, committed | emissão retomada com mesma revogação/geração; source não coleta; owner preservado |

## TDD Gate Compliance

- RED→GREEN presente nas três tarefas; `gsd_run check tdd-red-evidence` retornou `RED_EVIDENCE_OK` para os quatro relatórios finais submetidos. TAP integral e registros semânticos ficam no cache privado ignorado.
- Tarefa1: a primeira seleção de target foi rejeitada (`no_target_test_failure`): double-close já passava. Antes de GREEN, a evidência foi corrigida para a assertion de shutdown limitado/SSE ausente, com target executado e falha intencional. O caso já existente permaneceu como regressão.
- Tarefa2: fixture privada inicializada; assertion de coordenador ausente foi o RED. GREEN implementou serialização/retomada; crashes foram exercidos por subprocess SIGKILL.
- Tarefa3: RED concreto mostrou que apagar `restored.json` permitia `verifyBackup` emitir recibo comum. Outro RED mostrou que revogação persistida não bloqueava source com recibo válido. GREEN adicionou proveniência no authDb e fence durável assinado, sem dispensar gates.
- Refactor separado não foi necessário.

## Deviations from Plan

1. **[Rule 2 — Funcionalidade operacional crítica] Bind explícito para Docker.** O deploy delegado exige backend em rede privada do container. Adicionado `ZAP_BIND_HOST=0.0.0.0` somente após validar config proxy HTTPS e peers exatos; default127.0.0.1 preservado. Não publica portas nem amplia confiança de headers. Arquivos: main/operation tests; commits a758a96/27ce44d.
2. **[Rule 1 — Bug de gate] Remoção de marker autorizava um clone.** Restore agora registra geração/proveniência no authDb e exige promoção quando marker/manifest/proveniência indicam restore; retirar marker não emite permissão. Arquivos: backup/promotion/tests; commit27ce44d.
3. **[Rule 2 — Topologia real] VPS não conecta ao notebook e deve operar independentemente.** O despacho esclareceu isso antes do commit final. Adicionado fence-source durável, revogação na source e assinatura Ed25519 com chave fora do snapshot. Prova autenticada não é simples JSON salvo: depende da assinatura pinada, perfil/path/host/generation, revogação persistida e commit da promoção. Arquivos: promotion/backup/main/tests; RED6776234/GREEN27ce44d.
4. **[Rule 1 — Regressão diretamente causada] Teste legado exigia matar consulta quando coleta falha.** Atualizado um caso de collector.test.ts para o contrato D-04, com CLI em porta efêmera e SIGTERM; tratamento de erro do listener também evita stack/caminhos em stderr. Commit27ce44d.

## Threat Flags

| Flag | Arquivo | Descrição |
|---|---|---|
| threat_flag: private-network-bind | src/main.ts | Bind não loopback opcional exige config HTTPS/peers, mas firewall, proxy e ausência de porta pública devem ser conferidos no deploy real04-05 |

## Operational Contracts and Remaining Real Gate

- CLI: `operation-snapshot`, `operation-recover`, `promote-profile`, `fence-source`; config privado0600 em `ZAP_OPERATION_CONFIG_FILE`, `ZAP_DATA_DIR` correspondente. Sem shell/argv livre; controllers fixos systemd (inclusive `user:true`) e Docker, SSH opcional com identidade e host key pinados, sem autoaccept.
- `OperationConfig`: dataDir, operationDir, destination novo, priorMode, priorRelease, supervisor. `SupervisorConfig`: kind, name, offlineName opcional, user opcional para systemd, dataDir, machineId; SSH opcional. O modo observado determina a retomada. Consulta offline requer supervisor offlineName configurado.
- Fence-source roda na origem sob controle do operador: OperationConfig(source) + targetDataDir final absoluto e targetMachineId. Após emitir o fence, criar snapshot que inclui a revogação; transferir snapshot e prova/public anchor autenticados. Nunca transferir a chave privada de assinatura para o perfil/snapshot.
- Promoção no target usa OperationConfig(target) + source descritiva, snapshotDir, verificationDir novo, sourceFenceFile e sourceFencePublicKey pinada. A verificação durável não precisa source.ssh acessível. O caminho online alternativo exige probe atual antes do socket.
- Guardar operationDir persistente separado/fora do perfil, autorização/key/state e signed fence/public anchor no recovery kit protegido. O snapshot de dados não inclui chaves operacionais e continua restaurando offline por padrão.
- O service lock usa PID/starttime/bootId Linux. App e operador devem observar o mesmo namespace PID, e o controller Docker confere Mount.Source contra dataDir absoluto. No deploy, usar namespace/path coerentes (por exemplo pid:host e bind do perfil no mesmo path absoluto) e provar exclusividade; não presumir que PID1 de containers isolados oferece o mesmo contrato.
- Reversão permanece fail-closed: revogar/parar e conferir o target antes de qualquer reconciliação explícita da source. Não existe relançamento automático da origem. O fence protege os entrypoints deste serviço, não um operador externo que altere o gate, copie releases antigos ou religue outro coletor fora do fluxo.
- Implantação, units/containers reais, corte do coletor local, persistência do volume, proxy/firewall, parada medida, backup externo, restauração real e Codex permanente continuam para04-04/05/06. Nenhuma ação no Chrome/VPS/collector real foi executada aqui; OPS-01/02/03 permanecem sem conclusão por fixtures.
- STATE/ROADMAP/REQUIREMENTS são responsabilidade do orquestrador neste despacho e não foram editados pelo executor.

## Known Stubs

Nenhum stub que impeça as capacidades locais do plano. Test doubles são restritos às fixtures; controllers de produção executam comandos fixos e falham fechados quando configuração/prova/acesso faltam.

## Self-Check: PASSED

Arquivos criados e SUMMARY existem; os sete commits são ancestrais de HEAD; diff sem erro de whitespace. Branch main autorizada pela configuração do projeto, conferida antes dos commits. Nenhum arquivo rastreado foi excluído e nenhum gerado ficou untracked.

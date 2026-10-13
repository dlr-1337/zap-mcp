---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T03:47:27Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - .dockerignore
  - .env.example
  - Dockerfile
  - README.md
  - ops/README.md
  - ops/compose.example.yml
  - ops/verify-dependencies.mjs
  - ops/zap-container-control.mjs
  - scripts/phase3-acceptance.mjs
  - scripts/phase4-deploy.mjs
  - scripts/phase4-environment.mjs
  - src/auth.ts
  - src/backup.ts
  - src/main.ts
  - src/mcp.ts
  - src/media.ts
  - src/offsite.ts
  - src/operation.ts
  - src/promotion.ts
  - src/transport.ts
  - src/whatsapp.ts
  - test/collector.test.ts
  - test/deploy.test.ts
  - test/environment.test.ts
  - test/mcp-acceptance.test.ts
  - test/media.test.ts
  - test/offsite.test.ts
  - test/operation.test.ts
  - test/promotion.test.ts
  - test/transport.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-13T03:47:27Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** clean
**Source HEAD:** ad9942b05633ac12b062072e83b28e07f97c07ce
**Re-review:** terceira rodada, após correção CR-05 em ad9942b.

## Summary

Mantido exatamente o escopo de 30 arquivos da revisão original. As leituras completas e os rastreamentos das rodadas anteriores foram preservados para os 27 arquivos sem alterações nesta rodada. O helper atual foi novamente lido integralmente; o diff de helper, testes e documentação foi examinado junto aos chamadores de inventário/deployment/recovery e às validações de supervisor, sessão e armazenamento. Os relatórios do fixer foram tratados como alegações, verificadas contra a fonte e não como prova de correção.

Não restam achados comprováveis de bug, segurança ou robustez nesse escopo e profundidade. As seis ocorrências das rodadas anteriores estão corrigidas; nenhum novo BLOCKER ou WARNING foi identificado. `clean` descreve somente esta revisão do código, sem concluir requisitos OPS ou validar a operação real.

## Narrative Findings (AI reviewer)

Nenhum achado aberto. Os caminhos conectados dos achados anteriores foram conferidos:

| Ocorrência anterior | Conferência da correção |
|---|---|
| CR-01 — retry após falha de cifragem | produceOffsiteCopy reconhece o snapshot existente e confere intenção, perfil, manifesto e journal antes de cifrá-lo novamente sob mutex. Recupera retomada interrompida quando necessário; conserva ID, snapshot, publicação exclusiva e último bom. |
| CR-02 — backup reativa release antiga | coordinatedSnapshot registra a release observada; resume passa journal.priorRelease ao helper e confere a retomada. recoverOperation rejeita release ativa divergente; swapRelease usa a release realmente anterior para fallback. |
| CR-03 — recovery depende de HTTPS prévio | runDeployment(recover) usa assertRecoveryReady/inspect-runtime e valida binding/journal/schema antes de parar. Retoma código offline antes da validação HTTPS, registrando recovery-validation-failed se o endpoint continuar indisponível. Migrate/update mantêm assertReady completo. |
| CR-04 — helper e volume divergentes | Driver/inventário exigem as mesmas referências canônicas e SSH/helper. Probe e respostas de controle passam por assertSupervisorFacts, que confere máquina, path hash, PID/contagem, modo, release e candidatos preparados. |
| WR-01 — estado inválido retém mutex | loadState e seleção do ID estão dentro do try/finally imediatamente após acquireServiceLock; falha de leitura não sobrescreve estado inválido e a liberação da trava não depende da limpeza de temporários. |
| CR-05 — inspect-runtime anuncia outro perfil | inspectContainers agora impõe Env único com ZAP_DATA_DIR canônico, único bind Source/Destination correspondente e recusa mounts extras graváveis ou que encubram o perfil. As invariantes estáticas de bind/origem/peer/rede/labels se aplicam a inspect, inspect-runtime, stop e start; apenas saúde/IP atual/versão do proxy dependem de inspect normal. |

### Evidência independente desta rodada

Ensaio em memória chamou `control` e `assertSupervisorFacts` atuais, com runner Docker sintético. Container com Env apontando para o perfil A e mounts A+B foi recusado em **inspect, inspect-runtime, stop e start**, antes de qualquer comando mutante. Um container válido do perfil B, com machine-id read-only e tmpfs /tmp, continuou passando por inspect-runtime → start offline → stop quando somente o proxy estava ausente. Inspect normal recusou essa ausência, preservando seu contrato. Resultado observado: quatro ações negativas recusadas, zero mutações nesses casos e recuperação positiva permitida com ações sintéticas start/update/update/stop.

Também foram examinados os três testes CR-05 novos, incluindo as 18 mutações estáticas cruzadas com quatro ações, seus asserts de recusa anterior à mutação e o controle positivo de indisponibilidade exclusiva do proxy. Não houve enfraquecimento dos guards anteriores de UID não root, PID host, comando exato, allowlist, exclusividade ou validação do journal.

HEAD e ausência de alterações nas fontes src/scripts/ops/test foram conferidos. A suíte padrão **257/257** no mesmo HEAD é evidência informada pelo parent; não foi repetida nesta revisão e não foi usada como substituto da análise. Diff sem erros de whitespace.

### Limites

Revisão read-only de fontes; apenas este REVIEW.md foi atualizado pelo reviewer. Sem alterações de implementação, commits, push, root/sudo, Docker real, rede externa, VPS, conta WhatsApp, Codex real, dados pessoais, sessões, chaves ou locators privados. Os ensaios usaram somente inventários fictícios em memória.

Execução real 05-02, configuração/acesso/readback, supervisão e restauração na VPS continuam pendentes das provas operacionais. OPS-01/02/03/04 não estão concluídos por esta revisão, por fixtures ou pelo resultado da suíte local. Os relatórios e backups intermediários permanecem sob responsabilidade do parent.

---

_Reviewed: 2026-10-13T03:47:27Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

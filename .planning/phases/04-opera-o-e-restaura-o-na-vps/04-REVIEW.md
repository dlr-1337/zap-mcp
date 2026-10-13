---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T03:01:24Z
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
  critical: 4
  warning: 1
  info: 0
  total: 5
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-13T03:01:24Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Leitura integral dos 30 arquivos explicitamente indicados, incluindo testes, documentação operacional e contratos Docker. Chamadas conectadas foram rastreadas entre deployment, inventário, supervisor, backup, offsite, promoção e coletor. AGENTS.md, PROJECT.md, REQUIREMENTS.md e CONTEXT.md orientaram privacidade, preservação do arquivo e exclusividade. Nenhum arquivo do escopo é ignorado; dados, sessões, locators privados e caches não foram abertos.

Quatro defeitos bloqueiam a entrega operacional: retries de backup ficam presos após falha transitória, backup pode reverter uma atualização, recovery depende do endpoint que deveria recuperar e controles do deployment não vinculam o helper ao diretório observado. Há ainda uma falha de liberação do mutex quando o estado offsite é inválido.

Os ensaios desta revisão usaram somente diretórios temporários e fixtures descartáveis, removidos ao final. Não houve acesso à VPS, conta WhatsApp, credenciais reais, mutação de fonte ou commit. A suíte completa anteriormente informada pelo executor não foi repetida. Os testes sintéticos e a análise abaixo não comprovam OPS-01/02/03/04; a implantação e o aceite reais continuam pendentes, sem serem classificados como defeitos de código.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Falha transitória de cifragem impede todos os backups seguintes

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/offsite.ts:126-142`
**Related:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/offsite.ts:219-233`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/backup.ts:90-91`

**Issue:** Depois de publicar o snapshot `destination-ID`, uma falha na cifragem deixa o snapshot íntegro preservado, remove o temporário e não publica `ID.age`. O journal de coordinatedSnapshot termina `completed`, mas o estado do notebook permanece `failed`. A próxima tentativa reutiliza o mesmo operationId e, como o ciphertext não existe, tenta criar novamente o snapshot no mesmo destino. createSnapshot recusa o destino já existente antes de chegar à cifragem. Nenhuma execução posterior escolhe outro ID ou retoma a cifragem do snapshot original. Assim, uma falha recuperável de age/interrupção passa a impedir indefinidamente a rotina diária e o backup obrigatório anterior ao update.

**Evidence:** Fixture executou runOffsiteBackup duas vezes com produceOffsiteCopy/coordinatedSnapshot/createSnapshot reais e um cipher que falha apenas na primeira chamada. Foram seis tentativas de transferência, mas somente uma chamada de encrypt: primeira falha `transient encrypt failure`, cinco seguintes `Destino já existe; use um diretório novo`. O snapshot final permaneceu presente, o serviço retomou e lastVerifiedSuccess ficou null. Isso não depende da indisponibilidade persistente da ferramenta.

**Fix:** Persistir a associação ID→snapshot antes da cifragem e reconhecer o estágio de snapshot íntegro já publicado. Em retry do mesmo ID, validar perfil/manifesto/intenção e cifrar novamente esse snapshot, sem repetir stop/snapshot nem sobrescrever artefatos imutáveis. Se a intenção não puder ser reconciliada, marcar esse ID como abandonado com motivo explícito e permitir uma nova operação exclusiva, preservando snapshot e último bom. Acrescentar controle de falha única em encrypt e SIGKILL antes de publicar ciphertext, exigindo sucesso posterior sem editar estado manualmente.

### CR-02: Backup após update pode reiniciar silenciosamente a release anterior

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/operation.ts:124`
**Related:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/operation.ts:129-146`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-deploy.mjs:62-66`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-deploy.mjs:196-201`

**Issue:** createSupervisor.start retoma sempre config.release, enquanto coordinatedSnapshot captura apenas o modo observado, sem guardar a release realmente ativa. O driver troca para candidateRelease e marca o update comprometido, mas não atualiza a configuração source usada pelo offsite. Uma configuração válida que iniciou com release A continua pinada em A depois da ativação de B. O próximo backup para B e reinicia A; as verificações de retomada conferem running/mode, sem conferir release. Isso produz rollback não solicitado e potencial execução de código anterior contra dados atuais, justamente fora do fluxo de compatibilidade/fallback do update.

**Evidence:** Fixture chamou coordinatedSnapshot com bancos e snapshot reais. O transporte do helper foi substituído por runner sintético que iniciou com release B ativa e SupervisorConfig.release=A. O backup terminou com sucesso, mas o único `start` pediu A e a release final foi A. O próprio helper devolve `release` em inspect; esse fato é perdido no contrato/journal da coordenação.

**Fix:** Capturar a release observada no inspect, persistir no journal antes de stop e retomá-la explicitamente pelo helper autorizado. Validar a mesma release no inspect posterior. Como proteção mínima, recusar divergência entre release observada e configuração antes de parar qualquer serviço; o driver então precisa reconciliar atomicamente as referências operacionais ao comprometer/trocar/recuperar código. Cobrir backup após A→B e recuperação interrompida preservando B, incluindo modo collect.

### CR-03: Recovery exige HTTPS saudável antes de restaurar o código

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-deploy.mjs:174-193`
**Related:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-environment.mjs:198-200`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-environment.mjs:233-240`

**Issue:** Todos os modos, inclusive recover, executam assertReady antes de acessar o journal e o controller. assertReady exige publicOrigin observado por requisição HTTPS ao backend. Se o candidato não inicia, cai antes de servir HTTP ou o processo foi interrompido enquanto estava parado, esse probe falha e recover sai antes de reativar a release anterior. O ramo que deveria recuperar um serviço indisponível passa a depender da disponibilidade desse mesmo serviço. Dependências como último backup em estado success também podem bloquear o caminho de emergência por motivo não necessário ao rollback de código offline.

**Evidence:** Rastreamento do fluxo mostra a chamada incondicional na linha178 e o ramo recover apenas na linha190. Ensaio do corpo atual de runDeployment, com readiness falhando por HTTPS indisponível, confirmou rejeição em recover antes de qualquer chamada ao controller (`controls=0`). Não foi simulada uma falha real na VPS.

**Fix:** Definir preflight específico de recuperação: config privada e journal ligados ao target, identidade SSH atual, helper/path correto, exclusividade/parada, compatibilidade dos schemas atuais e release anterior allowlisted. Permitir restaurar somente código e iniciar offline mesmo com o endpoint/backup indisponível. Conferir HTTPS e integridade após a retomada e manter journal/falha explícitos se a validação final falhar. Preservar os gates completos de readiness para migrate/update. Testar recover com candidato que não abre listener e com interrupção no estágio stopped.

### CR-04: Deployment pode controlar um perfil diferente do volume que verificou

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-deploy.mjs:179-185`
**Related:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-deploy.mjs:161`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-deploy.mjs:211-216`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-environment.mjs:101-105`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/scripts/phase4-environment.mjs:184`; `/home/otavio/Documents/ChatGPT/zap-mcp 2/ops/zap-container-control.mjs:34`

**Issue:** O helper devolve machineId e profilePathHash do seu dataDir root-owned. O inventário compara somente a máquina, e o controller RPC do deployment retorna os fatos sem validar esse hash. validateConfig também não exige env.target.dataDir/appRoot/helperPath iguais às referências do driver. É possível verificar runtime/permissões/capacidade de B e obter supervisão/containers allowlisted de A no mesmo host, aceitando readiness e preparedReleases como se fossem de B. Na migração, o driver pode parar o perfil A e depois desabilitar/fencear a origem antes de a promoção de B finalmente detectar a divergência. A validação existente em createSupervisor.inspect não cobre esse caminho porque o driver usa seu próprio controller RPC.

**Evidence:** O retorno profilePathHash está presente no helper, mas não é consumido em nenhum gate do controller do deployment nem do inventário. Ensaio do corpo atual de runDeployment com readiness fornecido e fatos contendo `profilePathHash: wrong-profile-hash` retornou `{ready:true, operationalAcceptance:false}` em preflight. O ensaio verifica a ausência da validação no driver; não substitui um inventário real.

**Fix:** Antes do primeiro stop/start, validar os fatos atuais com machineId esperado e SHA-256 do target.dataDir canônico, conferir PID/contagem e contratos completos, e exigir igualdade entre todas as referências target/volume/appRoot/helper do environmentFile e do driver. Aplicar a mesma checagem ao hostProbe do inventário. Reutilizar a validação de createSupervisor em vez de manter uma variante menos restritiva. Um helper de A com volume B deve falhar antes de controller.stop e antes de qualquer alteração da origem.

## Warnings

### WR-01: Estado offsite inválido retém o mutex adquirido

**Classificação:** WARNING
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/offsite.ts:221-223`

**Issue:** acquireServiceLock é executado antes de loadState, mas ambos ficam fora do try/finally que libera a trava. Se loadState rejeitar JSON/schema/metadata, a função rejeita deixando service.lock pertencente ao processo ainda vivo. Corrigir o estado e tentar novamente no mesmo processo continua falhando com `Serviço já ativo`, embora não exista operação em andamento. Na CLI que encerra o processo a próxima invocação pode recuperar o órfão, mas o contrato da função e os chamadores persistentes ficam bloqueados até reiniciar o processo.

**Evidence:** Fixture gravou apenas `{version:999}` em um operationDir privado. A primeira chamada rejeitou `Estado de backup inválido`; a segunda no mesmo processo rejeitou `Serviço já ativo`. service.lock permaneceu presente até a remoção do diretório descartável do ensaio.

**Fix:** Começar o try/finally imediatamente depois de adquirir a trava, carregando/validando estado e selecionando operationId dentro dele. O catch que grava falha deve executar somente quando há estado válido; a liberação não pode depender dessa leitura.

```ts
const lock = acquireServiceLock(config.operationDir);
let work: string | undefined;
try {
  const state = loadState(config.operationDir);
  // Seleção do ID e operação; tratamento de falha com estado válido.
} finally {
  try { if (work) rmSync(work, { recursive: true }); }
  finally { lock.release(); }
}
```

---

_Reviewed: 2026-10-13T03:01:24Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

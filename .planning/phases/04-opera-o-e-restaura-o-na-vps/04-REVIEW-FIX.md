---
phase: 04
fixed_at: 2026-10-13T03:43:38Z
review_path: .planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-10-13T03:43:38Z
**Source review:** .planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW.md (re-review de 2026-10-13T03:33:53Z, source HEAD 6645f39; lido no checkout original antes da isolação)
**Iteration:** 2

**Summary:**
- Findings in scope: 1 Critical/BLOCKER
- Fixed: 1
- Skipped: 0

## Fixed Issues

### CR-05: inspect-runtime aceita container que serve um perfil diferente do diretório anunciado

**Files modified:** `ops/zap-container-control.mjs`, `test/deploy.test.ts`, `ops/README.md`
**Commit:** ad9942b05633ac12b062072e83b28e07f97c07ce
**Status:** fixed: requires human verification
**Applied fix:** As invariantes estáticas do app agora ficam em inspectContainers, compartilhada por inspect, inspect-runtime, stop e start. Uma única definição de ZAP_DATA_DIR deve ser exatamente o dataDir canônico da config root-owned, com um único bind Source/Destination/RW correspondente. Env ausente, divergente, duplicado ou definição sem valor são recusados; o PID Docker não pode compensar essa divergência. Binds extras graváveis e mounts que encubram o perfil são recusados. Mounts read-only de machine-id/snapshot/estado e tmpfs em /tmp permanecem permitidos. Com proxy configurado, bind host/origem/peers são únicos e iguais à config, com rede e labels de Host/forwarding coerentes. Apenas presença/saúde/versão/IP atual do proxy ficam restritos ao inspect normal: indisponibilidade exclusiva de proxy continua permitindo recuperar código offline. O driver e a guarda compartilhada CR-04 continuam inalterados.

**Verification:**
- RED exato: Env apontando A com mounts A/B foi aceito por control(inspect-runtime) e assertSupervisorFacts, causando Missing expected rejection; matriz de invariantes também falhou. Controle positivo de proxy exclusivamente indisponível passou na versão anterior.
- GREEN: deploy 12/12; após ampliar casos, foco helper/CR-05 4/4. Três testes novos, com 18 mutações estáticas × 4 ações = 72 negativos, mais 4 ações no cenário Env A/mounts A+B. Todos recusam antes de qualquer comando Docker mutante; nenhum assert foi enfraquecido.
- Negativos incluem Env ausente, ZAP_DATA_DIR ausente/divergente/duplicado/sem valor/não canônico, bind extra A gravável, bind duplicado, mount read-only que encobre media, bind host incorreto/ausente, origem incorreta/ausente/duplicada, peer incorreto/ausente/duplicado e Host label incoerente.
- Positivo usa control real com transporte Docker sintético: inspect normal recusa proxy ausente; inspect-runtime aceita perfil válido; start offline, inspect-runtime ativo e stop concluem, com assertSupervisorFacts real. Mounts machine-id/snapshot/estado somente leitura e tmpfs /tmp preservados.
- Tier 1: releitura completa do helper modificado e diff preservando UID não root/PID host/comando serve/allowlist/exclusividade/publicação limitada.
- Tier 2: node --check do helper, npm run build e git diff --check passaram.

## Previous Iteration Evidence

A rodada anterior corrigiu CR-01, CR-02, CR-03, CR-04 e WR-01 nos commits cf011f9, f234aab, d3edd35, 02aa060 e 6645f39, com suíte padrão 254/254 no main. O re-review atual conferiu esses cinco mecanismos em código e isolou CR-05 como regressão de invariantes estáticas no novo caminho runtime.

Os backups intermediários pertencem ao parent e permanecem preservados, sem commit:
- `.planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW.iter2.md`: review inicial dos cinco achados.
- `.planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW-FIX.iter2.md`: relatório da iteração 1, com correções e RED/GREEN por achado.
- `.planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW.iter3.md`: re-review que identificou CR-05.
- `.planning/phases/04-opera-o-e-restaura-o-na-vps/04-REVIEW-FIX.iter3.md`: cópia preservada do relatório da iteração 1.

O parent pode consumir/remover esses backups intermediários após convergência. Os commits e os testes da rodada anterior permanecem no histórico e na suíte final desta iteração.

## Verification

- Gates por finding rodaram na única worktree Git real `.claude/worktrees/rf-04-iteration2`, branch temporário `gsd-reviewfix/04-iteration2`, criada a partir de 6645f39. Contrato estático do papel e workflow.use_worktrees=true exigiam isolação; o adapter/handoff none conflitante foi informado ao parent. Nenhuma worktree adicional/aninhada foi criada.
- Node 24.21.0 e dependências existentes do checkout ancestral; nenhum node_modules criado/ligado na worktree, instalação ou mudança de pins.
- Commit atômico integrado main por ff-only; REVIEW original modificado e backups/report do parent preservados.
- **Suíte padrão completa final no checkout principal:** `PATH=/home/otavio/.local/share/mise/installs/node/24.21.0/bin:$PATH npm test`.
- **Resultado: 257/257**, 0 failed/cancelled/skipped/todo, exit 0, 74.487 s. Uma única execução da suíte completa após a mudança. Inclui todas as regressões dos cinco fixes anteriores e os três novos testes CR-05.
- **HEAD fonte final testado:** `ad9942b05633ac12b062072e83b28e07f97c07ce`. Após a suíte, mesmo HEAD e `git diff --exit-code -- src scripts ops test` confirmaram fonte inalterada.
- Isolação temporária removida em ordem transacional: ff-only → worktree remove → branch temporário → sentinel. Worktrees anteriores do projeto foram preservadas.
- A marca requires human verification sinaliza lógica/estado conforme o papel fixer; re-review/verificação da fase ficam com o parent, sem checkpoint impeditivo para correções sintéticas.
- Nenhum Docker real, root/sudo, rede externa, VPS, dados pessoais, push, source-stop/fence, ativação WhatsApp ou QR nesta iteração. Não houve alteração de STATE/ROADMAP/REQUIREMENTS/WINDOWS/REVIEW nem das fontes fora dos três arquivos do finding.
- OPS-01/02/03/04 e execução real 05-02 permanecem pendentes de prova real e acesso/configuração autorizados. Fixtures não constituem aceite operacional.
- Nenhum arquivo novo de implementação. Este relatório fica sem commit para o workflow.

---

_Fixed: 2026-10-13T03:43:38Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 2_


---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T19:19:01Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/phase4-acceptance.mjs
  - scripts/phase4-deploy.mjs
  - test/operation-acceptance.test.ts
  - test/deploy.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-13T19:19:01Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Revisão padrão dos quatro arquivos completos e do delta desde df19cf0, seguida de reavaliação da correção de CR-06 no HEAD 181a297. Nenhum achado aberto no escopo delimitado. Foram rastreados os caminhos conectados de privacidade, execução/cleanup do subprocesso Codex, metadata de falha remota e readiness HTTPS.

Não foram fornecidos structural findings nem evidência de revisores externos. As contagens acima representam apenas achados abertos. Os IDs de revisões anteriores não foram reutilizados; o histórico anterior permanece em 04-REVIEW-DISPOSITION.md e relatórios históricos. Nesta rodada, somente este relatório foi alterado; nenhuma fonte, configuração pessoal, VPS ou dado real foi modificado, e nenhum commit foi criado pelo revisor.

## Narrative Findings (AI reviewer)

Nenhum achado aberto. All reviewed files meet quality standards. No issues found.

### Histórico de CR-06 — resolvido

**Classificação anterior:** BLOCKER — resolvido.
**File:** `scripts/phase4-acceptance.mjs:200-207`.
**Problema confirmado anteriormente:** O helper publicava o pedido com hardlink e removia o temporário em seguida. Entre essas duas operações, o pai podia observar `nlink=2`, recusar e apagar o pedido legítimo. Uma pausa controlada nessa janela reproduziu helper exit 1, sem ACK, testemunha ou arquivo final, apesar de os 34 testes existentes passarem.

**Correção verificada:** A linha 207 agora escreve o JSON completo em temporário exclusivo `wx` e o publica por `renameSync(temporary,requestPath)`. No mesmo diretório privado, o pedido passa a existir atomicamente já com um único link; o estado intermediário rejeitado pelo pai deixa de existir. O helper recusa request/response preexistentes. O pai preserva `O_NOFOLLOW`, ownership, permissões, limite de tamanho, `nlink===1`, nonce e os dois IDs fixos; não aceita hardlinks arbitrários. Só os GETs autenticados no pai, com TLS e tamanho/SHA corretos, produzem testemunhas de entrega.

**Cobertura da correção:** `test/operation-acceptance.test.ts:90-91` injeta pausa de 250 ms imediatamente depois da operação de publicação e reduz somente o prazo da fixture para 1 segundo. O teste exige término bem-sucedido do helper, duas testemunhas, exatamente os dois GETs e bytes finais iguais aos originais. Essa pausa reproduzia o defeito na implementação anterior e passa após o rename. Os negativos de echo, cópia local, escopo/IDs incorretos, resposta forjada, symlink/hardlink, status não 200 e stream parcial continuam no mesmo teste.

### Verificação e limites

Nesta reavaliação, executado o foco CR-02 de entrega HTTPS com Node 24.21.0: **1/1 passou**, exit 0, zero falhas, cancelamentos, skips ou todo. Conferida a presença da nova asserção e da pausa no teste compilado. Na revisão anterior, os dois arquivos focados passaram **34/34** antes da correção de CR-06; esse resultado permanece histórico e não é apresentado como repetição atual. A suíte completa já em execução pelo orquestrador não foi repetida nem considerada concluída aqui.

Os dois arquivos de deploy não mudaram desde a rodada anterior. O metadata remoto projetado não inclui message, command ou stderr bruto; a leitura de readiness é aguardada antes do preflight estrito do update. O broker continua registrando entrega somente após GET autenticado, TLS verificado, tamanho/SHA conferidos e publicação exclusiva dos bytes; o helper lê apenas o ACK. Echo, cópia local e JSON serializado não fabricam essas observações.

Esta revisão não executou Codex instalado contra a VPS, atualização real, backup externo ou troca de backend restaurado. Não reavaliou a cronologia nem autenticou o registro privado do gate RED. Testes locais não concluem OPS-01 a OPS-04; o aceite operacional continua dependendo de evidência atual no ambiente real.

---

_Reviewed: 2026-10-13T19:19:01Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

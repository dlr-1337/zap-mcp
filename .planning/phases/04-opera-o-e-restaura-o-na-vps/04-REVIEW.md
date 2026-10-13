---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T20:15:51Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/phase4-acceptance.mjs
  - test/operation-acceptance.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-13T20:15:51Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** clean

## Summary

Reavaliação padrão delimitada a scripts/phase4-acceptance.mjs e test/operation-acceptance.test.ts, delta 6d72c12..944f494 no HEAD 944f494. A mudança acrescenta somente o span nativo opcional e exato serve_inner: antes do target rmcp::service no parser de negociação. Foram rastreados o stderr separado do subprocesso, a filtragem de horário/servidor e o caller que exige essa negociação antes de registrar os gates. Nenhum achado aberto no delta. A revisão anterior de quatro arquivos e a resolução de CR-06 são histórico; a lista do frontmatter delimita esta rodada.

Não foram fornecidos structural findings nem evidência de revisores externos. As contagens acima representam apenas achados abertos. Os IDs de revisões anteriores não foram reutilizados; o histórico anterior permanece em 04-REVIEW-DISPOSITION.md e relatórios históricos. Nesta rodada, somente este relatório foi alterado; nenhuma fonte, configuração pessoal, VPS ou dado real foi modificado, e nenhum commit foi criado pelo revisor.

## Narrative Findings (AI reviewer)

Nenhum achado aberto. All reviewed files meet quality standards. No issues found.

### Parser nativo: delta revisado

**File:** `scripts/phase4-acceptance.mjs:165-168,217-234`.
A expressão permanece ancorada no início da linha, em timestamp UTC e nível INFO, e aceita somente `(?:serve_inner:\\s+)?` antes de `rmcp::service`. Não foi substituída por wildcard de spans. Após esse filtro, o parser continua exigindo inicialização de cliente, peer_info, protocolo retornado e nome exato zap-archive, com timestamp dentro da janela atual. observeCodexNegotiation continua lendo somente result.stderr; stdout, eventos e transcript fornecidos como dados não substituem o log nativo.

probeInstalledCodex continua exigindo negociação na linha 221, chamadas atuais, oráculos SQL, entrega HTTPS testemunhada e preservação de configuração antes do record da linha 234. A mudança não cria fallback, não reconstitui observações perdidas nem reutiliza receipts de execução anterior.

O teste novo em `test/operation-acceptance.test.ts:52` exercita o formato com serve_inner. Foram executados os dois testes de negociação com Node 24.21.0: **2/2 passaram**, exit 0, zero falhas/cancelamentos/skips/todo. Um controle adicional direto confirmou esse positivo e **sete negativos** no formato com span: servidor estrangeiro, span diferente, texto intermediário não permitido, prefixo corrompido, timestamp anterior/posterior à janela e log forjado somente em stdout/eventos. Os testes de regressão anteriores não foram repetidos nesta rodada.

### Histórico CR-01 a CR-05

Os IDs e dispositions anteriores permanecem preservados nos relatórios e em 04-REVIEW-DISPOSITION.md. A rodada de aceite anterior resolvia CR-01 (contexto insuficiente), CR-02 (entrega sem GET testemunhado), CR-03 (fingerprints em recibo público) e CR-04 (cleanup de configuração MCP). A revisão de implantação preserva seu próprio histórico CR-01 a CR-05 e WR-01. Esses IDs históricos não foram reutilizados nem convertidos em achados novos; módulos externos a este delta não foram reavaliados nesta rodada.

### Histórico de CR-06 — resolvido

**Classificação anterior:** BLOCKER — resolvido.
**File:** `scripts/phase4-acceptance.mjs:200-207`.
**Problema confirmado anteriormente:** O helper publicava o pedido com hardlink e removia o temporário em seguida. Entre essas duas operações, o pai podia observar `nlink=2`, recusar e apagar o pedido legítimo. Uma pausa controlada nessa janela reproduziu helper exit 1, sem ACK, testemunha ou arquivo final, apesar de os 34 testes existentes passarem.

**Correção verificada:** A linha 207 agora escreve o JSON completo em temporário exclusivo `wx` e o publica por `renameSync(temporary,requestPath)`. No mesmo diretório privado, o pedido passa a existir atomicamente já com um único link; o estado intermediário rejeitado pelo pai deixa de existir. O helper recusa request/response preexistentes. O pai preserva `O_NOFOLLOW`, ownership, permissões, limite de tamanho, `nlink===1`, nonce e os dois IDs fixos; não aceita hardlinks arbitrários. Só os GETs autenticados no pai, com TLS e tamanho/SHA corretos, produzem testemunhas de entrega.

**Cobertura da correção:** `test/operation-acceptance.test.ts:90-91` injeta pausa de 250 ms imediatamente depois da operação de publicação e reduz somente o prazo da fixture para 1 segundo. O teste exige término bem-sucedido do helper, duas testemunhas, exatamente os dois GETs e bytes finais iguais aos originais. Essa pausa reproduzia o defeito na implementação anterior e passa após o rename. Os negativos de echo, cópia local, escopo/IDs incorretos, resposta forjada, symlink/hardlink, status não 200 e stream parcial continuam no mesmo teste.

### Verificação e limites

Na reavaliação anterior de CR-06, o foco de entrega HTTPS com pausa controlada passou **1/1**; antes daquela correção, os dois arquivos focados haviam passado **34/34**. Esses resultados permanecem históricos e não são apresentados como execuções atuais do delta de negociação. A suíte completa não foi repetida nem considerada concluída aqui.

O delta de negociação não modifica deploy, IPC, credenciais ou política de sandbox. A resolução de CR-06 acima permanece histórica e o código de entrega não mudou neste delta.

Esta revisão não executou Codex instalado contra a VPS, atualização real, backup externo ou troca de backend restaurado. Não reavaliou a cronologia nem autenticou o registro privado do gate RED. Testes locais não concluem OPS-01 a OPS-04; o aceite operacional continua dependendo de evidência atual no ambiente real.

---

_Reviewed: 2026-10-13T20:15:51Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T21:19:34Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - public/app.js
  - test/ui.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-13T21:19:34Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** clean

## Summary

Revisão padrão do delta d47602b..ec6ff29 no HEAD ec6ff29, delimitada a public/app.js e test/ui.test.ts. Foram examinados o estado de backup nunca iniciado e a tradução allowlisted das causas de falha, com rastreamento do contrato em src/offsite.ts. Nenhum achado aberto. As revisões anteriores de UI, negociação, IPC e deploy permanecem abaixo como histórico; o frontmatter delimita esta rodada.

Não foram fornecidos structural findings nem evidência de revisores externos. As contagens acima representam apenas achados abertos. Os IDs de revisões anteriores não foram reutilizados; o histórico anterior permanece em 04-REVIEW-DISPOSITION.md e relatórios históricos. Nesta rodada, somente este relatório foi alterado; nenhuma fonte, configuração pessoal, VPS ou dado real foi modificado, e nenhum commit foi criado pelo revisor.

## Narrative Findings (AI reviewer)

Nenhum achado aberto. All reviewed files meet quality standards. No issues found.

### Backup nunca iniciado e causas seguras: delta revisado

**Files:** `public/app.js:458-462`, `test/ui.test.ts:514-526`.
O backend cria o estado inicial com result pending e lastAttempt null; esse estado não prova execução de uma cópia. O renderer agora exige result pending e lastAttemptAt presente para mostrar “Backup em andamento”. Sem tentativa registrada, conserva “Nenhuma cópia conferida ainda”, sem fabricar progresso. Operações reais do backend persistem lastAttempt quando passam ao estado pending.

Os sete códigos da tabela backupFailures correspondem ao conjunto safeCodes do backend. Object.hasOwn restringe a leitura a propriedades próprias; nomes herdados como toString não viram função/texto renderizado. Todo código não conhecido recebe frase genérica. O renderer exibe somente a tradução fixa, nunca concatena o código bruto, exception, host, path ou mensagem de backend. A saída continua por textContent, após a conferência comum de readVersion/statusVersion.

A alteração preserva a limpeza em signedOut e a recusa de resposta de geração anterior. Não altera role status/alert, fuso America/Sao_Paulo, o rótulo do horário de conferência ou o atraso calculado pela criação do snapshot. O HTML e os fluxos de login não foram modificados neste delta.

**Verificação atual:** Executado com Node 24.21.0 o teste UI afetado: **1/1 passou**, exit 0, zero falhas/cancelamentos/skips/todo. Confere pending sem tentativa, pending com tentativa, causa conhecida de espaço, código desconhecido sentinel, propriedade herdada toString, ausência de detalhe privado, reflow 320/1280 px e limpeza no logout. Conferida a presença dos novos controles no teste compilado. A suíte completa e os testes de login não foram repetidos nesta rodada.

### Histórico do status operacional e login — clean

**Files:** `public/app.js:173-197,450-506`, `public/index.html:27-35`, `test/ui.test.ts:502-529`.
O parágrafo backup-status só é preenchido depois de request/json e da conferência de readVersion/statusVersion. O wrapper request recusa resposta de geração anterior e encerra a sessão em 401; signedOut incrementa as gerações e limpa o novo texto. Pagehide e a tentativa de logout invalidam readVersion antes que callbacks antigos possam preencher novamente a interface.

A apresentação do backup usa frases fixas, result, lastVerifiedAt e overdue24h por textContent. Host, paths, hashes, safeFailureCode e mensagens cruas de backend não são exibidos nesse novo bloco. A formatação reutiliza America/Sao_Paulo. O contrato conectado em backupStatus calcula overdue24h pela criação do snapshot, e a interface distingue essa idade do horário de conferência: “Última cópia conferida” rotula verifiedAt; “o arquivo protegido tem mais de 24 horas” rotula o atraso, sem prometer conteúdo recente apenas por uma verificação recente.

Pendência, última falha, ausência de cópia conferida e cópia anterior preservada têm textos distintos. Falha/atraso usam role alert, os demais estados usam status. O novo parágrafo fica na região autenticada existente e herda reflow/overflow-wrap. Não adiciona ação de coleta ou pareamento; collectorEnabled false deixa explícita a coleta pausada e não atribui a pausa a uma preparação não comprovada.

Login 401 orienta conferir a senha, 403 e outras recusas orientam recarregar a página, e 429 mantém a orientação de espera. Não há exposição do body de erro. O input de senha continua limpo e o erro permanece associado ao campo por aria-describedby e role alert.

**Verificação da rodada anterior:** Executados com Node 24.21.0 os dois testes UI afetados: **2/2 passaram**, exit 0, zero falhas/cancelamentos/skips/todo. Cobrem horário em São Paulo, sucesso/atraso/falha/pendência/ausência de cópia, sentinel privado não renderizado, role alert, coleta pausada, reflow em 320/1280 px, limpeza no logout e distinção 403/401. Respostas atrasadas foram rastreadas no mecanismo comum de gerações; não foi criada nem executada uma nova matriz de atraso específica do backup. Não foi repetida a suíte completa nem executada auditoria visual de produção.

### Histórico do parser nativo — clean

**File:** `scripts/phase4-acceptance.mjs:165-168,217-234`.
A expressão permanece ancorada no início da linha, em timestamp UTC e nível INFO, e aceita somente `(?:serve_inner:\\s+)?` antes de `rmcp::service`. Não foi substituída por wildcard de spans. Após esse filtro, o parser continua exigindo inicialização de cliente, peer_info, protocolo retornado e nome exato zap-archive, com timestamp dentro da janela atual. observeCodexNegotiation continua lendo somente result.stderr; stdout, eventos e transcript fornecidos como dados não substituem o log nativo.

probeInstalledCodex continua exigindo negociação na linha 221, chamadas atuais, oráculos SQL, entrega HTTPS testemunhada e preservação de configuração antes do record da linha 234. A mudança não cria fallback, não reconstitui observações perdidas nem reutiliza receipts de execução anterior.

O teste novo em `test/operation-acceptance.test.ts:52` exercita o formato com serve_inner. Foram executados os dois testes de negociação com Node 24.21.0: **2/2 passaram**, exit 0, zero falhas/cancelamentos/skips/todo. Um controle adicional direto confirmou esse positivo e **sete negativos** no formato com span: servidor estrangeiro, span diferente, texto intermediário não permitido, prefixo corrompido, timestamp anterior/posterior à janela e log forjado somente em stdout/eventos. Esses testes pertencem à revisão anterior do parser; não foram repetidos na rodada atual de UI.

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

O delta de UI não modifica deploy, IPC, negociação, credenciais ou política de sandbox. As revisões e a resolução de CR-06 acima permanecem históricas; não substituem o escopo desta rodada.

Esta revisão não executou Codex instalado contra a VPS, atualização real, backup externo ou troca de backend restaurado. Não reavaliou a cronologia nem autenticou o registro privado do gate RED. Testes locais não concluem OPS-01 a OPS-04; o aceite operacional continua dependendo de evidência atual no ambiente real.

---

_Reviewed: 2026-10-13T21:19:34Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

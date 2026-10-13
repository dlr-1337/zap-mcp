---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T17:58:29Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/phase4-acceptance.mjs
  - test/operation-acceptance.test.ts
  - scripts/phase2-acceptance.mjs
  - scripts/phase3-acceptance.mjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-13T17:58:29Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Revisão final das correções dos quatro blockers anteriores no HEAD d8eacec, incluindo os commits 2c7310c, 84673b2 e 98c05c7. Nenhum achado aberto nos quatro arquivos delimitados. As conclusões abaixo decorrem dos caminhos reais do código e dos controles negativos; a aprovação dos testes não substitui essa análise.

O aceite operacional real continua pendente: esta revisão não executou Codex real, VPS, backup externo ou troca de backend permanente/restaurado. Nenhum dado real, credencial, configuração global ou diretório privado de deploy foi acessado. Nenhuma fonte foi editada e nenhum commit foi criado.

A revisão histórica de 30 arquivos registrava como resolvidos retry de cifragem, retomada de release antiga, dependência de HTTPS no recovery, divergência helper/volume, mutex após estado inválido e binding do container. Esse histórico não amplia o escopo desta rodada. Não foram fornecidos structural findings nem evidência externa.

## Narrative Findings (AI reviewer)

Nenhum achado aberto. As classificações abaixo pertencem ao histórico dos problemas corrigidos, não às contagens atuais.

| Achado anterior | Classificação anterior | Resolução verificada |
|---|---|---|
| CR-01 — contexto validado somente pela âncora | BLOCKER — resolvido | assertCodexContexts, scripts/phase4-acceptance.mjs:168-181, exige abertura inicial para a âncora conhecida, compara mensagens/metadados com a janela SQL canônica, verifica limites/ordinais e partições before/after. Navegação exige cursor de resposta precedente da mesma snapshot e janela consecutiva. Cada direção é obrigatória quando o cursor inicial correspondente não é null; não exige direção inexistente no limite da conversa. O probe instalado chama o oráculo antes dos gates, na linha 227. |
| CR-02 — arquivo local/substring usados como prova de entrega | BLOCKER — resolvido | createDeliveryBroker, scripts/phase4-acceptance.mjs:186-207, usa escopo fixo e único com dois IDs/destinos distintos. O helper gerado apenas solicita entrega pelo socket Unix privado: o pai lê o bearer privado e executa os GETs HTTPS no origin fixo. Rejeita TLS não autorizado, status diferente de 200, redirect, tamanho excessivo, truncamento e hash divergente. Só publica o arquivo após pipeline completo e igualdade SQL de tamanho/SHA; link exclusivo rejeita destino previamente criado. Observações ficam em WeakMap privado, gravadas somente após publicação, e assertDeliveryObserved não aceita objeto serializado. |
| CR-03 — fingerprints no recibo público | BLOCKER — resolvido | scripts/phase3-acceptance.mjs:43 projeta originals para bytes/integrityVerified e não retorna SHA. O gate ainda confere hashes privados antes da emissão; o retorno/entrypoint usam o recibo reduzido. Teste de privacidade verifica a ausência dos fingerprints sintéticos no recibo serializado. |
| CR-04 — cleanup remove configuração MCP anterior | BLOCKER — resolvido | scripts/phase3-acceptance.mjs:147 captura todas as linhas de web_config antes de rotateMcpToken. restoreWebConfig, linha 48, repõe o conjunto inteiro transacionalmente. O finally, linhas 269-280, fecha os listeners, restaura proprietário/sessões/revogações/configuração, fecha bancos e apaga a credencial temporária; falhas de cleanup não pulam as tentativas posteriores e são propagadas em AggregateError. Os controles conferem igualdade integral, validade do bearer original e recusa do temporário tanto em sucesso quanto após falha de rotação. |

### Entrega e cleanup: rastreamento da fronteira de confiança

O socket aceita apenas nonce e os dois attachmentIds esperados, uma única vez. Nem URL, destino, hash ou afirmação de sucesso enviados pelo helper são tratados como evidência. No pai, receive verifica ausência do destino, autentica o GET e mede os bytes do stream em temporário exclusivo. A observação é acrescentada depois do link final; o helper recebe delivered:2 apenas após as duas operações. Os GETs e arquivos pertencem ao broker criado no próprio probe/live run, e os arquivos finais também têm mtime posterior ao início da execução e igualdade SQL reconferida na linha 228.

O probe exige assertDeliveryObserved antes de continuar e fecha o broker em finally, mesmo se runCodex ou o gate falhar. close aborta requests, destrói sockets, espera operações pendentes, fecha o listener e remove helper/socket/diretório temporário. Assim, echo sem GET, cópia local e JSON declarando observed não podem registrar savedOriginals. A negociação permanece derivada somente do stderr nativo do processo, não de stdout ou conteúdo de conversas.

### Verificação independente

Executados os dois arquivos de testes focados com o binário Node 24.21.0 exigido pelo projeto: **22 testes passaram**, exit 0. Foram examinados os controles negativos de contexto vazio, referência/ordinal/partição/direção/cursor corrompidos e direção ausente; entrega sem GET, cópia local, escopo/IDs alterados, status não 200 e resposta parcial; privacidade do recibo e restauração de credenciais. test/mcp-acceptance.test.ts foi consultado como evidência auxiliar das correções CR-03/04, sem ampliar a lista primária.

Uma tentativa anterior com o Node 26 do PATH foi recusada pelo guard Node24 obrigatório; foi repetida com o runtime correto. A suíte completa e os self-tests do orquestrador não foram repetidos nesta revisão.

---

_Reviewed: 2026-10-13T17:58:29Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

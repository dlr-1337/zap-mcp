---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
reviewed: 2026-10-11T04:00:30Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/archive.ts
  - test/revisions.test.ts
  - public/app.js
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Fase 1: relatório de revisão de código

**Reviewed:** 2026-10-11T04:00:30Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** clean

## Summary

Revisão incremental da correção de equivalência dos originais (`a292dd316da76fa3e524ba9cac1a80166900091c`), dos quatro testes de regressão (`fdce71e77592e7c5f421213fc7e16d6453baa40e`) e da alteração local de `public/app.js` para “Enviada por você”. Os três arquivos foram relidos integralmente, com rastreamento dos pontos de ingestão, projeção, leitura privada e consumo de mídia. O diff de `a292dd3`, o de `fdce71e` e o diff local do rótulo foram examinados separadamente; `b35aa85^` já contém a correção e os testes, sendo base apenas do incremento documental/local. Nenhum prepass estrutural ou evidência de revisor externo foi fornecido. Nenhum arquivo em escopo é ignorado.

Nenhum BLOCKER ou WARNING introduzido por esse incremento foi comprovado. `status: clean` indica ausência de achados abertos no escopo; não comprova cobertura da conta nem aceite operacional da fase.

A revisão anterior permanece preservada em [01-REVIEW.iter3.md](01-REVIEW.iter3.md). O ledger [01-REVIEW-DISPOSITION.md](01-REVIEW-DISPOSITION.md), com cinco achados corrigidos e zero abertos, e [01-REVIEW-FIX.md](01-REVIEW-FIX.md) permanecem históricos e intactos. Nenhum identificador anterior foi reutilizado.

## Narrative Findings (AI reviewer)

Nenhum achado aberto.

O comparador em `src/archive.ts:81-85` exclui somente `messageContextInfo` da raiz do corpo armazenado. O restante do corpo, incluindo descritores completos de mídia, campos não projetados e contextos aninhados, participa de `isDeepStrictEqual`. Em `src/archive.ts:163-175`, apenas originais empatados no maior relógio confiável, com payloads presentes e evidence idêntica, podem deixar de ser incertos. Ausência de relógio em qualquer candidato mantém incerteza; edições não recebem essa exceção. Revogação e restrição continuam cumulativas, sem apagar revisões ou liberar leitura privada.

O rótulo em `public/app.js:79` deriva somente de `fromMe === true`; `false` e direção ausente preservam seus rótulos próprios. A mudança deixa de inferir o dispositivo usado para enviar. O autor recebido continua inserido via `textContent`.

## Verificação desta execução

Todos os checks executados foram sintéticos e usaram Node24.21.0. Não houve build, alteração de fonte/teste/artefato compilado, navegador, rede externa, perfil WhatsApp ou conta real.

- **Testes de revisão atuais: 12/12**, zero falhas, skips ou cancelamentos. Um `node:module.registerHooks` em memória carregou `src/archive.ts` e `test/revisions.test.ts` atuais nos URLs de `dist/src/archive.js` e `dist/test/revisions.test.js`, usando `stripTypeScriptTypes(..., { mode: 'transform' })`; os demais módulos usaram os artefatos existentes. Assim, o teste exercitou os dois arquivos fonte atuais sem recompilar ou modificar `dist`.
- **Matriz adversarial independente: 29 verificações**, marcador `REPLAY_MATRIX_AND_LABEL_OK checks=29`, código zero. Importação direta de `./src/archive.ts`, SQLite e dados sintéticos temporários removidos em `finally`. Conferiu referências e primeira revisão intactas; contexto da raiz e ordem das propriedades equivalentes; diferenças em contexto aninhado, campo adicional, citação, URL, directPath, chave de mídia, hash, tamanho e miniatura ainda conflitantes; evidence divergente mesmo com corpo igual; relógio ausente, inválido e mistura de candidato datado/sem relógio; edição, revogação e restrição após replay equivalente; empate real de edições datadas; e relógio posterior resolvendo conflito anterior sem eliminar o histórico.
- Na mesma matriz, cinco entradas de direção (`true`, `false`, `null`, `undefined` e string `"true"`) exercitaram as funções reais de renderização em VM com DOM mínimo sintético. Os rótulos corresponderam às condições estritas; texto hostil de autoria permaneceu no `textContent`. Essa prova não avalia renderização ou interação em navegador.
- **Integridade da matriz:** `foreign_key_check=[]` e `integrity_check=ok`.
- A primeira tentativa da matriz falhou por um argumento `undefined` que ativava o relógio default do próprio harness. O caso sem relógio foi corrigido para `null`, sem mudar o código sob revisão, e a matriz completa passou.
- **Escopo:** `git diff fdce71e^ --stat -- src/archive.ts test/revisions.test.ts public/app.js` mostrou os três arquivos esperados. `git diff --check` não apontou erros.

A leitura dos testes `test/revisions.test.ts:17-97` confirmou que as assertivas verificam preservação da primeira revisão, ID e linhas existentes do anexo/job, bytes salvos, referências e chaves estrangeiras. A divergência de hash com a mesma legenda exige conflito, evitando que igualdade da evidence pública seja tomada como prova de equivalência da mídia. Os oito testes restantes conferem os protocolos rc14 e estados protegidos adjacentes.

## Evidência anterior e limites

Os **86/86** testes da suíte completa, a prova de retorno das duas falhas ao retirar a correção e o reaplique verde estão registrados em [.planning/debug/resolved/original-replay-conflict.md](../../debug/resolved/original-replay-conflict.md); são evidência anterior, não nova execução desta revisão.

O reparo operacional e os quantitativos de material real informados pelo orquestrador não foram usados como prova de correção nesta revisão. A comparação autorizada com WhatsApp Web e a atualização dos documentos de aceite pertencem ao trabalho do orquestrador. Esta revisão não cria uma nova exigência de comparação no celular ou uma etapa de participação do usuário.

Somente este `01-REVIEW.md` foi escrito pelo revisor, sem commits. Não houve alteração do ledger, `milestone.lock`, documentos alheios, fontes, testes, dados ou serviços privados. Suíte completa, build, conta real, implantação, backup externo e MCP no Codex real não foram verificados nesta execução.

---

_Reviewed: 2026-10-11T04:00:30Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard; re-review incremental_

## Incremento textual/de navegação após a revisão independente

O orquestrador corrigiu dois warnings menores da auditoria UI no mesmo public/app.js: removeAttribute('aria-current') em back() mantendo foco e pluralização explícita quando o lote tem1 item. Inspeção do diff, node --check e assertivas CUA atuais passaram:1→0 marca de seleção, foco conservado e143 lotes unitários no singular. São verificações do orquestrador posteriores à revisão acima, sem afirmar nova revisão independente. Nenhuma mudança adicional em archive.ts/revisions.test.ts.

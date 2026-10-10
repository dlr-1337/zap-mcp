---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
reviewed: 2026-10-10T22:32:40Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - .env.example
  - README.md
  - package.json
  - public/app.js
  - public/index.html
  - public/style.css
  - src/archive.ts
  - src/auth.ts
  - src/backup.ts
  - src/main.ts
  - src/media.ts
  - src/whatsapp.ts
  - test/archive.test.ts
  - test/auth-state.test.ts
  - test/auth.test.ts
  - test/backup.test.ts
  - test/collector.test.ts
  - test/coverage.test.ts
  - test/http.test.ts
  - test/media.test.ts
  - test/readonly.test.ts
  - test/recovery.test.ts
  - test/revisions.test.ts
  - test/security.test.ts
  - tsconfig.json
findings:
  critical: 3
  warning: 1
  info: 0
  total: 4
status: issues_found
---

# Fase 1: relatório de revisão de código

**Reviewed:** 2026-10-10T22:32:40Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Revisão dos arquivos explícitos dos planos 01-01 a 01-06, suas interfaces, chamadores e testes. `package-lock.json` foi excluído conforme o filtro de lockfiles. Foram encontrados três bloqueadores de correção/preservação e um aviso de evidência incorreta na UI. Os dois problemas de edição foram reproduzidos usando `processMessage`, `makeEventBuffer` e encode/decode protobuf da rc14 efetivamente instalada, sem socket WhatsApp. A perda de vínculo de mídia foi reproduzida com worker e binário sintéticos locais. Não houve alteração de fonte ou commit.

O piloto 01-07 permanece pendente. Conta, cobertura, validade remota da sessão, VPS e Codex real não foram validados nesta revisão. Ausência dessas provas é dependência de aceite, não achado de código. A falha terminal de itens de lote foi conferida e não classificada: o SUMMARY 01-02 documenta replay explícito de falhas, e D-16 admite ingestão não confirmada. O problema de falsa falta de espaço já corrigido não foi repetido.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: A mesma edição pelos dois eventos da rc14 vira conflito e apaga o texto atual

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/archive.ts:234-235`
**Linhas relacionadas:** `src/archive.ts:147-157,211-216,266-269`; `src/whatsapp.ts:153-154`.
**Issue:** O fingerprint serializa a árvore recebida, enquanto a projeção usa conteúdo desembrulhado. A rc14 emite o protocolo de edição em `messages.upsert` e também um `messages.update` com `{editedMessage:{message:...}}`. `ingestOne` converte o primeiro em `protocol.editedMessage`, mas mantém o wrapper do segundo no fingerprint. Assim, uma única edição produz duas revisões distintas. Quando `timestampMs` é um múltiplo de 1000, os dois instantes coincidem e `project` interpreta as revisões equivalentes como conflito, definindo `order_uncertain=1` e `text=NULL`. Com milissegundos diferentes de zero, ainda duplica a evidência da alteração. `readPrivateMessage` também deixa de entregar conteúdo quando o conflito artificial ocorre.
**Gatilho:** Original existente seguido por uma única edição, entregue nos formatos normais de upsert e update da rc14.
**Evidence:** Fixture com original `antes`, edição `depois` e `timestampMs=1700000010000`, processada pelo event buffer e `processMessage` da dependência instalada: `uniqueMessages=1`, `revisions=3`, `text=null`, `orderUncertain=true`. O protocolo e o update têm o mesmo conteúdo e instante, não são duas alterações concorrentes. O código da rc14 em `lib/Socket/chats.js:917-918` emite o upsert; `lib/Utils/process-message.js:364-378` emite o update; o buffer preserva ambos quando o ID do envelope é diferente do alvo.
**required_property:** SYNC-05 e SYNC-06: replay/eventos equivalentes não criam alterações nem removem uma atualização recebida confiável.
**Fix:** Normalizar a identidade/conteúdo da revisão entre os dois formatos antes da deduplicação, preservando separadamente a evidência de origem necessária. Não usar o wrapper de transporte como diferença de conteúdo. Conciliar a precisão de segundos do update com o instante em milissegundos do protocolo sem inventar conflito. Acrescentar uma regressão com os eventos reais da rc14, incluindo o instante no segundo exato; deve haver uma alteração efetiva e texto `depois`, sem `orderUncertain`.

### CR-02: Chave interna do protocolo cria mensagem fantasma com autoria/direção erradas

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/archive.ts:214-219`
**Linhas relacionadas:** `src/archive.ts:139-140,220-228`; `src/whatsapp.ts:153-154`.
**Issue:** Para edição/revogação, `ingestOne` substitui a chave normalizada do envelope por `protocol.key`. Essa chave pode estar na perspectiva do remetente. Por exemplo, uma edição recebida tem `raw.key.fromMe=false`, mas `protocol.key.fromMe=true` porque o original foi enviado pelo contato. A rc14 não normaliza a chave do protocolo em `cleanMessage`; seu `processMessage` identifica o alvo com a chave do envelope e o ID do protocolo. O arquivo inclui `fromMe`, conversa e participante na chave lógica, portanto a ingestão direta do protocolo cria outro registro, potencialmente com outra autoria/conversa, enquanto o update da rc14 altera o original correto. O caminho histórico sem update correspondente também pode deixar o original sem a alteração.
**Gatilho:** Protocolo recebido de um contato com chave do alvo na perspectiva desse contato; a perspectiva é diferente da do proprietário.
**Evidence:** Fixture encode/decode protobuf com original recebido, envelope da edição `fromMe=false` e alvo interno `fromMe=true`, emitida pelo `processMessage`/buffer da rc14: uma mensagem lógica passa a duas (`uniqueMessages` acumulado passou de 1 para 3 ao acrescentar o segundo original e sua edição); ambas as chaves de direção retornam conteúdo `depois`. A geração de edição da rc14 em `lib/Utils/messages.js:514-520` conserva a chave fornecida pelo remetente; seu processamento usa `{...message.key,id:protocolMsg.key?.id}`.
**required_property:** SYNC-05 e EVID-01: identidade estável e autoria/direção recebidas não podem ser duplicadas ou invertidas ao aplicar alterações.
**Fix:** Resolver o alvo do protocolo na perspectiva local usando a evidência do envelope e as identidades já recebidas, em vez de aceitar cegamente a chave interna. No caminho em tempo real, manter coerência com o alvo normalizado do `messages.update`; continuar tratando protocolos históricos sem depender de um update futuro. Cobrir edição/revogação recebidas, enviada pelo proprietário e grupo, sem criar mensagem extra ou misturar outro participante.

### CR-03: Conciliação PN/LID descarta o vínculo do único original já disponível

**Classificação:** BLOCKER
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/archive.ts:164-167`
**Linhas relacionadas:** `src/archive.ts:175-185,188-204`; `src/backup.ts:97-108`; `src/media.ts:65-74`.
**Issue:** Quando duas identidades depois comprovadas como PN/LID possuem a mesma revisão, `mergeMessages` mantém a revisão do registro mais antigo e exclui incondicionalmente os attachments e jobs da outra. Não confere se o lado excluído contém o único original `available`, enquanto o mantido está `unavailable` ou ainda pendente. O arquivo final não é apagado do disco, mas perde referência no banco, o download HTTP deixa de encontrá-lo e o backup copia somente anexos ligados e disponíveis. Uma conciliação legítima transforma material já capturado em órfão sem recuperação pelo acervo; após restauração, esses bytes ficam ausentes.
**Gatilho:** Receber a mesma mídia por PN e LID antes do mapeamento, falhar o download do registro mais antigo e finalizar o download do segundo; depois receber o mapeamento explícito.
**Evidence:** Fixture com dois registros da mesma mídia e hash, primeiro job em `unavailable/attempts=5` e segundo baixado pelo worker em `available`. Após `ingestContacts({lid,pn})`, a mensagem conciliada só possui o primeiro attachment `unavailable`; `getAttachment(secondId)` retorna `null`, embora o segundo `.bin` continue em disco. O attachment disponível desaparece das consultas e do conjunto selecionado pelo snapshot.
**required_property:** SYNC-05, MEDIA-02 e MEDIA-03: deduplicação/conciliação deve conservar originais capturados, sua disponibilidade offline e seu vínculo para backup.
**Fix:** Conciliar a revisão duplicada e seus anexos preservando um original finalizado/verificado quando qualquer lado já o possui. Transferir o attachment/job válido para a revisão e referência mantidas antes de excluir a duplicata, respeitando leases/worker e mantendo o arquivo/manifest associados. Não exigir novo download para um original já salvo. Acrescentar regressão que concilie os dois estados, baixe o original offline e inclua seus bytes em backup/restore.

## Warnings

### WR-01: Toda citação afirma ausência do original sem verificar essa ausência

**Classificação:** WARNING
**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/public/app.js:90`
**Linhas relacionadas:** `src/archive.ts:74,279-289`.
**Issue:** A UI sempre escreve “Citação recebida; original não encontrado no acervo.” A projeção fixa `quote.reference=null` e o DTO não tenta resolver a chave citada, então essa frase também aparece quando a mensagem original está efetivamente arquivada na mesma conversa. A ausência de relacionamento implementado não comprova ausência do registro e enfraquece a evidência apresentada ao proprietário.
**Gatilho/evidência:** Arquivar a mensagem de ID `a` e depois uma mensagem com `contextInfo.stanzaId='a'` e `quotedMessage`; ambas são consultáveis, mas a renderização da segunda executa incondicionalmente a frase de ausência.
**required_property:** EVID-01 e D-18: apresentar limites conhecidos e não inventar ausência da evidência.
**Fix:** Para o escopo atual, substituir por indicação precisa de que o original da citação ainda não foi relacionado/conferido. Reservar “não encontrado no acervo” para uma resolução que efetivamente não encontrou a chave. Não é necessário antecipar navegação/contexto da fase 2 para corrigir essa afirmação.

---

_Reviewed: 2026-10-10T22:32:40Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

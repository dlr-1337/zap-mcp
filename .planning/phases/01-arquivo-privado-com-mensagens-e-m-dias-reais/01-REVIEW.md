---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
reviewed: 2026-10-11T00:43:16Z
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
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Fase 1: relatório de revisão de código

**Reviewed:** 2026-10-11T00:43:16Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** clean

## Summary

Revisão independente da iteração 3 realizada em `b17f210`, dos 25 arquivos exatos de `/tmp/zap-mcp-phase1-rereview-files.json`, seguida de **verificação adicional localizada** da correção CR-03 em `4e739340cf8c54eb332f95e8cabec7858cc060b4`. O complemento conferiu somente o diff de `src/media.ts` e `test/media.test.ts` e o cenário de retry com falha SQL no mesmo processo. A lista de 25 arquivos conserva o escopo da revisão padrão anterior; esses arquivos não foram todos revisados novamente no complemento. Nenhum arquivo desse escopo é ignorado; lockfile, arquivos gerados e planejamento não integram a revisão de fonte. As revisões e relatórios FIX anteriores permanecem preservados. Nenhum prepass estrutural foi fornecido.

**Nenhum achado aberto.** O CR-03 foi corrigido: a retomada verifica/adota o final íntegro antes de consumir tentativa ou atribuir nova geração. A reprodução independente agora conserva o original acessível e incluído no backup/restore sem novo download desse anexo. A verificação localizada não comprovou novo defeito do patch. As correções CR-01, CR-02 e WR-01 permanecem respaldadas pela revisão padrão anterior, sem alegação de novo aceite operacional.

Na revisão padrão em `b17f210`, com `mise exec node@24.21.0`: `npm run build` passou; `node --test dist/test/archive.test.js dist/test/revisions.test.js dist/test/media.test.js dist/test/recovery.test.js dist/test/backup.test.js` passou **46/46**, zero falhas/cancelamentos/skips. Essa seleção exercitou protobuf/processMessage/event buffer da rc14 instalada, migração, PN/LID, DTOs HTTP/diretos, locators privados, fencing, reinício e backup/restore.

No complemento em `4e73934`, `mise exec node@24.21.0 -- npm run build` passou. `mise exec node@24.21.0 -- node --test --test-name-pattern='PN/LID preserva original em|retry verifica final publicado' dist/test/media.test.js` passou **9/9**, zero falhas/cancelamentos/skips: merge em published/beforeAvailable, falha SQL persistente, corrupção, final sem metadados, falta de espaço e última tentativa. A suíte completa não foi repetida nem usada como substituto da reprodução independente.

Evidências da revisão padrão anterior, preservadas para rastreabilidade (dados sintéticos, assertivas inline):

- Dois workers publicam bytes diferentes, ambos suspensos em `published` ou `beforeAvailable`. Merge e replay do mapeamento conservam as duas leases e chaves congeladas; depois ambos confirmam, reiniciam disponíveis e os dois IDs/bytes entram em snapshot/restore com download HTTP autenticado offline. Duas chamadas de download em cada cenário.
- Falha injetada **depois** de executar a reconstrução v6, incluindo DROP/RENAME, reverte versão, schema completo, attachments e jobs para v5. Nova abertura migra para v6 preservando linhas e ativando FKs; `foreign_key_check` vazio.
- Em `b17f210`, falha SQL na confirmação `available`, seguida de retry antes de reiniciar, reproduziu o CR-03. O backup e `verifyBackup` passavam, mas a cópia restaurada continha zero binários apesar do final anteriormente capturado. Essa evidência anterior está detalhada abaixo; seu resultado mudou após a correção em `4e73934`.

Somente este REVIEW.md foi alterado; nenhuma fonte, teste, snapshot, relatório FIX ou `milestone.lock` foi modificado e nenhum commit foi feito. Fixtures temporárias removidas. Transporte declarado: loopback. Nenhum socket WhatsApp real, QR, conta, credencial real, VPS/produção ou Codex real foi usado. Piloto e cobertura da conta permanecem dependências de aceite. A limitação D-16/replay explícito de itens falhos do SUMMARY 01-02 foi respeitada e não tratada como novo achado.

## Narrative Findings (AI reviewer)

Nenhum BLOCKER ou WARNING aberto após a verificação localizada da correção.

## Evidência do CR-03 corrigido

**Resultado atual:** corrigido e verificado localmente em `4e73934`; não é achado aberto.
**Fonte atual:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/src/media.ts:79` (`adoptFinal`), linhas 79-96, 178-200 e 212-213.
**Defeito anterior em b17f210:** `run`, nas antigas linhas 198-200, renomeava qualquer `.bin` para `.damaged` antes de verificar sua integridade. Depois da falha SQL de disponibilidade, a nova tentativa substituía a geração e movia o final íntegro; a ausência de outro download deixava bytes fora da consulta e da restauração. A revisão anterior classificou esse comportamento como bloqueador de preservação.
**Gatilho:** Mesma revisão recebida por PN/LID, dois jobs ativos; primeiro sem bytes; segundo publica final/manifest verificados; chega o mapeamento; confirmação SQL de `available` falha; primeiro falha; passa o retry de um segundo sem reinício; a origem do segundo está indisponível.
**Evidence anterior:** Reprodução inline com serviço/worker reais, Node24.21.0, relógio injetado e streams sintéticos. Em `fault('published')`, o script aplicava `ingestContacts({lid,pn})` e instalava trigger SQL que abortava somente a confirmação `state='available'`; o hook retornava normalmente. Depois do rollback e falha do primeiro downloader, o segundo ID existia em `retry_wait`, com tamanho correto, SHA-256 igual ao recebido, `sourceHashVerified=true`, `.bin` íntegro e manifest. Removido o trigger, avançado o relógio para 2000 ms e executado `drain`, os dois jobs tentavam novamente; download então falhava. O segundo `.bin` desaparecia e o `.damaged` continha exatamente o original. Após fechar/reabrir, o segundo ID ficava `pending`. `createSnapshot` e `verifyBackup` concluíam com sucesso, inclusive login/consulta HTTP offline, mas a mídia restaurada continha **zero `.bin`**. Quatro chamadas ao downloader no total. Fixture removida; nenhuma fonte/teste alterado. Uma reprodução separada com interrupção explícita no hook produziu o mesmo resultado.
**required_property:** SYNC-05, MEDIA-02 e MEDIA-03: conciliação e recuperação devem conservar o vínculo dos originais efetivamente capturados, disponibilidade offline e inclusão no backup.
**Correção conferida:** `adoptFinal` abre o final sem seguir symlink, confere tamanho/SHA-256 persistidos e descriptor, fecha o fd e confirma job/anexo em transação condicionada à geração e estado recebidos. `claim` adota finais antes do orçamento, consumo de tentativa ou troca de geração; somente divergência comprovada permite mover bytes para `.damaged`. Falha SQL mantém o final e a geração intactos e suspende o worker. `run` recusa mover um final que aparecer depois da claim. Reinício reutiliza o mesmo helper.

**Reprodução independente GREEN em 4e73934:** mesmo cenário SQL/PN-LID da prova anterior, com a origem recusando qualquer nova obtenção depois da publicação. Após remover o trigger e avançar para 2000 ms, o segundo ID foi adotado como `available` no mesmo processo; generation, attempts, source_key e bytes do manifest permaneceram idênticos, e nenhum `.damaged` foi criado. Foram três chamadas no total: os dois downloads iniciais e apenas a nova tentativa do primeiro anexo sem binário. **Zero redownload do original preservado.** HTTP negou acesso anônimo (401) e entregou os bytes exatos depois de login (200). Reabertura manteve `available`. `createSnapshot` e `verifyBackup` concluíram com autenticação HTTP offline e a restauração incluiu **um `.bin` idêntico ao original**. Fixture temporária removida; apenas REVIEW.md atualizado, sem commit ou alteração de fonte/teste.

---

_Reviewed: 2026-10-11T00:43:16Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

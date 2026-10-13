# Itens diferidos da fase04

## Falha do teste legado de mídia na suíte integrada04-04

- `test/media.test.ts:189`, caso `PN/LID preserva bytes distintos e usa locator de cada attachment nas novas tentativas`: ENOENT ao ler um original no segundo ciclo, depois de drain/stop e da assertion de quatro downloads. Nenhuma alteração em media.ts, archive.ts ou neste teste por04-04.
- Suíte padrão `mise exec node@24.21.0 -- npm test`:233/234, um failure, zero skips/todo;69,744s. Todos os nove testes offsite passaram.
- Foco isolado `mise exec node@24.21.0 -- node --test dist/test/media.test.js`:23/23,31,923s. Não reproduziu isoladamente. Causa não demonstrada; concorrência/carga são hipótese, não conclusão.
- Evidência integral privada ignorada: `.planning/research/.cache/04-04-full-suite.log` e `04-04-media-focus.log`. Não substituir o resultado padrão por execução com concorrência reduzida.
- Handoff ao orquestrador para workflow debug: capturar estados/reasons de media_jobs, snapshot do worker e etapa de publicação no instante da falha. Nenhum ajuste fora do escopo04-04 nem repetição de build por esperança.

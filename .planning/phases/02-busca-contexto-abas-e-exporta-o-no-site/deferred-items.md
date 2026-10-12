## Deferred Items

- Fixture HTTP preexistente procura conversa específica nas primeiras50 de56 conversas ordenadas por UUID aleatório.
  status: resolved
  **What:** test/http.test.ts pode falhar na seleção do ID antes da assertion HTTP; aconteceu na primeira regressão e passou nas duas seguintes após correções necessárias do DTO. Fora do escopo02-01; corrigir a fixture para procurar pela origem canônica sem depender da primeira página.
  **Resolution:** Escopo ampliado pelo orquestrador no02-02; seleção usa readStoredMessage da origemm0, sem alterar paginação/assertions. Commit60e100f;HTTP2/2 e full105/105 passaram.

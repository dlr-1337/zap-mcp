---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
fixed_at: 2026-10-11T00:41:43Z
review_path: .planning/phases/01-arquivo-privado-com-mensagens-e-m-dias-reais/01-REVIEW.md
iteration: 3
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Fase 1: relatório de correções da revisão

**Iteração:** 3. **Escopo:** `critical_warning`. **Resumo:** 1 achado corrigido, 0 ignorados.

## Fixed Issues

### CR-03: Retry retira o final íntegro preservado pelo merge antes de tentar outro download

**Disposição:** fixed: requires human verification
**Arquivos modificados:** `src/media.ts`, `test/media.test.ts`.
**Commit:** `4e739340cf8c54eb332f95e8cabec7858cc060b4` — `fix(01): CR-03 adopt verified finals before same-process retries`.

**Correção aplicada:** `adoptFinal` compartilha a leitura/verificação SHA-256/tamanho dos bytes reais e comparação com o descriptor entre a reconciliação de reinício e o claim de retry. A adoção ocorre antes de trocar geração, incrementar tentativa ou reservar espaço; preserva geração de publicação, manifesto e locator. A confirmação SQL tem fencing por geração/estado e fica fora do tratamento de integridade; se falhar, o worker pausa preservando bytes e sem iniciar outro download. Apenas final comprovadamente divergente é movido para `.damaged`; final sem prova é preservado e impede nova obtenção destrutiva. A recuperação também adota um final publicado na última tentativa, sem ultrapassar o limite de downloads.

## Verificação

- **RED sem alterar fonte:** build passou; 4/4 cenários `published`/`beforeAvailable` × hash isolado no outro attachment falharam na assertiva semântica do retry no mesmo processo: esperado `available`, recebido `retry_wait`.
- **GREEN no worktree isolado:** `mise exec node@24.21.0 -- npm run build` e seleção de `media`, `recovery`, `backup`, `archive` e `revisions` passaram **51/51**, sem falhas, skips ou cancelamentos; `git diff --check` passou. Dependências reutilizadas por symlink, sem instalação/mutação da árvore de dependências principal.
- Regressões comprovam merge com dois workers, falha SQL depois da publicação, origem indisponível no retry sem reinício, nenhum novo download do original íntegro, mesma geração/tentativas, locator/manifest/bytes preservados, HTTP offline autenticado, reinício e snapshot/restore com bytes. Os DTOs existentes conservam a allowlist pública v6.
- Controles específicos comprovam falha SQL na própria adoção sem destruição/download, corrupção de mesmo tamanho detectada por hash e isolada, final sem metadados de prova preservado, recuperação sem orçamento livre e recuperação na quinta tentativa. Os testes existentes de leases/fencing, concorrência, reserva de espaço e interrupção permanecem verdes.
- Uma edição intermediária produziu erros TypeScript de estrutura; os dois arquivos foram revertidos com `git checkout --`, conferidos idênticos ao HEAD e a mudança foi reaplicada corrigida. A compilação final passou. Uma assertiva intermediária de status foi corrigida para medir `paused` antes de `stop()`; nenhuma falha remanescente.
- **Gates no checkout principal:** após integração `--ff-only` em `main`, `mise exec node@24.21.0 -- npm test` padrão (inclui build) passou **79/79** em uma única execução, com zero falhas, skips ou cancelamentos. HEAD `4e73934`; remoção transacional do worktree, branch temporário e sentinel concluída, preservando dependências principais e trabalhos/documentos preexistentes. Nenhuma fonte ficou sem commit.

## Limites

Dados, streams e falhas injetadas são sintéticos; os HTTPs usam loopback. Nenhum socket WhatsApp real, QR, conta real, VPS/produção ou Codex real foi usado. A correção é de lógica e a persona exige revisão humana da disposição antes da verificação da fase; não comprova cobertura/aceite da conta. Não houve migração, nova dependência ou mudança em exportações/configuração/API pública. Relatório não commitado, para o orquestrador; snapshots/relatórios anteriores e `milestone.lock` preservados.

---
_Fixer: gsd-code-fixer_
_Iteration: 3_

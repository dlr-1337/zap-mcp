---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T19:14:01Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/phase4-acceptance.mjs
  - scripts/phase4-deploy.mjs
  - test/operation-acceptance.test.ts
  - test/deploy.test.ts
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-13T19:14:01Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Revisão do delta desde df19cf0 no HEAD 36ad53f e dos quatro arquivos completos. Foram rastreados os caminhos conectados de privacidade dos arquivos, execução/cleanup do subprocesso Codex e readiness HTTPS. Um bloqueador funcional foi confirmado na publicação do pedido IPC por arquivos: o helper legítimo produz temporariamente o mesmo estado de hardlink que o pai recusa e remove.

Não foram fornecidos structural findings nem evidência de revisores externos. O histórico de achados corrigidos permanece em 04-REVIEW-DISPOSITION.md; as contagens acima representam apenas os achados abertos desta rodada. Nenhuma fonte, configuração pessoal, VPS ou dado real foi alterado, e nenhum commit foi criado.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-06: Publicação do helper pode ser removida como hardlink inseguro

**Classificação:** BLOCKER
**File:** `scripts/phase4-acceptance.mjs:200-207`
**Issue:** O helper publica `request.json` com `linkSync(temporary,requestPath)` e depois remove o nome temporário. Entre essas duas chamadas, o inode tem dois links. O pai executa polling independente, exige `s.nlink===1` na linha 201 e remove o pedido no `finally` da linha 205 mesmo quando essa validação falha. Se o sistema preemptar o helper após o link e antes do unlink, o pai rejeita e apaga um pedido legítimo. Ao retomar, o helper remove o temporário e aguarda um ACK que jamais será escrito; termina com erro após seu prazo de dois minutos. Isso interrompe o aceite e a entrega mesmo com escopo, TLS e originais corretos. A recusa é segura quanto a falso aceite, mas o protocolo não funciona em todos os interleavings válidos.

**Reprodução:** Em fixture privada isolada, executar o helper gerado com uma pausa de 250 ms imediatamente após `linkSync(temporary,requestPath)` e antes de `unlinkSync(temporary)`. Reduzir somente o prazo da fixture para 500 ms. O pai remove o pedido durante essa janela; o helper retorna exit 1, sem ACK, testemunha de entrega ou arquivo final. A pausa simula preempção entre duas operações de filesystem e não altera o formato, nonce, IDs ou validação do pedido. Nenhum endpoint real é usado. Os testes existentes passam porque seus hardlinks negativos são estáveis e a execução positiva não controla essa janela.

**Fix:** Publicar o JSON completo atomicamente já com um único link, por exemplo por rename do temporário dentro do diretório privado exclusivo dessa execução, mantendo a recusa de pedido preexistente e a política de um único produtor. Preservar `O_NOFOLLOW`, ownership, permissões, tamanho e `nlink===1`; não resolver aceitando hardlinks arbitrários. Outra opção é um protocolo que torne a conclusão da publicação distinguível antes da validação. Adicionar teste determinístico que pause o produtor na transição de publicação e exija conclusão dos dois GETs e do ACK, mantendo os negativos de symlink/hardlink.

### Verificação e limites

Executados os dois arquivos de testes focados com Node 24.21.0: **34/34 passaram**, exit 0, zero falhas, cancelamentos, skips ou todo. Os testes compilados foram conferidos para conter os novos negativos de ACK forjado/hardlinks e a asserção de metadata remota sanitizada. A reprodução controlada adicional confirmou CR-06 apesar desse resultado verde.

O delta mantém as observações de entrega em WeakMap privado do pai e somente após GET autenticado, TLS verificado, tamanho/SHA conferidos e publicação exclusiva dos bytes. Echo, cópia local, resposta forjada e JSON serializado não criam testemunha. O metadata remoto projetado não inclui message, command ou stderr bruto. O readiness novo é aguardado antes do preflight estrito de update e não transforma erro de autenticação/TLS em sucesso.

Esta revisão não executou Codex instalado contra a VPS, atualização real, backup externo ou troca de backend restaurado. Não reavaliou a cronologia nem autenticou o registro privado do gate RED. Testes e reprodução locais não concluem OPS-01 a OPS-04; o aceite operacional continua dependendo de evidência atual no ambiente real.

---

_Reviewed: 2026-10-13T19:14:01Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

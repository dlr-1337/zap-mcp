---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
reviewed: 2026-10-11T01:44:20Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/archive.ts
  - src/media.ts
  - src/whatsapp.ts
  - test/archive.test.ts
  - test/media.test.ts
  - test/collector.test.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Fase 1: relatório de revisão de código

**Reviewed:** 2026-10-11T01:44:20Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Revisão independente incremental dos ajustes posteriores a `d06c1f0`, sobre o checkout `3c387d0`: compatibilidade de QR por WEB_BROWSER, contrato IPv4 do lookup protegido no Node24 e participante no envelope histórico da rc14 com enriquecimento conservador de registros legados. Os seis arquivos foram lidos integralmente, com comparação do diff e consulta dos callers em `src/main.ts` e dos adaptadores da rc14 instalada. Esses callers serviram como contexto, sem ampliar esta revisão para toda a implementação anterior. Nenhum prepass estrutural ou evidência de revisor externo foi fornecido. Os arquivos do escopo não são ignorados.

Nenhum BLOCKER novo foi comprovado no código de produção desse incremento. Foi comprovado um WARNING de confiabilidade no teste novo de DNS. A classificação `issues_found` expressa esse achado; não reabre nem altera as decisões registradas na revisão anterior.

A revisão padrão anterior permanece preservada no Git. `01-REVIEW-DISPOSITION.md` continua intacto, incluindo CR-01, CR-02, CR-03 e WR-01 corrigidos. O novo identificador WR-02 evita reutilizar o identificador anterior. Apenas este REVIEW.md foi alterado, sem commits, alteração de fonte/teste/estado ou intervenção no `milestone.lock`.

## Narrative Findings (AI reviewer)

### Warnings

### WR-02: WARNING — teste de DNS aceita falha antes de exercitar o lookup

**File:** `/home/otavio/Documents/ChatGPT/zap-mcp 2/test/media.test.ts:349-355`
**Severity:** WARNING
**Issue:** O teste cria um prazo de 200 ms e considera suficiente que qualquer rejeição tenha `cause.code !== 'ERR_INVALID_IP_ADDRESS'`. Timeout, recusa antecipada ou erro sem código satisfazem essa assertiva mesmo que nenhuma requisição chegue ao lookup corrigido. Não há assertiva de que `https.request` tenha sido chamado, de que `family: 4` tenha sido passado ou de que o callback de lookup tenha sido exercitado. Assim, um resultado verde pode representar ausência de execução do contrato que o teste anuncia verificar.
**Evidence:** Reprodução isolada em Node24.21.0: o módulo foi carregado em memória com apenas `family: 4` removido, sem editar a fonte. Expirado o mesmo prazo de 200 ms antes da requisição, foram executados o fetch e a mesma assertiva do catch. Resultado: `REVERTED_DNS_FIX_TEST_ASSERTION_PASSED_AFTER_TIMEOUT no-code`; nenhuma conexão externa ocorreu. Esta prova mostra o falso positivo possível, sem afirmar que ele ocorreu na execução anterior dos 82 testes.
**Fix:** Tornar a prova determinística e verificar que o ponto corrigido foi alcançado. Em processo isolado, interceptar `node:https.request` antes de importar o módulo, conferir `options.family === 4`, invocar o lookup com um endereço público sintético e conferir seu callback; finalizar o transporte sem rede e exigir uma chamada ao request. Alternativamente, usar um transporte local controlado que prove a passagem pelo lookup. Rejeição por timeout antes desse ponto deve falhar ou invalidar a execução do teste, em vez de ser aceita como evidência da correção.

## Verificação realizada

Foram feitas somente reproduções sintéticas pequenas, sem conta, conteúdo, credencial, perfil, serviço privado ou socket WhatsApp real:

- Migração de um registro sintético cujo payload privado também tinha `key.participant=null`, além de origins/logical_key legados. Trigger SQL injetado demonstrou rollback sem enriquecimento parcial; depois, replay duplicado conservou referência, IDs/estados dos anexos e jobs. Outro participante com o mesmo ID permaneceu separado; alias PN/LID conservou as referências. `foreign_key_check` vazio e `integrity_check=ok`. Resultado: `SYNTHETIC_REPLAY_ROLLBACK_IDS_MEDIA_PARTICIPANT_ALIAS_OK`. Fixture removida.
- Registro gerado pela rc14 com o browser selecionado no código atual: `webSubPlatform=WEB_BROWSER` e `DeviceProps.requireFullSync=true`. Resultado: `SYNTHETIC_QR_REGISTRATION_WEB_BROWSER_FULL_SYNC_OK`.
- Dispatcher atual com DNS público sintético e `https.request` interceptado em processo isolado: uma chamada, `agent=false`, `family=4` e callback com o IPv4/família esperados. Interrupção deliberada antes do transporte, sem rede. Resultado: `SYNTHETIC_DNS_PUBLIC_LOOKUP_FAMILY4_NO_NETWORK_OK`.
- Reprodução do falso positivo WR-02 com a correção removida apenas em memória e prazo expirado, descrita no achado.

A suíte completa e o build não foram repetidos. Os 82/82 testes informados pelo checkpoint são evidência anterior, não uma nova execução desta revisão. Não foi feita nova verificação operacional nem comparado material privado do piloto.

## Limites de aceite

A comparação humana com o WhatsApp no celular permanece pendente, conforme `01-CONTEXT.md` e `01-07-CHECKPOINT.md`: conversa individual conhecida, grupo, direções/autoria e quatro originais. Esta revisão não comprova cobertura da conta nem encerra a fase. VPS/domínio, backup externo e MCP no Codex real permanecem fora deste incremento.

---

_Reviewed: 2026-10-11T01:44:20Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

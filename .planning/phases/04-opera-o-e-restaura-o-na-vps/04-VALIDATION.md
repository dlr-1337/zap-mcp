---
phase: "04"
slug: "opera-o-e-restaura-o-na-vps"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-12"
---

# Phase 04 — Validation Strategy

Contrato de validação: testes locais sustentam implementação; OPS só é concluído por implantação/backup externo/restore/cliente real. O planejador deve vincular os IDs reais das tarefas e ameaças antes de finalizar os planos.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | node:test, Node24.21.0, TypeScript |
| Config file | package.json / tsconfig.json |
| Quick run command | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/auth.test.js dist/test/backup.test.js` |
| Full suite command | `mise exec node@24.21.0 -- npm test` |
| Estimated runtime | Suíte315/315 em68,461s; foco deploy+aceite e pausa IPC adversarial250ms verdes |

## Sampling Rate

- Após commit de tarefa: build e teste afetado; main/auth/MCP exigem foco de transporte.
- Após wave: suíte completa e self-test do driver correspondente.
- Antes do aceite/verificação: suíte verde, negativos de privacidade, implantação real e restore recuperado do destino externo.
- Objetivo de feedback focal: abaixo de30s com fake clock/adapters; duração medida na execução, sem watch nem skip de acesso real.

## Per-Task Verification Map

IDs alinhados aos seis PLANs. Wave0 de cada arquivo acontece no início RED da primeira tarefa consumidora; testes rápidos não atestam OPS real. Cada comando focal abaixo pressupõe build verde.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|---|
| 04-01-01 | 04-01 | 1 | OPS-01/02 | T-04-01/02 | Descoberta read-only, identidade/probes atuais, blocked explícito | integration | `mise exec node@24.21.0 -- node --test dist/test/environment.test.js` | Sim | green |
| 04-01-02 | 04-01 | 1 | OPS-01/02 | T-04-01/02 | Capacidade/key/destino não presumidos e recibo sanitizado | integration | `mise exec node@24.21.0 -- node scripts/phase4-environment.mjs --mode self-test` | Sim | green |
| 04-02-01 | 04-02 | 2 | OPS-01 | T-04-03/04 | TLS/proxy/Host/Origin, Secure, login e original | integration | `mise exec node@24.21.0 -- node --test dist/test/transport.test.js dist/test/auth.test.js` | Sim | green |
| 04-02-02 | 04-02 | 2 | OPS-01/04 | T-04-04/05 | MCP/Range/ZIP e revogação sem cookie bypass | integration | `mise exec node@24.21.0 -- node --test dist/test/transport.test.js dist/test/mcp.test.js dist/test/auth.test.js` | Sim | green |
| 04-03-01 | 04-03 | 3 | OPS-01 | T-04-06 | Shutdown bounded, streams/drain e consulta preservada | integration | `mise exec node@24.21.0 -- node --test dist/test/operation.test.js dist/test/recovery.test.js` | Sim | green |
| 04-03-02 | 04-03 | 3 | OPS-01/02 | T-04-06/07 | Mutex/journal/stop/snapshot/resume antes da rede; crash recovery | integration | `mise exec node@24.21.0 -- node --test dist/test/operation.test.js dist/test/backup.test.js` | Sim | green |
| 04-03-03 | 04-03 | 3 | OPS-03 | T-04-07/08 | Promoção fail-closed com fence, clones e marker preservados | integration | `mise exec node@24.21.0 -- node --test dist/test/promotion.test.js dist/test/backup.test.js dist/test/collector.test.js` | Sim | green |
| 04-04-01 | 04-04 | 4 | OPS-02/03 | T-04-09/10 | Cipher/readback/key independente e restore completo | integration | `mise exec node@24.21.0 -- node --test dist/test/offsite.test.js dist/test/backup.test.js` | Sim | green |
| 04-04-02 | 04-04 | 4 | OPS-02 | T-04-09/10/11 | Last good/crash/ENOSPC/atraso e status autenticado | integration | `mise exec node@24.21.0 -- node --test dist/test/offsite.test.js dist/test/operation.test.js` | Sim | green |
| 04-05-01 | 04-05 | 5 | OPS-01 | T-04-12/13/14 | Release/volume/TLS/update/fence e rollback sem perda | integration | `mise exec node@24.21.0 -- node --test dist/test/deploy.test.js dist/test/boot-control.test.js` | Sim | green |
| 04-05-02 | 04-05 | 5 | OPS-01/02/03 | T-04-12/13/14 | VPS/migrate/update/agenda/offsite reais e origem parada | real acceptance | `mise exec node@24.21.0 -- node scripts/phase4-deploy.mjs --mode migrate && mise exec node@24.21.0 -- node scripts/phase4-deploy.mjs --mode update` | Sim | green |
| 04-06-01 | 04-06 | 6 | OPS-01/02/03/04 | T-04-15/16/17 | Live run/gates individuais, stale/synthetic/loopback recusados | verifier integration | `mise exec node@24.21.0 -- node --test dist/test/operation-acceptance.test.js` | Sim | green |
| 04-06-02 | 04-06 | 6 | OPS-01/02/03/04 | T-04-15/16/17 | Site/Codex permanente e restore por key independente, config/cleanup | real acceptance | Invocador operacional privado executado com Node24 → `runAcceptance({configFile,caseFile,withRestoredBackend})` | Sim | green-real |

Comandos de arquivos novos somente depois de criar/compilar as dependências Wave0; cada PLAN inclui fails_when observável. Os nomes propostos podem ser ajustados pelo planejador a um contrato menor e completo.

## Wave 0 Requirements

- [x] test/environment.test.ts — inventário/probes/capacidade/key, stale receipt e sanitização; 04-01-01.
- [x] test/transport.test.ts — regressão Origin403, Secure/CSRF, links HTTPS e spoofing.
- [x] test/operation.test.ts — mutex/stop/restart/update/retomada e conexões abertas.
- [x] test/offsite.test.ts — readback, criptografia/chave/parcial/reserva e último bom.
- [x] test/promotion.test.ts — gate fail-closed/handoff/clones offline e interrupções.
- [x] test/operation-acceptance.test.ts — driver/recibos e sanitização.
- [x] test/deploy.test.ts — dados fora do release, TLS/update/fence/rollback; 04-05-01.
- [x] Driver fase4 com modo self-test e modo real falhando quando ambiente/acesso faltar.
- Framework adicional: nenhum.

## Verifications on Real Environment

| Behavior | Requirement | Why real evidence is required | Instructions |
|---|---|---|---|
| VPS/domínio/proxy/supervisor/disco persistente | OPS-01 | Fixture local não identifica nem testa host permanente | Inventário privado; HTTPS/login/MCP/download e restart/update reais |
| Backup cifrado recuperado do destino externo com chave independente | OPS-02 | Arquivo na própria VPS não é proteção offsite | Transferir, recuperar e conferir hash/manifesto; chave fora da VPS |
| Restore limpo e offline | OPS-03 | Teste unitário não comprova recuperação do acervo real | Integridade SQL/FTS/contagens/IDs/todos originais; sem segundo coletor |
| Orçamento/contexto/arquivo/ZIP no site e Codex real e restore | OPS-04 | Metadados/URL/pareamento não são entrega | Caso privado conhecido, cliente atual e bytes/SQL/manifesto independentes |

Execução autônoma nos acessos disponíveis; intervenção humana só para dependência indisponível de fato. Validade da sessão WhatsApp é separada de recuperabilidade do acervo.

## Validation Sign-Off

- [x] Mapear cada tarefa real e Threat Ref aos PLANs.
- [x] Todas tarefas com automated verify/fails_when ou dependência Wave0.
- [x] Sem três tarefas consecutivas sem verificação automatizada.
- [x] Wave0 cobre arquivos faltantes; nenhum skip/watch no aceite real.
- [x] Foco com duração medida; suíte verde.
- [x] Evidência permanente/offsite/restore/Codex real concluída.
- [x] nyquist_compliant true após auditoria técnica e aceite real obrigatório.

**Approval:** evidência automatizada pronta; conclusão de fase/requisitos depende do verificador independente.

## Auditoria Nyquist técnica atual

Auditor especializado conferiu13 tarefas:12 cobertas originalmente e04-06-02 então parcial. O aceite atual completou a última tarefa:13/13 cobertas, zero lacunas novas de teste. Os sete arquivos Wave0 existem; a suíte315/315 não tem skips/falhas/cancelamentos/todo. Os negativos exercitam comportamento, incluindo publicação IPC sob pausa, GETs autenticados, testemunhas e bytes completos. Nenhuma operação real foi reexecutada pelo auditor.

O CLI `phase4-acceptance.mjs --mode real-operation` sozinho recusa sem callback operacional. O invocador privado prepara/configura um callback bounded para clone offline temporário pelo mesmo HTTPS, coordenando locks/timer e restauração do backend. A localização e configuração ficam no handoff privado, fora do Git. Existência do invocador não produz gate. A tarefa04-06-02 só fica green com seu recibo vivo final e cleanup observado.

O recibo atual passou26/26 gates vivos com status0 da unidade, Chrome/Codex nos dois backends, restore integral de910 originais, cleanup/perfil e timer preservados. OPS-01–04 permanecem Pending nos requisitos até o verificador independente; nyquist_compliant é true pela cobertura e evidência atuais. Revisão clean e18/18 mitigações ASVS1 verificadas são evidências independentes, sem substituir o cliente real. Detalhes sanitizados e limites constam em04-ACCEPTANCE.md; os valores estáticos edgeProbes unresolved permanecem explícitos.

## Validation Audit 2026-10-13

| Metric | Count |
|---|---|
| Tasks total | 13 |
| Covered | 13 |
| Real acceptance pending | 0 |
| New test gaps | 0 |

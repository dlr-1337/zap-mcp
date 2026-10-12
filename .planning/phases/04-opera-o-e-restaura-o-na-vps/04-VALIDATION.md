---
phase: "04"
slug: "opera-o-e-restaura-o-na-vps"
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| Estimated runtime | Foco existente medido 9,26s após build; novos focos e suíte completa a medir |

## Sampling Rate

- Após commit de tarefa: build e teste afetado; main/auth/MCP exigem foco de transporte.
- Após wave: suíte completa e self-test do driver correspondente.
- Antes do aceite/verificação: suíte verde, negativos de privacidade, implantação real e restore recuperado do destino externo.
- Objetivo de feedback focal: abaixo de30s com fake clock/adapters; duração medida na execução, sem watch nem skip de acesso real.

## Per-Task Verification Map

IDs/propriedade de ameaças serão alinhados aos PLANs pelo planejador.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|---|
| Atribuir ao plano de transporte | A definir | 1 | OPS-01 | A atribuir | HTTPS/Host/Origin/forwarded confiável, cookie Secure e CSRF | integration | `mise exec node@24.21.0 -- node --test dist/test/transport.test.js` | Não — W0 | pending |
| Atribuir ao plano operacional | A definir | A definir | OPS-01 | A atribuir | Persistência, stop/start/update, leitura sem coletor | integration | `mise exec node@24.21.0 -- node --test dist/test/operation.test.js` | Não — W0 | pending |
| Atribuir ao plano offsite | A definir | A definir | OPS-02 | A atribuir | Cópia cifrada recuperada, chave independente, parcial/ENOSPC preserva último bom | integration | `mise exec node@24.21.0 -- node --test dist/test/offsite.test.js` | Não — W0 | pending |
| Atribuir ao plano promoção/restore | A definir | A definir | OPS-03 | A atribuir | Clone offline e handoff com origem parada | integration | `mise exec node@24.21.0 -- node --test dist/test/promotion.test.js dist/test/backup.test.js` | Promotion não — W0; backup sim | pending |
| Atribuir ao plano aceite | A definir | A definir | OPS-04 | A atribuir | Recibo novo com TLS/cliente/site/SQL/FTS/ZIP/bytes; stale/sintético não passa | verifier unit | `mise exec node@24.21.0 -- node --test dist/test/operation-acceptance.test.js` | Não — W0 | pending |

Comandos de arquivos novos somente depois de criar/compilar as dependências Wave0; cada PLAN inclui fails_when observável. Os nomes propostos podem ser ajustados pelo planejador a um contrato menor e completo.

## Wave 0 Requirements

- [ ] test/transport.test.ts — regressão Origin403, Secure/CSRF, links HTTPS e spoofing.
- [ ] test/operation.test.ts — mutex/stop/restart/update/retomada e conexões abertas.
- [ ] test/offsite.test.ts — readback, criptografia/chave/parcial/reserva e último bom.
- [ ] test/promotion.test.ts — gate fail-closed/handoff/clones offline e interrupções.
- [ ] test/operation-acceptance.test.ts — driver/recibos e sanitização.
- [ ] Driver fase4 com modo self-test e modo real falhando quando ambiente/acesso faltar.
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

- [ ] Mapear cada tarefa real e Threat Ref aos PLANs.
- [ ] Todas tarefas com automated verify/fails_when ou dependência Wave0.
- [ ] Sem três tarefas consecutivas sem verificação automatizada.
- [ ] Wave0 cobre arquivos faltantes; nenhum skip/watch no aceite real.
- [ ] Foco com duração medida; suíte verde.
- [ ] Evidência permanente/offsite/restore/Codex real concluída.
- [ ] nyquist_compliant true somente após auditoria/evidência.

**Approval:** pending

---
phase: "04"
slug: "opera-o-e-restaura-o-na-vps"
status: verified
threats_open: 0
threats_total: 18
threats_closed: 18
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-10-13"
---

# Fase04 — Segurança

Verificação ASVS1 das mitigações declaradas nos seis planos, por gsd-security-auditor especializado, somente leitura. Este relatório verifica implementação e testes; não encerra OPS-01–04 nem substitui o aceite operacional real.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|---|---|---|
| Internet → interfaces privadas | Proxy identificado e autenticação antes dos dados | Sessão web e bearer MCP separados |
| Fonte → destino | Fence, coletor único e promoção vinculada ao perfil | Banco, originais e estado WhatsApp privados |
| VPS → cópia externa | Cifra, chave independente e readback por ID | Snapshot privado e recibo sanitizado |
| Dados de conversa → Codex/relatórios | Conteúdo não confiável; tools somente leitura | DTOs permitidos, sem credenciais/envelopes brutos |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|---|---|---|---|---|---|---|
| T-04-01 | Information disclosure | Inventário e stdout | high | mitigate | Allowlist/redaction em scripts/phase4-environment.mjs; sentinelas em test/environment.test.ts. | closed |
| T-04-02 | Spoofing | Identidade e readiness | high | mitigate | Host key fixada, identidade e re-probe atual em scripts/phase4-environment.mjs; negativos de identidade/deadline. | closed |
| T-04-03 | Spoofing | Proxy e transporte | high | mitigate | Peer/Host/Proto/Origin/duplicados em src/transport.ts; guard inicial em src/main.ts; matriz test/transport.test.ts. | closed |
| T-04-04 | Tampering | Autenticação e logout | high | mitigate | CSRF canônico, geração/revogação e cookie Secure em src/auth.ts e src/main.ts; negativos de transporte. | closed |
| T-04-05 | Information disclosure | MCP e streams | high | mitigate | Bearer exclusivo, URL canônica e revogação durante write/end em src/mcp.ts; testes de links/revogação. | closed |
| T-04-06 | Denial of service | Shutdown e operações | high | mitigate | Prazos, idempotência, finally e recovery em src/operation.ts e src/main.ts; test/operation.test.ts. | closed |
| T-04-07 | Tampering | Coletor único | high | mitigate | Mutex, fence atual/durável e permit antes do socket em src/promotion.ts e src/whatsapp.ts; zero sockets nos negativos. | closed |
| T-04-08 | Elevation of privilege | Promoção | high | mitigate | HMAC/profile/path/manifest/generation e estado committed em src/promotion.ts e src/backup.ts; replay/adulteração/crash. | closed |
| T-04-09 | Tampering | Cópia externa | high | mitigate | ID específico, readback/hash/decrypt/SQL e ACK antes de sucesso em src/offsite.ts; preservação do último bom. | closed |
| T-04-10 | Information disclosure | Chave e estado | high | mitigate | age por descritor privado, arquivos restritos e status allowlisted em src/offsite.ts; chave independente em scripts/phase4-acceptance.mjs. | closed |
| T-04-11 | Denial of service | Capacidade e backup | high | mitigate | Capacidade antes do stop, publicação exclusiva, retomada e prazos em src/offsite.ts; ENOSPC/deadlines em test/offsite.test.ts. | closed |
| T-04-12 | Information disclosure | Backend e volumes | high | mitigate | UID/binds/origem/peers e ausência de portas publicadas em ops/zap-container-control.mjs e ops/compose.example.yml; negativos de deploy. | closed |
| T-04-13 | Tampering | Update e rollback | high | mitigate | Backup anterior, baseline atual, schema compatível e rollback apenas de código em scripts/phase4-deploy.mjs; preservação/recusas. | closed |
| T-04-14 | Elevation of privilege | Autostart e handoff | high | mitigate | Probes atuais e source fenced em scripts/phase4-deploy.mjs; job/estado/caller ancestral em ops/zap-container-control.mjs e test/boot-control.test.ts. | closed |
| T-04-15 | Repudiation | Aceite fabricado | high | mitigate | WeakSet/WeakMap e todos gates atuais em scripts/phase4-acceptance.mjs; replay, gate removido, negociação e entrega forjada recusados. | closed |
| T-04-16 | Information disclosure | Recibos e transcripts | high | mitigate | Allowlist pública e transcript exclusivo privado em scripts/phase4-acceptance.mjs e scripts/phase3-acceptance.mjs; sentinelas. | closed |
| T-04-17 | Tampering | Cliente e clone | high | mitigate | Setup privado auditado: backup, merge scoped, preservação e rollback do TOML; helper valida arquivo de token. Clone offline, cleanup e testemunhas em scripts/phase4-acceptance.mjs; test/readonly.test.ts. | closed |
| T-04-SC | Tampering | Dependências | high | mitigate | Pins/lock sem mudança nesta fase; registry/SRI verificados antes de npm ci por ops/verify-dependencies.mjs e Dockerfile; age oficial verificado e versão exigida. | closed |

T-04-SC foi consolidada a partir dos seis planos, conservando todas as exigências. As flags private-network-bind, bounded-host-root-control e host-pid-and-identity estão cobertas pelo registro; nenhuma flag sem correspondência.

## Accepted Risks Log

Nenhum risco aceito. Todas as disposições são mitigate.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|---|---|---|---|---|
| 2026-10-13 | 18 | 18 | 0 | gsd-security-auditor |

## Limites e evidências

A suíte existente passou311/311, sem falhas, cancelamentos, skips ou todo; o auditor conferiu o resumo e não repetiu operações reais. A revisão de código está clean, incluindo a correção da publicação IPC com teste de pausa controlada. O setup privado do cliente foi lido sem execução, sem abrir configuração pessoal, conversas ou credenciais. Seus ponteiros completos permanecem privados.

A rodada final de implantação/cliente/restauração continua em execução. Nenhum marcador ou relatório desserializado confere gates OPS; o driver requer efeitos atuais e cleanup observado.

## Sign-Off

- [x] Todas as ameaças têm disposição e mitigação verificada em ASVS1.
- [x] Nenhum risco aceito.
- [x] threats_open:0 confirmado.
- [x] status:verified.

**Verificação:** 2026-10-13 — mitigações presentes; aceite operacional independente.

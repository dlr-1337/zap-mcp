---
phase: "03"
slug: "consulta-e-arquivos-reais-no-codex"
status: verified
threats_open: 0
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
created: "2026-10-12"
---

# Fase03 — Segurança

Auditoria e reauditoria independentes do registro planejado:13/13mitigações fechadas e zero ameaças abertas. Nenhum risco aceito automaticamente. A correção atual de T-03-SC preserva o desvio histórico da instalação original.

## Trust Boundaries

Codex→HTTP/MCP; MCP→arquivo/binário; CLI→auth/config; argumentos→snapshots; dados/contexto→consumo; acervo/evidência privada→recibo público. Somente o coletor original acessa sessão/socket WhatsApp.

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|---|---|---|---|---|---|---|
| T-03-01 | Spoofing | /mcp e download | high | mitigate | Bearer antes de parsing/cookie; Host/Origin e TLS real; src/mcp.ts:70,src/main.ts:51/56,test/mcp.test.ts:538 | closed |
| T-03-02 | Information disclosure | buffer/stream | high | mitigate | Gate por consumo/write/end e fd; src/mcp.ts:57/80/230,src/media.ts:88,test/mcp.test.ts:39/72/89 | closed |
| T-03-03 | Tampering | original e ID | high | mitigate | ID fechado/O_NOFOLLOW/tamanho/SHA; src/media.ts:50/65,test/mcp.test.ts:54/97/532 | closed |
| T-03-04 | Elevation of privilege | tool/socket | high | mitigate | Adapter sem socket, quatro registros fixos, allowlist e spies zero; src/mcp.ts:62/148/166/174/213,test/readonly.test.ts:16/34/36 | closed |
| T-03-05 | Tampering | cursor/filtros | high | mitigate | HMAC/operação/geração/filtro/TTL e namespace; src/mcp.ts:105,src/archive.ts:422,test/mcp.test.ts:388 | closed |
| T-03-06 | Denial of service | consulta/payload | medium | mitigate | Schemas/corpo/args/envelope/quotas e DTO inteiro; src/mcp.ts:13/17/96/129/203,src/archive.ts:426,test/mcp.test.ts:202/365/409/449 | closed |
| T-03-07 | Information disclosure | snapshot/requests concorrentes | high | mitigate | Closure request-local/namespace/gate no consumo; src/mcp.ts:65/76/139/169,test/mcp.test.ts:427/463/474 | closed |
| T-03-08 | Information disclosure | contexto bufferizado | high | mitigate | Âncora/referências no gate e projeção atual; src/mcp.ts:206,src/archive.ts:366/487,test/mcp.test.ts:327/345 | closed |
| T-03-09 | Elevation of privilege | payload/tool dispatch | high | mitigate | Instruções fixas/DTO como dados/allowlist; src/mcp.ts:18/147,test/mcp.test.ts:305,test/readonly.test.ts:37 | closed |
| T-03-10 | Tampering | contexto/cursor | medium | mitigate | Referência/direção/sessão/TTL/ordinal e paridade; src/mcp.ts:174,src/archive.ts:478,test/mcp.test.ts:223/273 e SQL/site real | closed |
| T-03-11 | Information disclosure | recibos/config/diff | high | mitigate | Whitelist/diretórios0700/arquivos0600/config/cleanup; scripts/phase3-acceptance.mjs:21/38/101/233/236/241,test/mcp-acceptance.test.ts:47 | closed |
| T-03-12 | Repudiation | falso aceite/recibo replay | medium | mitigate | Run atual/calls/canal/destinos/oráculos; scripts/phase3-acceptance.mjs:19/24/107/153/176/224,test/mcp-acceptance.test.ts:25/29/40 | closed |
| T-03-SC | Tampering | npm installs | high | mitigate | Desvio de ordem original preservado; mitigação corretiva reauditoria1586/1586arquivos iguais ao registry/stage/projeto,0vulnerabilidades,controles antes do ciisolado/scriptsdesabilitados:03-DEPENDENCY-REVALIDATION.md | closed |

## Accepted Risks Log

Nenhum risco aceito. A limitação HTTPS do login do site está registrada parafase4/WINDOWS13; não altera a prova TLS do MCP e dos originais.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|---|---|---|---|---|
| 2026-10-12 | 13 | 12 | 1 | gsd-security-auditor |

O auditor inspecionou código/testes, histórico seletivo de instalação, prova/transcripts privados e recalculou SHA/tamanho dos dois destinos/originais. Confirmou12calls completas/correlacionadas,13resultados/20referências,0outros MCP/1helper,2GETs completos,artefatos0600/diretório0700 e token removido. Regressão independente177/177,zero fail/cancel/skip/todo. Interrupção/restrição/concorrência são fixtures; operaçãoVPS não foi verificada. Não repetiu testes/aceite nem escreveu fonte.

## Sign-Off

- [x] Todas13ameaças têm disposição mitigate, T-03-SC deduplicada.
- [x] Nenhum risco aceito automaticamente.
- [x] threats_open:0 após reauditoria corretiva independente de T-03-SC.

**Approval:** segurança verificada em2026-10-12;13/13fechadas,zero open/below-threshold. Veredito final do objetivo ainda cabe ao verificador.

## Reauditoria corretiva T-03-SC

O gsd-security-auditor recalculou SHA512 dos6tarballs e comparou1586/1586arquivos regulares com stage e pacotes ativos, todos iguais. Conferiu registry/repositórios/pins/manifestos/grafo e ausência de lifecycle; confirmou a ordem preventiva da nova instalação isolada com scriptsdesabilitados e audit0/smokeexit0. Somente documentos mudaram, portanto as12closures anteriores foram preservadas. T-03-SC fechou pela correção verificável do estado atual, sem alegar conformidade da instalação original nem aceitar risco automaticamente. Futuras atualizações exigem nova conferência preventiva.

## Security Audit 2026-10-12

| Metric | Count |
|---|---|
| Threats found | 13 |
| Closed | 13 |
| Open | 0 |

## Seguimento da revisão de código

WR-01/WR-02 corrigem a recuperação do roteiro: subprocesso aguarda close e grupoLinux TERM→KILL, setup/cleanup cobre todos recursos e restaura somente após primeira mutação. Adapter/Archive/auth/mídia/dependências ativos não foram alterados. Os controles e a prova integrada já auditados permanecem válidos; regressão e tracer atualizado passaram. T-03-11/T-03-12 ganham as regressões documentadas em03-REVIEW-FIX.md, sem nova aceitação de risco ou reescrita do histórico.

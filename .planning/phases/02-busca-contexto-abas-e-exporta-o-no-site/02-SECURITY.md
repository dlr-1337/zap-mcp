---
phase: "02"
status: verified
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
threats_total: 23
threat_occurrences: 27
threats_closed: 23
threats_open: 0
unregistered_flag: 0
audited: "2026-10-11"
---
# Phase 2 — Security Verification

Auditoria independente `gsd-security-auditor` dos registros planejados; 23 IDs únicos/27 ocorrências, 19 high e quatro medium, todos mitigate/CLOSED. Evidência localizada no código e assertions executadas no log dist/02-05-full-tests.log: 130/130 pass, zero fail/skip/todo. Não é certificação ASVS nem varredura exaustiva de ameaças novas.

## Trust Boundaries
| Boundary | Control |
|---|---|
| Browser/HTTP/private archive | Owner session, CSRF, HMAC scope, sanitized DTO and textContent |
| Archive/files/ZIP | Internal IDs, verified fd, frozen evidence, CRC/SHA, private derived storage |
| Collector/read surfaces | Local archive only; no send/edit/delete/markRead calls |
| Private acceptance/public report | 0700/0600 private proof; aggregates only in Git |

## Threat Register
| Threat ID | Category | Component | Severity | Disposition | Mitigation/Evidence | Status |
|---|---|---|---|---|---|---|
| T-02-01 | Tampering | search/cursor | high | mitigate | src/archive.ts:417; src/main.ts:102; test/search.test.ts:111 | closed |
| T-02-02 | Information Disclosure | search/candidates | high | mitigate | src/main.ts:64; src/archive.ts:357; test/search.test.ts:125 | closed |
| T-02-03 | Tampering | FTS/revisions/snapshot | high | mitigate | src/archive.ts:385; test/search.test.ts:30 | closed |
| T-02-04 | Denial of Service | snapshot limits | medium | mitigate | src/archive.ts:26; test/search.test.ts:146 | closed |
| T-02-05 | Elevation of Privilege | DOM received content | high | mitigate | public/app.js:175; test/ui.test.ts:247 | closed |
| T-02-06 | Information Disclosure | context/snapshot/redirect | high | mitigate | src/main.ts:66; src/archive.ts:448; test/context.test.ts:46 | closed |
| T-02-07 | Information Disclosure | tabs/races/restored page | high | mitigate | public/app.js:362; src/auth.ts:20; test/ui.test.ts:175 | closed |
| T-02-08 | Tampering | bidirectional cursors | high | mitigate | src/main.ts:161; src/archive.ts:467; test/context.test.ts:77 | closed |
| T-02-09 | Information Disclosure | browser storage | high | mitigate | public/app.js:9; test/ui.test.ts:193 | closed |
| T-02-10 | Elevation of Privilege | MIME preview | high | mitigate | src/media.ts:77; test/preview.test.ts:55 | closed |
| T-02-11 | Information Disclosure | preview GET/HEAD/Range | high | mitigate | src/main.ts:67; test/security.test.ts:54 | closed |
| T-02-12 | Information Disclosure | paths/symlinks/original | high | mitigate | src/media.ts:15; src/main.ts:85; test/preview.test.ts:70 | closed |
| T-02-13 | Denial of Service | streams/Range/resources | medium | mitigate | src/main.ts:77; src/media.ts:78; test/preview.test.ts:86 | closed |
| T-02-14 | Spoofing | exports CSRF/session | high | mitigate | src/auth.ts:64; src/main.ts:68; src/export.ts:104; test/security.test.ts:62 | closed |
| T-02-15 | Information Disclosure | ZIP/archive paths | high | mitigate | src/archive.ts:478; src/export.ts:61; test/export.test.ts:86 | closed |
| T-02-16 | Tampering | frozen selection/manifest/ZIP | high | mitigate | src/export.ts:27; src/export.ts:125; test/export.test.ts:113 | closed |
| T-02-17 | Denial of Service | jobs/disk/derived files | high | mitigate | src/export.ts:50; src/export.ts:130; test/export.test.ts:143 | closed |
| T-02-18 | Repudiation | exported evidence | medium | mitigate | src/archive.ts:363; src/export.ts:76; test/export.test.ts:86 | closed |
| T-02-19 | Information Disclosure | private acceptance evidence | high | mitigate | scripts/phase2-acceptance.mjs:159; test/security.test.ts:44 | closed |
| T-02-20 | Tampering | acceptance oracle | high | mitigate | scripts/phase2-acceptance.mjs:52; test/acceptance.test.ts:34 | closed |
| T-02-21 | Denial of Service | real profile/restore | high | mitigate | scripts/phase2-acceptance.mjs:123; src/backup.ts:229; test/acceptance.test.ts:25 | closed |
| T-02-22 | Repudiation | coverage/acceptance | medium | mitigate | scripts/phase2-acceptance.mjs:164; test/acceptance.test.ts:15 | closed |
| T-02-SC | Tampering | pinned npm supply chain | high | mitigate | package.json; package-lock.json; 02-DEPENDENCY-VERIFICATION.json | closed |

## Accepted Risks Log
Nenhuma disposição accept ou transfer foi usada para fechar os registros.

## Evidence and Limits
- Autenticação anterior a consulta/ID/HEAD/Range; CSRF/Origin na criação de ZIP; recortes/cursores/jobs vinculados à sessão/geração; no-store e erros sanitizados.
- Índice e DTOs de evidência sanitizada, texto DOM sem execução, MIME/assinatura permitidos, descritor verificado e paths por IDs internos.
- Freeze integral de recorte; ZIP relido com unicidade/conjunto/tamanho/CRC/SHA antes de ready; jobs interrompidos falham e limpeza remove somente derivados.
- Testes de somente leitura mantêm zero envio/edição/exclusão/markRead. Site e exportação operam sobre o acervo offline.
- P-02-01..07 têm enforcement localizado em search/ui/preview/export/acceptance tests e roteiro; o verificador final registra sua disposição canônica.
- T-02-SC: cinco pins/origens/integridades instalados coincidem com o registry oficial na conferência atual. O artefato 02-DEPENDENCY-VERIFICATION.json não comprova independentemente o instante da revalidação pré-instalação; esse limite permanece explícito.
- SUMMARYs não incluem heading literal Threat Flags, mas suas seções de desvios/stubs/self-check foram auditadas; nenhuma superfície sem registro encontrada. /api/exports/period está coberta por T-02-14.
- Conexão atual da fonte WhatsApp não confirmada após reinício; senha preservada, sem sessão web válida para status autenticado. Consulta real/cópia offline e serviço local atualizado foram comprovados. MCP/VPS/histórico integral não são evidência desta auditoria.

## Security Audit 2026-10-12

| Metric | Count |
|---|---|
| Threats found | 23 |
| Closed | 23 |
| Open | 0 |

## Sign-Off
- [x] All planned threats mitigate/closed with concrete code/test evidence.
- [x] No accepted/transfer risks; threats_open: 0.
- [x] status: verified; independent ASVS L1 planned-register audit completed.
**Approval:** verified 2026-10-11 within the stated scope.

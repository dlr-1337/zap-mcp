---
phase: "02"
status: verified
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
threats_total: 26
threat_occurrences: 31
threats_closed: 26
threats_open: 0
unregistered_flag: 0
audited: "2026-10-12"
---
# Phase 2 — Security Verification

Auditoria independente `gsd-security-auditor` dos registros planejados; 23 IDs únicos/27 ocorrências, 19 high e quatro medium, todos mitigate/CLOSED após a reverificação incremental abaixo. A auditoria inicial usou dist/02-05-full-tests.log: 130/130 pass. A suíte final integrada passou 143/143, zero fail/cancelled/skip/todo, em38,366s. Não é certificação ASVS nem varredura exaustiva de ameaças novas.

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
| T-02-12 | Information Disclosure | paths/symlinks/original | high | mitigate | src/media.ts:77; src/archive.ts:361; test/preview.test.ts:68 e84; CR-04/reteste buffer e HTTP com/sem notificação | closed |
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

| T-02-23 | Denial of Service | sticky tabs/long text | medium | mitigate | public/style.css:48–51; test/ui.test.ts:352–404; UI19/19, full144/144; altura/Fechar/rolagem local/âncora | closed |
| T-02-24 | Tampering | native scroll oracle | medium | mitigate | test/ui.test.ts:329–335 e352–404; RED5aa736f/GREENcbbac69; CUA físicaA/Bdelta0 no02-06-SUMMARY | closed |
| T-02-25 | Information Disclosure | private CUA/report | high | mitigate | 02-06-SUMMARY/02-UAT só agregados; prova0600foraGit, logout limpo, helper fechado com snapshot/senha preservados | closed |

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

## Reabertura incremental — 2026-10-12

A aprovação acima é histórica. Auditoria independente do delta confirmou CR-04/T-02-12: `streamVerifiedAttachment` verificava antes de preencher o buffer, mas não ao consumi-lo. Probe sem dados privados reteve `drain`, aplicou a restrição e observou outra escrita HTTP. O gate foi reaberto durante a correção.

`1a5b7c8` adicionou guarda ao consumo e cancelamento por `archive.onChange`, com remoção da inscrição e um único dono do fd. Auditor independente repetiu dois probes com e sem notificação: **4/4 PASS**, buffer62.292→zero bytes entregues após a restrição; HTTP reteve45.645 bytes e manteve somente a escrita anterior, sem escrita futura. Fd fechado/inscrição removida em todos os casos; destroy repetido não fechou descritor reaproveitado. T-02-12 está novamente CLOSED. O arquivo primário permanece preservado; bytes já entregues não podem ser recolhidos.

Delta também confirmou guarda de ZIP aberto (`src/export.ts:155`, `test/export.test.ts:103 e138`), requestId restrito à sessão/recorte/CSRF (`src/main.ts`, `test/security.test.ts:74`) e resolução de aliases sem mudar a seleção congelada (`test/export.test.ts:200`). Retomada de página é exercitada em `test/ui.test.ts:42`; texto/DTOs e evidências restritas têm gate compartilhado em `src/archive.ts:361`. Os controles das sete proibições continuam presentes; a disposição canônica pertence ao verificador.

Suíte final integrada em Node24.21.0:143/143,0fail/cancelled/skip/todo,38.366,233ms. Log ignorado `dist/02-final-tests.log`, SHA256 `e44473cc9da55c2abc3bc2d69b5fe0a11f3b3fff7ba1bae8562ba2f134ae6f7d`. A suíte inclui os testes da Phase1; o diagnóstico e a correção da simulação de fd e do encerramento dos navegadores estão preservados nos relatórios de correção. A auditoria delta não executou novamente a suíte inteira nem o aceite real. Nenhuma certificação, implantação ou ampliação de escopo foi feita.

## Classificação incremental L1 do plano02-06 — 2026-10-12

Orquestrador conferiu os três novos IDs e a repetiçãoT-02-SC contra fonte, assertions, log144/144 e provaCUA/closed.json sanitizada:26IDs únicos/31ocorrências,20high/6medium, todosmitigate/CLOSED,0abertos. ASVSlevel1 confirmado por config; registro escrito noPLAN; short-circuit seguro do Step3secure-phase aplicado após classificação, sem nova auditoria independente ou certificação. Auditorias independentes anteriores permanecem históricas. Nenhuma dependência instalada, nova rota/schema/auth/estado persistido, arquivo primário ou coletor original alterado. Maior altura de mensagem exige alinhamento explícito block:start; guards/tickets e ausência de âncora preservados.

O deslocamento287px do caminho locator daCUA foi preservado como controle de ferramenta; clique físico visível restaurou0px nas duas direções. Causa interna da ferramenta e duas falhas I/O iniciais não confirmadas. Captura de encerramento contém somente login com senha vazia; nenhuma captura privada ou conteúdo/ID/cookie entrou noGit.

## Security Audit 2026-10-12

| Metric | Count |
|---|---|
| Threats found | 26 |
| Closed | 26 |
| Open | 0 |

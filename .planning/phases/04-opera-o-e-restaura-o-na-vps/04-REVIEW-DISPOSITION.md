---
phase: 04
review: 04-REVIEW.md
titles: json
findings:
  - id: CR-05
    severity: critical
    disposition: fixed
    title: "inspect-runtime aceita container que serve um perfil diferente do diretório anunciado"
  - id: CR-01
    severity: critical
    disposition: fixed
    title: "Falha transitória de cifragem impede todos os backups seguintes"
  - id: CR-02
    severity: critical
    disposition: fixed
    title: "Backup após update pode reiniciar silenciosamente a release anterior"
  - id: CR-03
    severity: critical
    disposition: fixed
    title: "Recovery exige HTTPS saudável antes de restaurar o código"
  - id: CR-04
    severity: critical
    disposition: fixed
    title: "Deployment pode controlar um perfil diferente do volume que verificou"
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Estado offsite inválido retém o mutex adquirido"
open: 0
total: 6
recorded: 2026-10-13T03:51:27.393Z
---

# Phase 04: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-05 | critical | fixed | 04-REVIEW-FIX.md (not in the current review) |
| CR-01 | critical | fixed | 04-REVIEW-FIX.iter3.md (not in the current review) |
| CR-02 | critical | fixed | 04-REVIEW-FIX.iter3.md (not in the current review) |
| CR-03 | critical | fixed | 04-REVIEW-FIX.iter3.md (not in the current review) |
| CR-04 | critical | fixed | 04-REVIEW-FIX.iter3.md (not in the current review) |
| WR-01 | warning | fixed | 04-REVIEW-FIX.iter3.md (not in the current review) |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.

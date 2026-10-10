---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 6
total_count: 6
last_updated: 2026-10-10T22:23:17.496Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 1 | deviation | src/media.ts |  | Publicação exclusiva por hardlink/unlink substitui rename que pode sobrescrever final; verificado por crash e hashes | fixed |  | 2026-10-10T21:45:03.523Z | 2026-10-10T21:45:19.278Z |
| 2 | 1 | deviation | src/whatsapp.ts |  | rc14 ignora AbortSignal e não renova Boom404; dispatcher privado e fallback seguro são necessários e testados | fixed |  | 2026-10-10T21:45:19.375Z | 2026-10-10T21:45:19.485Z |
| 3 | 1 | deviation | test/archive.test.ts |  | Assert de versão atual ajustado de4 para5 após migração aditiva de mídia; teste de preservação passou | fixed |  | 2026-10-10T21:45:19.585Z | 2026-10-10T21:45:19.683Z |
| 4 | 1 | deviation | src/auth.ts |  | QR assíncrono revalida TTL e revogação pelo SQLiteStore antes de responder; teste HTTP passou | fixed |  | 2026-10-10T22:01:44.544Z | 2026-10-10T22:01:44.736Z |
| 5 | 1 | deviation | src/main.ts |  | DTO da lista preserva proteção de identificadores legados privados e expõe somente PN/LID/grupo recebido; teste antigo passou | fixed |  | 2026-10-10T22:01:44.911Z | 2026-10-10T22:01:45.042Z |
| 6 | 1 | deviation | src/media.ts |  | Suite paralela apresentou retry_wait inesperado em original válido (58/59); reserva de job com tamanho desconhecido sob filesystem compartilhado requer revisão fora de01-06. | fixed |  | 2026-10-10T22:20:11.110Z | 2026-10-10T22:23:17.496Z |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "1",
    "file": "src/media.ts",
    "line": null,
    "description": "Publicação exclusiva por hardlink/unlink substitui rename que pode sobrescrever final; verificado por crash e hashes",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-10T21:45:03.523Z",
    "resolved_at": "2026-10-10T21:45:19.278Z",
    "milestone": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "1",
    "file": "src/whatsapp.ts",
    "line": null,
    "description": "rc14 ignora AbortSignal e não renova Boom404; dispatcher privado e fallback seguro são necessários e testados",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-10T21:45:19.375Z",
    "resolved_at": "2026-10-10T21:45:19.485Z",
    "milestone": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "1",
    "file": "test/archive.test.ts",
    "line": null,
    "description": "Assert de versão atual ajustado de4 para5 após migração aditiva de mídia; teste de preservação passou",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-10T21:45:19.585Z",
    "resolved_at": "2026-10-10T21:45:19.683Z",
    "milestone": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "1",
    "file": "src/auth.ts",
    "line": null,
    "description": "QR assíncrono revalida TTL e revogação pelo SQLiteStore antes de responder; teste HTTP passou",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-10T22:01:44.544Z",
    "resolved_at": "2026-10-10T22:01:44.736Z",
    "milestone": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "1",
    "file": "src/main.ts",
    "line": null,
    "description": "DTO da lista preserva proteção de identificadores legados privados e expõe somente PN/LID/grupo recebido; teste antigo passou",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-10T22:01:44.911Z",
    "resolved_at": "2026-10-10T22:01:45.042Z",
    "milestone": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "1",
    "file": "src/media.ts",
    "line": null,
    "description": "Suite paralela apresentou retry_wait inesperado em original válido (58/59); reserva de job com tamanho desconhecido sob filesystem compartilhado requer revisão fora de01-06.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-10-10T22:20:11.110Z",
    "resolved_at": "2026-10-10T22:23:17.496Z",
    "milestone": null
  }
]
````

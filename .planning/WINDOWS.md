---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 3
total_count: 3
last_updated: 2026-10-10T21:45:19.683Z
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
  }
]
````

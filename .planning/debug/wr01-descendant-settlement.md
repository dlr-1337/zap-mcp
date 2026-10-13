---
status: verifying
trigger: "WR-01 timeout espera close e encerra filho e descendente que ignoram TERM: full npm test Node24 failed196/197; descendant with independent pipes still executes when Promise settles, actualfalse expectedtrue."
created: 2026-10-12T21:24:04-03:00
updated: 2026-10-12T21:31:25-03:00
---

## Current Focus

hypothesis: close of a TERM-exiting parent precedes cessation of its independent-pipe descendant; signal SIGKILL is sent but termination is not awaited
bug_class: concurrency
test: run the existing focused WR-01 and observe state immediately after settlement and after a scheduler yield
expecting: independent-pipe case may expose state R/S immediately after kill while inherited-pipe case waits for close via open pipes
next_action: parent runs the full Node24 npm test once on the committed fix, then resumes the Phase4 gate if green; archive only after final acceptance
candidate_causes:
  - code: driver resolves close before a descendant has ceased execution
  - code: test mistakes a zombie process for an executing descendant
  - environment: parallel-suite scheduling reveals an existing race
  - config: timeout or grace changes alter the termination window
and_gate: no; missing descendant termination synchronization is sufficient; scheduler timing only decides whether the race is observable
reasoning_checkpoint:
  hypothesis: runCodex rejects too early because SIGKILL transmission is mistaken for completed group termination when only the parent close is awaited
  confirming_evidence:
    - unmodified focused WR-01 failed 2/10 without full-suite load
    - independent-pipe synthetic trace observed R with SIGKILL pending at settlement 9/30 times; even a single setImmediate sometimes retained R
  falsification_test: if driver already awaits every non-zombie member of the child's process group, a controlled live descendant stat must keep its Promise pending until that state becomes dead
  fix_rationale: observe the Linux process-group member state after SIGKILL and await its absence/dead state, preserving timeout failure and all original assertions
  blind_spots: Linux /proc must be readable; helpers deliberately escaping the process group and unkillable kernel tasks are outside the existing group contract; real Codex flow is not rerun for this failure-path change
  candidate_causes:
    - code: missing happens-before relation between group SIGKILL and settlement (confirmed)
    - environment: full-suite load (eliminated as required cause by focused failures)
    - data: zombie mistaken for running or faulty stat parse (eliminated by direct state R and explicit pending signal trace)
    - config: changed timeouts/grace (eliminated by unchanged driver history)
  and_gate: no; code ordering flaw alone permits failure on an idle machine

## Symptoms

expected: timeout settles only after the main child closes and TERM-resistant descendants cease execution
actual: full-suite WR-01 assertion reports descendant still executes when Promise settles
errors: "dist/test/mcp-acceptance.test.js:203: assertion actual false expected true; suite 196/197, zero cancelled/skipped/todo, 70.466s"
reproduction: Node24 full npm test after Phase4 04-01; synthetic WR-01 fixture
started: previously positive CI; latest 04-01 changes limited to environment report script/tests/ops README, outside driver

## Eliminated

- hypothesis: failure requires concurrent full-suite workload or Phase4 environment code
  evidence: unchanged focused WR-01 failed 2/10 with no other suite running
  timestamp: 2026-10-12T21:31:25-03:00
- hypothesis: assertion mistakenly rejects a zombie that cannot execute
  evidence: independent trace reads state R with SIGKILL pending at settlement, not Z
  timestamp: 2026-10-12T21:31:25-03:00

## Evidence

- timestamp: 2026-10-12T21:24:04-03:00
  checked: delegation and initial workspace inventory
  found: clean Git status; existing unrelated debug report left untouched; parent authorizes only driver, MCP test and this scoped report
  implication: isolate investigation from ongoing Phase4 work and real runtime/account data
- timestamp: 2026-10-12T21:27:00-03:00
  checked: complete scripts/phase3-acceptance.mjs and test/mcp-acceptance.test.ts; call sites; package scripts
  found: runCodex emits SIGKILL and rejects synchronously in close handler; independent descendant ignores TERM, has no inherited pipes, and is checked immediately for absent/Z state
  implication: parent close provides no happens-before relation for descendant termination; need direct reproduction to distinguish true race from bad state oracle
- timestamp: 2026-10-12T21:27:00-03:00
  checked: phase-0 knowledge and skill discovery
  found: no project-local skills, no durable knowledge-base.md; installed runtime agent-skills query emitted agent profile without configured additional skill directives
  implication: no known WR-01 diagnosis; per-test coverage is unavailable, so SBFL is skipped; atomicity/order/deadlock checklist routes to ordering (no resource cycle or shared read-modify-write)
- timestamp: 2026-10-12T21:29:00-03:00
  checked: installed Node24.21.0 build and focused WR-01 repetition without source modifications
  found: build passes; first seven runs include two identical failures in independent-pipe assertion (runs 3 and 7)
  implication: issue reproduces without any full-suite load; no need to blame Phase4 environment or raise timeouts
- timestamp: 2026-10-12T21:31:25-03:00
  checked: independent-pipe real-process trace across 30 bounded runs; existing WR-01 history
  found: 9/30 settlements observe R with ShdPnd 0x100 immediately after group SIGKILL; some remain R after one setImmediate; previous a512a69 only adds synchronous group SIGKILL before rejecting on close
  implication: a one-turn yield is also insufficient; condition-based synchronization is required, not fixed delay or test retry
- timestamp: 2026-10-12T21:31:25-03:00
  checked: hardened WR-01 against unchanged driver after Node24 build
  found: deterministic RED exits 1 with Promise settled before descendant termination was observed; both real termination assertions and original timers/close assertions remain in the test
  implication: regression now proves synchronization instead of relying on scheduler luck; controlled stat includes spaces and closing parenthesis in comm to cover Linux parser boundary
- timestamp: 2026-10-12T21:31:25-03:00
  checked: minimal group wait, Node24 build, all MCP acceptance controls
  found: build exits0; mcp-acceptance passes11/11 with no fail/cancel/skip/todo; wait only applies to timed-out close and leaves the successful-call path unchanged
  implication: real inherited/independent-pipe fixtures and WR-02 cleanup remain valid; one full npm test is delegated to the parent after this scoped delivery
- timestamp: 2026-10-12T21:31:25-03:00
  checked: exact driver revert/reconfirm, fixed MCP import graph, ten repeated focused runs and scoped diff
  found: reverting only driver to HEAD makes hardened WR-01 fail deterministically; restoring fix passes46/46 (mcp-acceptance + mcp) and WR-01 passes10/10; diff-check passes; only authorized driver/test/report changed
  implication: synchronization is causal, adjacent functionality remains green, no retries/assertion weakening; full suite and real Codex/account are not claimed verified by this subagent
- timestamp: 2026-10-12T21:31:25-03:00
  checked: primary Node/Linux documentation and missing local recall tools
  found: Node close covers child exit and stdio closure; Linux kill sends a signal, proc stat exposes state and process group; mempalace/rr/Stryker are absent, with no debug KB to match
  implication: manual process tracing and revert/reconfirm provide bounded evidence; no new tooling or dependency installed
  sources: https://nodejs.org/docs/latest-v24.x/api/child_process.html#event-close ; https://man7.org/linux/man-pages/man2/kill.2.html ; https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html

## Resolution

root_cause: runCodex rejects on parent close immediately after SIGKILL without waiting for independently piped descendants in the process group to finish termination
oracle_type: specified (WR-01 termination contract; immediate absent/dead group state at settlement)
fix: after timeout SIGKILL, poll actual Linux process-group states until no running members remain; stop with explicit incomplete-shutdown error if the bounded 2s observation window expires; harden existing WR-01 with live/dead state barrier without weakening real process assertions
verification:
  target_test: { result: pass, controls: 11 }
  mutation_check: { result: skipped, reason_if_skipped: Stryker is not installed/configured; exact revert-and-reconfirm exercises removal of synchronization }
  no_op_deletion: { result: pass, deletion_justified_by_rca: false, evidence: original assertions preserved; synchronization added only to timeout failure path }
  adjacent_tests: { result: pass, suites_run: [mcp-acceptance.test, mcp.test], tests: 46, failed: 0, cancelled: 0, skipped: 0, todo: 0 }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true }
  stability: { result: pass, focused_runs: 10, failed: 0 }
  full_suite: { result: pending, responsibility: parent, reason: explicitly delegated for one post-commit run }
  guardrail_verdict: accepted
files_changed: [scripts/phase3-acceptance.mjs, test/mcp-acceptance.test.ts]

Commands (all via installed mise Node24.21.0):
- `mise exec node@24 -- npm run build`: exit0
- `mise exec node@24 -- node --test --test-name-pattern=WR-01 --test-reporter=tap dist/test/mcp-acceptance.test.js`: old original 2/10 failures; hardened regression RED before fix and again on exact revert
- `mise exec node@24 -- node --test --test-reporter=tap dist/test/mcp-acceptance.test.js`: fixed11/11
- `mise exec node@24 -- node --test --test-reporter=tap dist/test/mcp-acceptance.test.js dist/test/mcp.test.js`: fixed46/46
- bounded repeated focused runner (10 iterations, each subprocess timeout12s): fixed10/10
- `git diff --check`: exit0

---
status: awaiting_human_verify
trigger: "Phase 4 default suite: PN/LID attachment second cycle reconcile -> redownload -> drain -> stop reaches calls=4 but final attachment read fails ENOENT; focused media suite passes."
created: 2026-10-13T02:05:31Z
updated: 2026-10-13T02:17:23Z
---

## Current Focus

bug_class: concurrency
hypothesis: Two unknown-length downloads receive uneven reservations; first consumes the full initial spare capacity, second receives only a transient filesystem increase, and shrinking that increase zeros the second reservation and triggers ENOSPC while ample physical space remains.
test: Source-only revert/reapply, six driving/control cases, media/recovery 39/39, repeated driving sets 60/60 and default complete npm test 239/239 all verified.
expecting: Parent integrates the source correction into the ongoing phase-4 workflow and preserves the live-account acceptance boundary.
next_action: Hand off source commit f94b8236787c12bb87b615644ce69c5f76303cdf, private logs and this sanitized investigation record to the parent; archive only after required workflow confirmation, outside this owned-file task.
candidate_causes:
  - code: Worker drain/stop ordering may cancel a newly dispatched second-cycle download.
  - data: PN/LID rekey may preserve a wrong final storage locator or envelope reference.
  - environment: Heavy default-suite scheduling may expose a worker deadline rather than state loss.
and_gate: Yes: code insertion-order clamping plus environment free-space decline while two unknown-length jobs are admitted; no PN/LID defect is necessary.
reasoning_checkpoint:
  hypothesis: budget() protects the first unknown-length reservation at the expense of later reservations when free-space readings shrink, so a small normal disk change zeros the later reservation and falsely triggers ENOSPC.
  confirming_evidence:
    - Original PN/LID test with controlled readings reproduces the exact second-cycle calls=4 and ENOENT; both jobs have attempts=2, later reason is insufficient space, first is aborted.
    - Minimized non-PN/LID test reproduces retry_wait at declines of 4095/4096/4097 bytes with 1 GiB free on a 2 GiB filesystem; singleton and no-decline controls pass.
    - Second-cycle source-key assertions pass before the downloader returns; the two initial originals, merged revision and foreign keys remain correct before redownload.
  falsification_test: The diagnosis is false if proportional shrink still loses these files, alters known reservations, or permits writes exceeding the physical reserve in existing low-space tests.
  fix_rationale: Revoke unknown reservations proportionally from their remaining amounts instead of consuming the spare capacity in insertion order. Their sum remains bounded by available capacity, known commitments remain unchanged, and no allocation is increased.
  blind_spots: Real filesystem variation from the original suite was not recorded; the controlled schedule proves a matching mechanism but cannot establish the exact original fluctuation. The code continues its existing conservative admission policy for unknown sizes.
  candidate_causes:
    - code: Priority clamping starves later unknown-size reservations.
    - environment: Normal statfs free-space movement exposes the clamping defect.
    - data: Wrong PN/LID source keys are ruled out by direct assertions and non-PN/LID reproduction.
  and_gate: Yes; priority clamping plus a free-space drop. Two unknown-length jobs form the triggering input.

## Symptoms

expected: Two PN/LID attachments with distinct bytes remain available after second reconcile/redownload/drain/stop cycle.
actual: Default npm test reports 233/234 passing; legacy media test reaches four downloader calls but readFileSync then fails ENOENT. Focused suite reports 23/23 passing.
errors: ENOENT in test/media.test.ts:189.
reproduction: Standard npm test at inherited phase-4 HEAD 2a191a2, pinned Node 24.21.0; complete reproduction still required.
started: Observed by parent after phase 4 plan 04-04; prior baseline was 225/225.

## Eliminated

- hypothesis: Drain returns before admitted work finishes, or stop's cancellation is the primary cause.
  evidence: Deterministic run completes both run promises before stop; later job's reason is the ENOSPC budget rejection, which aborts the first. Stop runs after drain; active=0. Test elapsed ~42 ms, far below 120 seconds.
  timestamp: 2026-10-13T02:11:17Z

- hypothesis: PN/LID rekey loses attachment IDs or source locators.
  evidence: Exact original first cycle publishes both distinct originals and validates merged rows; second-cycle downloader source-key assertions pass. Two unrelated unknown-length messages reproduce the same failure without any identity merge.
  timestamp: 2026-10-13T02:11:17Z

## Evidence

- timestamp: 2026-10-13T02:05:31Z
  checked: Initial Git state, project instructions, debug recall and skills discovery.
  found: Working tree is clean. No project skill directories or knowledge-base.md exist. Prior resolved replay-conflict session concerns projection multiplicity, a different symptom. Systematic-debugging and Ponytail instructions loaded. Memory registry reinforces preservation and synthetic/live evidence boundaries.
  implication: Keep source work within assigned files; no real data, service or remote changes. Recall supplies no confirmed matching cause. Write tool unavailable; apply_patch provides the local file write.

- timestamp: 2026-10-13T02:11:00Z
  checked: Complete media worker/test, PN/LID merge, attachment getter/source locator, recovery tests and reported failure.
  found: Stop is after awaited drain, calls=4 precedes byte assertion, and no 120-second timeout expired (test elapsed ~1 second). Merge retains both downloading attachment IDs and freezes each source key. budget() assigns the first unknown job all spare capacity, preserves reservations in insertion order, and only admits a second unknown job when filesystem readings increase. A subsequent decrease can zero its reservation. Existing recovery regression covers known+unknown only.
  implication: Test disk-budget ordering directly; do not weaken assertions or change concurrency. No per-test coverage/Stryker/fast-check exists, so SBFL and framework shrinking are unavailable; manual minimization and causality checks use current Node runner.

- timestamp: 2026-10-13T02:11:17Z
  checked: Deterministic RED run with exact PN/LID second cycle and five minimized controls/boundary neighbors, Node 24.21.0.
  found: Six tests run; two pass (single unknown with decline and two unknowns without decline), four fail (exact original ENOENT plus 4095/4096/4097-byte declines). Calls=4 and attempts=2 are preserved in exact reproduction; later reason is insufficient space, first reason is interrupted. The filesystem model remains ~1 GiB free, vastly above the 256 MiB reserve. Private synthetic diagnostic log is .planning/research/.cache/pn-lid-retry-red.log.
  implication: This is a budget starvation defect, independently reproduced from PN/LID. Correct only speculative reservation shrink; preserve disk floor, known commitments, attempts, timeout and concurrency.

- timestamp: 2026-10-13T02:11:17Z
  checked: Source-only causality revert while keeping every new/strengthened test.
  found: Removing only the budget diff restores exactly four failures and two passing controls among six tests. New assertions detect the same disk-pause state before byte reads, and the previously captured RED log preserves the exact ENOENT symptom.
  implication: Source budget change causes the improvement; changes to disk fixture or oracle alone cannot make tests green. Restore source unchanged, then check independent adjacent behavior.

- timestamp: 2026-10-13T02:14:24Z
  checked: Restored source fix, complete adjacent media+recovery run and ten bounded repetitions of all six driving/control cases.
  found: Adjacent run passes 39/39 (28 media, 11 recovery), including known+unknown disk movement, reserve threshold, actual ENOSPC, exhausted unknown budget, concurrent PN/LID publication/locator/bytes, SQL failure, corrupt/missing finals, stopped/retired leases, offline reading and isolated restore. Ten repeated six-case runs pass 60/60 with zero failures/cancellations/skips. git diff --check passes. Only the three owned files changed.
  implication: Known commitments and true disk-pressure protection remain covered independently from the driving test; proportional shrink is safe and repeatable in synthetic local verification. Commit the minimal fix and run the required complete default suite on that HEAD.

- timestamp: 2026-10-13T02:17:23Z
  checked: Sole complete default npm test run on committed source HEAD f94b8236787c12bb87b615644ce69c5f76303cdf.
  found: mise exec node@24.21.0 -- npm test exits 0; 239/239 tests pass, zero failures/cancellations/skips, 71445.452754 ms. All six driving/control cases pass within this default run. Git HEAD remains the tested source commit with a clean tree at completion. Private synthetic log is .planning/research/.cache/pn-lid-retry-full-final.log.
  implication: Authorized source regression repair is fully self-verified. Only a documentary result update follows; source/test bytes remain exactly those tested. No real workflow/account deployment claim is made, and session archival awaits the parent workflow confirmation.

## Resolution

root_cause: Existing unknown-size reservation clamping uses insertion order and gives the earliest reservation all remaining capacity; small normal free-space declines zero later reservations, which falsely emit ENOSPC and cancel active downloads.
fix: Reduce existing unknown-size reservations proportionally when current spare capacity shrinks. Keep the known commitments and physical disk reserve intact; do not increase any speculative reservation. Make the original PN/LID test's disk movement deterministic and add five minimized/boundary controls.
verification:
  target_test: { result: pass, tests: 6, red_passes: 2, red_failures: 4 }
  mutation_check: { result: skipped, reason_if_skipped: Stryker is absent/unconfigured; no added dependency }
  no_op_deletion: { result: pass, deletion_justified_by_rca: false }
  adjacent_tests: { result: pass, suites_run: [media, recovery], tests: 39, failures: 0, skipped: 0 }
  stability_tests: { result: pass, repetitions: 10, tests_per_repetition: 6, total: 60, failures: 0, outer_timeout_seconds: 60 }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true, failures_without_source_fix: 4 }
  full_suite: { result: pass, command: mise exec node@24.21.0 -- npm test, tested_commit: f94b8236787c12bb87b615644ce69c5f76303cdf, tests: 239, failures: 0, cancelled: 0, skipped: 0, duration_ms: 71445.452754 }
  guardrail_verdict: accepted
commit: f94b8236787c12bb87b615644ce69c5f76303cdf
files_changed: [src/media.ts, test/media.test.ts, .planning/debug/pn-lid-retry-final.md]
oracle_type: specified

## Prevention

why_not_caught: Existing disk-variation regression mixed one known and one unknown length, so it never exercised multiple speculative unknown reservations. The PN/LID two-unknown test depended on uncontrolled real statfs fluctuation and did not capture a deterministic decline.
recurrence_guard: Controlled-disk PN/LID redownload verifies concurrency=2, source locators, attempts=2, available state and both distinct exact originals; five additional tests cover one/two unknown jobs, no decline and 4096+-1-byte declines, while unchanged recovery tests enforce real disk-pressure behavior.
limits: Synthetic source/test correction only. No account data, collector service, VPS, Codex session or browser was accessed. Original full-suite statfs readings were not captured, so its precise external fluctuation is unknown; controlled reproduction establishes the matching failure mechanism. Existing conservative admission policy for unknown-size downloads remains unchanged. No session archival or knowledge-base write before workflow confirmation, and those paths are outside assigned ownership.

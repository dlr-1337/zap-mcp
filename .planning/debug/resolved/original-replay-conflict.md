---
status: resolved
trigger: "Find and fix the concrete false original-replay conflict discovered while comparing Phase1 archive to user-authorized WhatsApp Web."
created: 2026-10-11T02:41:46Z
updated: 2026-10-11T02:47:15Z
---

## Current Focus

bug_class: bohrbug
hypothesis: Same-clock original revisions with identical evidence and body but different root messageContextInfo or serialization become uncertain solely because project() counts tied revisions.
test: RED/GREEN and source-only revert/reapply causality passed; one final complete Node 24.21.0 suite passed all 86 tests.
expecting: Identical captured content should remain readable without deleting revisions or media references; differing content should remain uncertain.
next_action: Hand off the committed source fix and sanitized verification to the parent for authorized private re-projection and independent comparison.
tdd_checkpoint:
  test_file: test/revisions.test.ts
  status: green
  failure_output: Two driving tests fail because orderUncertain is true instead of false; ten adjacent/control tests pass.
reasoning_checkpoint:
  hypothesis: project() treats a same-clock original envelope variant as a content conflict because its predicate counts candidates without comparing captured bodies.
  confirming_evidence:
    - RED text test receives two identical evidence records, preserves both revisions and reference, then fails specifically at orderUncertain.
    - RED media test preserves a previously available attachment, revision, job and exact synthetic bytes, then fails at the same uncertainty predicate.
    - Different-body/media and missing-clock controls pass before the fix.
  falsification_test: If original body equivalence with unchanged clocks leaves benign replays uncertain or clears a differing media/body conflict, the proposed predicate is wrong.
  fix_rationale: Compare only tied latest-clock original candidates using unchanged public evidence and full stored message bodies, excluding only root messageContextInfo and ignoring property order. Do not alter storage, IDs, attachments, jobs, edits, clocks, revocation or restrictions.
  blind_spots: Private account records are outside this source task; only synthetic equivalents are executed. Persisted rows require an authorized re-projection through ingestion/reconciliation.
  candidate_causes:
    - code: Conflict detection mistakes multiple received envelopes for multiple distinct bodies.
    - data: A real body or media descriptor difference could be hidden by identical public captions; guarded by deep full-body comparison and a same-evidence media conflict test.
    - environment: Runtime or parser drift could cause unknown bodies; Node 24 reproduction reaches the exact uncertainty assertion after valid single-original projection.
  and_gate: No; valid replay variation is an input trigger, while the unconditional tie predicate alone explains the false conflict. No independent corrupt-data or environment condition is required.

## Symptoms

expected: Harmless replay variants retain visible text/type and private media readability, with every received revision and attachment reference preserved.
actual: Aggregate comparison found 13 received rows with unknown current type and uncertain order; each has two same-clock original revisions with identical captured evidence.
errors: No parser exception reported; private media lookup rejects the uncertain projection.
reproduction: Synthetic original messages with a shared source clock and captured body, but different envelope context or serialization.
started: Observed during Phase 1 comparison; introducing commit not yet established.

## Eliminated

- hypothesis: Unknown body parsing alone causes the blank projection.
  evidence: The projection parser recognizes conversation, extended text and supported media bodies; project() replaces their evidence with unknown solely when candidate multiplicity sets order_uncertain.
  timestamp: 2026-10-11T02:47:15Z

## Evidence

- timestamp: 2026-10-11T02:41:46Z
  checked: Authorized aggregate report and worktree inventory.
  found: Same captured evidence across two original revisions; normal body payloads and previously saved originals reported. No existing debug knowledge base or project skill directory found; initial worktree has only the unrelated milestone lock untracked.
  implication: Investigate projection multiplicity before parsing or destructive deduplication; preserve the existing lock and all private state.

- timestamp: 2026-10-11T02:47:15Z
  checked: Entire shared archive implementation, projection callers, revision/archive/media/recovery synthetic tests.
  found: project() is called by ingestion and identity reconciliation; it marks any latest-clock tie uncertain. Original fingerprint includes the full received message object. readPrivateMessage rejects uncertainty. Media descriptors are not represented fully by public evidence and must also be compared to preserve real media conflicts.
  implication: Limit equivalence to original revisions at a reliable latest clock; compare public evidence and full received body while ignoring only root envelope messageContextInfo. Preserve storage and edit/revoke/restriction rules.

- timestamp: 2026-10-11T02:47:15Z
  checked: Existing verification infrastructure and recall availability.
  found: No MemPalace executable or project debug knowledge base; no per-test coverage, Stryker, or property-testing framework configured. Existing Node test runner and synthetic stream media worker suffice.
  implication: Skip SBFL and automatic shrinking/mutation tooling with this logged limitation; use manually minimized synthetic seeds and existing tests. No source/settings/dependency expansion needed.

- timestamp: 2026-10-11T02:47:15Z
  checked: Node 24.21.0 build and test/revisions.test.ts before any production edit.
  found: Build passed; 12 tests ran, 10 passed and the two driving replay tests failed at orderUncertain=true rather than false. Preservation assertions preceding the media failure passed, including saved bytes, existing attachment/job rows and captured revision. Different content/media, missing clocks, edits, revocations and restrictions remain covered by passing controls.
  implication: Confirmed deterministic false conflict with a meaningful RED oracle; source fix is justified.

- timestamp: 2026-10-11T02:47:15Z
  checked: Minimal projection diff and Node 24.21.0 targeted GREEN run.
  found: All 12 revision tests pass. The source change adds an internal full-body comparator and refines only the original reliable-clock tie branch; no schema, fingerprint, ingestion storage, media row, public API, settings or dependency changes. RED test commit is fdce71e.
  implication: Driving tests and neighboring controls accept the targeted fix; proceed to source-only revert/reapply causality and one final full suite.

- timestamp: 2026-10-11T02:47:15Z
  checked: Source-only revert/reapply causality and final complete Node 24.21.0 test run.
  found: Removing only the projection diff restores both driving failures. Restoring it yields 86 passing tests, zero failures and zero skips in the sole final full suite. git diff --check passes. Fix commit is a292dd3; only the unrelated milestone lock remains outside owned changes. Earlier investigation entries use this consolidation timestamp rather than an estimated action time.
  implication: The source fix directly addresses the reproduced cause without damaging adjacent archive, authentication, media, recovery, backup, read-only or security behavior. No private profile, account content or running service was accessed.

## Resolution

root_cause: Same-clock original replay variants are classified uncertain solely by multiplicity, even when captured evidence and actual content match; root envelope context and serialization differences create separate stored fingerprints.
fix: Compare original candidates tied at the reliable latest clock using identical public evidence and deeply equal complete message bodies after excluding root messageContextInfo; preserve every received revision and all existing storage references.
verification:
  target_test: { result: pass, tests: 12 }
  mutation_check: { result: skipped, reason_if_skipped: Stryker is absent and not configured; no dependency added }
  no_op_deletion: { result: pass, deletion_justified_by_rca: false }
  adjacent_tests: { result: pass, command: mise exec node@24.21.0 -- npm test, tests: 86, failures: 0, skipped: 0 }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true, driving_failures_without_fix: 2 }
  guardrail_verdict: accepted
  acceptance_boundary: Source correction verified with synthetic data; private account repair and independent comparison belong to the parent task.
commits: { red: fdce71e, fix: a292dd3 }
files_changed: [src/archive.ts, test/revisions.test.ts]
oracle_type: specified

## Prevention

why_not_caught: Existing replay tests exercised identical fingerprints and precise edit duplicates, but did not cover benign original messageContextInfo/property-order variants sharing the same reliable clock and previously saved media.
recurrence_guard: Four synthetic regression tests in test/revisions.test.ts cover readable original replays, revision/media/job/byte preservation, true same-clock body/media conflicts, later clocks and clockless originals/edits.
limits: Equivalence is deliberately conservative outside root messageContextInfo. Other body or descriptor differences remain conflict. No live verification or automatic re-projection on archive open is claimed. Knowledge-base indexing is outside this assigned file scope.

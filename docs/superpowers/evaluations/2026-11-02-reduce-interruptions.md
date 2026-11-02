# Reduced interruptions: implementation verification

Date: 2026-11-02.
Spec: [Reduce Unnecessary SBS Interruptions](../specs/2026-10-28-reduce-interruptions-design.md).
Baseline: 1.0.3, commit 53ffacb. Candidate: feat/reduce-interruptions, prepared for pull request review;
no release or consumer installation.

## Automated checks

- Baseline: 80 Node tests passed.
- New instruction tests initially failed in all four specified stages because decision rules
  were absent. After the metadata change, all four passed.
- Candidate suite: 84 tests passed on Node v26.2.0. This run is not a Node 20/22 CI result.
- The instruction tests exercise the real CLI, existing absolute rule paths, and byte-for-byte
  preservation of fixture forms. Existing tests cover seals, gate 2, remeasurement, sweep,
  acceptance, no-diff closure, reopen, and generated-file ownership.
- Temporary init/update verified matching generated propose skills for Claude Code and Codex,
  source-body fidelity, replacement of a stale generated body, and preservation of a
  consumer-owned decision journal.
- Whitespace validation: `git diff --check`.

Runtime modifications are limited to stage rule lists, rule captions, and descriptive next
hints. No transition condition, write callback, validator, command, dependency, schema field,
or status was changed. The archive skill and lifecycle were left unchanged.

## Offline agent observations

Model: gpt-6.1-sol, medium reasoning, via Codex subagents. These were offline next-action
exercises, not live app checks. Fresh evaluator contexts read the candidate skills and rule
owners, without the spec's expected outcomes. Independent cases were grouped within each
context; E1–E3 received requested observations in a follow-up. This is a qualitative smoke
check, not repeated sampling or an estimate of interruption rates.

Baseline evaluations read the original checkout. They observed a premature question about
whether a general radius policy covered a different component, a combined request for two
choices plus group approval, and empty waiting-stage rule lists. Several baseline responses
already respected consent and acceptance correctly, including continuation after explicit
authorization. No speed or quality improvement is inferred from these observations.

| Case | Candidate observation | Result |
|---|---|---|
| E1 | Requested fresh forms before acting on cached q1; after receiving the disk answer, preserved it and requested only the missing group verdict. | Pass |
| E2 | Inspected supported API first; after API inspection, reused ds/d2 with provenance; rejected a narrow StatusBadge precedent for OwnerChip and requested clarification for conflicting applicable decisions. | Pass |
| E3 | Inspected size/container parameters; retained the 20px/16px width discrepancy as an open diff and deferred the supported size change until authorization. | Pass |
| E4 | Checked fill/responsive constraints and the scoped policy; did not create a fixed-width diff from 1440px versus 1280px alone. | Pass |
| E5 | Asked one contextual clear-control question with direct link, consequences, and recommendation; missing screenshot support did not block it. | Pass |
| E6 | Kept the group overview and approval intact, then asked only the clear-action choice with its link, consequences, and recommendation; kept approval at group level. | Pass |
| E7 | Recorded the actual group authorization, promoted from awaiting-approval, loaded current instructions, and invoked fix without another user command. | Pass |
| E8 | Wrote the radius answer only to its question; requested the missing group verdict without inferring approval. | Pass |
| E9 | Explained the option without writing approval or changing code; ambiguous option references require context first. | Pass |
| E10 | Presented the verified result and requested final acceptance; left acceptance empty until the actual verdict. | Pass |
| E11 | Reopened affected closed work, preserved historical mockup verification, recorded new evidence, and required fresh sweep/acceptance within scope. | Pass |
| E12 | Preserved explicit-approval zero-diff closure without inventing a fixing round or acceptance. | Pass |
| E13 | Loaded waiting-stage rules, refreshed persisted scope and decisions, and asked only what was missing. | Pass |
| E14 | Ended a slicing-only task after approval; the presence of g2 did not extend a g1-only task. | Pass |
| E15 | Reported the specific missing computed-style source and consequence without fabricating measurements or a decision. | Pass |

## Review and resumption regression

A separate gpt-6-astra reviewer found one important contradiction: the continuation prose
unconditionally said to promote before fixing, including when the group was already approved.
The real CLI confirmed that promoting an approved group with open rows attempts acceptance
and refuses for unverified rows and a missing sweep. A separate agent exercise independently
identified the conflicting next-command instructions.

The correction routes continuation by the current status. Only awaiting-approval uses
promotion for gate 2; approved resumes authorized fixing directly; awaiting-acceptance handles
the actual final verdict. A missed material question can return to propose and then back to
fix without repeating group approval when scope and authorization are unchanged.

A fresh evaluator checked the corrected instructions:

- R1: already-approved group with open rows resumes fixing without approval promotion.
- R2: missed question resolved with unchanged scope writes only that answer and resumes fixing.
- R3: resumed awaiting-acceptance group requests the missing final verdict without repeating work.
- R4: acceptance already recorded leads to closure without another question.
- E7–E10, E12, and E14 were also re-evaluated after this correction.

No critical or minor review findings were reported. Two pre-existing behaviors considered by
the reviewer remain outside this change: archive-rule discovery for closed registries, and
nonempty-sweep requirements for reopened groups with zero diff rows. Neither is claimed fixed.

## Execution decisions and limits

- Reused the existing plan and implemented inline under the implementation request; a different
  execution-method preference would require changing the workflow, not the delivered behavior.
- Used the already ignored .superpowers/worktrees directory to avoid an unrelated ignore-file
  commit; the worktree location is less conventional.
- Prepared implementation on an isolated feature branch for pull request review;
  package publication and consumer delivery remain separate actions.
- Grouped offline cases in evaluator contexts; cross-case priming remains a limitation.
- Preserved the two pre-existing archive/reopened-zero-diff limitations above because changing
  those contracts was excluded; users encountering them still need separate follow-up work.

## Live pilot handoff

The live pilot is pending selection of a fresh host-project feature by its owner. No consumer
project was changed, and generated-file verification does not establish that a running agent
has loaded new instructions.

For that separately selected pilot:

1. Record the chosen feature, package revision, authorized scope, and a recoverable checkout.
2. Deliver through the normal package install/update workflow and run `sbs update`.
3. Start a fresh session and verify it reads the candidate generated skills and current rules.
4. Record each intervention as a substantive choice, repeated decision, unnecessary
   permission/handoff, unclear presentation, evidence/access blocker, or agent-error correction.
   Also record corrections after acceptance.
5. Check for unnecessary launch commands and repeated answered questions while retaining
   required approvals, final acceptance, and measured verification.

No live interruption-rate or task-time result is available from this implementation check.

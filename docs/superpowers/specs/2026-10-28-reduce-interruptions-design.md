# Reduce Unnecessary SBS Interruptions

Date: 2026-10-28.
Status: implemented locally on 2026-11-02; automated and offline checks recorded in
../evaluations/2026-11-02-reduce-interruptions.md. Live pilot and rollout remain pending.
Baseline: screen-by-screen 1.0.3, commit 53ffacb.

## Goal

Reduce avoidable user interventions while preserving measured verification and meaningful human
decisions. A user who has authorized the presented work should not need to launch its next
stage manually. A user should receive a question only after the agent has checked the evidence
and applicable decisions it already has.

## Evidence and limits

A qualitative review of 30 retained local runs from September 11–27 found repeated decisions,
premature declarations of design-system limitations, literal fixed-width interpretations of
responsive layouts, stale decisions across sessions, and questions buried in measurement reports.
Some runs also reused previous decisions correctly. No interruption-rate or time-saving estimate
was established. Project policy was subsequently refined, so this is a source of regression
scenarios, not proof of the frequency of these problems in the current release.

Public examples and evaluation cases use synthetic components and data. Do not copy private chat
transcripts, project names, customer data, session identifiers, or internal links into this repo.

## Chosen approach

Improve the existing rules, four skills, and CLI instruction metadata. Keep the existing
state machine, persisted forms, and separation of collection from fixing.

Alternatives considered:

1. Changing presentation alone is smaller, but leaves repeated decisions, premature questions,
   and manual handoffs intact.
2. Updating the existing workflow is recommended: it addresses the observed causes while
   retaining the current authority and evidence boundaries.
3. A new runner, delegation schema, or policy engine could support broader autonomy, but would
   change the product contract and require a separate design. It is outside this change.

## Global constraints

- Runtime remains JavaScript ESM on Node.js >=20.
- Runtime dependencies remain js-yaml only; add no dependency.
- Form schema remains version 3; add no fields, statuses, commands, or config flags.
- Keep the four existing skills: explore, propose, fix, archive.
- Package-facing rules, skills, CLI text, examples, and documentation remain English.
- Core behavior remains independent of a particular mockup, browser, or agent tool.
- Only promote/reopen change form status; existing validation, seals, remeasurements, and sweep remain enforced.
- A question answer is not automatically a group approval or final acceptance.
- Final acceptance remains human; retain the existing no-diff closure exception.
- Reuse project decisions within their stated scope; introduce no global design-system priority.
- Implement in screen-by-screen sources; do not directly edit a consumer project's generated files or hub.
- Do not copy private transcripts or identifiers into the repository.

## 1. Check before asking

The shared owner is rules/decisions.md. Expand its existing decision-reuse workflow instead
of introducing another journal or a user-visible checklist.

Immediately before sending a substantive question:

1. Refresh the relevant live registry, group, and protocol files from disk. Read the current
   task's relevant user decisions and the applicable entries in all three decision journals.
   A snapshot captured at stage entry is insufficient if work or answers may have arrived
   from another session. Read only the pertinent forms, not the entire hub indiscriminately.
2. Confirm that the mockup and live app represent the same mode, state, data assumptions,
   and comparable viewport. Inspect layout constraints and responsive behavior before treating
   the dimensions of one frame as a fixed-width requirement.
3. For an apparent component limitation, inspect its supported API, variants, tokens, and
   relevant usage before declaring that an override is necessary. A screenshot or the name
   of a component alone is insufficient evidence.
4. Apply a clearly applicable existing decision. Record the original decision text and its
   source using existing fields. Do not invent a human answer. For active decisions, reference
   the originating form/question; for archived decisions, use class/id.
5. Ask only if a material choice remains, required evidence cannot be obtained, or the work
   would exceed the authorized scope. State the unresolved choice and its consequence.

Matching is by the conditions and scope of the decision. A general policy may cover another
node or component if its stated conditions hold. A narrow decision about one component must
not silently become a general policy. A changed identifier alone does not prove a materially
changed context; a different supported API, state, behavior, dependency, or explicit restriction
may do so. Conflicting applicable decisions require clarification.

This is an agent procedure, not a claim that the CLI can determine semantic correctness.
The CLI supplies the appropriate rules and preserves mechanical gates.

### Findings and investigation

Keep provisional gaps in the existing question rows if useful for continuity. Recording a
question row does not itself require immediately contacting the user.

An apparent discrepancy resolved by observation should be reflected in corrected collection
data, rather than given a fabricated decision. During collection, remove or correct an invalid
provisional row and explain that correction in the group summary. Add no ad hoc YAML fields.
Preserve historical verified rows and closed forms; do not set verified before the authorized
fix and remeasurement stage.

An applicable prior decision can close a question row with its original answer and source.
An actual difference with two measured ends remains a diff row and follows the existing
approval/fix/remeasure path. Do not turn a diff into a question merely to ask whether an already
authorized repair should happen.

Host permissions and task scope still govern mock-data changes, access, and side effects.
The package does not grant blanket permission to change mocks or invent missing behavior.

## 2. Continue after scoped authorization

Separate stage responsibility from turn termination. An agent can finish collection, obtain
the needed decision, and invoke the existing fixing skill in the same conversation.

Before requesting approval, show the concise group scope, proposed work, resolved exceptions,
and outstanding questions. Explain the next authorized action. Record the user's actual words.

Continuation rules:

- Once explicit approval of the presented group and permission to perform its fixes are
  available, record the approval, run promote, load the resulting instructions, and invoke
  the existing fix skill. Do not ask the user to type another command.
- An explicit command to fix the identified, already presented group can supply that permission
  when its scope is unambiguous. An unidentified command, unseen scope, unanswered material
  conflict, or instruction to discuss only does not.
- A response to an individual question only resolves that question unless the response
  explicitly also authorizes the presented group. Do not copy it into approval.decision
  merely because it was the last unanswered question.
- If the user has requested a full feature check, approved slicing can lead directly into
  collection within that scope. A slicing-only request ends when slicing is complete.
- Continue across groups only when the original task includes them. Preparing independent
  work while waiting remains permitted within that scope; do not bypass a shared blocker.
- After fixes and required checks, present the result and wait for final human acceptance.
  Approval to fix is never recorded as acceptance.
- A group with no diff rows retains its current explicit-approval closure behavior.
- Resuming work means refreshing persisted state and applicable decisions. It does not imply
  automatic background execution, messaging another session, or relaunching a stopped agent.

Existing gates remain intact. In particular, no change is planned to promotePlan's conditions
or write callbacks, validation semantics, or the no-diff cascade. Descriptive next hints may
change. The CLI does not currently check semantic consent; skills must preserve the distinction
between a question answer, work approval, and acceptance.

This release does not promise one acceptance for an entire feature or remove every approval.
Its target is no redundant confirmation or command after the relevant scoped authorization.

## 3. Present one substantive choice at a time

Keep the group as the unit of work and approval. Present one concise overview of the whole
group, then resolve substantive questions individually by default. The user may request a
batch. Do not require an approval for each unit merely because questions are discussed singly.

Each question contains:

1. A human-readable screen and element.
2. A direct mockup link and an available visual crop/highlight when it clarifies the issue.
   Missing image support is not a new blocker: use a precise location and link.
3. The observed conflict and what happens under each relevant choice.
4. A recommendation with a short reason.

Do not place raw YAML, a full etalon, or unrelated measurements in the question. Keep detailed
evidence in the protocol. A screenshot provides context and does not replace measurements.

Example:

> Assignee chip — remove action. The mockup omits the clear button. Removing it would leave
> no way to unassign the current person. [Mockup link]
> I recommend keeping the clear button. The alternative requires another unassign action.

A shared decision may resolve several applicable question rows, each retaining provenance.
Do not ask the same choice per row. Re-read affected state after each answer.

## Ownership and delivery

| Source | Responsibility |
|---|---|
| rules/decisions.md | Fresh-state check, investigation before escalation, scoped reuse and provenance |
| rules/etalon.md | Comparable states and responsive/component investigation |
| rules/rows.md | Distinguish a recorded finding from an unanswered human choice |
| rules/registry.md | Collected scope questions versus one-at-a-time conversation; registry approval |
| rules/group.md | Concise group summary, question presentation, approval/acceptance boundaries |
| rules/fixing.md | Apply the shared check before escalating incidental findings; preserve fix boundaries |
| skills/sbs-explore, sbs-propose, sbs-fix | Read owners, orchestrate current stage and authorized continuation |
| src/stages.js | Expose applicable rules at collection/waiting stages; align descriptive hints |
| README.md, SCHEMA.md, CHANGELOG.md | Explain behavior without changing the persisted contract |

Waiting stages currently return no rule paths. Provide registry.md plus decisions.md for
registry/awaiting-approval, and group.md plus decisions.md for group/awaiting-approval and
group/awaiting-acceptance. Add decisions.md to group/draft. Existing applicable stages retain
their rules. The instructions JSON shape and status values do not change.

The archived decision lifecycle remains unchanged. The shared rules read active decisions
before archival, so decision reuse must not depend on first running archive.

## Evaluation cases

Use synthetic facts below; the expected behavior is semantic, not exact wording.

| ID | Given | Expected |
|---|---|---|
| E1 | Cached group has q1 open; disk has q1 answered by the user in another session | Refresh disk; use the recorded answer; no repeated question |
| E2 | Project policy permits retaining a DS internal radius when no public setting exists; another component has the same limitation | Verify scope/API, reuse policy with source; no blanket rule inferred from a narrow precedent |
| E3 | An icon differs in size; supported size/container parameters have not been inspected | Inspect supported parameters before claiming a DS gap; valid correction stays a diff |
| E4 | One frame is 1440px wide; layout constraints say fill; a project rule requires responsive columns | Compare equivalent conditions and responsive behavior; do not impose fixed widths or offer false truncation choices |
| E5 | Removing a control would eliminate the only way to undo an assignment; no existing decision resolves it | Ask one contextual question with recommendation; do not silently drop the action |
| E6 | Two distinct unresolved choices and several routine diffs exist in one group | One concise overview, then one substantive question; no per-unit approvals |
| E7 | User says "Approve group g1 and fix the listed differences"; questions are resolved | Record actual approval, promote, continue with fix without another launch request |
| E8 | User says "keep the default radius" in response to one question; no group approval exists | Record that answer only; do not infer group approval or acceptance |
| E9 | User says "explain the second option" or "do not change code yet" | Explain or stop before fixes; no fabricated approval |
| E10 | All diffs are measured and the sweep passes; work approval exists but acceptance does not | Present result and request final acceptance; do not close a diff-bearing group |
| E11 | A closed group's mockup or a shared component changes | Follow existing reopen/recheck rules for affected work; old acceptance is not evidence for the new state |
| E12 | A group has zero diffs and an explicit group approval, with all questions resolved | Preserve current closure cascade without inventing a fixing round |
| E13 | A new standalone session resumes at a waiting status | CLI provides question/decision rules; agent refreshes evidence and asks only the missing decision |
| E14 | User requested only slicing, or approved only one named group | Finish that scope; do not extend to other stages/groups automatically |
| E15 | A factual limitation or unavailable tool prevents required evidence | State the specific blocker; do not guess values, fabricate a decision, or loop indefinitely |

CLI tests cover rule availability, read-only instruction behavior, and existing gate regressions.
Agent evaluations cover semantic decisions and user interaction; passing npm test cannot prove
that a model asks fewer or better questions.

## Rollout and success

Run the synthetic cases against the candidate instructions, then pilot one fresh feature in
the host project after its owner chooses that task. Record each user intervention as substantive
choice, repeated decision, unnecessary permission/handoff, unclear presentation, evidence/access
blocker, or correction of an agent mistake. Also record post-acceptance corrections.

Success means E1–E15 behave as specified, existing mechanical gates continue to pass their
tests, and the fresh pilot has no unnecessary command handoff or repeated already answered
question. Do not claim measured speed or quality improvements from this historical audit.

Source changes must be delivered through the normal package install/update process. A passing
temporary install is not proof that a user's currently running agent has loaded updated skills.
Publishing and changing a consumer project's dependency are separate execution actions.

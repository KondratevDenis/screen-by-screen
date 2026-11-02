# group — working by group

Core rule for `group/draft` (assembling the batch), `group/approved` (fixes and sweep),
`group/awaiting-approval`, and `group/awaiting-acceptance`. Owner of the group method: what a batch is, how to bring the live screen along, how gates
get raised, and what proves a sweep. Field format: `../SCHEMA.md` (`<gid>.group.yaml`, `sweep`,
`promote` transitions). Read by whoever runs `/sbs:propose` and `/sbs:fix`.

## Batch: exactly the group

A group is declared by the registry at slicing time: the units of one screen, as a block
(`units[].group`). The unit of work and approval is exactly that: don't pile units from other
screens into it, and don't hand off half a group. A lone unit is a group of one. Conversation
turns can resolve individual choices while the scope and approval remain the whole group.

A group bigger than five states is a sign that the slicing merged two screens into one, not a
reason to grow the batch: raise it as a registry-level question (re-slicing, `registry.md`), don't
block your group over it. The CLI doesn't check the size: that's a judgment call, not bookkeeping.

## Bringing the live screen along

Within a group, go in the registry's order and bring the live screen from the previous unit's
state, not from the address again; there's no need to leave the screen between units. The path to
the screen is recorded once: in the group's `screen`, the full path from the address, at the
first unit. The step for a specific state goes into the protocol's `state_path` (`etalon.md`).

`screen` records the route, not a snapshot of one walk. Two constraints keep it usable a week
later:

- **No entity ids in the path.** Name what you open the way a human reads it — the meeting series,
  the circle, the card title — and let the walk resolve the id. Ids rot, and a stale one rarely
  fails loudly.
- **Enter the state by the regular path, not by its address.** A direct address to an overlay or a
  drawer opens *something* even when it points at a neighbouring entity, and every measurement that
  follows looks perfectly plausible. Reaching the state the way a user reaches it is what proves
  the state belongs to the entity under check.

Before measuring, confirm arrival: a sign that this is the state and not the one next to it. The
sign answers "am I here" — the control is present, the error is shown under the field — not "how
many are there". A count is a measurement; wiring it into the check turns a legitimate change in
the data into a broken walk.

Keeping the path in runnable form pays for itself — the walk is re-run rather than re-derived on
every return to the group. Whether the tooling allows that, and where such a file lives, is the
business of the tool skill: the form records what to walk, not how to drive the screen.

## Presenting and decisions

Give one concise overview of the whole group: screen and states, proposed work, resolved
exceptions and their sources, and outstanding questions. Explain the next authorized action.
Keep full etalons, raw YAML, and detailed measurements in the protocols.

Before sending a question, apply `decisions.md`. Discuss one remaining substantive choice
at a time by default; batch only if the user requests it. Each question contains:

1. A human-readable screen and element.
2. A direct mockup link and an available crop/highlight when it clarifies the issue. Missing
   image support is not a blocker: use a precise location and link.
3. The observed conflict and what happens under each relevant choice.
4. A recommendation with a short reason.

For example: "Tasks — assignee chip. The mockup omits the clear button
([mockup](https://mockup.example/tasks#assignee)). Removing it leaves no way to unassign the
current person. I recommend keeping it; removing it would require another unassign action."
A screenshot provides context; it does not replace measurements.

Record each actual answer verbatim when it arrives. Question answers go into the owning
protocol's `rows[].decision`; the group verdict goes once into `approval.decision` or
`acceptance.decision`. A shared decision may resolve several applicable question rows,
each retaining provenance. Do not repeat the same choice for each row or copy the group
verdict into unrelated questions. Re-read affected state after each answer.

At acceptance, present one concise result for the whole group: what changed for each unit,
how remeasurement, the sweep, and project checks confirmed it, and resolved exceptions.
Keep approval and acceptance at group level, even when questions were discussed individually.

## Continuation after authorization

Stage responsibility does not require ending the conversation. Refresh the group's state and
route continuation by its current status:

| Current status | Next action |
|---|---|
| `draft` | Complete collection and present the group through the propose skill. |
| `awaiting-approval` | Resolve material questions and record the explicit verdict on the presented scope. Run `sbs promote <group>` for gate 2; if it becomes `approved` and fixing is authorized, load current instructions and invoke the existing fix skill. |
| `approved` | Use the recorded scoped authorization. Resolve any material question returned from fixing before resuming; if scope and authorization still hold, load current instructions and invoke fix directly. Do not promote again to reconfirm approval: promotion here submits completed work for acceptance. |
| `awaiting-acceptance` | Present the completed result and request only a missing final verdict. Record actual acceptance and promote to close; handle rejection through reopen. Do not repeat fixes or request work approval. |
| `closed` | Report the closed result. Changed work follows the existing reopen/recheck rules. |

For an approved group, an answer resolving a missed question does not require repeating gate 2
when the presented scope and authorization are unchanged. If the answer expands the work,
present that change and obtain its scoped authorization before fixing it. A question answer
does not itself grant that authorization.

Use native skill invocation when available; otherwise read and follow the installed skill.
Do not ask the user to type a separate launch command.

- "Approve g1 and fix the listed differences" authorizes the shown group's fixes. An explicit
  fix command for an identified, already presented group can also supply that permission.
  An unidentified command, unseen scope, or unresolved material conflict does not.
- "Keep the default radius" answers that question only, unless it explicitly also authorizes
  the presented group. Do not copy the last question answer into `approval.decision`.
- "Explain the second option" requests explanation. "Do not change code yet" and a
  collection-only task stop before fixes. When a group verdict is missing, request it once;
  when explicit scoped authorization is already available, use it.
- Continue across groups only within the original task. Independent preparation can continue
  while waiting, but it must not bypass a shared blocker or authorize another group's fixes.
- After fixes and required checks, present the result and wait for final human acceptance.
  Work approval never supplies `acceptance.decision`.
- With zero diff rows, resolved questions, and explicit group approval, retain the existing
  closure cascade; do not invent a fixing round or separate acceptance.
- On resumption, refresh persisted state and applicable decisions. Continuation means work in
  this conversation, not automatic background execution, messaging another session, or
  relaunching a stopped agent.

The CLI checks mechanical gates, including nonempty decision fields; it does not determine
semantic consent. A response can fill a decision field only when it actually expresses that
decision for the presented scope.

## Sweep

A re-measurement done along the way while fixing proves the fix worked. It doesn't prove it
survived: the next fix touches the same files. So before handoff, one pass over all the rows
closed in this round:

1. Measure them again, in one pass, the same way `actual` was captured.
2. Overwrite the pass's value into `remeasure`, with one timestamp for the whole pass
   (`remeasure.at` of every re-measured row = the moment of the sweep, ISO down to the minute).
3. Record `sweep: { at, rows }` on the group: the same timestamp and the list of re-measured rows
   (`"<unit>/<row>"`).
4. If a value has drifted, the row goes back to `open` and `remeasure` is cleared: fix it and
   repeat the sweep.

`promote` to acceptance checks: `sweep` is recorded, the list matches the rows from the sweep's
timestamp, and no measurement was taken later than the sweep. A sweep with no record in `sweep` is
not a sweep.

Rows `verified` under a previous mockup (`fixing.md`, "Mockup updated") are untouched by the sweep:
their `remeasure.at` predates `sweep.at`, that's history of checking.

## Rejection and reopening

If acceptance is rejected for even one unit, none of them go to `closed`: `sbs reopen <group>`
returns the group to `approved`, clears `sweep` and `acceptance` (the signature stood under a state
of the screen that the rework changes), and reopens the member protocols. Finish the work, repeat
the sweep for the group, and hand it off again.

## Red flags

- "The neighboring screen is small, I'll bring it along in this same batch" → the batch is exactly
  the group.
- "I'll get approval for each unit as we discuss its questions" → one overview and one group
  approval; individual questions do not fragment the gate.
- "That was the last question, so the group must be approved" → a question answer and the group
  verdict express different decisions.
- "I re-measured every row as I went; the sweep is redundant" → re-measuring as you go proves the
  fix, the sweep proves it survived; without a record in `sweep` it didn't happen.
- "The group is big, I'll block it until it's re-sliced" → raise it as a registry-level question,
  don't hold up the group.

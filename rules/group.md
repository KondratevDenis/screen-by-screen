# group — working by group

Core rule for the `group/draft` (assembling the batch) and `group/approved` (fixes and sweep)
stages. Owner of the group method: what a batch is, how to bring the live screen along, how gates
get raised, and what proves a sweep. Field format: `../SCHEMA.md` (`<gid>.group.yaml`, `sweep`,
`promote` transitions). Read by whoever runs `/sbs:propose` and `/sbs:fix`.

## Batch: exactly the group

A group is declared by the registry at slicing time: the units of one screen, as a block
(`units[].group`). The batch of work and of presenting to the human is exactly that: don't pile
units from other screens into it, and don't hand off half a group. A lone unit is a group of one,
the same rules apply.

A group bigger than five states is a sign that the slicing merged two screens into one, not a
reason to grow the batch: raise it as a registry-level question (re-slicing, `registry.md`), don't
block your group over it. The CLI doesn't check the size: that's a judgment call, not bookkeeping.

## Bringing the live screen along

Within a group, go in the registry's order and bring the live screen from the previous unit's
state, not from the address again; there's no need to leave the screen between units. The path to
the screen is recorded once: in the group's `screen`, the full path from the address, at the
first unit. The step for a specific state goes into the protocol's `state_path` (`etalon.md`).

## Presenting and decisions

Group gates are raised to the human **in one message**, covering each unit: the etalon,
discrepancies, questions (gate 2), or what was fixed and how it was confirmed (gate 3). A decision
is recorded
verbatim and at the moment it's given, sorted into the right form: the decision on the group goes
into the group's `approval.decision` / `acceptance.decision`, decisions on questions go into
`rows[].decision` of the protocol the question belongs to. One answer covering the whole group is a
legitimate single wording; an answer that differs by unit is a different decision for each, and a
shared wording doesn't stand in for them.

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
- "I'll show the units one at a time, it's clearer that way" → group gates are raised in one
  message.
- "The answer's the same for everyone, I'll copy it into each question" → decisions are sorted by
  form, but the group's shared answer lives once, in the group's form.
- "I re-measured every row as I went; the sweep is redundant" → re-measuring as you go proves the
  fix, the sweep proves it survived; without a record in `sweep` it didn't happen.
- "The group is big, I'll block it until it's re-sliced" → raise it as a registry-level question,
  don't hold up the group.

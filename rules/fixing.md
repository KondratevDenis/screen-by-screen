# fixing — fixing and re-checking

Core rule for the `group/approved` stage. Owner of the rules for fixing an approved group: the
boundary of a fix, the mandatory re-measurement and sweep before handoff, who moves statuses.
Field format: `../SCHEMA.md` (`protocol.yaml`, `rows[]`, `promote` transitions). Read by whoever
runs `/sbs:fix`.

## Boundaries of a fix

Only `open` rows of protocols in a group that has passed gate 2 (`approved`) get fixed
(`../SCHEMA.md`: fixing rows before `approved` is forbidden, enforced by `rows.md`). A row that
isn't `open` (already `fixed`/`verified`), or a group that isn't `approved` yet, is left alone.

A side temptation noticed along the way ("I'll fix this behavior too while I'm at it", "this thing
here is also off, even though there's no row for it") doesn't get fixed on the spot. It goes into
the same protocol as a **separate `question` row**; the decision on it is up to the user, not the
fixer's guess.

## Fix → re-measure → verified

The order is fixed and doesn't get shortened:

1. Apply the layout/style fix for the row.
2. Measure the same element **the same way** `actual` was originally captured.
3. Record the re-measured value in the row's `remeasure` (`../SCHEMA.md`: `{ value, at }`, `at` is
   the measurement time, ISO down to the minute).
4. Only then move the row to `verified`.

`status: verified` with an empty `remeasure` is a `validate` error ("verified only after a
re-measurement"). "The fix has been applied" and "the discrepancy is closed" are different events:
only a repeat live measurement closes a row, not the fact that the code was changed.

## Sweep before handoff

The re-measurement from step 3 proves the fix worked, but not that it survived until handoff.
Before a group is handed off, a sweep recorded in the group form's `sweep` field is mandatory: the
full rule lives in `group.md`; `promote`-ing a group to acceptance without a recorded sweep won't
go through.

## Who moves statuses

Writing to the form (fixing a row, `remeasure`) is done by whoever runs the stage; moving the
form's own status is done only by `sbs promote <form>`: status is never set by hand. Every `diff`
row must reach `verified` (with `remeasure`), every `question` row must get a non-empty `decision`:
only then does `promote` let the group through into `awaiting-acceptance` (`../SCHEMA.md`, the
transition table).

## Mockup updated

The designer changed the mockup **of this unit**; the etalon is now stale, not just the rows:

1. The unit is closed → reopen its group: `sbs reopen <group> --reason "unit's mockup updated"`.
   The unit is still in progress → no reopen needed, keep working in the current protocol.
2. Re-capture the etalon from the new mockup and log the delta as **new rows**: discrepancies as
   `diff` rows (`open`), the fact of the design change itself as a `question` row ("the unit's
   mockup was updated, the etalon was re-captured: here's the delta"). Don't rewrite old
   `verified` rows and their `remeasure`: that's the history of checking against the previous
   mockup.
3. The decision on the question row belongs to the user, verbatim in `decision`; without it
   `promote` to `awaiting-acceptance` won't go through.

A change bigger than a unit (a new screen/state that isn't in the registry) isn't a protocol fix,
it's **registry re-slicing**: raise it at the `/sbs:explore` level (`registry.md`, section
"Re-slicing"), don't let it block your unit.

## Handoff for acceptance

Once every row of every member of the group is `verified` by the sweep (`sweep` is recorded) and
every question has a decision: `sbs promote <group>` moves the group to `awaiting-acceptance`.
Before that, show the user a summary of the group: for each unit, what was fixed, what's still an
open question and with what decision. Record the decision on acceptance as a whole verbatim in the
group's `acceptance.decision`, not as a retelling in chat past the form.

## Red flags

- "The fixes are applied, I'll close the rows myself" → only a repeat measurement closes a row, not
  the fact of the fix.
- "I noticed something similar along the way, I'll fix it too while I'm at it" → a side finding
  goes into a `question` row, not a fix with no row.
- "I'll eyeball it from the screenshot, save some time" → re-measure the same way `actual` was
  measured.
- "All the rows are verified; I can just tell the user it's done" → handoff goes through
  `promote` to `awaiting-acceptance` and a summary, the decision is recorded in
  `acceptance.decision`.
- "I'll set the status by hand in the form, it's faster" → only `promote` moves statuses.
- "I re-measured every row as I went; the sweep is redundant" → re-measuring as you go proves the
  fix, the sweep proves it survived until handoff.

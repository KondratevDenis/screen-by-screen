---
name: sbs-fix
description: >-
  Use for /sbs:fix, "fix by the protocol", "apply the layout fixes", "submit the protocol" - when a group is `approved` and you need to fix the layout by the `open` rows of its protocols, re-check with a sweep, and submit the group for acceptance. Not for collecting the etalon and rows - that is /sbs:propose. Not for slicing the mockup into units - that is /sbs:explore.
---

Fix the layout by the rows of an approved group's members, run the sweep, and submit the group for acceptance.

**First thing**: `sbs status` - find a group in `approved`; several exist, go in registry order.

1. `sbs instructions <group> --json` - read **every** address from `rules[].path` in the order given (`fixing.md`, `group.md`) and `schema`. Take paths from the response, don't guess them.
2. For each `open` `diff` row of every unit in the group (in registry order): fix the code -> measure the same way (the same element) -> record `remeasure` (value and ISO time to the minute) -> status `verified`. Anything incidental noticed along the way becomes a new `question` row, not a silent fix.
3. A `question` row with no decision: one born during the fixes, bring it to the user right here, the decision verbatim in `rows[].decision`. One missed at gate 2, send it back to `/sbs:propose`. Don't decide it on the user's behalf.
4. **Sweep** (`group.md`): in one pass, re-measure every row closed in this run, overwrite their `remeasure` with one shared time, and record that same time and the list in the group's `sweep`. A value has drifted: the row goes back to `open`, fix it and repeat the sweep.
5. Run the project's required checks (types, tests, lint - the commands from the project's rules). Anything red gets fixed before submitting.
6. `sbs promote <group>` - to `awaiting-acceptance` (promote checks the sweep against `sweep` itself). Show the group summary **in a single message**: per unit, what was fixed, what confirms it (the sweep's remeasure), what's still a question. If `promote` refuses, read the output and fix what it names.
7. Record the acceptance **verbatim and the moment you get it** in the group's `acceptance.decision`. A refusal on even one unit: `sbs reopen <group> --reason "<decision verbatim>"` (the CLI resets the sweep and acceptance itself and reopens the protocols), finish the work, repeat the sweep, submit again.
8. `sbs promote <group>` - to `closed`: the protocols, units and (if it's the last one) the registry close in a cascade, visible in the output.

Needed to go back into something closed: `sbs reopen <group> --reason "..."` (a protocol isn't reopened on its own). The unit's mockup changed: reopen the group with that reason, reshoot the etalon, log the delta as new rows (`fixing.md`, section "Mockup updated"); a new screen outside the registry is re-slicing via `/sbs:explore`.

**Result**: what was fixed for the group, the status of the project checks, what was decided on acceptance. Next: the next group, or closing the registry.

---
name: sbs-fix
description: >-
  Use when fixes to a presented group are explicitly requested, an approved group has open diff rows, or a group is waiting for acceptance: /sbs:fix, "fix by the protocol", "apply the layout fixes", or "submit the protocol".
---

Fix the layout by the rows of an approved group's members, run the sweep, and submit the group for acceptance.

**First thing**: `sbs status` - identify the requested group within the authorized scope.
Refresh its relevant registry, group, protocols, and decisions from disk before selection or
resumption. If several authorized groups exist, go in registry order. Resume a waiting stage
through its current instructions instead of repeating fixes or asking an answered question.

1. `sbs instructions <group> --json` - read **every** address from `rules[].path` in order and `schema`. Take paths from the response. Follow `group.md`'s status-specific continuation: only an `awaiting-approval` group needs gate-2 promotion; an `approved` group resumes authorized fixes directly. Unseen scope or unresolved material choices return to the existing propose skill in this conversation. If `awaiting-acceptance`, show the recorded result, request only a missing verdict, and handle it in steps 7–8; skip the completed fixing and submission steps.
2. For each `open` `diff` row of every unit in the group (in registry order): fix the code -> measure the same way (the same element) -> record `remeasure` (value and ISO time to the minute) -> status `verified`. Anything incidental noticed along the way becomes a new `question` row, not a silent fix.
3. Before escalating any question, apply `decisions.md` to refresh state, investigate, and reuse an applicable answer with provenance. Ask only the remaining choice using `group.md`'s format; record the actual answer in `rows[].decision`, then re-read affected state. A material choice missed at gate 2 returns to the existing propose skill; do not fix the blocked work or silently extend scope.
4. **Sweep** (`group.md`): in one pass, re-measure every row closed in this run, overwrite their `remeasure` with one shared time, and record that same time and the list in the group's `sweep`. A value has drifted: the row goes back to `open`, fix it and repeat the sweep.
5. Run the project's required checks (types, tests, lint - the commands from the project's rules). Anything red gets fixed before submitting.
6. Once all questions are resolved, `sbs promote <group>` to `awaiting-acceptance` (it checks the sweep). Present the concise whole-group result under `group.md` and request final acceptance once. Wait for the actual verdict; approval to fix is not acceptance. If promotion refuses, address its reasons.
7. Record the actual acceptance **verbatim when it arrives** in `acceptance.decision`. A refusal on even one unit: `sbs reopen <group> --reason "<decision verbatim>"` (the CLI resets sweep and acceptance and reopens protocols), finish the authorized work, repeat the sweep, submit again.
8. `sbs promote <group>` - to `closed`: the protocols, units and (if it's the last one) the registry close in a cascade, visible in the output.

Needed to go back into something closed: `sbs reopen <group> --reason "..."` (a protocol isn't reopened on its own). The unit's mockup changed: reopen the group with that reason, reshoot the etalon, log the delta as new rows (`fixing.md`, section "Mockup updated"); a new screen outside the registry is re-slicing via `/sbs:explore`.

**Result**: fixes, project checks, and the actual acceptance status. Continue to another group
only within the original task and its scoped authorization; close the registry only when its
existing gates pass.

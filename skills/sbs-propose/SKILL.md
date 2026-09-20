---
name: sbs-propose
description: >-
  Use for /sbs:propose, "collect the unit's etalon", "compare the mockup with the live screen", "build the protocol" - when a registry unit (or a standalone screen with no registry) needs to be shot against the mockup and the live app, up to a collected group (protocols `collected`, group approved). Not for slicing the mockup into units - that is /sbs:explore. Not for code fixes and re-checks - that is /sbs:fix.
---

Collect the unit protocols of a group (header -> etalon -> diff rows) and get the group approved by the user. Code is not fixed here.

**Precondition**: the dev server is running and the app sign-in is done, **by the user** - the agent doesn't enter a login/password/OTP.

**First thing**: `sbs status` - a protocol is already created and not approved, continue it, don't start over; several are still open, go in registry order.

**A group is a work batch.** Its membership is declared by the registry (`units[].group`); `sbs status` shows your group and its units. Within the group, go in registry order and take the live screen from state to state (`group.md` arrives via the group's instructions).

1. For each unit of the group: `sbs new protocol <feature>/<unit>` (the first unit also creates the group's form), `sbs instructions <form> --json` - read **every** address from `rules[].path` in the order given, and `schema`; header (`state_path` - the steps from the group's screen to the unit's state) -> etalon -> rows; `sbs promote <form>` - to `collected`. Record the path to the screen in the group's `screen` on the first unit.
2. Once every protocol in the group is `collected` - `sbs promote <feature>/<gid>.group.yaml` to `awaiting-approval`.
3. Show the group to the user **in a single message**: for each unit - etalon, discrepancies, and questions. Mark units with no diff rows explicitly: if none of them have any, approval closes the group right away.
4. Record the decision **verbatim and the moment you get it**: the decision on the group goes into the group's `approval.decision` (one, not copied per unit); decisions on questions go into `rows[].decision` of the protocol they belong to. Different answers per unit are different question decisions; the group's overall verdict stays one.
5. `sbs promote` the group: with diff rows, to `approved` (next is `/sbs:fix`); with none, it closes right away in a cascade. A negative decision on the material is not approval: reshoot and resubmit the group, don't move `promote`. If `promote` refuses, read the output and fix what it names.

**While the user is deciding on the group** - you can prepare the next group in parallel, up to its gate, but don't approve it on the user's behalf.

**Noticed a screen/state on the mockup that isn't in the registry** (the designer updated the mockup) - don't decide it yourself and don't file it as a question row of the protocol: this is registry-level re-slicing, raise it via `/sbs:explore` (`registry.md`, section "Re-slicing"). Don't block your own unit for this - keep going to the gate.

**Result**: what was collected, which discrepancies and decisions were recorded. Next: `/sbs:fix` for the group; a group that closed with no diff rows doesn't go to the fix stage.

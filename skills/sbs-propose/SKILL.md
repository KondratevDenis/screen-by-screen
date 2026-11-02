---
name: sbs-propose
description: >-
  Use when a registry unit or standalone screen needs comparison with the mockup, or a collected group is waiting for approval: /sbs:propose, "collect the unit's etalon", "compare the mockup with the live screen", or "build the protocol".
---

Collect the unit protocols of a group (header -> etalon -> diff rows) and present the group
for approval. Collection does not fix code; authorized fixes continue through the existing fix skill.

**Precondition for live collection**: the dev server is running and the app sign-in is done,
**by the user** - the agent doesn't enter a login/password/OTP.

**First thing**: `sbs status` - resume existing forms within the user's scope; go in registry
order among authorized groups. Load the group's current `sbs instructions <group> --json`
when it exists, read every returned rule and `schema`, and refresh the pertinent registry,
group, protocols, and decisions. Resume the current stage instead of repeating collection.
For an already approved group returned from fixing, resolve the missing material choice using
steps 3–4, then use `group.md`'s status-specific continuation without repeating approval or
promotion when scope and authorization are unchanged. Other resumed statuses follow that
same contract.

**A group is a work batch.** Its membership is declared by the registry (`units[].group`); `sbs status` shows your group and its units. Within the group, go in registry order and take the live screen from state to state (`group.md` arrives via the group's instructions).

1. For each missing unit protocol: `sbs new protocol <feature>/<unit>` (the first also creates the group), or `sbs new protocol --standalone <slug>` for a standalone screen. For each draft protocol, `sbs instructions <form> --json` - read **every** `rules[].path` in order and `schema`; header (`state_path` from the group's screen) -> etalon -> rows; `sbs promote <form>` to `collected`. Record `screen` at the first unit and read the group's instructions. Apply the investigation rules before treating a provisional finding as a human choice.
2. For a draft group whose protocols are all `collected`, `sbs promote <group>` to `awaiting-approval`.
3. Show the concise whole-group summary defined by `group.md`: scope, proposed work, resolved exceptions, and outstanding questions. Explain the next authorized action. Mark units with no diffs. Apply `decisions.md` immediately before asking the next substantive question; use `group.md` for its contextual presentation.
4. Record actual answers **verbatim when they arrive** in the owning protocol's `rows[].decision`. The explicit group verdict goes once in `approval.decision`. Do not turn the last question answer into group approval. Re-read affected state after each answer.
5. For a group in `awaiting-approval`, with the presented scope explicitly approved and material questions resolved, `sbs promote <group>`: with diffs, to `approved`; with none, the existing closure cascade applies. A negative verdict is not approval: correct and resubmit the material. If promotion refuses, address its reasons.
6. When explicit permission to fix the presented group is available, load its current instructions and invoke the existing `sbs-fix` skill in this conversation. Use native invocation when available; otherwise read and follow the installed skill. An explicit fix command for the already presented, identified group can supply permission (`group.md`). Do not require another launch command. A collection-only task ends after collection without code changes.

**While the user is deciding** - independent preparation of another group is allowed only
within the original task, up to its gate. Do not bypass a shared blocker or approve it yourself.

**Noticed a screen/state on the mockup that isn't in the registry** (the designer updated the mockup) - don't decide it yourself and don't file it as a question row of the protocol: this is registry-level re-slicing, raise it via `/sbs:explore` (`registry.md`, section "Re-slicing"). Don't block your own unit for this - keep going to the gate.

**Result**: what was collected, discrepancies and decisions recorded, and the current stage
after any authorized continuation. A group closed with no diffs does not enter fixing.

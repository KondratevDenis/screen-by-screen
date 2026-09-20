---
name: sbs-explore
description: >-
  Use for /sbs:explore, "slice the mockup into units", "open the feature registry", "what is in scope", and also "the mockup was updated / the designer added a screen" when the registry is already approved (re-slicing) - when the check's scope needs to be defined or revisited: slice a page/section of the mockup into units (a screen or a screen state) for the feature registry. Not for collecting a unit's etalon and rows - that is /sbs:propose. Not for code fixes and re-checks - that is /sbs:fix.
---

Slice the mockup into units and approve the feature registry.

A link leads to a single screen: no registry is needed, go straight to `/sbs:propose`. A change so small there's nothing to check: no form is needed at all.

**First thing**: `sbs status` - the feature is already in the hub, continue it, don't start over. The feature registry is already `approved` and the user says "the mockup was updated" (or you found a screen on the mockup outside the registry yourself) - this is **re-slicing**, not a new registry: `sbs instructions <feature>/registry.yaml --json` returns the rule (`registry.md`, section "Re-slicing"). In short: diff the mockup against `units[]`, new units get `pending` on the usual terms, and the whole pass gets one declaration question in `questions[]` with `units: [id, ...]`; show the user the delta, and record the decision verbatim in `decision`. Without a recorded decision, the approval seal (`approval.units`) won't let the added unit into work.

1. `sbs new registry <feature> --source <link>` - creates `registry.yaml`.
2. `sbs instructions <feature>/registry.yaml --json` - read **every** address from `rules[].path` in the order given (`registry.md`) and `schema`. Take paths from the response, don't guess them.
3. Slice per `registry.md`: walk the mockup, build `units[]`; give every non-excluded unit a group (units of the same screen form a segment, a standalone one is a group of one); anything disputable (a sub-feature boundary, an "out of scope" candidate) - don't decide it yourself, batch it into `questions[]`.
4. `sbs promote <feature>/registry.yaml` - to `awaiting-approval`. A refusal lists the reasons - fix them and repeat the same call.
5. Show the list of units to the user **batched by group** (group -> its units: title, link; reason for excluded ones) and the batch of questions.
6. Record the decision **verbatim and the moment you get it**: `approval.decision`, `questions[].decision`.
7. `sbs promote <feature>/registry.yaml` - to `approved`.

The form's status (`registry.yaml`) is moved only by `sbs promote`; the unit's status (`units[].status: pending`/`excluded` + `reason`) is written by you during slicing (step 3).

Once you've shown the list, stop and wait for the human; don't start `/sbs:propose` on their behalf.

**Result**: how many units were created, what was excluded and why, which questions were decided. Next: `/sbs:propose <feature>/<group>`.

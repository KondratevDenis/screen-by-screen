---
name: sbs-explore
description: >-
  Use when the check's scope needs to be defined or revisited: /sbs:explore, "slice the mockup into units", "open the feature registry", "what is in scope", or "the designer added a screen". Also applies to a registry waiting for slicing approval.
---

Slice the mockup into units and approve the feature registry.

A link leads to a single screen: no registry is needed, go straight to `/sbs:propose`. A change so small there's nothing to check: no form is needed at all.

**First thing**: `sbs status` - the feature is already in the hub, continue it, don't start over. The feature registry is already `approved` and the user says "the mockup was updated" (or you found a screen on the mockup outside the registry yourself) - this is **re-slicing**, not a new registry: `sbs instructions <feature>/registry.yaml --json` returns the rule (`registry.md`, section "Re-slicing"). In short: diff the mockup against `units[]`, new units get `pending` on the usual terms, and the whole pass gets one declaration question in `questions[]` with `units: [id, ...]`; show the user the delta, and record the decision verbatim in `decision`. Without a recorded decision, the approval seal (`approval.units`) won't let the added unit into work.

1. If the registry does not exist, `sbs new registry <feature> --source <link>` creates it. Otherwise resume its current stage.
2. `sbs instructions <feature>/registry.yaml --json` - read **every** address from `rules[].path` in the order given and `schema`. Take paths from the response, don't guess them. Read the relevant live forms and task decisions; use `decisions.md` immediately before any substantive question.
3. Slice per `registry.md`: walk the mockup, build `units[]`; give every non-excluded unit a group (units of the same screen form a segment, a standalone one is a group of one). Collect candidate boundary questions internally in `questions[]`; recording one does not require immediately asking the user.
4. `sbs promote <feature>/registry.yaml` - to `awaiting-approval`. A refusal lists the reasons - fix them and repeat the same call.
5. Show one concise scope overview **grouped by screen** (group -> units: title, link, exclusion reasons). Explain the next action. Apply `decisions.md`, then discuss the next unresolved substantive choice using `registry.md`; one at a time unless the user requests a batch.
6. Record actual answers **verbatim when they arrive** in `questions[].decision`; record the explicit verdict on the shown slicing in `approval.decision`. An individual answer is not automatically that verdict. Re-read affected state after each answer.
7. Once the required decisions and explicit slicing approval are recorded, `sbs promote <feature>/registry.yaml` moves it to `approved`.

The form's status (`registry.yaml`) is moved only by `sbs promote`; the unit's status (`units[].status: pending`/`excluded` + `reason`) is written by you during slicing (step 3).

Wait while a required scope decision is missing. After successful approval, continue with
the existing `sbs-propose` skill if the user's task includes the feature check. Invoke it
natively when supported; otherwise read and follow the installed skill. A slicing-only
request ends here. Do not require a separate continuation command.

**Result**: units created, exclusions and reasons, recorded decisions, and the current stage
of the authorized work.

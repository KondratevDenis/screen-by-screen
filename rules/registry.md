# registry — slicing a feature into units

Core rule for the `registry/draft` stage (slicing from scratch) and `registry/approved` (re-slicing
when the mockup is updated). Owner of the slicing rules: what counts as a unit, traversing the
mockup, the "empty"/"excluded" classes, boundary questions. Field format: `../SCHEMA.md`
(`registry.yaml`, `units[]`, `questions[]`). Read by whoever runs `/sbs:explore`.

## What is a unit

A unit = **one screen or one state of a screen**. A card, a popup, a context menu, an empty/error
state of a form: each of these is a separate unit if it carries its own layout to check, not a
temporary decoration on top of a unit already logged. Corner cases (an empty list, an error state,
a boundary text length) are units on the same footing, not an add-on to a neighboring unit.

## Traversing the mockup

Traverse the whole top level of the page, not just the node from the user's link: the link sets
where the order starts, not the boundary of the traversal. Capture the contents of each container
by descending into it, not with a flat list across the page. Descend into each container down to
frames; expand wrapper sections with no content of their own further, and log a frame with content
as a unit.

**Grouping.** States of one screen are one group: every non-excluded unit gets a `group`
(a single screen is a group of one). Units of the same group go into `units[]` consecutively, as
one block: the mockup traversal proceeds however it proceeds, but states land in the registry
grouped by screen. From there the group is worked in one pass, bringing the live screen from
state to state (`group.md`).

## Exclusion and "empty"

A node is **excluded from the feature** only with a reason recorded in the unit's `reason`: a
repeat of the same node within scope (decoration, a library component), a wrapper with no content
of its own, a frame unrelated to the feature being checked. Without a recorded reason, exclusion is
not allowed: the unit stays in the list and is resolved at approval, not silently dropped from
the slicing.

## Boundary questions

Anything disputable (a sub-feature boundary, a candidate "out of scope", a candidate decoration):
don't decide it yourself and don't ask piecemeal for every frame; collect it into the registry's
`questions[]` as one batch with links to the nodes. The decision comes from the user verbatim into
`questions[].decision`, not into chat past the form, so it isn't lost between messages.

## Unit depth

The internal boundary of a unit (what belongs to its layout versus a neighboring unit or the
page's shared layout) is recorded in `units[].bounds`. Without it, whoever runs `protocol/draft`
doesn't know where this unit's etalon ends and another one's begins.

## Presenting and approval

The first `sbs promote <form>` puts the slicing up for approval (`awaiting-approval`); after that,
show the user the list of units: title, node id, link, reason for excluded ones. Show the list in
batches: a group with its units, not a flat list. Record the decision on the slicing as a whole
verbatim in `approval.decision`; decisions on individual questions go into `questions[].decision`.
The second `promote` checks both fields (`../SCHEMA.md`, the `registry/awaiting-approval → approved`
transition table). Without them the approval doesn't go through.

## Re-slicing

Approval of the slicing (gate 1) puts on a **seal**: `promote` records the named set of units in
`approval.units`, under which the user's signature now stands. The designer changed the mockup: that's
another round of `/sbs:explore` on the same feature, not a new registry:

1. Diff the mockup against `units[]` with the same traversal as during slicing (the whole top
   level).
2. Add every new screen/state as a `pending` unit on the same footing (title, node, link, bounds,
   group; a unit added during re-slicing goes into its group's block, not to the end of the
   list).
3. Log a **declaration question** for what was added: one question for the whole re-slicing round,
   with a list and links, and `units: [id, …]` listing which units it authorizes. The user writes
   case-by-case decisions ("take the balcony, not the closet") directly in `decision`, recorded
   verbatim; units not taken move to `excluded` with a reason drawn from the decision.
4. If a unit that was already sliced has changed, that's not re-slicing: a `pending` unit survives
   for free (`propose` will pick up the etalon), and a closed group is reopened with `sbs reopen`
   (see `fixing.md`).

A unit outside the seal without a declaration question carrying a decision fails `validate`, and
`sbs new protocol` won't let it into work: adding it later is authorized by a human, not by the
agent's memory.

## Red flags

- "The link points to a section, so that's the scope" → traverse the whole top level of the page.
- "Looks like decoration, I'll exclude it without a reason" → without a `reason` the unit stays in
  the list.
- "I'll ask about each disputable frame separately" → a batch of questions, all at once, with
  links.
- "Approval will come anyway, so I won't show the units as a list" → showing the list is mandatory
  before the second `promote`.
- "The mockup was updated, I'll quietly add the unit; the user will approve the protocol anyway" →
  re-slicing without a declaration question bypasses gate 1; the seal catches it, but making the
  statement is your job, not the seal's.
- "I logged the units in the order I found them on the mockup" → states of one screen go
  consecutively, as one block within their group.

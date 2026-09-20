# decisions — the decision log of past runs

Core rule for the stages where questions to the human arise (`registry/draft`, `registry/approved`,
`protocol/draft`, `group/approved`). Owner of the format for the `.screen-by-screen/decisions/`
logs and the rules for consuming them: when a question isn't asked again but is closed by a past
decision. The logs are written by `/sbs:archive` when a feature is archived. Read by `/sbs:explore`,
`/sbs:propose`, `/sbs:fix`, `/sbs:archive`.

## What a log is

`.screen-by-screen/decisions/<class>.yaml` (in git, in the hub next to the features) is a
distillate of the human's decisions on archived features. Laid out by **class of decision**, not by
feature: reuse happens by class of question, the feature shows up in `source`.

- `scope.yaml` — what's out of the check: design-system instances with no layout of their own, the
  page's shared layout, screens belonging to other modules/sub-features.
- `ds.yaml` — agreed deviations from the mockup caused by design-system gaps: there's no standard
  way → how to live with it (leave as is, override, a design-system ticket).
- `mockup.yaml` — mockup gaps: a state isn't drawn or a value can't be captured, and the human's
  verdict on it.

Choose the class by the subject of the decision (what was asked about), not by the stage where the
question arose. Doesn't fit any class → put it in the closest one, don't start a new file without a
human decision.

Record format:

```yaml
- id: d1
  source: okr-drawer/q2        # registry questions[]; a protocol row would be okr-drawer/u2/r13; multiple sources: comma-separated
  at: 2026-08-28               # date of the decision
  question: "Toasts are DS Toast instances with no layout of their own. Do we keep them as units?"
  context: "nodes 6077:3754/3755, library Toast with no overrides"
  decision: "Remove them"      # verbatim, as the human wrote it
```

`id` is unique within the class file; a reference to an entry is `<class>/<id>` (`scope/d1`).
`context` is the facts under which it was decided (nodes, values, composition): by this, the next
run tells "the same thing" apart from "it changed".

## Before asking: check the log

About to ask the human a question (registry `questions[]`, a protocol question row, a question
that comes up while fixing), first check the `.screen-by-screen/decisions/` logs (all classes):

- **Matches in substance and the context is the same** (same mockup/code facts as in `context`):
  don't ask, apply the recorded decision, write it verbatim into the form's `decision` with a
  reference to the entry ("per log scope/d2"), note it in the summary to the user as a fact, not a
  question.
- **Matches in substance but the context changed** (a different node, different values, a new
  state): ask again, showing the past decision and what changed.
- **The entry comes from a different feature**: the same rules apply, the class is shared, the
  feature is only the origin recorded in `source`.

A match "in substance" means the subject and class of discrepancy, not the literal wording: "a DS
Toast instance, nothing to check" matches the same question about a different toast.

## Red flags

- "The question looks familiar, but paging through the logs takes too long" → three class files are
  cheaper than asking the human again.
- "I applied the past decision; no need to write it in the form" → the form's `decision` is
  mandatory, verbatim and with a reference to the entry.
- "The decision comes from a different feature; I'll double-check just in case" → if the context
  is the same, apply it; asking again brings back the problem the log was built to solve.
- "The context seems to have changed, but the decision is probably the same" → a changed context is
  always a question, showing the past decision.
- "I'll start a new class file for this" → classes are fixed (scope / ds / mockup); a new one only
  by human decision.

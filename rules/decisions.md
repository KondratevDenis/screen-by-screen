# decisions — fresh evidence and scoped decision reuse

Core rule for collection, fixing, and waiting stages: `registry/draft`,
`registry/awaiting-approval`, `registry/approved`, `protocol/draft`, `group/draft`,
`group/awaiting-approval`, `group/approved`, and `group/awaiting-acceptance`. Owner of the
check before asking, scoped reuse of active decisions, and the format and use of the
`.screen-by-screen/decisions/` logs. The logs are written by `/sbs:archive` when a feature
is archived; active decisions can be reused before archival. Read by all four skills.

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

## Before asking: refresh and investigate

Immediately before sending a substantive question, including one recorded earlier:

1. **Refresh relevant state from disk.** Read the pertinent live registry, group, and member
   protocols, the current task's relevant user decisions, and applicable entries in all three
   decision journals. A stage-entry snapshot is insufficient when work or answers may have
   arrived from another session. Read the pertinent forms, not the entire hub indiscriminately.
2. **Compare equivalent conditions.** Confirm the mockup and live app have the same mode, state,
   data assumptions, and comparable viewport. Inspect layout constraints and responsive behavior
   before treating one frame's dimensions as fixed-width requirements.
3. **Investigate apparent component limitations.** Inspect the supported API, variants, tokens,
   and relevant usage before declaring that an override is necessary. A screenshot or component
   name alone does not establish a design-system gap.
4. **Apply a clearly applicable decision.** Record its original text and source in the existing
   question `decision` field: an originating form/question for an active decision, or
   `<class>/<id>` for an archived one (for example, "Keep the clear action — per
   tasks/u1/r2" or "Retain internal radius — per log ds/d2"). Preserve the original wording;
   provenance is a reference, not an invented human answer. Note the reuse in the summary.
5. **Ask only what remains.** A material choice, evidence that cannot be obtained, or work beyond
   the authorized scope can require the user. State the unresolved choice or specific blocker
   and its consequence. Do not guess values or loop indefinitely when evidence is unavailable.

Match the conditions and scope of the decision, not just the wording, node id, or feature.
A general policy can cover another component when its stated conditions hold. A narrow decision
about one component stays narrow; there is no global design-system priority.

A changed identifier alone is not a materially changed context. A different supported API,
state, behavior, dependency, or explicit restriction may be. Investigate that difference and
ask only for the unresolved choice. Conflicting applicable decisions require clarification.
The feature in a journal entry is its origin, not a restriction unless the decision says so.

After each answer, re-read affected state before choosing the next action. Reuse does not turn
a question answer into group approval or final acceptance (`group.md`). This is an agent
procedure; the CLI supplies rules and mechanical gates, not semantic consent checking.

## Red flags

- "I read this group when I started" → refresh the relevant forms immediately before asking.
- "This component has a different id, so I'll ask again" → check the decision's scope and
  conditions; an explicitly general policy can still apply.
- "The screenshot proves the component cannot do it" → inspect its supported API and usage.
- "I applied the past decision; no need to record its source" → preserve both the original
  answer and its provenance in the form.
- "The old answer probably applies" → verify conditions; unresolved conflicts need a decision.
- "I'll start a new class file for this" → classes are fixed (scope / ds / mockup); a new one only
  by human decision.

# etalon — the header and the unit's etalon

Core rule for the `protocol/draft` stage (the first half: up through the rows of difference, which
are owned by `rows.md`). Owner of the rules for capturing the etalon: what proves a value, what
goes into the header, how to record a mockup gap. Field format: `../SCHEMA.md` (`protocol.yaml`,
`header`, `etalon`). Read by whoever runs `/sbs:propose`.

## Header: three checks before comparing

Filled in first, before the etalon (`../SCHEMA.md`: an etalon with an empty header is a `validate`
error, "header first"). Three checks before comparing:

1. **Component identity.** Inspect the supported API, variants, tokens, and relevant usage before
   classifying a different appearance as redesign or a design-system limitation. A confirmed
   different composition needing a human choice becomes one `question` row, "decide as a
   whole"; small differences inside that unresolved composition aren't logged one by one.
2. **Mode and state.** Which state the frame carries (create/edit, empty/filled, default/error) and
   whether the live screen has been brought into it: the result goes into `frame_state`.
3. **Data source.** Whether the live screen runs on real or mock data: the result goes into
   `data_source`; content discrepancies caused by mocks are a data question, not a layout diff.

Compare equivalent mode, state, and data assumptions at a comparable viewport. Inspect fill,
hug, fixed, min/max, and responsive constraints before interpreting a frame's width as a fixed
requirement. A 1440px frame with fill columns does not by itself require 1440px-wide content in
a narrower viewport. Verify the applicable project decision and actual layout behavior.

Apply `decisions.md` before escalating an apparent mismatch. Changing mock data, obtaining
access, and other side effects remain subject to host permissions and task scope; these rules
do not authorize changing mocks or inventing missing behavior.

The path to the screen lives in the group: `screen` in `<gid>.group.yaml`, the full path from the
address, written at the group's first unit. The protocol's header carries only `state_path`: the
steps from the group's screen to this unit's state ("—" for the default state). A unit's
reproducibility = the group's `screen` + the protocol's `state_path`, read together.

## Capturing the etalon

Properties and tokens of the mockup node take precedence; the screenshot is auxiliary, for
composition only. Each `etalon.values[]` entry carries `prop`, `value`, `token` (if any), and
`node` (where it was captured from); without the node's address a value is indistinguishable from
"looked about right".

- **Values** — properties and tokens of specific nodes, not "what the screenshot shows".
- **Structure** (`etalon.structure`) — the composition and nesting of the unit's blocks from the
  mockup tree.
- **Semantics** (`etalon.semantics`) — which design-system components the mockup instances
  correspond to (the `figma` field holds the component's name in the mockup), so the code ends up
  with a ready-made component instead of hand-built divs.

## Mockup gap

The mockup has no property for the value you need (no token, no annotation, the state isn't
shown) → record it right away as a `question` row in `rows[]` (see `rows.md`), not with an "I'll
get to it later", and not with a value eyeballed off the screenshot. Put it off and the gap gets
lost between sessions; a verdict from a screenshot with no property behind it is an impression, not
an etalon.

Recording a provisional question preserves the finding; it does not require immediately
contacting the user. Investigate and apply `decisions.md` first. Correct a gap resolved by
observation as collection data under `rows.md`, without fabricating a human decision.

## Red flags

- "The spacing is visible on the screenshot, I won't bother pulling the property" → a value comes
  only from a property/token.
- "The screen runs on a mock, but the data looks close to the mockup; I'll check it as is" → the
  data source goes in the header, content discrepancies are a question, not a diff.
- "There's no property, but by analogy it looks like 20px" → a mockup gap gets recorded as a
  question, not a number.
- "I'll put together the etalon, then sort out the header" → the header must be filled in before
  the etalon.
- "I'll write state_path as the path from the neighboring unit" → state_path runs from the group's
  screen, not from a neighboring state.

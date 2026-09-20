# etalon — the header and the unit's etalon

Core rule for the `protocol/draft` stage (the first half: up through the rows of difference, which
are owned by `rows.md`). Owner of the rules for capturing the etalon: what proves a value, what
goes into the header, how to record a mockup gap. Field format: `../SCHEMA.md` (`protocol.yaml`,
`header`, `etalon`). Read by whoever runs `/sbs:propose`.

## Header: three checks before comparing

Filled in first, before the etalon (`../SCHEMA.md`: an etalon with an empty header is a `validate`
error, "header first"). Three checks before comparing:

1. **Component identity.** The same UI block is assembled from a different set of components in
   the mockup than in the code → that's a redesign: not into `header`, but straight into one
   `question` row, "decide as a whole"; pixel-level discrepancies inside it don't get logged one
   by one.
2. **Mode and state.** Which state the frame carries (create/edit, empty/filled, default/error) and
   whether the live screen has been brought into it: the result goes into `frame_state`.
3. **Data source.** Whether the live screen runs on real or mock data: the result goes into
   `data_source`; content discrepancies caused by mocks are a data question, not a layout diff.

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

# rows — protocol rows

Core rule for the `protocol/draft` stage (the second half: rows that come after the etalon; the
etalon itself is owned by `etalon.md`). Owner of the rules for logging rows: what becomes a `diff`,
what becomes a `question`, how to phrase `level`. Field format: `../SCHEMA.md` (`protocol.yaml`,
`rows[]`). Read by whoever runs `/sbs:propose`.

## Measuring the live screen

A measurement of a live element is a computed value taken from the live screen; "looks about right
from the screenshot" doesn't count as a measurement. A numeric, pixel-by-pixel comparison of the
live screen's rendering against the mockup frame is forbidden, even as a supporting signal: the
browser's rendering model and the mockup's are different, so a layout defect can't be told apart
from a rendering difference by the numbers alone. Before gate 2 (`approved`) no code gets fixed
based on rows: this stage only logs and describes discrepancies, fixing is a separate stage
(`fixing.md`).

## Diff row: number against number

Every `diff` row carries both ends of the comparison: `expected.value` + `expected.ref` (the value
and node address of the etalon) and `actual.value` + `actual.selector` (the value and address of
the live element). A row missing either end fails `validate` (`../SCHEMA.md`); "looks different"
without both numbers isn't a finding. A "from scratch" unit (the element doesn't exist in the app
yet) doesn't cancel that end: `actual.value` is `"element doesn't exist"`, `actual.selector` is the
expected place (the parent/container where the element will go).

`level` follows three levels of scrutiny:

- **value** — a specific property (spacing, color, font size).
- **structure** — composition, nesting, order of blocks.
- **semantics** — the wrong component/primitive was used (raw divs instead of a ready
  design-system component).

For a "from scratch" unit (a screen that doesn't exist in the app yet), structure/semantics rows
are legitimate: "there's no screen yet, it needs a Button from the design system" is a valid row,
not a premature conclusion.

## Question row: one per class of discrepancy

A redesign (a different set of components), a mismatch between the frame's mode/state and the live
screen's, a data-source question: these get logged as **one** `question` row for the whole class
of discrepancy, not scattered across `diff` rows for every small difference inside it. A question
row doesn't carry the fields of a diff row (`level`, `expected`, `actual`, `status`, `remeasure`):
only `what` and `decision` (`../SCHEMA.md`).

## Red flags

- "The screen is in a different mode, I'll log a difference for each field" → one `question` row
  about the mode mismatch, not a pile of diffs.
- "The value is almost the same, I won't bother writing out expected" → both ends are mandatory in
  every diff row.
- "The unit isn't in the code yet, it's too early to log rows" → structure/semantics rows for
  "from scratch" units are legitimate.
- "I'll just fix this spacing right now while I'm at it" → fixing rows before `approved` (gate 2)
  is forbidden.

# SCHEMA — sbs v3 artifacts

The contract for `.screen-by-screen/` forms: `registry.yaml` (feature registry), `<gid>.group.yaml`
(group form), and `protocol.yaml` (unit protocol). The CLI (`sbs`) owns the bookkeeping —
validation, status transitions (`promote`/`reopen`), the fact of handoff; the skills
(`/sbs:explore`, `/sbs:propose`, `/sbs:fix`, `/sbs:archive`) own judgment: slicing, the check method, triage; the
human owns the decisions (`decision`, `approval`, `acceptance`). Read by all four skills and the CLI; the deterministic contract tests are `test/*.test.mjs` in the repository.

## Form schema v3 (reference)

### `registry.yaml` (feature registry, lives at `<hub>/<feature>/registry.yaml`)

```yaml
version: 3
kind: registry
feature: okr-drawer            # feature slug = folder name in the hub
source: "https://mockup.example/file?node=150-200"
status: draft                  # draft | awaiting-approval | approved | closed
questions:                     # slicing questions
  - id: q1
    text: "Is the calendar a separate unit or a drawer state?"
    decision: null             # the user's verbatim answer; null = open
  - id: q2
    text: "The designer added a 'Balcony' screen — do we take it into the check as unit u22?"
    units: [u22]               # re-slicing declaration question: which units, added after approval, this answer authorizes
    decision: null
units:
  - id: u1
    title: "Create-goal drawer — default"
    node: "150:200"
    link: "https://mockup.example/file?node=150-200"
    bounds: "the whole drawer, excluding the calendar"
    group: g1                  # group id — units of one screen, as a block; a lone unit is a group of one; excluded units have no group
    status: pending            # pending | in-progress | closed | excluded
    protocol: null             # path to the protocol relative to the feature folder, once logged
    reason: null                # mandatory when excluded
approval: null                 # { decision, at, units: [u1, …], groups: { g1: [u1, u2] } } — gate 1;
                               # units is the composition seal, groups is the grouping seal; both written by promote
```

### `<gid>.group.yaml` (group form, `<hub>/<feature>/<gid>.group.yaml`; standalone — `<hub>/standalone-<slug>/main.group.yaml` with `registry: null`, `group: main`)

```yaml
version: 3
kind: group
registry: okr-drawer           # registry slug or null (standalone)
group: g1                      # group id = file name; membership is declared by the registry (units[].group), the form doesn't duplicate it
status: draft                  # draft | awaiting-approval | approved | awaiting-acceptance | closed
screen: null                   # full path to the screen from the address, one per group; written by /sbs:propose at the first unit
approval: null                 # { decision, at } — gate 2: one decision per group
acceptance: null                # { decision, at } — gate 3 (group acceptance)
sweep: null                    # { at: "2026-08-25T14:30", rows: ["u1/r1", …] } — sweep:
                               # timestamp (ISO down to the minute) and the re-measured rows ("<protocol without suffix>/<row id>")
reopened: []
```

### `protocol.yaml` (unit protocol, `<hub>/<feature>/<unit-id>.protocol.yaml`; a single screen with no registry — `<hub>/standalone-<slug>/main.protocol.yaml` with `registry: null`)

```yaml
version: 3
kind: protocol
registry: okr-drawer           # registry slug or null (a single screen)
unit: u1                       # unit id in the registry, or null
status: draft                  # draft | collected | closed
header:
  state_path: "—"              # steps from the group's screen to this unit's state; "—" for the default state
  node: "150:200"
  link: "https://mockup.example/file?node=150-200"
  frame_state: "create, empty form"
  data_source: mock            # real | mock
etalon:
  values:
    - { prop: "list gap", value: "20px", token: "2.5x", node: "150:201" }
  structure: "Drawer > Header(title+close) > Form(3 fields) > Footer(button)"
  semantics:                   # figma: component name in the mockup
    - { figma: "Button/Primary", component: "Button (design-system)" }
rows:
  - id: r1
    type: diff                 # diff | question
    what: "gap between form fields"
    level: value               # value | structure | semantics
    expected: { value: "20px (2.5x)", ref: "150:201" }
    actual: { value: "16px", selector: "form.drawer > .fields" }
    status: open                # open | fixed | verified
    remeasure: null            # { value: "20px", at: "2026-08-25T14:30" } — mandatory for verified
  - id: r2
    type: question
    what: "the mockup has no field error state — mockup gap"
    decision: null             # the user's verbatim decision; the question is closed once non-empty
```

### `promote` transitions (single table)

| Form | Transition | Conditions (all; on rejection, list which ones failed) |
|---|---|---|
| registry | draft → awaiting-approval | `validate` green; `units` non-empty; every unit has `title`+`node`+`link`; non-excluded units have `group`; `excluded` units have `reason` |
| registry | awaiting-approval → approved | `approval.decision` non-empty; every `questions[].decision` non-empty; the transition writes the `approval.units` and `approval.groups` seals |
| registry | approved → closed | every unit is `closed` or `excluded`; auto-triggered after the last group closes (or by hand) |
| protocol | draft → collected | `validate` green; `header` filled in (all 5 fields); `etalon.values` non-empty; the registry (if any) is `approved`, the unit exists and isn't excluded |
| protocol | collected → closed | only cascaded from the group; a direct promote is rejected: "the protocol is closed by the group: sbs promote <group>" |
| group | draft → awaiting-approval | `validate` green; `screen` non-empty; every unit of the group has a protocol in `collected` |
| group | awaiting-approval → approved | `approval.decision` non-empty; there are diff rows among the members |
| group | awaiting-approval → closed | `approval.decision` non-empty; no diff rows in any member; every member's question row has a `decision`; cascade: protocols → closed, units → closed, the registry auto-closes |
| group | approved → awaiting-acceptance | every diff row of every member is `verified` with `remeasure` (value and at); every question has a `decision`; sweep invariant (below) |
| group | awaiting-acceptance → closed | `acceptance.decision` non-empty; cascading closures as above |

Sweep invariant (checked by `promote`-ing a group from `approved` to `awaiting-acceptance`):
`sweep.at` is non-empty; `sweep.rows` is non-empty; the set of member diff rows with
`remeasure.at == sweep.at` matches `sweep.rows`; no row has `remeasure.at > sweep.at`.

Any other transition (no table entry for the current status): rejected with
`cannot promote <form>: no transitions from <status> - this is a terminal status`. Lowering a
status is only done via `reopen <form> --reason "..."`:

- **group** — from `closed | awaiting-acceptance` → `approved`, the CLI clears `sweep` and
  `acceptance`, cascades members `closed → collected` and units `closed → in-progress`, the reason
  is appended to the form (`reopened: [{reason, at}]` field); the protocol isn't reopened
  separately ("the signature stands under the group").
- **registry** — from `closed` → `approved`, as before.

### Domain checks in `validate` (beyond structural ones; exact messages)

- `rows` non-empty while `etalon.values` is empty → `protocol.yaml: rows: diff rows with an empty etalon - etalon comes first (staging)`
- `etalon.values` non-empty while `header` isn't filled in → `protocol.yaml: etalon: etalon with an empty header — header first (staging order)`
- diff row: `status: verified`, `remeasure: null` → `protocol.yaml: rows[r1]: status verified, but remeasure is incomplete - verified only after a re-measurement (value and at)`; `verified` requires both `remeasure.value` **and** `remeasure.at`
- diff row: `status: fixed|verified`, but the unit's **group** isn't `approved`+ → `protocol.yaml: rows[r1]: fixes before the collected approval (gate 2)`
- diff row without `expected.value`/`expected.ref` → `protocol.yaml: rows[r1]: expected has no value/ref — number against number, both ends are mandatory` (symmetric for `actual`)
- a "from scratch" unit, the element doesn't exist in the app yet: `actual.value: "element doesn't exist"`, `actual.selector` — the expected place (the parent/container where the element will go); both ends stay filled in
- question row with `status`/`expected`/`actual`/`remeasure` → `protocol.yaml: rows[r2]: question doesn't carry diff-row fields`
- the protocol references a `registry` that doesn't exist in the hub / the unit isn't found → `protocol.yaml: registry: registry 'X' not found in the hub` / `unit: unit 'uN' is missing from the registry`
- protocol: the unit has no group form logged in the folder → `protocol.yaml: group: the unit's group form wasn't found in the folder — it's created by sbs new protocol`
- protocol: `status: closed` while the group isn't `closed` → `protocol.yaml: status: closed while the group is in status … — the protocol is closed by the group`
- registry: an `excluded` unit with no `reason` → `registry.yaml: units[u3]: excluded with no reason`
- registry: a non-excluded unit outside `draft` with no `group` → `registry.yaml: units[uN]: no group — every unit in progress belongs to a group`
- registry: an `excluded` unit with a `group` → `registry.yaml: units[uN]: excluded with a group — an excluded unit isn't part of a batch`
- registry: units of the same group aren't consecutive → `registry.yaml: units[uN]: group gX is split - units of the same group must be contiguous in units[] (one run)`
- registry: **grouping seal** — a unit's `group` diverges from `approval.groups` → `registry.yaml: units[uN]: group "…" diverges from the grouping seal (approval.groups: …) — reshuffling groups after approval is authorized by a declaration question`. A registry with `approval.units` but no `approval.groups` is legacy, the grouping check doesn't apply
- registry `approved`, but `approval` is empty (edited by hand) → `registry.yaml: approval: status approved with no recorded decision — statuses are moved by promote`
- **seal (re-slicing):** an `approved`/`closed` registry with an `approval.units` seal, and `units[]` has a unit outside the seal with no declaration question (`questions[]` with `units: [id]` and a non-empty `decision`) → `registry.yaml: units[u22]: unit added after the slicing approval (seal approval.units) - adding it later is authorized by a declaration question: questions[] with units: [u22] and a recorded decision`. The same guard is in `sbs new protocol`. A registry with no seal (approved before it existed) is legacy, the check doesn't apply until the next approval
- `questions[].units` references a unit that doesn't exist → `registry.yaml: questions[q2]: units — unit "u9" not found in the registry`
- group: the registry has no units with `group: gX` → `<gid>.group.yaml: group: registry '…' has no units with group: gX — group has no members`
- group: a sweep row isn't found among the members' diff rows → `<gid>.group.yaml: sweep: rows — row "…" not found among the members' diff rows`
- group: `status awaiting-acceptance|closed` with diff rows and no recorded sweep → structural error in the sweep invariant
- group: `closed`, but members aren't closed → `<gid>.group.yaml: group members not closed (…) — closing cascades from the group's promote`
- group: file name ≠ `group` → error (same as feature/folder)
- unknown status / unknown top-level field → structural error listing the allowed values.

# screen-by-screen (sbs)

A CLI plus four agent skills that turn "check the layout against the mockup" into a paper
trail with explicit human gates: what to check is written down, what's wrong is measured
number against number, and nothing moves to the next stage without a recorded decision. Built
for people using Claude Code or Codex on UI work. Form contract: [SCHEMA.md](SCHEMA.md);
stage rules: [rules/](rules/).

## Install

```bash
npm i -D screen-by-screen
npx sbs init
```

Run `sbs init` at the repository root: the hub is created relative to the current directory.

Or run it without installing:

```bash
npx screen-by-screen init
```

`sbs init` installs both tool targets by default. To install only one:

```bash
npx sbs init --tools claude
```

`init` creates:

- `.screen-by-screen/` — the hub: `config.yaml` and a `decisions/` folder for the decision
  journals.
- `.claude/skills/sbs-*` and `.claude/commands/sbs/*` — Claude Code skills and `/sbs:*` slash
  commands.
- `.agents/skills/sbs-*` — Codex skills.

After upgrading the package, refresh the generated files:

```bash
npx sbs update
```

`update` rewrites the generated skill and command files in place; it never touches the hub or
anything you've written into it.

## Supported tools

| Tool | What `init` writes | How you invoke it |
|---|---|---|
| Claude Code | `.claude/skills/sbs-<x>/SKILL.md` + `.claude/commands/sbs/<x>.md` | `/sbs:explore`, `/sbs:propose`, `/sbs:fix`, `/sbs:archive` |
| Codex | `.agents/skills/sbs-<x>/SKILL.md` | by name or by intent (Codex has no slash commands) |

## Workflow

Four skills, run in order per feature:

**`/sbs:explore`** — slices the mockup into units (a screen or a screen state) and builds the
feature registry. Anything disputable becomes a batch of questions instead of a guess. The
user signs off on the list of units — **gate 1, slicing approval** — and that approval is
sealed: the exact set of units it covers is recorded.

**`/sbs:propose`** — for each unit, collects the etalon (the reference values taken from the
mockup) and measures the live screen against it, row by row. No code is touched here. The
group — all units of one screen — is submitted as a whole for **gate 2, group approval**.

**`/sbs:fix`** — fixes the code for the open rows of an approved group, re-measures each one
with the same method that found it, and runs a sweep (one pass that re-checks every row closed
in this round) before submitting the group for **gate 3, acceptance**.

**`/sbs:archive`** — once a feature's registry is closed, distills the decisions made along the
way into the hub's decision journals (`.screen-by-screen/decisions/`) and moves the feature's
folder into the archive.

Only `sbs promote` moves a form's status, and only when the paperwork is clean.

## The renovation analogy

The system reads like an apartment renovation done against a signed contract: the client
(the user) signs off on paper, the foreman (the agent) works strictly from it, and bookkeeping
(the `sbs` CLI) won't let work continue while the paperwork is out of order.

| In the analogy | In the system |
|---|---|
| The apartment project | The mockup |
| The estimate: list of rooms | `registry.yaml`: the feature's unit registry |
| A room | A unit — a screen or a state of a screen |
| Signing the estimate | Gate 1: slicing approval (`approval.decision`) |
| The seal on the estimate | `approval.units`: the named set of units the signature covers |
| The report for one room | `protocol.yaml`: the unit protocol |
| "What it should look like" in the report | The etalon (`etalon`): properties and tokens taken from the mockup |
| The punch list | `rows[]` of type `diff`: live vs. mockup, number against number |
| A question to the client in the report | `rows[]` of type `question` / the registry's `questions[]` |
| A work order for a section (rooms on one riser) | `<gid>.group.yaml`: a group — units of one screen |
| Signing the work order | Gates 2 and 3 live on the group: its `approval` / `acceptance` |
| The control-walk line on the work order | `sweep`: the time of the walk and the list of re-measured items |
| Splitting the estimate into sections | `units[].group` + the `approval.groups` seal |
| Signing the section's punch list | Gate 2: group approval |
| Clearing the punch list with a control measurement | A fix + `remeasure` → `verified` |
| Accepting the section | Gate 3: the group's `acceptance.decision` |
| Reopening a closed work order | `sbs reopen --reason` |
| "The designer added a balcony" | A re-slicing declaration question: `questions[]` with `units: [id]` |
| The client's decision log at the office | `.screen-by-screen/decisions/<class>.yaml` — a distillate of decisions by class (scope / ds / mockup), written by `/sbs:archive` |
| Moving a finished job's paperwork to storage | `/sbs:archive`: the feature's folder moves to `<hub>/archive/` |

### The renovation, step by step

**1. The estimate (`/sbs:explore`).** The foreman walks the whole project and builds an
estimate: every room gets its own line, including closets and dark corners (empty states,
error states, popups). Anything the foreman wants to exclude needs a recorded reason.
Disputable boundaries ("is the balcony its own room or part of the living room?") are batched
into a set of questions. The client reviews the list and signs. The moment of signing,
bookkeeping puts on a **seal**: it records, by name, exactly which set of rooms the signature
covers.

**2. The report for a room (`/sbs:propose`).** For each room, the foreman takes what the
project says it should look like (the etalon), measures what's actually there (the live
application), and writes up the punch list — number against number, nothing eyeballed. The
report for a room is an unsigned inventory: the client doesn't sign it, the punch list is just
`collected`. What gets signed is the **whole section's work order** — every room on one riser at
once, as a single list. No room in the section has an open item — the signature closes the
whole section at once. No code is touched at this stage.

**3. Fixing (`/sbs:fix`).** The foreman fixes only what's in the signed work order, **section by
section**. Every fixed item is **re-measured with the same tool** — "painted" doesn't mean
"level"; only a control measurement closes an item. Anything noticed along the way isn't
quietly fixed — it becomes a question. Before handoff, a control walk covers the whole section:
every closed item is re-measured in one pass, and the result is recorded in the work order's
`sweep`. Once the walk is clean and the questions are answered, the section goes to the client
for acceptance. Accepting the last section also closes the estimate — the renovation is done.

**4. Archive (`/sbs:archive`).** The job is done, but the paperwork isn't thrown out. The
foreman copies every client decision out of it into the office's logs
(`.screen-by-screen/decisions/<class>.yaml`, kept in git), then moves the paperwork itself into
storage (`<hub>/archive/`) — it drops out of the summaries. On the next job, the office checks
the log first: if the same question came up before and the circumstances match, it works from
the recorded answer without bothering the client; if circumstances changed, it asks again,
showing the old entry ([rules/decisions.md](rules/decisions.md)).

**Only bookkeeping moves the paperwork.** Form statuses change only through `sbs promote`, and
only when the paperwork is clean: the client's decisions are recorded verbatim, measurements
are in place. Moving a status backward requires an official `sbs reopen` with a reason that
stays on the form permanently.

**Reopening a work order.** Rejecting acceptance for even one room reopens the **whole
section**, not just that room: bookkeeping voids the old acceptance and the work order's
control walk, and the section's reports go back into work — the whole section has to be redone
and resubmitted for acceptance, not just the one room.

### The designer changed the project mid-renovation

Two different cases:

**An existing room was redesigned.** If the room hasn't been started yet, this is free — its
report will be taken from the new project anyway. If the room is already closed, the **whole
section's work order** is reopened (`reopen` with the reason "unit mockup updated"): its rooms
reopen with it, the etalon is retaken, and the delta becomes new punch-list items plus a
question to the client; bookkeeping won't let the work order close again without the client's
recorded answer. Rule: [rules/fixing.md](rules/fixing.md), "Mockup updated".

**A new room was added (a balcony).** This is a re-slicing of the estimate — another
`/sbs:explore` pass. The foreman diffs the project against the estimate, adds the balcony as a
line, and **must** file a declaration: a question listing what was added (`units: [id]`), with
the client's answer recorded verbatim. This is where the seal kicks in: a room added after
signing, without a declaration carrying a recorded answer, fails `validate`, and bookkeeping
refuses to let "start the balcony's report" (`sbs new protocol`) through. A balcony can't be
slipped into the work past the client — not because the foreman is disciplined, but because the
door won't open. Rule: [rules/registry.md](rules/registry.md), "Re-slicing".

Estimates signed before the seal existed keep living under the old rules: no seal means the
check doesn't apply until the next signing.

### In one sentence

The client isn't signing off on "the renovation in general" — they're signing off on specific
lists: rooms, punch-list items, acceptances; anything that shows up beyond what was signed
needs their recorded, verbatim decision, and bookkeeping won't let the work move forward
without it.

## CLI reference

Every command accepts `--json` for a machine-readable response, including on failure. Exit
codes: `0` ok, `1` validation problems, `2` usage / own failure.

| Command | What it does |
|---|---|
| `sbs status` | Hub summary: what stands where, what's waiting on the human, what's in progress. |
| `sbs instructions <form>` | This form's current stage: task, rules to read, where to write, what's next. |
| `sbs validate [<feature>]` | Checks v3 forms; exits 1 on errors. |
| `sbs new registry <feature> --source <link>` | Creates a feature registry from the template. |
| `sbs new protocol <feature>/<unit>` | Creates a unit protocol (the registry must be approved). |
| `sbs new protocol --standalone <slug>` | Creates a standalone screen protocol with no registry. |
| `sbs promote <form>` | Advances the form to its next status per the transition table — the only command that moves a status. |
| `sbs reopen <form> --reason "..."` | Returns a closed form to work with a reason recorded on it permanently. |
| `sbs init [path] [--tools claude,codex]` | Installs the hub and the agent skill/command files. Idempotent; default tools are `claude,codex`. |
| `sbs update [path]` | Refreshes generated agent files after a package upgrade; never touches the hub. |

## Forms

There are three form kinds: the feature registry (`registry.yaml`), the group form
(`<gid>.group.yaml`), and the unit protocol (`protocol.yaml`). Their fields, statuses and
transition tables are the contract in [SCHEMA.md](SCHEMA.md); the judgment behind each stage —
what counts as a unit, how to collect an etalon, how to triage rows — is in [rules/](rules/).
Only `sbs promote` moves a form's status; skills and agents write content into a form, never
its status field directly.

## Bring your own tools

The core is agnostic to how you read a mockup or inspect a live screen — it never names a
specific mockup source or browser automation tool (Figma is just one example of where a mockup
might live). To use `sbs`, the agent needs, from its own skills or MCP servers:

- **A way to read the mockup**: node properties, design tokens, and links to specific nodes.
- **A way to inspect the live screen**: computed styles, DOM structure, and screenshots.

Wiring those up is out of scope for this package — bring the skills or MCP servers you already
use for design and browser work.

## License

MIT — see [LICENSE](LICENSE).

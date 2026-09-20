# screen-by-screen: extraction into an open-source npm package

Date: 2026-09-19. Status: approved in chat, pending implementation.

## Goal

Move the `sbs` toolkit (CLI core + rules + templates + agent skills) out of the private
`hola-web` repository into a standalone public repository `KondratevDenis/screen-by-screen`,
published to npm as `screen-by-screen`, distributed the way OpenSpec is: one CLI that both
does the bookkeeping and installs agent instruction files into a host project.

Everything user-facing is in English. The tool stays agnostic to mockup and browser tooling:
the core says "mockup", "live screen", "measurement" and never names Figma MCP or Playwright.

## What ships

```
screen-by-screen/
  bin/sbs.js                    # entry point, imports src/cli.js
  src/
    cli.js                      # argv parsing, command dispatch, usage
    forms.js                    # vocabularies, hub loading, form resolution, write-back
    validate.js                 # validateRegistry / validateProtocol / validateGroup
    stages.js                   # STAGES, RULE_WHAT, promote transition table, reopen
    commands/
      status.js  validate.js  instructions.js  new.js  promote.js  reopen.js
      init.js                   # NEW: install hub + agent files
      update.js                 # NEW: refresh generated agent files
    install/                    # NEW: tool targets for init/update
      claude.js  codex.js
  rules/*.md                    # methodology, read by agents via `sbs instructions`
  templates/*.yaml              # registry / protocol / group blanks
  skills/sbs-{explore,propose,fix,archive}/SKILL.md   # single source for all tools
  commands/sbs/{explore,propose,fix,archive}.md       # Claude Code slash commands
  SCHEMA.md                     # form contract v3
  README.md                     # the "apartment renovation" walkthrough, install, commands
  test/*.test.mjs               # node:test, spawns the CLI against temp hubs
  docs/specs/                   # this file
  .github/workflows/ci.yml      # node 20/22: npm test
  .github/workflows/release.yml # on tag v*: npm publish --provenance
  package.json  LICENSE (MIT)  CHANGELOG.md  .gitignore
```

Plain ESM, no build step, no TypeScript. One runtime dependency: `js-yaml`. `engines.node >= 20`.
`package.json` `files` whitelists `bin src rules templates skills commands SCHEMA.md README.md`.

The 1.7k-line `sbs.mjs` is split along its existing `// ---` section markers. Behaviour of the
six existing commands does not change except for message language.

## Existing commands (unchanged semantics)

`status`, `instructions <form>`, `validate [<feature>]`, `new registry|protocol`, `promote <form>`,
`reopen <form> --reason`. `--json` on every command. Exit codes: 0 ok, 1 validation problems,
2 usage / own failure.

`sbs instructions` keeps printing absolute paths to `rules/*.md` and `SCHEMA.md` inside the
installed package, so agent skills never hardcode where the package lives.

## New commands

### `sbs init [path] [--tools claude,codex]`

Default tools: `claude,codex`. Idempotent.

1. Creates `<path>/.screen-by-screen/` with `config.yaml` (`version: 3`) and `decisions/` holding
   `scope.yaml`, `ds.yaml`, `mockup.yaml` as empty lists (`[]`) if they do not exist.
2. Writes tool files (see targets). Existing files are overwritten only when they carry an
   `sbs` generation marker; a foreign file with the same path is left alone and reported.
3. Prints what was written and the next step (`/sbs:explore <mockup link>`).

### `sbs update [path]`

Re-writes every generated tool file that exists on disk (detected by marker), for the tools
found in the project. Never touches the hub. Reports files whose `generatedBy` was older.

### Tool targets

| Tool | Skills | Commands |
|---|---|---|
| claude | `.claude/skills/sbs-<x>/SKILL.md` | `.claude/commands/sbs/<x>.md` |
| codex | `.agents/skills/sbs-<x>/SKILL.md` | none (Codex has no slash commands; skills are invoked by name or intent) |

Skill files are the same content for both tools. Generated files get frontmatter
`metadata: { generatedBy: "<pkg version>", author: screen-by-screen }` plus the existing name /
description. Commands say `Read and follow @.claude/skills/sbs-<x>/SKILL.md`.

Config moves from the package directory into the hub: `.screen-by-screen/config.yaml`.
The core reads it from the hub root, warns on unknown keys, and works on defaults if it is missing.

## Schema decisions

- Form `version: 3` and every YAML key stay exactly as today (`etalon`, `figma`, `remeasure`,
  `sweep`, ...). Renaming would break archived hubs in existing projects for no functional gain.
  English prose explains `etalon` as "reference values taken from the mockup"; the `figma` field
  in `semantics` is documented as "component name in the mockup".
- Hub folder name stays `.screen-by-screen`.
- Decision journals keep the three classes `scope`, `ds`, `mockup`.

## Translation

All Russian text becomes English: CLI messages and hints, comments, `STAGES` / `RULE_WHAT`,
rules, SCHEMA, templates, README, skills, commands, tests. Glossary that every file follows:

| Russian | English |
|---|---|
| сверка | check (verb: check the layout against the mockup) |
| хаб | hub |
| фича | feature |
| юнит | unit |
| реестр | registry |
| протокол | protocol |
| группа / наряд | group |
| эталон | etalon (reference values) |
| строка (diff / question) | row |
| замер / перемер | measurement / re-measurement |
| контрольный обход | sweep |
| нарезка / дорезка | slicing / re-slicing |
| пломба | seal |
| апрув / приёмка | approval / acceptance |
| вскрытие | reopen |
| гейт | gate |
| решение дословно | decision, verbatim |
| макет | mockup |
| живой экран | live screen |
| прораб / заказчик / бухгалтерия (README analogy) | foreman / client / bookkeeping |

Tests assert on message substrings, so they are translated together with the messages and must
stay green after each file lands.

## Testing

`test/smoke.test.mjs` ports the existing 61 scenarios to `node:test` with the same
spawn-the-CLI approach. New scenarios: `init` on an empty dir creates hub + both tool targets;
`init --tools claude` writes no `.agents`; `init` twice is a no-op; `update` refreshes a
stale `generatedBy`, skips unmarked files; config read from the hub, not from the package.

CI runs `npm test` on Node 20 and 22.

## Release

Manual by the maintainer: bump version, tag `v1.0.0`, push; `release.yml` publishes with
`npm publish --provenance --access public` using `NPM_TOKEN` secret (or the maintainer runs
`npm publish` locally). First published version: `1.0.0`.

## Migration of hola-web (separate step, after publish)

1. `pnpm add -D screen-by-screen`, remove `"sbs": "link:.claude/sbs"`.
2. Delete `.claude/sbs/`.
3. Delete `.claude/skills/sbs-*`, `.agents/skills/sbs-*` symlinks, `.claude/commands/sbs/`.
4. `npx sbs init` regenerates them in English. Claude keeps answering in Russian per CLAUDE.md.
5. Move `config.yaml` into `.screen-by-screen/` (init does it).
6. Update AGENTS.md references and the memory note `sbs-is-tool-agnostic` (paths changed).
7. `npx sbs validate` must be green against the existing hub and archive.

## Out of scope

- Figma / Playwright skills (`figma-mcp`, `playwright-live`): they stay in the host project.
- Other tool targets (Cursor, Windsurf, ...). Adding one is a new file in `src/install/`.
- TypeScript, bundling, interactive `init` prompts.

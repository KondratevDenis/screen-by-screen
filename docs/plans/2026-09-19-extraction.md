# screen-by-screen Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the copied `sbs` core into the publishable npm package `screen-by-screen` (English, `init`/`update` commands, CI) without changing the behaviour of the six existing commands.

**Architecture:** Plain ESM Node CLI. `bin/sbs.js` imports `src/cli.js`; the former monolith is split along its section markers into `forms.js` / `validate.js` / `stages.js` / `commands/*.js`. `init` and `update` copy the package's `skills/` and `commands/` into tool-specific paths (`src/install/{claude,codex}.js`) and stamp them with `generatedBy`. Tests spawn the CLI against temp hubs with `node:test`.

**Tech Stack:** Node ≥ 20, `js-yaml` (only dependency), `node:test`, GitHub Actions.

**Spec:** `docs/specs/2026-09-19-extraction-design.md`

## Global Constraints

- Package name `screen-by-screen`, bin name `sbs`, license MIT, repository `https://github.com/KondratevDenis/screen-by-screen`.
- `engines.node >= 20`. One runtime dependency: `js-yaml`. No build step, no TypeScript.
- Form schema stays `version: 3`; no YAML key is renamed (`etalon`, `figma`, `remeasure`, `sweep`, ...). Hub folder stays `.screen-by-screen`.
- Exit codes: 0 ok, 1 validation problems, 2 usage / own failure. `--json` prints exactly one JSON document on stdout.
- All prose, messages, comments and tests in English; follow the glossary in the spec (hub, feature, unit, registry, protocol, group, etalon, row, measurement, sweep, slicing, seal, approval, acceptance, reopen, gate, mockup, live screen).
- Core never names Figma, Playwright or any MCP tool.
- **No git commits by the agent.** The maintainer commits. Each task ends with `npm test` green.
- Work in `~/WebstormProjects/screen-by-screen` (the new repo). `hola-web` is not touched by this plan.

---

### Task 1: Package scaffold and node:test runner

**Files:**
- Create: `package.json`, `bin/sbs.js`, `LICENSE`, `.gitignore`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `CHANGELOG.md`
- Modify: `test/smoke.mjs` → rename to `test/smoke.test.mjs`, port to `node:test`
- Keep: `src/sbs.mjs` untouched

**Interfaces:**
- Produces: `npm test` runs `node --test test/`; `bin/sbs.js` is the CLI entry; test helpers `run(args, cwd)`, `makeHub(files)`, `expectOk`, `expectFail`, `VALID_PROTOCOL`, `VALID_GROUP`, `SOLO` exported from `test/helpers.mjs` for later tasks.

- [ ] **Step 1: package.json**

```json
{
  "name": "screen-by-screen",
  "version": "1.0.0",
  "description": "Layout-vs-mockup checks for AI coding agents, screen by screen: a CLI that keeps the paperwork honest and installs the sbs skills into your project",
  "keywords": ["figma", "layout", "design-review", "ai", "agent", "claude-code", "codex", "cli"],
  "homepage": "https://github.com/KondratevDenis/screen-by-screen",
  "repository": { "type": "git", "url": "https://github.com/KondratevDenis/screen-by-screen" },
  "bugs": "https://github.com/KondratevDenis/screen-by-screen/issues",
  "license": "MIT",
  "author": "Denis Kondratev",
  "type": "module",
  "bin": { "sbs": "./bin/sbs.js" },
  "files": ["bin", "src", "rules", "templates", "skills", "commands", "SCHEMA.md", "README.md"],
  "engines": { "node": ">=20" },
  "publishConfig": { "access": "public" },
  "scripts": { "test": "node --test test/" },
  "dependencies": { "js-yaml": "^4.1.0" }
}
```

Check the js-yaml version actually resolvable: `npm view js-yaml version` and pin `^<major>` to what is published (hola used `^5.3.0`; use whatever `npm view` returns).

- [ ] **Step 2: bin/sbs.js**

```js
#!/usr/bin/env node
import '../src/sbs.mjs';
```

`chmod +x bin/sbs.js`. Update `smoke` `SBS` constant to point at `../bin/sbs.js`.

- [ ] **Step 3: LICENSE (MIT, "Copyright (c) 2026 Denis Kondratev"), .gitignore (`node_modules/`, `.DS_Store`, `*.tgz`), CHANGELOG.md (`## 1.0.0 — unreleased` with one line: "First public release, extracted from a private repo.")**

- [ ] **Step 4: CI workflows**

`.github/workflows/ci.yml`: on push + pull_request, matrix node `[20, 22]`, steps `actions/checkout@v4`, `actions/setup-node@v4` with `node-version: ${{ matrix.node }}`, `npm ci`, `npm test`.

`.github/workflows/release.yml`: on `push: tags: ['v*']`, `permissions: { contents: read, id-token: write }`, setup-node with `registry-url: https://registry.npmjs.org`, `npm ci`, `npm test`, `npm publish --provenance --access public` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.

- [ ] **Step 5: Port smoke.mjs to node:test**

Create `test/helpers.mjs` exporting `run`, `makeHub`, `expectOk`, `expectFail`, `VALID_PROTOCOL`, `VALID_GROUP`, `SOLO` (copy bodies from `smoke.mjs`; `SBS = new URL('../bin/sbs.js', import.meta.url).pathname`). In `test/smoke.test.mjs` replace `scenario(name, fn)` with `test(name, fn)` from `node:test`; drop the hand-rolled counter and `process.exit`. Messages asserted stay Russian for now (Task 3 translates them).

- [ ] **Step 6: Install and run**

```bash
npm install && npm test
```
Expected: 61 tests pass. Also `node bin/sbs.js --help` prints usage.

---

### Task 2: Read config.yaml from the hub, not from the package

**Files:**
- Modify: `src/sbs.mjs` `loadConfig()` (~line 229) and its call sites
- Test: `test/smoke.test.mjs`

- [ ] **Step 1: Failing tests**

```js
test('config: unknown key in hub config warns but does not fail', () => {
  const root = makeHub({ 'config.yaml': 'version: 3\nfoo: 1\n' });
  const r = run(['validate'], root);
  expectOk(r);
  assert.ok(r.out.includes('foo'));
});
test('config: missing config is fine', () => {
  expectOk(run(['validate'], makeHub({})));
});
```

- [ ] **Step 2: Implement** — `loadConfig(hubRoot)` reads `join(hubRoot, 'config.yaml')`; call it after `findRoot` with the resolved root when non-null. Delete `config.yaml` from the package root (it no longer ships).

- [ ] **Step 3: `npm test` green.**

---

### Task 3: Translate the CLI and its tests to English

**Files:**
- Modify: `src/sbs.mjs` (every string, comment, `STAGES`, `RULE_WHAT`, `usage()`), `test/smoke.test.mjs`, `test/helpers.mjs`

**Interfaces:**
- Produces: stable English messages that Task 7/8 tests will match. Fix the exact wording of these anchors now and keep them:
  - missing hub: `no .screen-by-screen folder found`
  - unknown command: `unknown command "<x>"`, hint `did you mean "<y>"` / `available: ...`
  - unknown flag: `unknown flag "<x>"`
  - validation category words used by tests: `staging` (for «этапность»), `seal` (for «пломба»), `verbatim`, `gate`
  - promote refusal header: `cannot promote <form>:`
  - reopen requires `--reason`
  - stage `waiting` prefix: `waiting for the human:`

- [ ] **Step 1: Translate `src/sbs.mjs` top to bottom.** Rules: keep all identifiers and YAML keys; translate comments too; typographic quotes `«»` → straight `"`; `—` inside messages → `-` or a colon. Keep `--json` shapes byte-identical except message text.

- [ ] **Step 2: Translate test names and asserted substrings in `test/smoke.test.mjs` and fixture strings in `test/helpers.mjs` (`frame_state: "default"`). Keep the scenario set: 61 + 2 from Task 2.**

- [ ] **Step 3: Verify no Cyrillic remains**

```bash
grep -nP '[\x{0400}-\x{04FF}]' src/sbs.mjs test/*.mjs && echo LEFTOVERS || echo clean
npm test
```
Expected: `clean`, all tests pass.

---

### Task 4: Split the monolith into modules

**Files:**
- Create: `src/cli.js`, `src/forms.js`, `src/validate.js`, `src/stages.js`, `src/commands/{status,validate,instructions,new,promote,reopen}.js`, `src/paths.js`
- Delete: `src/sbs.mjs`
- Modify: `bin/sbs.js` → `import '../src/cli.js'`

**Interfaces:**
- `src/paths.js`: `export const PKG_ROOT` (package root dir, resolved from `import.meta.url`), `export const RULES_DIR`, `TEMPLATES_DIR`, `SKILLS_DIR`, `COMMANDS_DIR`, `SCHEMA_PATH`, `export function findHub(start)` (old `findRoot`), `export function projectRoot(start)`, `export function pkgVersion()` (reads `package.json`).
- `src/forms.js`: vocabularies (`REGISTRY_STATUSES` … `GROUP_REQUIRED`, `SLUG`), `loadHub`, `formsOf`, `resolveForm`, `bundleOf`, `writeForm`, `stampGates`, `TODAY`, `loadYamlFile`, `makeProblems`, `loadConfig`.
- `src/validate.js`: `validateRegistry`, `validateProtocol`, `validateGroup`, `validateOne`, `memberUnitsOf`, `groupOf`, `memberProtocolsOf`, `figmaLinkProblem` (rename to `mockupLinkProblem`), helpers.
- `src/stages.js`: `STAGES`, `RULE_WHAT`, `promotePlan`, `closeGroupCascade`.
- `src/output.js`: `fail`, `failList`, `nearest`, `notFound`, `setJsonMode`, `isJsonMode`.
- `src/commands/<name>.js`: `export function cmd<Name>(...)` with the same signatures as today.
- `src/cli.js`: arg parsing, `COMMANDS`, `usage()`, dispatch. Exports nothing; runs on import.

- [ ] **Step 1: Move code section by section (markers `// --- ... ---`), add imports/exports, no logic edits.**
- [ ] **Step 2: `npm test` green; `node bin/sbs.js --help` and `node bin/sbs.js status --json` in a temp hub behave as before.**

---

### Task 5: Translate rules, SCHEMA and templates

**Files:**
- Modify: `rules/{registry,etalon,rows,fixing,group,decisions}.md`, `SCHEMA.md`, `templates/{registry,protocol,group}.yaml`

**Interfaces:**
- Produces: `RULE_WHAT` in `src/stages.js` must describe the translated files accurately (adjust wording if a rule's framing changed).

- [ ] **Step 1: Translate each file with the spec glossary.** Preserve headings that `STAGES`/skills reference by name: `registry.md` section "Re-slicing" (was «Дорезка»), `fixing.md` section "Mockup updated" (was «Макет обновился»). Replace `figma.com` example links with `https://mockup.example/file?node=150-200`; keep the `figma:` YAML key in `semantics` and document it as "component name in the mockup".
- [ ] **Step 2: Templates: translate comments only; keys and defaults unchanged.**
- [ ] **Step 3: Verify**

```bash
grep -rnP '[\x{0400}-\x{04FF}]' rules SCHEMA.md templates && echo LEFTOVERS || echo clean
npm test
```
Also run in a temp dir: `sbs new registry demo --source https://mockup.example/x` then `sbs validate` → green (templates still parse and pass the draft checks).

---

### Task 6: Translate skills and commands (package sources)

**Files:**
- Modify: `skills/sbs-{explore,propose,fix,archive}/SKILL.md`, `commands/sbs/{explore,propose,fix,archive}.md`

- [ ] **Step 1: Translate SKILL.md files.** Frontmatter `description` keeps the trigger style ("Use for /sbs:explore, 'slice the mockup into units', ... Not for ... — that is /sbs:propose"). Keep every `sbs <command>` invocation and every rule/section name in sync with Task 5. Remove the `metadata` block if any; Task 7 stamps it at install time.
- [ ] **Step 2: Translate commands** to the OpenSpec style:

```md
---
name: "SBS: Explore"
description: Slice the mockup into units and open the feature registry for a layout check
category: Workflow
tags: [workflow, layout, scope]
---

Read and follow @.claude/skills/sbs-explore/SKILL.md.

User input:

$ARGUMENTS
```

- [ ] **Step 3: `grep -rnP '[\x{0400}-\x{04FF}]' skills commands` → clean.**

---

### Task 7: `sbs init`

**Files:**
- Create: `src/install/targets.js`, `src/install/claude.js`, `src/install/codex.js`, `src/install/generate.js`, `src/commands/init.js`
- Modify: `src/cli.js` (register `init`, flag `--tools`, `init` is hub-optional)
- Test: `test/init.test.mjs`

**Interfaces:**
- `src/install/generate.js`:
  - `export const MARKER = 'generatedBy'`
  - `export function renderSkill(name, version)` → string: SKILL.md content with frontmatter `name`, `description` (from package source), `metadata: { author: screen-by-screen, generatedBy: "<version>" }`
  - `export function renderCommand(name)` → package `commands/sbs/<name>.md` content verbatim (add `generatedBy` into frontmatter as `metadata.generatedBy`)
  - `export function isGenerated(text)` → `true` if frontmatter contains `generatedBy:`
  - `export function generatedVersion(text)` → string | null
- `src/install/targets.js`: `export const SKILL_NAMES = ['explore','propose','fix','archive']`, `export const TOOLS = { claude, codex }` where each tool is `{ id, files(projectRoot, version) → Array<{ path, content }> }`.
- `src/install/claude.js`: skills at `.claude/skills/sbs-<x>/SKILL.md`, commands at `.claude/commands/sbs/<x>.md`.
- `src/install/codex.js`: skills at `.agents/skills/sbs-<x>/SKILL.md`.
- `src/commands/init.js`: `export function cmdInit(pathArg, flags)`; `flags.tools` = comma list, default `claude,codex`; unknown tool → `fail('unknown tool "<x>"', 'known: claude, codex')`.

Behaviour:
1. `project = resolve(pathArg ?? '.')`; hub = `project/.screen-by-screen`; create `config.yaml` (`version: 3\n`) and `decisions/{scope,ds,mockup}.yaml` (`[]\n`) only when missing.
2. For each file from each tool: if absent → write; if present and `isGenerated` → overwrite; else → skip and list under `kept (not generated by sbs)`.
3. Print `written:` / `unchanged:` / `kept:` lists and `next: /sbs:explore <mockup link>`; `--json` → `{ ok: true, written: [...], unchanged: [...], kept: [...] }`.

- [ ] **Step 1: Failing tests** (`test/init.test.mjs`, uses `run` from helpers with a fresh `mkdtempSync` dir containing `.git`):

```js
test('init: creates hub and both tool targets by default', () => {
  const root = fresh();
  expectOk(run(['init'], root));
  for (const p of [
    '.screen-by-screen/config.yaml', '.screen-by-screen/decisions/scope.yaml',
    '.claude/skills/sbs-explore/SKILL.md', '.claude/commands/sbs/fix.md',
    '.agents/skills/sbs-archive/SKILL.md',
  ]) assert.ok(existsSync(join(root, p)), p);
  const skill = readFileSync(join(root, '.claude/skills/sbs-propose/SKILL.md'), 'utf8');
  assert.match(skill, /generatedBy: "1\.\d+\.\d+"/);
});
test('init --tools claude: no .agents', () => { ... assert !existsSync('.agents') });
test('init: unknown tool refused', () => expectFail(run(['init', '--tools', 'cursor'], fresh()), 'unknown tool'));
test('init twice: second run reports unchanged, rewrites nothing foreign', () => {
  const root = fresh(); run(['init'], root);
  writeFileSync(join(root, '.claude/commands/sbs/fix.md'), '# mine\n');
  const r = run(['init', '--json'], root); expectOk(r);
  const j = JSON.parse(r.out);
  assert.ok(j.kept.includes('.claude/commands/sbs/fix.md'));
  assert.equal(readFileSync(join(root, '.claude/commands/sbs/fix.md'), 'utf8'), '# mine\n');
});
test('init: does not clobber existing decisions journal', () => { write scope.yaml with content; init; content intact });
```

- [ ] **Step 2: Implement** modules above. `--tools` is a value flag (add to `VALUE_FLAGS`). `init` joins `HUB_OPTIONAL`.
- [ ] **Step 3: `npm test` green. Manual: `cd $(mktemp -d) && git init -q && node ~/WebstormProjects/screen-by-screen/bin/sbs.js init` → lists files; `node .../bin/sbs.js status` → empty hub summary.**

---

### Task 8: `sbs update`

**Files:**
- Create: `src/commands/update.js`
- Modify: `src/cli.js`
- Test: `test/update.test.mjs`

**Interfaces:**
- `export function cmdUpdate(pathArg, flags)`: for each tool in `TOOLS`, for each file: exists and `isGenerated` → rewrite (report `updated` if `generatedVersion` differed, `unchanged` otherwise); exists and not generated → `kept`; absent → skip silently (tool not installed). Never touches `.screen-by-screen/`. Refuses with exit 2 if no generated file exists at all: `nothing to update - run sbs init first`.

- [ ] **Step 1: Failing tests**

```js
test('update: refreshes stale generatedBy', () => {
  const root = fresh(); run(['init', '--tools', 'claude'], root);
  const p = join(root, '.claude/skills/sbs-fix/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/generatedBy: "[^"]+"/, 'generatedBy: "0.0.1"'));
  const r = run(['update', '--json'], root); expectOk(r);
  assert.ok(JSON.parse(r.out).updated.includes('.claude/skills/sbs-fix/SKILL.md'));
  assert.doesNotMatch(readFileSync(p, 'utf8'), /0\.0\.1/);
});
test('update: leaves .agents alone when only claude was installed', ...);
test('update: skips unmarked files', ...);
test('update: without init refuses', () => expectFail(run(['update'], fresh()), 'sbs init'));
```

- [ ] **Step 2: Implement; `npm test` green.**

---

### Task 9: README, usage text, CHANGELOG

**Files:**
- Modify: `README.md` (rewrite in English), `src/cli.js` `usage()`, `CHANGELOG.md`

- [ ] **Step 1: README structure**: one-paragraph pitch; Install (`npm i -D screen-by-screen` + `npx sbs init`, or `npx screen-by-screen init`); Supported tools table (Claude Code, Codex); Workflow (the four skills, one paragraph each); The renovation analogy (translated table + walkthrough from the current README); CLI reference (all eight commands, `--json`); Forms → link to SCHEMA.md; Bring your own tools (the core is agnostic: mockup reader and browser tool live in your own skills; mention what a mockup-reader skill needs to provide: node properties and tokens, and what a browser skill needs: computed styles and structure); License.
- [ ] **Step 2: `usage()` lists `init` and `update` with one-line descriptions.**
- [ ] **Step 3: `grep -rnP '[\x{0400}-\x{04FF}]' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs` → clean.** (`docs/` may keep Russian-free anyway; specs are English.)

---

### Task 10: Package verification

- [ ] **Step 1: `npm pack --dry-run`** → file list contains `bin/`, `src/**`, `rules/`, `templates/`, `skills/`, `commands/`, `SCHEMA.md`, `README.md`, `LICENSE`, `package.json` and nothing else (no `test/`, no `docs/`).
- [ ] **Step 2: Install from tarball into a temp project**

```bash
cd ~/WebstormProjects/screen-by-screen && npm pack
T=$(mktemp -d) && cd $T && git init -q && npm init -y >/dev/null && npm i -D ~/WebstormProjects/screen-by-screen/screen-by-screen-1.0.0.tgz
npx sbs init && npx sbs status && npx sbs new registry demo --source https://mockup.example/x && npx sbs validate && npx sbs instructions demo/registry.yaml --json
```
Expected: rule paths in the `instructions` output point inside `node_modules/screen-by-screen/rules/`.

- [ ] **Step 3: Compatibility with the existing hola-web hub**

```bash
cd ~/WebstormProjects/hola-web && node ~/WebstormProjects/screen-by-screen/bin/sbs.js validate && node ~/WebstormProjects/screen-by-screen/bin/sbs.js status
```
Expected: green (archive folders are skipped as today; decision journals untouched).

- [ ] **Step 4: Report** the tarball size, file list, and the exact commands the maintainer runs to publish (`gh repo create` / push / `npm publish`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run, fresh, expectOk, expectFail } from './helpers.mjs';
import { claude } from '../src/install/claude.js';
import { codex } from '../src/install/codex.js';
import { isGenerated } from '../src/install/generate.js';

// Pins the module load order: claude.js/codex.js must be independently importable (they used to
// depend on a binding re-exported by targets.js that was not yet initialized when either of them
// was the entry point, throwing "Cannot access '...' before initialization").
test('install/claude.js and codex.js load and produce files when imported directly', () => {
  const claudeFiles = claude.files('/tmp/sbs-direct-import-check', '1.0.0');
  assert.ok(claudeFiles.some((f) => f.path.endsWith('.claude/skills/sbs-explore/SKILL.md')));
  assert.ok(claudeFiles.some((f) => f.path.endsWith('.claude/commands/sbs/fix.md')));
  const codexFiles = codex.files('/tmp/sbs-direct-import-check', '1.0.0');
  assert.ok(codexFiles.some((f) => f.path.endsWith('.agents/skills/sbs-archive/SKILL.md')));
  assert.equal(codexFiles.length, 4);
});

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

test('init --tools claude: no .agents', () => {
  const root = fresh();
  expectOk(run(['init', '--tools', 'claude'], root));
  assert.ok(existsSync(join(root, '.claude/skills/sbs-explore/SKILL.md')));
  assert.ok(!existsSync(join(root, '.agents')), '.agents should not be created');
});

test('init: unknown tool refused', () => {
  expectFail(run(['init', '--tools', 'cursor'], fresh()), 'unknown tool');
});

test('init --tools with no value: refused, not silently defaulted', () => {
  const root = fresh();
  expectFail(run(['init', '--tools'], root), '--tools needs a value');
  assert.ok(!existsSync(join(root, '.screen-by-screen')), 'must not have installed anything');
});

test('init twice: second run reports unchanged, rewrites nothing foreign', () => {
  const root = fresh();
  run(['init'], root);
  writeFileSync(join(root, '.claude/commands/sbs/fix.md'), '# mine\n');
  const r = run(['init', '--json'], root);
  expectOk(r);
  const j = JSON.parse(r.out);
  assert.ok(j.kept.includes('.claude/commands/sbs/fix.md'));
  assert.equal(readFileSync(join(root, '.claude/commands/sbs/fix.md'), 'utf8'), '# mine\n');
});

test('isGenerated: recognises a generated file resaved with CRLF line endings', () => {
  const root = fresh();
  run(['init', '--tools', 'claude'], root);
  const lf = readFileSync(join(root, '.claude/skills/sbs-fix/SKILL.md'), 'utf8');
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.ok(isGenerated(crlf), 'CRLF-resaved generated file should still be recognised as generated');
});

test('init: does not clobber existing decisions journal', () => {
  const root = fresh();
  mkdirSync(join(root, '.screen-by-screen/decisions'), { recursive: true });
  writeFileSync(join(root, '.screen-by-screen/decisions/scope.yaml'), '- decided: true\n');
  expectOk(run(['init'], root));
  assert.equal(readFileSync(join(root, '.screen-by-screen/decisions/scope.yaml'), 'utf8'), '- decided: true\n');
});

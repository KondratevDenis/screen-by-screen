import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run, fresh, expectOk, expectFail } from './helpers.mjs';

test('update: refreshes stale generatedBy', () => {
  const root = fresh();
  run(['init', '--tools', 'claude'], root);
  const p = join(root, '.claude/skills/sbs-fix/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/generatedBy: "[^"]+"/, 'generatedBy: "0.0.1"'));
  const r = run(['update', '--json'], root);
  expectOk(r);
  assert.ok(JSON.parse(r.out).updated.includes('.claude/skills/sbs-fix/SKILL.md'));
  assert.doesNotMatch(readFileSync(p, 'utf8'), /0\.0\.1/);
});

test('update: same version but hand-edited body -> appears in updated, content restored', () => {
  const root = fresh();
  run(['init', '--tools', 'claude'], root);
  const p = join(root, '.claude/skills/sbs-fix/SKILL.md');
  const original = readFileSync(p, 'utf8');
  writeFileSync(p, `${original}\nEDITED BY HAND\n`); // generatedBy version untouched - only the body drifted
  const r = run(['update', '--json'], root);
  expectOk(r);
  assert.ok(JSON.parse(r.out).updated.includes('.claude/skills/sbs-fix/SKILL.md'));
  assert.equal(readFileSync(p, 'utf8'), original);
});

test('update: leaves .agents alone when only claude was installed', () => {
  const root = fresh();
  run(['init', '--tools', 'claude'], root);
  expectOk(run(['update'], root));
  assert.ok(!existsSync(join(root, '.agents')), '.agents should not be created by update');
});

test('update: only codex installed - refreshes .agents, creates no .claude', () => {
  const root = fresh();
  run(['init', '--tools', 'codex'], root);
  const p = join(root, '.agents/skills/sbs-fix/SKILL.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace(/generatedBy: "[^"]+"/, 'generatedBy: "0.0.1"'));
  const r = run(['update', '--json'], root);
  expectOk(r);
  assert.ok(JSON.parse(r.out).updated.includes('.agents/skills/sbs-fix/SKILL.md'));
  assert.doesNotMatch(readFileSync(p, 'utf8'), /0\.0\.1/);
  assert.ok(!existsSync(join(root, '.claude')), '.claude should not be created by update');
});

test('update: skips unmarked files', () => {
  const root = fresh();
  run(['init', '--tools', 'claude'], root);
  const p = join(root, '.claude/commands/sbs/fix.md');
  writeFileSync(p, '# mine\n');
  const r = run(['update', '--json'], root);
  expectOk(r);
  const j = JSON.parse(r.out);
  assert.ok(j.kept.includes('.claude/commands/sbs/fix.md'));
  assert.equal(readFileSync(p, 'utf8'), '# mine\n');
});

test('update: without init refuses', () => {
  expectFail(run(['update'], fresh()), 'sbs init');
});

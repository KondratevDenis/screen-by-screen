import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { run, fresh, makeHub, expectOk, expectFail, VALID_PROTOCOL, VALID_GROUP, SOLO } from './helpers.mjs';

test('validate: empty hub - success with no forms', () => {
  const root = makeHub({});
  expectOk(run(['validate'], root));
});

test('validate: verified with no remeasure.at - fails, pointing right at it', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL()
    .replace('status: open', 'status: verified').replace('remeasure: null', 'remeasure: { value: 20px, at: null }') });
  expectFail(run(['validate'], root), 'rows[r1]', 'remeasure');
});
test('validate: rows with an empty etalon - staging', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL().replace('values: [ { prop: gap, value: 20px, token: 2.5x, node: "1:3" } ]', 'values: []') });
  expectFail(run(['validate'], root), 'staging');
});
test('validate: question with diff fields - fails', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL().replace('type: diff', 'type: question') });
  expectFail(run(['validate'], root), 'rows[r1]', 'question');
});
test('validate: protocol under a non-approved registry - fails', () => {
  const root = makeHub({
    'feat/registry.yaml': `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: draft\nquestions: []\nunits: [ { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: in-progress, protocol: u1.protocol.yaml, reason: null } ]\napproval: null`,
    'feat/u1.protocol.yaml': VALID_PROTOCOL('').replace('registry: null', 'registry: feat').replace('unit: null', 'unit: u1'),
  });
  expectFail(run(['validate'], root), 'registry', 'approved');
});
test('validate: excluded with no reason - fails', () => {
  const root = makeHub({ 'feat/registry.yaml': `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: draft\nquestions: []\nunits: [ { id: u3, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, status: excluded, protocol: null, reason: null } ]\napproval: null` });
  expectFail(run(['validate'], root), 'units[u3]', 'reason');
});
test('validate: valid standalone protocol - green', () => {
  const root = SOLO();
  expectOk(run(['validate'], root));
});
test('validate: version 2 - the core reads only v3', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL().replace('version: 3', 'version: 2') });
  expectFail(run(['validate'], root), 'version 3');
});
test('validate: approval in the protocol - unknown field', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL('approval: null') });
  expectFail(run(['validate'], root), 'approval');
});

// Unit completeness is required by the draft -> awaiting-approval transition, not by the act of
// writing itself: while in draft, the slicing is still being written. A pair of scenarios holds
// the boundary from both sides.
const THIN_REGISTRY = (status) => `
version: 3
kind: registry
feature: feat
source: "https://figma.com/design/X?node-id=1-1"
status: ${status}
questions: []
units: [ { id: u1, title: null, node: null, link: null, bounds: null, group: g1, status: pending, protocol: null, reason: null } ]
approval: null`;

test('validate: draft registry with an unfilled unit - green (warning, not error)', () => {
  const root = makeHub({ 'feat/registry.yaml': THIN_REGISTRY('draft') });
  const r = run(['validate'], root);
  expectOk(r);
  assert.ok(r.out.includes('⚠ feat/registry.yaml: units[u1]: missing title'), 'expected a unit warning, output:\n' + r.out);
});
test('validate: the same unit at awaiting-approval - fails', () => {
  const root = makeHub({ 'feat/registry.yaml': THIN_REGISTRY('awaiting-approval') });
  expectFail(run(['validate'], root), 'units[u1]', 'missing title');
});

test('promote: draft->collected for a valid protocol', () => {
  const root = SOLO();
  expectOk(run(['promote', 'solo/main.protocol.yaml'], root));
  const after = readFileSync(join(root, '.screen-by-screen/solo/main.protocol.yaml'), 'utf8');
  assert.ok(/^status: collected$/m.test(after));
});
test('promote: collected - direct closing fails, points to the group', () => {
  const root = SOLO(VALID_PROTOCOL().replace('status: draft', 'status: collected'));
  expectFail(run(['promote', 'solo/main.protocol.yaml'], root), 'the group is what closes the protocol');
});
test('promote: registry not approved AND unit missing - failure lists both violations', () => {
  const reg = `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: draft\nquestions: []\nunits: [ { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null } ]\napproval: null`;
  const proto = VALID_PROTOCOL('').replace('registry: null', 'registry: feat').replace('unit: null', 'unit: u9');
  const root = makeHub({ 'feat/registry.yaml': reg, 'feat/u9.protocol.yaml': proto });
  const r = run(['promote', 'feat/u9.protocol.yaml'], root);
  expectFail(r, "unit 'u9'", 'approved');
});

test('status: no hub yet - does not fail, hints to create one', () => {
  const root = makeHub({});
  const r = run(['status'], root); expectOk(r);
  assert.ok(r.out.includes('create one'), 'expected a hint to create a registry, output:\n' + r.out);
});
test('status: shows what is waiting on the human', () => {
  const root = makeHub({ 'feat/registry.yaml': `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: awaiting-approval\nquestions: []\nunits: [ { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null } ]\napproval: null` });
  const r = run(['status'], root); expectOk(r);
  assert.ok(r.out.includes('awaiting-approval') && r.out.includes('feat'));
});
test('new: creates a standalone protocol from the template', () => {
  const root = makeHub({});
  expectOk(run(['new', 'protocol', '--standalone', 'my-screen'], root));
  const text = readFileSync(join(root, '.screen-by-screen/standalone-my-screen/main.protocol.yaml'), 'utf8');
  assert.ok(text.includes('kind: protocol'));
});
test('instructions: prints the stage rules by status', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL() });
  const r = run(['instructions', 'solo/main.protocol.yaml'], root); expectOk(r);
  assert.ok(r.out.includes('rules/etalon.md') && r.out.includes('rules/rows.md') && r.out.includes('rules/decisions.md'));
});

// The slicing seal: approval (gate 1) records the named set of units in approval.units; a unit
// added after approval (re-slicing after a mockup update) is legal only with a declaration
// question (questions[].units + the human's recorded decision). A registry with no seal is
// legacy - the check does not apply.
const SEALED_REGISTRY = ({ extraUnit = '', questions = '[]', seal = 'at: "2026-08-22", units: [u1], groups: { g1: [u1] }' } = {}) => `
version: 3
kind: registry
feature: feat
source: "https://figma.com/design/X?node-id=1-1"
status: approved
questions: ${questions}
units:
  - { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null }${extraUnit}
approval: { decision: "slicing ok", ${seal} }`;
const EXTRA_UNIT = `
  - { id: u2, title: T2, node: "1:5", link: "https://figma.com/design/X?node-id=1-5", bounds: b, group: g2, status: pending, protocol: null, reason: null }`;

test('promote: approving the slicing writes the approval.units seal', () => {
  const reg = `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: awaiting-approval\nquestions: []\nunits: [ { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null } ]\napproval: { decision: "slicing ok" }`;
  const root = makeHub({ 'feat/registry.yaml': reg });
  expectOk(run(['promote', 'feat/registry.yaml'], root));
  const after = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(after.match(/approval:[\s\S]*?units:[\s\S]*?u1/), 'expected the approval.units seal, form:\n' + after);
});
test('validate: unit outside the seal with no declaration - fails', () => {
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ extraUnit: EXTRA_UNIT }) });
  expectFail(run(['validate'], root), 'units[u2]', 'after the slicing approval');
});
test('validate: unit outside the seal, declaration with no decision - fails', () => {
  const q = '[ { id: q1, text: "the designer added a screen - do we take u2?", decision: null, units: [u2] } ]';
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ extraUnit: EXTRA_UNIT, questions: q }) });
  expectFail(run(['validate'], root), 'units[u2]', 'after the slicing approval');
});
test('validate: unit outside the seal with a declaration and a decision - green', () => {
  const q = '[ { id: q1, text: "the designer added a screen - do we take u2?", decision: "Take it", units: [u2] } ]';
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ extraUnit: EXTRA_UNIT, questions: q }) });
  expectOk(run(['validate'], root));
});
test('validate: declaration references a nonexistent unit - fails', () => {
  const q = '[ { id: q1, text: "take u9?", decision: "Take it", units: [u9] } ]';
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ questions: q }) });
  expectFail(run(['validate'], root), 'questions[q1]', 'u9');
});
test('validate: registry with no seal (legacy) - an added unit is tolerated', () => {
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ extraUnit: EXTRA_UNIT, seal: 'at: "2026-08-22"' }) });
  expectOk(run(['validate'], root));
});
test('new protocol: unit outside the seal with no decision - fails', () => {
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ extraUnit: EXTRA_UNIT }) });
  expectFail(run(['new', 'protocol', 'feat/u2'], root), 'after the slicing approval');
});
test('new protocol: unit outside the seal with a decision - gets created', () => {
  const q = '[ { id: q1, text: "the designer added a screen - do we take u2?", decision: "Take it", units: [u2] } ]';
  const root = makeHub({ 'feat/registry.yaml': SEALED_REGISTRY({ extraUnit: EXTRA_UNIT, questions: q }) });
  expectOk(run(['new', 'protocol', 'feat/u2'], root));
});

test('new: standalone creates a protocol+group pair', () => {
  const root = makeHub({});
  expectOk(run(['new', 'protocol', '--standalone', 'my-screen'], root));
  const g = readFileSync(join(root, '.screen-by-screen/standalone-my-screen/main.group.yaml'), 'utf8');
  assert.ok(g.includes('kind: group') && /^group: "main"/m.test(g));
});
test('new: the unit\'s first protocol creates the group file, the second does not', () => {
  const reg = `
version: 3
kind: registry
feature: feat
source: "https://figma.com/design/X?node-id=1-1"
status: approved
questions: []
units:
  - { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null }
  - { id: u2, title: T2, node: "1:5", link: "https://figma.com/design/X?node-id=1-5", bounds: b, group: g1, status: pending, protocol: null, reason: null }
approval: { decision: "slicing ok", at: "2026-08-22", units: [u1, u2], groups: { g1: [u1, u2] } }`;
  const root = makeHub({ 'feat/registry.yaml': reg });
  expectOk(run(['new', 'protocol', 'feat/u1'], root));
  const g = readFileSync(join(root, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(g.includes('kind: group') && /^registry: "feat"/m.test(g) && /^group: "g1"/m.test(g));
  const r2 = run(['new', 'protocol', 'feat/u2'], root);
  expectOk(r2);
  assert.ok(!r2.out.includes('group created'), 'the second group must not be recreated, output:\n' + r2.out);
});
test('new: unit with no group - fails', () => {
  const reg = `
version: 3
kind: registry
feature: feat
source: "https://figma.com/design/X?node-id=1-1"
status: approved
questions: []
units:
  - { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, status: pending, protocol: null, reason: null }
approval: { decision: "slicing ok", at: "2026-08-22" }`;
  const root = makeHub({ 'feat/registry.yaml': reg });
  expectFail(run(['new', 'protocol', 'feat/u1'], root), 'no group');
});

test('validate: unit in progress with no group - fails outside draft', () => {
  const reg = SEALED_REGISTRY({}).replace('group: g1, ', '');
  const root = makeHub({ 'feat/registry.yaml': reg });
  expectFail(run(['validate'], root), 'units[u1]', 'no group');
});
test('validate: a group\'s run is split - fails', () => {
  const units = `
  - { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null }
  - { id: u2, title: T, node: "1:3", link: "https://figma.com/design/X?node-id=1-3", bounds: b, group: g2, status: pending, protocol: null, reason: null }
  - { id: u3, title: T, node: "1:4", link: "https://figma.com/design/X?node-id=1-4", bounds: b, group: g1, status: pending, protocol: null, reason: null }`;
  const root = makeHub({ 'feat/registry.yaml': `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: draft\nquestions: []\nunits:${units}\napproval: null` });
  expectFail(run(['validate'], root), 'units[u3]', 'is split');
});
test('validate: excluded between group units does not break the run', () => {
  const units = `
  - { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null }
  - { id: u2, title: T, node: "1:3", link: "https://figma.com/design/X?node-id=1-3", bounds: b, status: excluded, protocol: null, reason: "decoration" }
  - { id: u3, title: T, node: "1:4", link: "https://figma.com/design/X?node-id=1-4", bounds: b, group: g1, status: pending, protocol: null, reason: null }`;
  const root = makeHub({ 'feat/registry.yaml': `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: draft\nquestions: []\nunits:${units}\napproval: null` });
  expectOk(run(['validate'], root));
});
test('validate: excluded with group - fails', () => {
  const reg = SEALED_REGISTRY({}).replace('status: pending', 'status: excluded').replace('reason: null', 'reason: "duplicate"');
  const root = makeHub({ 'feat/registry.yaml': reg });
  expectFail(run(['validate'], root), 'excluded with group');
});
test('promote: gate 1 writes the grouping seal approval.groups', () => {
  const reg = `\nversion: 3\nkind: registry\nfeature: feat\nsource: "https://figma.com/design/X?node-id=1-1"\nstatus: awaiting-approval\nquestions: []\nunits: [ { id: u1, title: T, node: "1:2", link: "https://figma.com/design/X?node-id=1-2", bounds: b, group: g1, status: pending, protocol: null, reason: null } ]\napproval: { decision: "slicing ok" }`;
  const root = makeHub({ 'feat/registry.yaml': reg });
  expectOk(run(['promote', 'feat/registry.yaml'], root));
  const after = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(after.match(/groups:[\s\S]*?g1:[\s\S]*?u1/), 'expected the approval.groups seal, form:\n' + after);
});
test('validate: a regrouped unit against the seal - fails; sanctioned by a question - green', () => {
  const sealed = SEALED_REGISTRY({}).replace('group: g1', 'group: g9');
  expectFail(run(['validate'], makeHub({ 'feat/registry.yaml': sealed })), 'units[u1]', 'grouping seal');
  const q = '[ { id: q1, text: "regroup u1 into g9?", decision: "Yes", units: [u1] } ]';
  const withQ = SEALED_REGISTRY({ questions: q }).replace('group: g1', 'group: g9');
  expectOk(run(['validate'], makeHub({ 'feat/registry.yaml': withQ })));
});
test('validate: registry with no approval.groups (legacy) - regrouping is tolerated', () => {
  const reg = SEALED_REGISTRY({ seal: 'at: "2026-08-22", units: [u1]' }).replace('group: g1', 'group: g9');
  expectOk(run(['validate'], makeHub({ 'feat/registry.yaml': reg })));
});

test('validate: protocol with no group form - fails', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL() });
  expectFail(run(['validate'], root), 'the unit\'s group form was not found');
});
test('validate: fixed before the group\'s approval - fails (gate 2)', () => {
  const root = SOLO(VALID_PROTOCOL().replace('status: open', 'status: fixed'), VALID_GROUP());
  expectFail(run(['validate'], root), 'rows[r1]', 'gate 2');
});
test('validate: fixed with the group approved - green', () => {
  const root = SOLO(
    VALID_PROTOCOL().replace('status: draft', 'status: collected').replace('status: open', 'status: fixed'),
    VALID_GROUP().replace('status: draft', 'status: approved').replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }'),
  );
  expectOk(run(['validate'], root));
});
test('validate: group with no members in the registry - fails', () => {
  const root = makeHub({
    'feat/registry.yaml': SEALED_REGISTRY({}),
    'feat/g9.group.yaml': VALID_GROUP().replace('registry: null', 'registry: feat').replace('group: main', 'group: g9'),
  });
  expectFail(run(['validate'], root), 'no units with group: g9');
});
test('validate: group file name != group - fails', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL(), 'solo/main.group.yaml': VALID_GROUP().replace('group: main', 'group: g1') });
  expectFail(run(['validate'], root), 'does not match the file name');
});
test('validate: protocol closed while the group is open - fails', () => {
  const root = SOLO(
    VALID_PROTOCOL().replace('status: draft', 'status: closed').replace('status: open', 'status: verified').replace('remeasure: null', 'remeasure: { value: 20px, at: "2026-08-22T10:00" }'),
    VALID_GROUP().replace('status: draft', 'status: approved').replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }'),
  );
  expectFail(run(['validate'], root), 'the group is what closes the protocol');
});
test('validate: sweep references a nonexistent row - fails', () => {
  const root = SOLO(VALID_PROTOCOL(), VALID_GROUP().replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["main/r9"] }'));
  expectFail(run(['validate'], root), 'main/r9');
});

// --- promote: the group's state machine + the closing cascade ---
// A hub with a registry of two units (u1, u2) in one group g1, approved and sealed
// (approval.units/approval.groups), plus a pair of member protocols. The unit's node and the
// protocol's header.node must match (validate checks this) - a fixed id <-> node pairing:
// u1 <-> "1:10", u2 <-> "1:20" (computed from the id deterministically).
const REG3 = ({ status = 'approved', units, questions = '[]', seal = 'units: [u1, u2], groups: { g1: [u1, u2] }' } = {}) => `
version: 3
kind: registry
feature: feat
source: "https://figma.com/design/X?node-id=1-1"
status: ${status}
questions: ${questions}
units:${units}
approval: { decision: "slicing ok", at: "2026-08-22", ${seal} }`;
const U = (id, node, group = 'g1', status = 'in-progress', protocol = `${id}.protocol.yaml`) =>
  `\n  - { id: ${id}, title: T, node: "${node}", link: "https://figma.com/design/X?node-id=${node.replace(':', '-')}", bounds: b, group: ${group}, status: ${status}, protocol: ${protocol}, reason: null }`;
// VALID_PROTOCOL keeps the unit's node only in header.node ("1:2") - and the same node's link
// node-id is tied to that same address ("node-id=1-2"), so both spots are rewritten to a pair
// consistent with U(): id "uN" -> node "1:N0".
const PROTO3 = (unit, over = '') => {
  const node = `1:${unit.slice(1)}0`;
  return VALID_PROTOCOL(over)
    .replace('registry: null', 'registry: feat')
    .replace('unit: null', `unit: ${unit}`)
    .replace('"1:2"', `"${node}"`)
    .replace('node-id=1-2', `node-id=${node.replace(':', '-')}`);
};
const GROUP3 = (over = '') => VALID_GROUP(over).replace('registry: null', 'registry: feat').replace('group: main', 'group: g1');
// A member with no diff rows: its only row is a question with a recorded decision.
const noDiffProto = (unit) =>
  PROTO3(unit)
    .replace(/- \{ id: r1, type: diff,[\s\S]*?remeasure: null \}/, '- { id: r1, type: question, what: "no error state", decision: "Not needed" }')
    .replace('status: draft', 'status: collected');
const collectedDiffProto = (unit) => PROTO3(unit).replace('status: draft', 'status: collected');
const verifiedProto = (unit, at = '2026-08-22T10:00') =>
  collectedDiffProto(unit)
    .replace('status: open', 'status: verified')
    .replace('remeasure: null', `remeasure: { value: 20px, at: "${at}" }`);

test('promote: group draft->awaiting-approval requires collected members and a screen', () => {
  const units = U('u1', '1:10') + U('u2', '1:20');
  const reg = REG3({ units });
  const group = GROUP3();
  // subscenario 1: members not collected yet - fails
  const rootFail = makeHub({
    'feat/registry.yaml': reg,
    'feat/u1.protocol.yaml': PROTO3('u1'),
    'feat/u2.protocol.yaml': PROTO3('u2'),
    'feat/g1.group.yaml': group,
  });
  expectFail(run(['promote', 'feat/g1.group.yaml'], rootFail), 'protocol in status draft', 'collected');
  // subscenario 2: both members collected, screen filled in - success
  const rootOk = makeHub({
    'feat/registry.yaml': reg,
    'feat/u1.protocol.yaml': collectedDiffProto('u1'),
    'feat/u2.protocol.yaml': collectedDiffProto('u2'),
    'feat/g1.group.yaml': group,
  });
  expectOk(run(['promote', 'feat/g1.group.yaml'], rootOk));
  const after = readFileSync(join(rootOk, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(/^status: awaiting-approval$/m.test(after));
});

test('promote: gate 2 with no decision - fails', () => {
  const units = U('u1', '1:10') + U('u2', '1:20');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units }),
    'feat/u1.protocol.yaml': collectedDiffProto('u1'),
    'feat/u2.protocol.yaml': collectedDiffProto('u2'),
    'feat/g1.group.yaml': GROUP3().replace('status: draft', 'status: awaiting-approval'),
  });
  expectFail(run(['promote', 'feat/g1.group.yaml'], root), 'gate 2');
});

test('promote: a group with no diff rows closes at gate 2 by cascade', () => {
  const units = U('u1', '1:10') + U('u2', '1:20');
  const group = GROUP3()
    .replace('status: draft', 'status: awaiting-approval')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units }),
    'feat/u1.protocol.yaml': noDiffProto('u1'),
    'feat/u2.protocol.yaml': noDiffProto('u2'),
    'feat/g1.group.yaml': group,
  });
  expectOk(run(['promote', 'feat/g1.group.yaml'], root));
  const groupAfter = readFileSync(join(root, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(groupAfter));
  const proto1After = readFileSync(join(root, '.screen-by-screen/feat/u1.protocol.yaml'), 'utf8');
  const proto2After = readFileSync(join(root, '.screen-by-screen/feat/u2.protocol.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(proto1After), 'protocol u1 is not closed:\n' + proto1After);
  assert.ok(/^status: closed$/m.test(proto2After), 'protocol u2 is not closed:\n' + proto2After);
  const regAfter = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(regAfter), 'registry is not closed:\n' + regAfter);
});

test('promote: mixed group - a no-diff member does not close before gate 3', () => {
  const units = U('u1', '1:10') + U('u2', '1:20');
  const group = GROUP3()
    .replace('status: draft', 'status: awaiting-approval')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units }),
    'feat/u1.protocol.yaml': noDiffProto('u1'),
    'feat/u2.protocol.yaml': collectedDiffProto('u2'),
    'feat/g1.group.yaml': group,
  });
  expectOk(run(['promote', 'feat/g1.group.yaml'], root));
  const groupAfter = readFileSync(join(root, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(/^status: approved$/m.test(groupAfter));
  const proto1After = readFileSync(join(root, '.screen-by-screen/feat/u1.protocol.yaml'), 'utf8');
  assert.ok(/^status: collected$/m.test(proto1After), 'protocol u1 closed before gate 3:\n' + proto1After);
});

test('promote: approved->awaiting-acceptance with no sweep - fails', () => {
  const units = U('u1', '1:10');
  const group = GROUP3()
    .replace('status: draft', 'status: approved')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units, seal: 'units: [u1], groups: { g1: [u1] }' }),
    'feat/u1.protocol.yaml': verifiedProto('u1'),
    'feat/g1.group.yaml': group,
  });
  expectFail(run(['promote', 'feat/g1.group.yaml'], root), 'sweep is not recorded');
});

test('promote: remeasure later than sweep.at - fails', () => {
  const units = U('u1', '1:10');
  const group = GROUP3()
    .replace('status: draft', 'status: approved')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u1/r1"] }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units, seal: 'units: [u1], groups: { g1: [u1] }' }),
    'feat/u1.protocol.yaml': verifiedProto('u1', '2026-08-22T11:00'),
    'feat/g1.group.yaml': group,
  });
  expectFail(run(['promote', 'feat/g1.group.yaml'], root), 'is later than the sweep');
});

test('promote: a row measured at sweep time is not declared in sweep.rows - fails', () => {
  const units = U('u1', '1:10');
  const group = GROUP3()
    .replace('status: draft', 'status: approved')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: [] }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units, seal: 'units: [u1], groups: { g1: [u1] }' }),
    'feat/u1.protocol.yaml': verifiedProto('u1'),
    'feat/g1.group.yaml': group,
  });
  expectFail(run(['promote', 'feat/g1.group.yaml'], root), 'not declared in sweep.rows');
});

test('promote: a valid sweep - the group goes to acceptance', () => {
  const units = U('u1', '1:10') + U('u2', '1:20');
  const group = GROUP3()
    .replace('status: draft', 'status: approved')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u2/r1"] }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units }),
    'feat/u1.protocol.yaml': noDiffProto('u1'),
    'feat/u2.protocol.yaml': verifiedProto('u2'),
    'feat/g1.group.yaml': group,
  });
  expectOk(run(['promote', 'feat/g1.group.yaml'], root));
  const groupAfter = readFileSync(join(root, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(/^status: awaiting-acceptance$/m.test(groupAfter));
});

test('promote: gate 3 closes the group, protocols, units and the registry', () => {
  const units = U('u1', '1:10', 'g1', 'in-progress', 'null') + U('u2', '1:20', 'g1', 'in-progress', 'null');
  const group = GROUP3()
    .replace('status: draft', 'status: awaiting-acceptance')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('acceptance: null', 'acceptance: { decision: "accepted", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u1/r1", "u2/r1"] }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units }),
    'feat/u1.protocol.yaml': verifiedProto('u1'),
    'feat/u2.protocol.yaml': verifiedProto('u2'),
    'feat/g1.group.yaml': group,
  });
  expectOk(run(['promote', 'feat/g1.group.yaml'], root));
  const groupAfter = readFileSync(join(root, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(groupAfter));
  const proto1After = readFileSync(join(root, '.screen-by-screen/feat/u1.protocol.yaml'), 'utf8');
  const proto2After = readFileSync(join(root, '.screen-by-screen/feat/u2.protocol.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(proto1After));
  assert.ok(/^status: closed$/m.test(proto2After));
  const regAfter = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(regAfter), 'registry is not closed:\n' + regAfter);
  assert.ok(/protocol: u1\.protocol\.yaml/.test(regAfter) && /protocol: u2\.protocol\.yaml/.test(regAfter), 'the cascade did not set protocol on the units:\n' + regAfter);
  expectOk(run(['validate'], root));
});

// --- promote: coverage gaps from task 6 (gate 3 standalone, sweep.rows failure, registry with two groups) ---

test('promote: gate 3 of a standalone group closes the pair with no registry', () => {
  const proto = VALID_PROTOCOL()
    .replace('status: draft', 'status: collected')
    .replace('status: open', 'status: verified')
    .replace('remeasure: null', 'remeasure: { value: 20px, at: "2026-08-22T10:00" }');
  const group = VALID_GROUP()
    .replace('status: draft', 'status: awaiting-acceptance')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('acceptance: null', 'acceptance: { decision: "accepted", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["main/r1"] }');
  const root = SOLO(proto, group);
  expectOk(run(['promote', 'solo/main.group.yaml'], root));
  const groupAfter = readFileSync(join(root, '.screen-by-screen/solo/main.group.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(groupAfter), 'group is not closed:\n' + groupAfter);
  const protoAfter = readFileSync(join(root, '.screen-by-screen/solo/main.protocol.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(protoAfter), 'protocol is not closed:\n' + protoAfter);
  expectOk(run(['validate'], root));
});

test('promote: sweep.rows declares a row with a different remeasure.at - fails', () => {
  const units = U('u1', '1:10') + U('u2', '1:20');
  const group = GROUP3()
    .replace('status: draft', 'status: approved')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u2/r1"] }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units }),
    'feat/u1.protocol.yaml': noDiffProto('u1'),
    'feat/u2.protocol.yaml': verifiedProto('u2', '2026-08-22T09:00'),
    'feat/g1.group.yaml': group,
  });
  expectFail(run(['promote', 'feat/g1.group.yaml'], root), 'is declared in the sweep');
});

test('promote: registry with two groups does not close on the first', () => {
  const units = U('u1', '1:10', 'g1') + U('u2', '1:20', 'g2');
  const reg = REG3({ units, seal: 'units: [u1, u2], groups: { g1: [u1], g2: [u2] }' });
  const group1 = GROUP3()
    .replace('status: draft', 'status: awaiting-acceptance')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('acceptance: null', 'acceptance: { decision: "accepted", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u1/r1"] }');
  const group2 = GROUP3()
    .replace('group: g1', 'group: g2')
    .replace('status: draft', 'status: awaiting-acceptance')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('acceptance: null', 'acceptance: { decision: "accepted", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u2/r1"] }');
  const root = makeHub({
    'feat/registry.yaml': reg,
    'feat/u1.protocol.yaml': verifiedProto('u1'),
    'feat/u2.protocol.yaml': verifiedProto('u2'),
    'feat/g1.group.yaml': group1,
    'feat/g2.group.yaml': group2,
  });
  const r1 = run(['promote', 'feat/g1.group.yaml'], root);
  expectOk(r1);
  assert.ok(r1.out.includes('still has open units'), 'no note about open units:\n' + r1.out);
  const regAfter1 = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(/^status: approved$/m.test(regAfter1), 'registry closed ahead of time:\n' + regAfter1);
  const proto2After1 = readFileSync(join(root, '.screen-by-screen/feat/u2.protocol.yaml'), 'utf8');
  assert.ok(/^status: collected$/m.test(proto2After1), 'protocol u2 touched ahead of time:\n' + proto2After1);

  expectOk(run(['promote', 'feat/g2.group.yaml'], root));
  const regAfter2 = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(/^status: closed$/m.test(regAfter2), 'registry did not close after the second group:\n' + regAfter2);
});

// --- reopen: a group resets sweep/acceptance, cascades to members; a protocol only reopens through the group ---

test('reopen: a group from closed - approved, sweep and acceptance reset, cascade', () => {
  const units = U('u1', '1:10', 'g1', 'closed');
  const group = GROUP3()
    .replace('status: draft', 'status: closed')
    .replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }')
    .replace('acceptance: null', 'acceptance: { decision: "accepted", at: "2026-08-22" }')
    .replace('sweep: null', 'sweep: { at: "2026-08-22T10:00", rows: ["u1/r1"] }');
  const root = makeHub({
    'feat/registry.yaml': REG3({ units, seal: 'units: [u1], groups: { g1: [u1] }' }),
    'feat/u1.protocol.yaml': verifiedProto('u1').replace('status: collected', 'status: closed'),
    'feat/g1.group.yaml': group,
  });
  expectOk(run(['reopen', 'feat/g1.group.yaml', '--reason', 'acceptance rejected'], root));
  const groupAfter = readFileSync(join(root, '.screen-by-screen/feat/g1.group.yaml'), 'utf8');
  assert.ok(/^status: approved$/m.test(groupAfter), 'group did not return to approved:\n' + groupAfter);
  assert.ok(/^sweep: null$/m.test(groupAfter), 'sweep was not reset:\n' + groupAfter);
  assert.ok(/^acceptance: null$/m.test(groupAfter), 'acceptance was not reset:\n' + groupAfter);
  assert.ok(/reopened:\s*\n\s*-\s*reason:\s*acceptance rejected/.test(groupAfter), 'reopened[] is empty:\n' + groupAfter);
  const protoAfter = readFileSync(join(root, '.screen-by-screen/feat/u1.protocol.yaml'), 'utf8');
  assert.ok(/^status: collected$/m.test(protoAfter), 'protocol did not return to collected:\n' + protoAfter);
  const regAfter = readFileSync(join(root, '.screen-by-screen/feat/registry.yaml'), 'utf8');
  assert.ok(/status: in-progress/.test(regAfter), 'unit did not return to in-progress:\n' + regAfter);
});

test('reopen: protocol - fails, points to the group', () => {
  const root = SOLO(VALID_PROTOCOL().replace('status: draft', 'status: collected'), VALID_GROUP());
  expectFail(run(['reopen', 'solo/main.protocol.yaml', '--reason', 'x'], root), 'the signature sits under the group');
});

test('reopen: with no reason - fails (group)', () => {
  const root = SOLO(VALID_PROTOCOL(), VALID_GROUP().replace('status: draft', 'status: closed').replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }'));
  expectFail(run(['reopen', 'solo/main.group.yaml'], root), 'reason');
});

// --- status/instructions: groups ---

test('status: shows the group and that it is waiting on the human', () => {
  const root = SOLO(VALID_PROTOCOL().replace('status: draft', 'status: collected'),
    VALID_GROUP().replace('status: draft', 'status: awaiting-approval'));
  const r = run(['status'], root); expectOk(r);
  assert.ok(r.out.includes('awaiting-approval') && r.out.includes('main'));
  assert.ok(r.out.includes('the group decision is not recorded'));
});
test('instructions: the group stage yields group.md and fixing.md', () => {
  const root = SOLO(VALID_PROTOCOL().replace('status: draft', 'status: collected'),
    VALID_GROUP().replace('status: draft', 'status: approved').replace('approval: null', 'approval: { decision: "ok", at: "2026-08-22" }'));
  const r = run(['instructions', 'solo/main.group.yaml'], root); expectOk(r);
  assert.ok(r.out.includes('rules/fixing.md') && r.out.includes('rules/group.md'));
});
test('instructions: a collected protocol points to its group', () => {
  const root = SOLO(VALID_PROTOCOL().replace('status: draft', 'status: collected'), VALID_GROUP());
  const r = run(['instructions', 'solo/main.protocol.yaml'], root); expectOk(r);
  assert.ok(r.out.includes('solo/main.group.yaml'));
});

test('config: unknown key in hub config warns but does not fail', () => {
  const root = makeHub({ 'config.yaml': 'version: 3\nfoo: 1\n' });
  const r = run(['validate'], root);
  expectOk(r);
  assert.ok(r.out.includes('foo'));
});
test('config: missing config is fine', () => {
  expectOk(run(['validate'], makeHub({})));
});

// --- mockup link: the core is tool-agnostic, any http(s) URL is a valid mockup link ---

test('new: registry accepts a non-figma https mockup link with no node-id', () => {
  const root = fresh();
  expectOk(run(['new', 'registry', 'demo', '--source', 'https://mockup.example/x'], root));
  expectOk(run(['validate'], root));
});
test('validate: link node-id contradicting the header node still fails', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL().replace('node-id=1-2', 'node-id=9-9') });
  expectFail(run(['validate'], root), 'header: link', 'does not match node');
});
test('validate: ftp link fails - the core accepts only http(s)', () => {
  const root = makeHub({ 'solo/main.protocol.yaml': VALID_PROTOCOL().replace('https://figma.com/design/X?node-id=1-2', 'ftp://x') });
  expectFail(run(['validate'], root), 'header: link', 'must be http(s)');
});

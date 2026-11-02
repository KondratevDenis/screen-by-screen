import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { run, makeHub, expectOk, VALID_GROUP, VALID_PROTOCOL } from './helpers.mjs';

const waitingRegistry = [
  'version: 3',
  'kind: registry',
  'feature: feat',
  'source: "https://mockup.example/screen"',
  'status: awaiting-approval',
  'questions: []',
  'units:',
  '  - { id: u1, title: Screen, node: "1:2", link: "https://mockup.example/screen", bounds: screen, group: g1, status: pending, protocol: null, reason: null }',
  'approval: null',
  '',
].join('\n');

const cases = [
  {
    name: 'registry awaiting approval',
    target: 'feat/registry.yaml',
    files: { 'feat/registry.yaml': waitingRegistry },
    owner: 'registry',
  },
  ...['draft', 'awaiting-approval', 'awaiting-acceptance'].map((status) => ({
    name: 'group ' + status,
    target: 'solo/main.group.yaml',
    files: {
      'solo/main.group.yaml': VALID_GROUP().replace('status: draft', 'status: ' + status),
      'solo/main.protocol.yaml': VALID_PROTOCOL().replace('status: draft', 'status: collected'),
    },
    owner: 'group',
  })),
];

for (const scenario of cases) {
  test('instructions: ' + scenario.name + ' exposes decision rules without writing forms', () => {
    const root = makeHub(scenario.files);
    const paths = Object.keys(scenario.files).map((rel) => join(root, '.screen-by-screen', rel));
    const before = paths.map((path) => readFileSync(path, 'utf8'));
    const result = run(['instructions', scenario.target, '--json'], root);
    expectOk(result);
    const payload = JSON.parse(result.out);
    const ids = payload.rules.map((rule) => rule.id);
    assert.ok(ids.includes('decisions'), 'resume must expose the before-question procedure');
    assert.ok(ids.includes(scenario.owner), 'resume must expose its presentation owner');
    for (const rule of payload.rules) {
      assert.ok(isAbsolute(rule.path), 'rule paths remain absolute');
      assert.ok(existsSync(rule.path), 'every returned rule must exist');
    }
    assert.deepEqual(paths.map((path) => readFileSync(path, 'utf8')), before);
  });
}

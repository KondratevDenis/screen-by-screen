import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';

const SBS = new URL('../bin/sbs.js', import.meta.url).pathname;

export function run(args, cwd) {
  const r = spawnSync('node', [SBS, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

export function fresh() {
  const root = mkdtempSync(join(tmpdir(), 'sbs2-'));
  mkdirSync(join(root, '.git'));                       // projectRoot marker (.git)
  return root;
}

export function makeHub(files) {
  const root = fresh();
  for (const [rel, text] of Object.entries(files)) {
    const p = join(root, '.screen-by-screen', rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  return root;
}

export const expectOk = (r) => assert.equal(r.code, 0, 'expected success, output:\n' + r.out);
export const expectFail = (r, ...subs) => {
  assert.notEqual(r.code, 0, 'expected failure, output:\n' + r.out);
  for (const s of subs) assert.ok(r.out.includes(s), `missing "${s}" in:\n` + r.out);
};

export const VALID_PROTOCOL = (over = '') => `
version: 3
kind: protocol
registry: null
unit: null
status: draft
header: { state_path: "—", node: "1:2", link: "https://figma.com/design/X?node-id=1-2", frame_state: "default", data_source: real }
etalon:
  values: [ { prop: gap, value: 20px, token: 2.5x, node: "1:3" } ]
  structure: "A > B"
  semantics: []
rows:
  - { id: r1, type: diff, what: gap, level: value, expected: { value: 20px, ref: "1:3" }, actual: { value: 16px, selector: ".a" }, status: open, remeasure: null }
${over}`;

export const VALID_GROUP = (over = '') => `
version: 3
kind: group
registry: null
group: main
status: draft
screen: "http://x"
approval: null
acceptance: null
sweep: null
${over}`;

export const SOLO = (proto = VALID_PROTOCOL(), group = VALID_GROUP()) =>
  makeHub({ 'solo/main.protocol.yaml': proto, 'solo/main.group.yaml': group });

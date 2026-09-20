// sbs instructions - the stage brief for one form: what to do with it right now, what to read,
// where to write, what's next. The stage is not picked by the skill - it's determined by the
// form itself (kind + status), not by the skill's memory.

import { join } from 'node:path';
import { RULES_DIR, SCHEMA_PATH } from '../paths.js';
import { fail } from '../output.js';
import { groupOf } from '../validate.js';
import { loadHub, makeProblems, resolveForm, REGISTRY_STATUSES, GROUP_STATUSES, PROTOCOL_STATUSES } from '../forms.js';
import { STAGES, RULE_WHAT } from '../stages.js';

export function cmdInstructions(root, target, asJson) {
  const hub = loadHub(root, makeProblems());
  const entry = resolveForm(hub, target);
  const kinds = ['registry', 'protocol', 'group'];
  const kind = kinds.includes(entry.form?.kind) ? entry.form.kind : entry.kind;
  const status = entry.form?.status ?? null;
  const stage = STAGES[`${kind}/${status}`];
  if (!stage) {
    const statuses = kind === 'registry' ? REGISTRY_STATUSES : kind === 'group' ? GROUP_STATUSES : PROTOCOL_STATUSES;
    fail(`${entry.rel}: status "${status ?? 'empty'}" is outside the dictionary - the stage cannot be determined`, `allowed: ${statuses.join(' | ')}; check the form: sbs validate ${entry.slug}`);
  }
  // The rule file's existence is not checked here: the rule's address is part of the core's
  // contract, not something found on disk; a missing file is fixed by restoring the core, not by
  // staying silent.
  const rules = stage.rules.map((name) => ({ id: name.replace(/\.md$/, ''), path: join(RULES_DIR, name), what: RULE_WHAT[name] ?? null }));
  const group = kind === 'protocol' ? groupOf(hub, entry) : null;
  const payload = {
    form: entry.rel,
    path: entry.path,
    kind,
    status,
    task: stage.task,
    waiting: stage.waiting ?? null,
    rules,
    schema: SCHEMA_PATH,
    write: stage.write,
    done: stage.done,
    next: stage.next.replaceAll('<form>', entry.rel).replaceAll('<group>', group ? group.rel : '<group>'),
  };
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }
  console.log(`${payload.form} - ${kind}/${status}`);
  console.log(`task: ${payload.task}\n`);
  if (payload.waiting) console.log(`waiting for the human: ${payload.waiting}\n`);
  if (rules.length > 0) {
    console.log('read in this order:');
    for (const rule of rules) console.log(`  ${rule.path}\n    ${rule.what ?? ''}`.trimEnd());
    console.log('');
  }
  console.log(`forms contract: ${payload.schema}`);
  console.log(`write to:       ${payload.write}`);
  console.log(`\ndone when: ${payload.done}`);
  console.log(`next: ${payload.next}`);
  return 0;
}

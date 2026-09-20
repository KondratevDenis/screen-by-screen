// sbs promote - the only command that moves a form's status, per the transition table in
// stages.js. Status only moves on clean paperwork: the bundle passes validate first.

import { fail, failList } from '../output.js';
import { isObject, validateOne } from '../validate.js';
import { loadHub, makeProblems, resolveForm, bundleOf, writeForm, stampGates, TODAY } from '../forms.js';
import { promotePlan } from '../stages.js';

export function cmdPromote(root, target, asJson) {
  const hub = loadHub(root, makeProblems());
  const entry = resolveForm(hub, target);
  const from = entry.form.status;
  stampGates(entry.form, TODAY());

  // Status only moves on clean paperwork: the bundle passes validate first, then the transition.
  const problems = makeProblems();
  for (const f of bundleOf(hub, entry)) {
    if (!f.parsed || !isObject(f.form)) {
      problems.error(f.rel, 'does not read as YAML - the bundle is checked as a whole');
      continue;
    }
    validateOne(hub, f, problems);
  }
  if (problems.errors.length > 0) {
    failList(
      `cannot promote ${entry.rel}: form does not pass validate - statuses only move on clean paperwork`,
      problems.errors.map((e) => ({ where: e.where, msg: e.msg })),
      `fix what's listed and retry: sbs promote ${entry.rel}`,
    );
  }

  const plan = promotePlan(entry, hub);
  if (!plan) {
    fail(
      `cannot promote ${entry.rel}: no transitions from ${from} - this is a terminal status`,
      `returning it to work needs a reason: sbs reopen ${entry.rel} --reason "..."`,
    );
  }
  if (plan.reasons.length > 0) {
    failList(`cannot promote ${entry.rel}: ${from} -> ${plan.to} - transition conditions not met`, plan.reasons, `fix what's listed and retry: sbs promote ${entry.rel}`);
  }

  entry.form.status = plan.to;
  const applied = plan.apply ? plan.apply() : { writes: [], notes: [] };
  const writes = [entry, ...applied.writes];
  for (const f of writes) writeForm(f);

  if (asJson) {
    console.log(JSON.stringify({ ok: true, form: entry.rel, from, to: plan.to, wrote: writes.map((f) => f.rel), notes: applied.notes, next: plan.next }, null, 2));
    return 0;
  }
  console.log(`${entry.rel}: ${from} -> ${plan.to}`);
  for (const note of applied.notes) console.log(`  ${note}`);
  console.log(`\nnext: ${plan.next}`);
  return 0;
}

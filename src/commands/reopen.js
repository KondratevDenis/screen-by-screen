// sbs reopen - returns a closed (or awaiting-acceptance group) form to approved with a recorded
// reason; a status downgrade never happens without one.

import { fail } from '../output.js';
import { filled, isObject, groupOf, memberProtocolsOf, memberUnitsOf } from '../validate.js';
import { loadHub, makeProblems, resolveForm, writeForm, TODAY } from '../forms.js';

export function cmdReopen(root, target, reason, asJson) {
  if (reason === true || !filled(reason)) {
    fail(
      'need a reason for reopening: --reason "why the form is being reopened"',
      'a status downgrade never happens without a recorded reason - it stays on the form, in reopened[]',
    );
  }
  const hub = loadHub(root, makeProblems());
  const entry = resolveForm(hub, target);
  if (entry.kind === 'protocol') {
    const group = groupOf(hub, entry);
    fail(
      `${entry.rel}: a protocol is not reopened on its own - the signature sits under the group`,
      `reopen the group: sbs reopen ${group ? group.rel : '<group>'} --reason "..."`,
    );
  }
  const from = entry.form.status;
  const allowed = entry.kind === 'registry' ? ['closed'] : ['closed', 'awaiting-acceptance'];
  if (!allowed.includes(from)) {
    fail(`${entry.rel}: status ${from ?? 'empty'} - reopen returns to approved only from ${allowed.join(' | ')}`, 'sbs promote is what moves statuses forward');
  }
  entry.form.status = 'approved';
  const reopened = Array.isArray(entry.form.reopened) ? entry.form.reopened : [];
  reopened.push({ reason: String(reason), at: TODAY() });
  entry.form.reopened = reopened;

  const writes = [entry];
  const notes = [];
  if (entry.kind === 'group') {
    // The signature sat under a screen state that the rework changes: sweep and acceptance are
    // reset: both must be redone.
    entry.form.sweep = null;
    entry.form.acceptance = null;
    notes.push(`${entry.rel}: sweep and acceptance are reset: both must be redone`);
    for (const m of memberProtocolsOf(hub, entry)) {
      if (m.form?.status !== 'closed') continue;
      m.form.status = 'collected';
      writes.push(m);
      notes.push(`${m.rel}: closed -> collected`);
    }
    const ref = filled(entry.form.registry) ? String(entry.form.registry) : null;
    const registry = ref ? hub.registries.get(ref) ?? null : null;
    if (registry && isObject(registry.form)) {
      for (const u of memberUnitsOf(registry.form, entry.form.group)) {
        if (u.status !== 'closed') continue;
        u.status = 'in-progress';
        if (!writes.includes(registry)) writes.push(registry);
        notes.push(`${registry.rel}: units[${u.id}] -> in-progress`);
      }
      if (registry.form.status === 'closed') notes.push(`the registry is closed - reopen it too: sbs reopen ${registry.rel} --reason "..."`);
    }
  }
  for (const f of writes) writeForm(f);

  const next = `sbs instructions ${entry.rel}`;
  if (asJson) {
    console.log(JSON.stringify({ ok: true, form: entry.rel, from, to: 'approved', reason: String(reason), wrote: writes.map((f) => f.rel), notes, next }, null, 2));
    return 0;
  }
  console.log(`${entry.rel}: ${from} -> approved (reason: ${reason})`);
  for (const note of notes) console.log(`  ${note}`);
  console.log(`\nnext: ${next}`);
  return 0;
}

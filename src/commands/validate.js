// sbs validate - checks v3 forms in the hub (or one feature folder) and exits 1 on errors.

import { notFound } from '../output.js';
import { validateRegistry, validateGroup, validateProtocol, groupOf, memberProtocolsOf } from '../validate.js';
import { loadHub, makeProblems } from '../forms.js';

function problemsJson(problems) {
  return [
    ...problems.errors.map((e) => ({ severity: 'error', where: String(e.where), message: e.msg })),
    ...problems.warnings.map((w) => ({ severity: 'warning', where: String(w.where), message: w.msg })),
  ];
}

export function cmdValidate(root, target, asJson) {
  // Parsing the whole hub is always needed (a protocol looks for its registry among its
  // neighbours), but parse errors from other folders never leak into an addressed run -
  // otherwise a self-check would go red because of an unrelated folder.
  const loadProblems = makeProblems();
  const hub = loadHub(root, loadProblems);
  if (target && !hub.slugs.includes(target)) notFound('feature folder', target, hub.slugs);
  const inTarget = (where) => !target || String(where).startsWith(`${target}/`);
  const problems = makeProblems();
  for (const e of loadProblems.errors) if (inTarget(e.where)) problems.errors.push(e);
  for (const w of loadProblems.warnings) if (inTarget(w.where)) problems.warnings.push(w);

  let registries = 0;
  let protocols = 0;
  let groups = 0;
  for (const entry of hub.registries.values()) {
    if (!inTarget(entry.rel)) continue;
    registries += 1;
    if (!entry.parsed) continue;
    validateRegistry(entry.form, problems, { label: entry.rel, slug: entry.slug, protocolFiles: entry.protocolFiles });
  }
  for (const group of hub.groups) {
    if (!inTarget(group.rel)) continue;
    groups += 1;
    if (!group.parsed) continue;
    const ref = typeof group.form?.registry === 'string' ? group.form.registry : null;
    validateGroup(group.form, problems, { label: group.rel, file: group.file, registry: ref ? hub.registries.get(ref) ?? null : null, members: memberProtocolsOf(hub, group) });
  }
  for (const proto of hub.protocols) {
    if (!inTarget(proto.rel)) continue;
    protocols += 1;
    if (!proto.parsed) continue;
    const ref = typeof proto.form?.registry === 'string' ? proto.form.registry : null;
    validateProtocol(proto.form, problems, { label: proto.rel, registry: ref ? hub.registries.get(ref) ?? null : null, group: groupOf(hub, proto) });
  }

  const total = registries + protocols + groups;
  const errors = problems.errors.length;
  if (asJson) {
    const payload = {
      ok: errors === 0,
      target: target ?? null,
      hub: root ?? null,
      registries,
      groups,
      protocols,
      status: problemsJson(problems),
      next: errors > 0 ? 'fix the errors and rerun' : null,
    };
    console.log(JSON.stringify(payload, null, 2));
    return errors > 0 ? 1 : 0;
  }
  if (total === 0 && errors === 0 && problems.warnings.length === 0) {
    console.log('no v3 forms in the hub - nothing to validate');
    return 0;
  }
  for (const e of problems.errors) console.log(`  ✗ ${e.where}: ${e.msg}`);
  for (const w of problems.warnings) console.log(`  ⚠ ${w.where}: ${w.msg}`);
  console.log(`\nforms: ${total} (registries ${registries} · groups ${groups} · protocols ${protocols}) · errors: ${errors} · warnings: ${problems.warnings.length}`);
  if (errors > 0) {
    console.log(`\nNext: fix what's listed and rerun \`sbs validate${target ? ` ${target}` : ''}\`. What's wrong is in the message next to the address.`);
  }
  return errors > 0 ? 1 : 0;
}

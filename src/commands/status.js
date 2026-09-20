// sbs status - hub summary: what stands where, what waits on the human, what is in progress.

import { filled, isObject, memberUnitsOf } from '../validate.js';
import { loadHub, makeProblems } from '../forms.js';

function rowsSummary(counts) {
  const parts = [];
  for (const [key, word] of [['open', 'open'], ['fixed', 'fixed'], ['verified', 'verified'], ['questions', 'unresolved questions']]) {
    if (counts[key] > 0) parts.push(`${counts[key]} ${word}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'no rows';
}

export function cmdStatus(root, asJson) {
  const loadProblems = makeProblems();
  const hub = loadHub(root, loadProblems);
  const features = [];
  const waiting = [];
  const working = [];
  const groupsBySlug = new Map();

  for (const slug of hub.slugs) {
    const registry = hub.registries.get(slug) ?? null;
    const protocols = hub.protocols.filter((p) => p.slug === slug);
    const groups = hub.groups.filter((g) => g.slug === slug);
    groupsBySlug.set(slug, groups);
    const feature = { feature: slug, registry: null, units: [], protocols: [], groups: [] };
    if (registry && isObject(registry.form)) {
      const status = registry.form.status ?? null;
      feature.registry = { form: registry.rel, status };
      const units = Array.isArray(registry.form.units) ? registry.form.units : [];
      for (const u of units) {
        feature.units.push({ id: u?.id ?? null, title: u?.title ?? null, status: u?.status ?? null, protocol: u?.protocol ?? null, group: u?.group ?? null });
      }
      if (String(status).startsWith('awaiting-')) {
        waiting.push({ form: registry.rel, status, what: 'the slicing decision is not recorded: verbatim in approval.decision' });
      }
      const questions = Array.isArray(registry.form.questions) ? registry.form.questions : [];
      questions.forEach((q, i) => {
        if (filled(q?.decision)) return;
        const id = filled(q?.id) ? q.id : i;
        waiting.push({ form: registry.rel, status, what: `questions[${id}] unresolved${filled(q?.text) ? `: "${q.text}"` : ''}` });
      });
    }
    for (const proto of protocols) {
      const status = proto.form?.status ?? null;
      const counts = { open: 0, fixed: 0, verified: 0, questions: 0 };
      const rows = Array.isArray(proto.form?.rows) ? proto.form.rows : [];
      rows.forEach((row, i) => {
        const id = filled(row?.id) ? row.id : i;
        if (row?.type === 'question') {
          if (filled(row.decision)) return;
          counts.questions += 1;
          waiting.push({ form: proto.rel, status, what: `rows[${id}] question unresolved${filled(row?.what) ? `: "${row.what}"` : ''}` });
          return;
        }
        if (row?.status === 'open' || row?.status === 'fixed') {
          counts[row.status] += 1;
          working.push({ form: proto.rel, row: String(id), status: row.status, what: row?.what ?? null });
        } else if (row?.status === 'verified') counts.verified += 1;
      });
      feature.protocols.push({ form: proto.rel, unit: proto.form?.unit ?? null, status, rows: counts });
    }
    // Group membership in JSON is member ids from the registry; a standalone group (a folder
    // without a registry) has no registry of its own, so it has no declared membership either -
    // units stays an empty list.
    feature.groups = groups.map((g) => ({
      form: g.rel,
      group: g.form?.group ?? null,
      status: g.form?.status ?? null,
      units: memberUnitsOf(registry?.form, g.form?.group).map((u) => u.id),
    }));
    for (const g of groups) {
      if (String(g.form?.status ?? '').startsWith('awaiting-')) {
        const what = g.form.status === 'awaiting-acceptance'
          ? 'the group acceptance is not recorded: decision verbatim in acceptance.decision'
          : 'the group decision is not recorded: verbatim in approval.decision';
        waiting.push({ form: g.rel, status: g.form.status, what });
      }
    }
    features.push(feature);
  }

  const broken = loadProblems.errors.map((e) => ({ form: String(e.where), problem: e.msg }));
  if (asJson) {
    console.log(JSON.stringify({ ok: true, hub: root ?? null, features, waiting, working, broken }, null, 2));
    return 0;
  }
  if (features.length === 0 && broken.length === 0) {
    console.log('no v3 forms in the hub - create one: sbs new registry <feature> --source <link>');
    return 0;
  }
  for (const feature of features) {
    console.log(`${feature.feature}  ${feature.registry ? `registry: ${feature.registry.status}` : 'standalone screen (no registry)'}`);
    const groups = groupsBySlug.get(feature.feature) ?? [];
    const byGid = new Map(groups.map((g) => [String(g.form?.group ?? ''), g]));
    let printedGid = null;
    for (const unit of feature.units) {
      const gid = filled(unit.group) ? String(unit.group) : null;
      if (gid && gid !== printedGid) {
        const g = byGid.get(gid);
        console.log(`  [${gid}]  ${g ? g.form?.status ?? '-' : 'group not created'}${g?.form?.screen ? `  ${g.form.screen}` : ''}`);
        printedGid = gid;
      }
      const proto = feature.protocols.find((p) => p.unit === unit.id) ?? null;
      console.log(`  ${gid ? '  ' : ''}${unit.id}  ${unit.status ?? '-'}${filled(unit.title) ? `  ${unit.title}` : ''}`);
      if (proto) console.log(`      ${proto.form}  ${proto.status ?? '-'}  ${rowsSummary(proto.rows)}`);
    }
    for (const proto of feature.protocols) {
      if (feature.units.some((u) => u.id === proto.unit)) continue;
      // Standalone: without a registry, units are not grouped - the folder's contents are the
      // group itself (usually one per folder).
      const g = groups[0] ?? null;
      if (g) console.log(`  [${g.form?.group ?? 'main'}]  ${g.form?.status ?? '-'}`);
      console.log(`  ${proto.form}  ${proto.status ?? '-'}  ${rowsSummary(proto.rows)}`);
    }
  }
  if (waiting.length > 0) {
    console.log('\nwaiting for the human:');
    for (const item of waiting) console.log(`  ${item.form}  ${item.status ?? '-'} - ${item.what}`);
  }
  if (working.length > 0) {
    console.log('\nin progress:');
    for (const item of working) console.log(`  ${item.form}  rows[${item.row}] ${item.status}${filled(item.what) ? ` - ${item.what}` : ''}`);
  }
  if (broken.length > 0) {
    console.log('\nunreadable:');
    for (const item of broken) console.log(`  ✗ ${item.form}: ${item.problem}`);
  }
  console.log(`\nfolders in the hub: ${features.length} · protocols: ${hub.protocols.length}`);
  if (waiting.length === 0 && working.length === 0 && broken.length === 0) {
    console.log('nothing left waiting on the human - what to do with the form next: sbs instructions <form>');
  }
  return 0;
}

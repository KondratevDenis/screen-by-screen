// sbs new - creates a feature registry or a unit/standalone protocol from the templates next to
// the core.

import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { TEMPLATES_DIR, projectRoot } from '../paths.js';
import { fail, notFound } from '../output.js';
import { filled, isObject, mockupLinkProblem, unsealedUnits } from '../validate.js';
import { SLUG, loadHub, makeProblems, writeForm } from '../forms.js';

function readTemplate(name) {
  const path = join(TEMPLATES_DIR, name);
  if (!existsSync(path)) fail(`template ${name} not found next to the core (${path})`, 'the package is incomplete - reinstall it: npm i screen-by-screen');
  return readFileSync(path, 'utf8');
}

// The substitution runs line by line on the form, not across the whole text: the same keys show
// up in the template inside example comments, and a blind replace would wreck the hints. The
// line's trailing comment is kept.
function setField(text, key, value, indent = '') {
  const re = new RegExp(`^${indent}${key}:[^\\n]*$`, 'm');
  if (!re.test(text)) fail(`the template has drifted from the core: no field "${key}"`, 'reinstall the package: npm i screen-by-screen');
  return text.replace(re, (line) => {
    const hash = line.indexOf('#');
    const comment = hash >= 0 ? line.slice(hash) : '';
    return `${indent}${key}: ${JSON.stringify(value)}${comment ? `  ${comment}` : ''}`;
  });
}

function created(path, next, asJson, notes = []) {
  if (asJson) {
    console.log(JSON.stringify({ ok: true, created: path, notes, next }, null, 2));
    return 0;
  }
  console.log(`created: ${path}`);
  for (const note of notes) console.log(`  ${note}`);
  console.log(`\nnext: ${next}`);
  return 0;
}

function newRegistry(hubRoot, feature, flags) {
  if (!filled(feature) || feature === true) fail('need a feature slug: sbs new registry <feature> --source <link>');
  if (!SLUG.test(String(feature))) fail(`"${feature}" is not a slug (lowercase latin, digits, hyphen)`, 'the feature folder in the hub is its slug; the human-readable name lives in prose');
  const source = flags.source;
  if (!filled(source) || source === true) fail('need a mockup link: --source "https://<mockup host>/...?node-id=1-2"', 'a registry without a source page has nothing to slice');
  const problem = mockupLinkProblem(source, null);
  if (problem) fail(`--source: ${problem}`, 'a link to the page or the whole feature frame');
  const dir = join(hubRoot, String(feature));
  const path = join(dir, 'registry.yaml');
  if (existsSync(path)) fail(`registry already exists: ${path}`, `work in it: sbs instructions ${feature}/registry.yaml`);
  let text = readTemplate('registry.yaml');
  text = setField(text, 'feature', String(feature));
  text = setField(text, 'source', String(source));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, text, 'utf8');
  return created(path, `slice the feature into units: sbs instructions ${feature}/registry.yaml`, flags.json);
}

function newStandalone(hubRoot, slug, flags) {
  if (slug === true || !filled(slug)) fail('need a screen slug: sbs new protocol --standalone <slug>');
  if (!SLUG.test(String(slug))) fail(`"${slug}" is not a slug (lowercase latin, digits, hyphen)`);
  const folder = `standalone-${slug}`;
  const dir = join(hubRoot, folder);
  const path = join(dir, 'main.protocol.yaml');
  if (existsSync(path)) fail(`protocol already exists: ${path}`, `work in it: sbs instructions ${folder}/main.protocol.yaml`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, readTemplate('protocol.yaml'), 'utf8');
  let gtext = readTemplate('group.yaml');
  gtext = setField(gtext, 'group', 'main');
  writeFileSync(join(dir, 'main.group.yaml'), gtext, 'utf8');
  return created(path, `capture the header and the etalon: sbs instructions ${folder}/main.protocol.yaml`, flags.json, [`group created: ${folder}/main.group.yaml`]);
}

function newProtocol(hubRoot, target, flags) {
  if (flags.standalone !== undefined) return newStandalone(hubRoot, flags.standalone, flags);
  if (!filled(target) || target === true) {
    fail('need a unit address: sbs new protocol <feature>/<unit>', 'a standalone screen with no registry - sbs new protocol --standalone <slug>');
  }
  const parts = String(target).split('/');
  if (parts.length !== 2 || !filled(parts[0]) || !filled(parts[1])) {
    fail(`"${target}" is not a unit address`, 'format: <feature>/<unit>, e.g. okr-drawer/u1');
  }
  const [feature, unitId] = parts;
  const hub = loadHub(existsSync(hubRoot) ? hubRoot : null, makeProblems());
  const registry = hub.registries.get(feature) ?? null;
  if (!registry) notFound('feature', feature, [...hub.registries.keys()]);
  if (!registry.parsed || !isObject(registry.form)) fail(`${registry.rel}: registry does not read`, 'fix the YAML and check: sbs validate');
  if (registry.form.status !== 'approved') {
    fail(
      `${registry.rel}: registry is in status ${registry.form.status ?? 'empty'} - a unit's protocol is created after the slicing approval (approved)`,
      registry.form.status === 'closed' ? `the feature is closed: sbs reopen ${registry.rel} --reason "..."` : `carry the slicing through approval: sbs promote ${registry.rel}`,
    );
  }
  const units = Array.isArray(registry.form.units) ? registry.form.units : [];
  const unit = units.find((u) => u?.id === unitId);
  if (!unit) notFound('unit', unitId, units.map((u) => u?.id).filter((id) => filled(id)));
  if (unit.status === 'excluded') fail(`${registry.rel}: units[${unitId}] is excluded from the check (reason: ${unit.reason ?? '-'}) - no protocol is created for it`);
  if (unsealedUnits(registry.form).some((u) => String(u.id) === unitId)) {
    fail(
      `${registry.rel}: units[${unitId}]: the unit was added after the slicing approval (seal approval.units) - it does not go into work without a human decision`,
      `late addition is authorized by a declaration question: questions[] with units: [${unitId}] and a recorded decision, then repeat sbs new protocol ${feature}/${unitId}`,
    );
  }
  if (filled(unit.protocol)) fail(`unit ${unitId} already has a protocol: ${unit.protocol}`, `work in it: sbs instructions ${feature}/${unit.protocol}`);
  const file = `${unitId}.protocol.yaml`;
  const path = join(dirname(registry.path), file);
  if (existsSync(path)) fail(`protocol already exists: ${path}`, `work in it: sbs instructions ${feature}/${file}`);

  const gid = filled(unit.group) ? String(unit.group) : null;
  if (!gid) {
    fail(
      `${registry.rel}: units[${unitId}] has no group - a unit is assigned to a group during slicing`,
      'set the unit\'s group (registry.md, "Grouping") and repeat',
    );
  }
  const notes = [];
  const groupFile = `${gid}.group.yaml`;
  const groupPath = join(dirname(registry.path), groupFile);
  if (!existsSync(groupPath)) {
    let gtext = readTemplate('group.yaml');
    gtext = setField(gtext, 'registry', feature);
    gtext = setField(gtext, 'group', gid);
    writeFileSync(groupPath, gtext, 'utf8');
    notes.push(`group created: ${feature}/${groupFile}`);
  }

  let text = readTemplate('protocol.yaml');
  text = setField(text, 'registry', feature);
  text = setField(text, 'unit', unitId);
  if (filled(unit.node)) text = setField(text, 'node', String(unit.node), '  ');
  if (filled(unit.link)) text = setField(text, 'link', String(unit.link), '  ');
  writeFileSync(path, text, 'utf8');

  unit.protocol = file;
  if (unit.status !== 'in-progress') unit.status = 'in-progress';
  writeForm(registry);
  notes.push(`${registry.rel}: units[${unitId}] -> in-progress (protocol: ${file})`);
  return created(path, `capture the header and the etalon: sbs instructions ${feature}/${file}`, flags.json, notes);
}

export function cmdNew(root, what, target, flags) {
  const kinds = ['registry', 'protocol'];
  if (!filled(what)) {
    fail(
      'what to create: registry or protocol',
      'sbs new registry <feature> --source <link> | sbs new protocol <feature>/<unit> | sbs new protocol --standalone <slug>',
    );
  }
  if (!kinds.includes(what)) notFound('form', what, kinds);
  // The hub may not exist yet: the first form creates it - next to the repo root, not in cwd.
  const hubRoot = root ?? join(projectRoot(process.cwd()), '.screen-by-screen');
  return what === 'registry' ? newRegistry(hubRoot, target, flags) : newProtocol(hubRoot, target, flags);
}

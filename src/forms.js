// Forms v3 dictionaries (SCHEMA.md), the hub loader and the form-addressing/bundling/writing
// helpers shared by every command.

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fail, notFound } from './output.js';
import { filled, isObject, groupOf, memberProtocolsOf } from './validate.js';

// The core's only external dependency. Missing it is a failure to launch at all, and it must
// look like a message, not a resolver stack trace: the core is moved around by copying the folder.
let loadYaml;
let dumpYaml;
try {
  ({ load: loadYaml, dump: dumpYaml } = await import('js-yaml'));
} catch {
  console.error('sbs: js-yaml package not found - the core has nothing to read artifacts with');
  console.error('     how to fix: reinstall the package: npm i screen-by-screen');
  process.exit(2);
}

// --- forms v3 dictionaries (SCHEMA.md) ---

export const REGISTRY_STATUSES = ['draft', 'awaiting-approval', 'approved', 'closed'];
export const PROTOCOL_STATUSES = ['draft', 'collected', 'closed'];
export const GROUP_STATUSES = ['draft', 'awaiting-approval', 'approved', 'awaiting-acceptance', 'closed'];
// "Collected approved" (gate 2) - from this GROUP status onward, fixes on its members' rows are legal.
export const GROUP_APPROVED_PLUS = ['approved', 'awaiting-acceptance', 'closed'];
export const UNIT_STATUSES = ['pending', 'in-progress', 'closed', 'excluded'];
export const ROW_TYPES = ['diff', 'question'];
export const ROW_LEVELS = ['value', 'structure', 'semantics'];
export const ROW_STATUSES = ['open', 'fixed', 'verified'];
export const DATA_SOURCES = ['real', 'mock'];

export const REGISTRY_KEYS = ['version', 'kind', 'feature', 'source', 'status', 'questions', 'units', 'approval', 'reopened'];
export const REGISTRY_REQUIRED = ['version', 'kind', 'feature', 'source', 'status', 'units'];
export const PROTOCOL_KEYS = ['version', 'kind', 'registry', 'unit', 'status', 'header', 'etalon', 'rows'];
export const PROTOCOL_REQUIRED = ['version', 'kind', 'status', 'header', 'etalon', 'rows'];
export const HEADER_KEYS = ['state_path', 'node', 'link', 'frame_state', 'data_source'];
export const ETALON_KEYS = ['values', 'structure', 'semantics'];
export const ROW_COMMON_KEYS = ['id', 'type', 'what'];
export const ROW_DIFF_KEYS = ['level', 'expected', 'actual', 'status', 'remeasure'];
export const ROW_QUESTION_KEYS = ['decision'];
export const GROUP_KEYS = ['version', 'kind', 'registry', 'group', 'status', 'screen', 'approval', 'acceptance', 'sweep', 'reopened'];
export const GROUP_REQUIRED = ['version', 'kind', 'group', 'status'];

export const SLUG = /^[a-z0-9][a-z0-9-]*$/;

// The config lives in the hub (<hub>/config.yaml), not next to the core. It holds no check
// parameters any more: everything the core knows about forms lives in SCHEMA.md and here.
const CONFIG_KEYS = ['version'];
export function loadConfig(hubRoot) {
  const path = join(hubRoot, 'config.yaml');
  if (!existsSync(path)) return;
  let parsed;
  try {
    parsed = loadYaml(readFileSync(path, 'utf8'));
  } catch (e) {
    console.warn(`sbs: config.yaml does not parse (${e.message.split('\n')[0]}) - running on defaults`);
    return;
  }
  if (!parsed || typeof parsed !== 'object') return;
  if (parsed.version !== undefined && parsed.version !== 3) {
    console.warn(`sbs: config.yaml version ${parsed.version} - the core knows version 3, reading it as that`);
  }
  for (const key of Object.keys(parsed)) {
    if (!CONFIG_KEYS.includes(key)) console.warn(`sbs: config.yaml - unknown key "${key}" (known: ${CONFIG_KEYS.join(', ')})`);
  }
}

export function loadYamlFile(path, problems, label, text) {
  try {
    return loadYaml(text ?? readFileSync(path, 'utf8'));
  } catch (e) {
    problems.error(label, `does not parse as YAML: ${e.message.split('\n')[0]}`);
    return null;
  }
}

export function makeProblems() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    error: (where, msg) => errors.push({ where, msg }),
    warn: (where, msg) => warnings.push({ where, msg }),
  };
}

// --- loading the hub ---

// The hub v3 is flat: one folder per feature, holding the registry, its units' protocols and
// group forms (<gid>.group.yaml). A single screen is a folder without a registry, with one
// protocol (`registry: null`). Folders with no forms are invisible to the core.
export function loadHub(root, problems = makeProblems()) {
  const registries = new Map();
  const protocols = [];
  const groups = [];
  const slugs = [];
  if (!root || !existsSync(root)) return { registries, protocols, groups, slugs };
  for (const slug of readdirSync(root).sort()) {
    const dir = join(root, slug);
    let isDir = false;
    try {
      isDir = statSync(dir).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;
    const files = readdirSync(dir).sort();
    const protocolFiles = files.filter((name) => name.endsWith('.protocol.yaml'));
    const groupFiles = files.filter((name) => name.endsWith('.group.yaml'));
    const hasRegistry = files.includes('registry.yaml');
    if (!hasRegistry && protocolFiles.length === 0 && groupFiles.length === 0) continue;
    slugs.push(slug);
    // A file that failed to parse has already been reported as its own row - validators do not
    // run on it too, otherwise every YAML typo also gets "empty or not an object" piled on top.
    const read = (name, rel) => {
      const before = problems.errors.length;
      const form = loadYamlFile(join(dir, name), problems, rel);
      return { form, parsed: problems.errors.length === before };
    };
    if (hasRegistry) {
      const rel = `${slug}/registry.yaml`;
      const { form, parsed } = read('registry.yaml', rel);
      registries.set(slug, { slug, rel, path: join(dir, 'registry.yaml'), form, parsed, protocolFiles });
    }
    for (const file of protocolFiles) {
      const rel = `${slug}/${file}`;
      const { form, parsed } = read(file, rel);
      protocols.push({ slug, file, rel, path: join(dir, file), form, parsed, unit: form?.unit ?? null });
    }
    for (const file of groupFiles) {
      const rel = `${slug}/${file}`;
      const { form, parsed } = read(file, rel);
      groups.push({ slug, file, rel, path: join(dir, file), form, parsed });
    }
  }
  return { registries, protocols, groups, slugs };
}

// --- forms: addressing, bundling, writing ---

export const TODAY = () => new Date().toISOString().slice(0, 10);

export function formsOf(hub) {
  const list = [];
  for (const entry of hub.registries.values()) list.push({ ...entry, kind: 'registry' });
  for (const proto of hub.protocols) list.push({ ...proto, kind: 'protocol' });
  for (const group of hub.groups) list.push({ ...group, kind: 'group' });
  return list.sort((a, b) => a.rel.localeCompare(b.rel));
}

// A form is named by its path from the hub (feat/u1.protocol.yaml), but an absolute path and a
// folder name are also accepted when the folder holds a single form: a skill repeats the address
// from the core's own output, and a human writes whatever is convenient.
export function resolveForm(hub, target) {
  const forms = formsOf(hub);
  const rels = forms.map((f) => f.rel);
  if (!filled(target)) {
    fail(
      'need a form path - for example feat/registry.yaml or feat/u1.protocol.yaml',
      rels.length > 0 ? `the hub has: ${rels.join(', ')}` : 'no forms in the hub - create one: sbs new registry <feature> --source <link>',
    );
  }
  const norm = String(target).replace(/^\.\//, '').replace(/\/+$/, '');
  const abs = resolve(process.cwd(), norm);
  let found = forms.filter((f) => f.rel === norm || f.path === abs);
  if (found.length === 0) {
    const inFolder = forms.filter((f) => f.slug === norm);
    const registry = inFolder.find((f) => f.kind === 'registry');
    if (inFolder.length === 1) found = inFolder;
    else if (registry) found = [registry];
    else if (inFolder.length > 1) fail(`folder "${norm}" has several forms - name the file`, `available: ${inFolder.map((f) => f.rel).join(', ')}`);
  }
  if (found.length === 0) notFound('form', norm, rels);
  const entry = found[0];
  if (!entry.parsed || !isObject(entry.form)) {
    fail(`${entry.rel}: the form does not read - paperwork only moves when it can be read`, 'fix the YAML and check: sbs validate');
  }
  return entry;
}

// A form's bundle: a protocol is checked together with its registry and its group, a registry
// with all its protocols, a group with all its members. Status moves across the whole bundle: a
// unit cannot be closed by a protocol that breaks it.
export function bundleOf(hub, entry) {
  if (entry.kind === 'registry') return formsOf(hub).filter((f) => f.slug === entry.slug);
  const ref = typeof entry.form?.registry === 'string' ? entry.form.registry : null;
  const registry = ref ? hub.registries.get(ref) ?? null : null;
  const bundle = [entry];
  if (registry) bundle.push({ ...registry, kind: 'registry' });
  if (entry.kind === 'group') {
    for (const m of memberProtocolsOf(hub, entry)) bundle.push({ ...m, kind: 'protocol' });
  } else {
    const group = groupOf(hub, entry);
    if (group) bundle.push({ ...group, kind: 'group' });
  }
  return bundle;
}

export function writeForm(entry) {
  writeFileSync(entry.path, dumpYaml(entry.form, { lineWidth: 120, noRefs: true }), 'utf8');
}

// promote is what stamps a gate's date: a skill records the verbatim decision, the bookkeeping
// around it is not its job.
export function stampGates(form, today) {
  for (const field of ['approval', 'acceptance']) {
    const gate = form[field];
    if (isObject(gate) && filled(gate.decision) && !filled(gate.at)) gate.at = today;
  }
}

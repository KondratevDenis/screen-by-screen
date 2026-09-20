// Forms v3 shape checks (SCHEMA.md): registry, protocol, group - plus the small cross-references
// between them (memberUnitsOf / groupOf / memberProtocolsOf) that the checks and the transition
// table both need.

import { nearest } from './output.js';
import {
  REGISTRY_STATUSES,
  PROTOCOL_STATUSES,
  GROUP_STATUSES,
  GROUP_APPROVED_PLUS,
  UNIT_STATUSES,
  ROW_TYPES,
  ROW_LEVELS,
  ROW_STATUSES,
  DATA_SOURCES,
  REGISTRY_KEYS,
  REGISTRY_REQUIRED,
  PROTOCOL_KEYS,
  PROTOCOL_REQUIRED,
  HEADER_KEYS,
  ETALON_KEYS,
  ROW_COMMON_KEYS,
  ROW_DIFF_KEYS,
  ROW_QUESTION_KEYS,
  GROUP_KEYS,
  GROUP_REQUIRED,
  SLUG,
} from './forms.js';

// Empty means null, undefined, an empty string or a string of spaces. Zero and false do not count as empty.
export function filled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// A value outside the dictionary always comes with the list of allowed ones and a typo hint.
function enumProblem(value, allowed) {
  if (allowed.includes(value)) return null;
  const near = nearest(value ?? '', allowed);
  return `"${value ?? 'empty'}" is outside the dictionary (allowed: ${allowed.join(' | ')})${near ? `; did you mean "${near}"` : ''}`;
}

function checkShape(form, p, label, kind, allowedKeys, requiredKeys) {
  if (form.version !== 3) p.error(label, `version: "${form.version ?? 'empty'}" - the core reads version 3 forms`);
  if (form.kind !== kind) p.error(label, `kind: "${form.kind ?? 'empty'}" - expected ${kind} (a form is identified by kind, not by file name)`);
  for (const key of requiredKeys) {
    if (!(key in form)) p.error(label, `missing field "${key}" (required: ${requiredKeys.join(', ')})`);
  }
  for (const key of Object.keys(form)) {
    if (allowedKeys.includes(key)) continue;
    const near = nearest(key, allowedKeys);
    p.error(label, `unknown field "${key}"${near ? ` - did you mean "${near}"` : ''} (allowed: ${allowedKeys.join(', ')})`);
  }
}

function checkKeys(obj, p, label, at, allowedKeys) {
  for (const key of Object.keys(obj ?? {})) {
    if (allowedKeys.includes(key)) continue;
    const near = nearest(key, allowedKeys);
    p.error(label, `${at}: unknown field "${key}"${near ? ` - did you mean "${near}"` : ''} (allowed: ${allowedKeys.join(', ')})`);
  }
}

// A gate (approval/acceptance) is either null (not passed) or the user's decision with a date.
// `sbs promote` writes it: a half-filled value in this field means someone edited it by hand.
function gateProblem(gate, field) {
  if (gate === null || gate === undefined) return null;
  if (!isObject(gate)) return `${field}: not an object { decision, at } - the gate is written by promote`;
  if (!filled(gate.decision)) return `${field}: missing decision - the user's decision is recorded verbatim`;
  if (!filled(gate.at)) return `${field}: missing at - date of the decision`;
  return null;
}

// The slicing seal: gate 1 records the named set of units in approval.units at the moment of
// approval. A unit outside the seal (re-slicing after a mockup update) is legal only with a
// declaration question: questions[] with units: [id] and the human's decision recorded. A
// registry with no seal is legacy - the check does not apply until the next approval.
export function unsealedUnits(form) {
  const seal = form?.approval?.units;
  if (!Array.isArray(seal)) return [];
  const sealed = new Set(seal.map(String));
  for (const q of Array.isArray(form.questions) ? form.questions : []) {
    if (!filled(q?.decision)) continue;
    for (const id of Array.isArray(q?.units) ? q.units : []) sealed.add(String(id));
  }
  const units = Array.isArray(form.units) ? form.units : [];
  return units.filter((u) => filled(u?.id) && !sealed.has(String(u.id)));
}

// A mockup link: the core is tool-agnostic - it only checks that the link is an http(s) URL and,
// when the URL carries a node-id, that it matches the given node. It never touches the network
// and never finds out whether the node exists (that's the job of whoever reads the mockup, not
// the bookkeeping).
export function mockupLinkProblem(link, node) {
  if (typeof link !== 'string' || link.length === 0) return 'mockup link is missing';
  let url;
  try {
    url = new URL(link);
  } catch {
    return `not a URL: ${link}`;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return `mockup link must be http(s): ${link}`;
  const nodeId = url.searchParams.get('node-id');
  if (nodeId && node && nodeId !== String(node).replace(':', '-')) {
    return `link's node-id (${nodeId}) does not match node (${node})`;
  }
  return null;
}

export function validateRegistry(form, p, ctx = {}) {
  const label = ctx.label ?? 'registry.yaml';
  const slug = ctx.slug ?? null;
  if (!isObject(form)) {
    p.error(label, 'empty or not an object - the registry form is described in SCHEMA.md');
    return;
  }
  checkShape(form, p, label, 'registry', REGISTRY_KEYS, REGISTRY_REQUIRED);
  const statusProblem = enumProblem(form.status, REGISTRY_STATUSES);
  if (statusProblem) p.error(label, `status: ${statusProblem}`);
  const draft = form.status === 'draft';

  // feature is the same slug as the folder: otherwise the feature has two names and protocols
  // look for the registry in the wrong place.
  if (!filled(form.feature)) {
    if (draft) p.warn(label, `feature: not filled in - the feature slug is the folder name${slug ? ` ("${slug}")` : ''}`);
    else p.error(label, 'feature: empty - the feature slug is required');
  } else if (!SLUG.test(String(form.feature))) {
    p.error(label, `feature: "${form.feature}" is not a slug (lowercase latin, digits, hyphen); the human-readable feature name lives in prose`);
  } else if (slug && form.feature !== slug) {
    p.error(label, `feature: "${form.feature}" does not match the folder name "${slug}" - the feature slug is the folder in the hub`);
  }

  if (!filled(form.source)) {
    if (draft) p.warn(label, 'source: not filled in - link to the feature\'s mockup page/frame');
    else p.error(label, 'source: empty - link to the feature\'s mockup page/frame is required');
  } else {
    const problem = mockupLinkProblem(form.source, null);
    if (problem) p.error(label, `source: ${problem}`);
  }

  const questions = form.questions ?? [];
  if (!Array.isArray(questions)) {
    p.error(label, 'questions: not a list');
  } else {
    const ids = new Set();
    questions.forEach((q, i) => {
      const at = `questions[${filled(q?.id) ? q.id : i}]`;
      if (!isObject(q)) {
        p.error(label, `${at}: not an object { id, text, decision }`);
        return;
      }
      checkKeys(q, p, label, at, ['id', 'text', 'decision', 'units']);
      if (!filled(q.id)) p.error(label, `${at}: missing id`);
      else if (ids.has(q.id)) p.error(label, `${at}: duplicate id`);
      else ids.add(q.id);
      if (!filled(q.text)) p.error(label, `${at}: missing text - the question is recorded verbatim`);
      if (q.units !== undefined && q.units !== null) {
        if (!Array.isArray(q.units)) {
          p.error(label, `${at}: units - not a list of unit ids that this declaration authorizes`);
        } else {
          const unitIds = new Set((Array.isArray(form.units) ? form.units : []).map((u) => String(u?.id)));
          for (const id of q.units) {
            if (!unitIds.has(String(id))) p.error(label, `${at}: units - unit "${id}" not found in the registry`);
          }
        }
      }
    });
  }

  const units = form.units ?? [];
  if (!Array.isArray(units)) {
    p.error(label, 'units: not a list');
  } else {
    const ids = new Set();
    units.forEach((u, i) => {
      const at = `units[${filled(u?.id) ? u.id : i}]`;
      if (!isObject(u)) {
        p.error(label, `${at}: not an object - the unit form is in SCHEMA.md`);
        return;
      }
      checkKeys(u, p, label, at, ['id', 'title', 'node', 'link', 'bounds', 'group', 'status', 'protocol', 'reason']);
      if (!filled(u.id)) p.error(label, `${at}: missing id`);
      else if (ids.has(u.id)) p.error(label, `${at}: duplicate id`);
      else ids.add(u.id);
      // A unit's completeness is required by the draft -> awaiting-approval transition: while
      // the registry is in draft, slicing is still being written, and an incomplete unit is a
      // stage, not a breakage (same as feature/source above).
      for (const [field, what] of [['title', 'human-readable unit name'], ['node', 'mockup frame id'], ['link', 'link to this node in the mockup']]) {
        if (filled(u[field])) continue;
        if (draft) p.warn(label, `${at}: missing ${field} (${what}) - fill in before the slicing approval`);
        else p.error(label, `${at}: missing ${field} (${what})`);
      }
      if (filled(u.link)) {
        const problem = mockupLinkProblem(u.link, u.node ?? null);
        if (problem) p.error(label, `${at}: link - ${problem}`);
      }
      const unitStatusProblem = enumProblem(u.status, UNIT_STATUSES);
      if (unitStatusProblem) p.error(label, `${at}: status ${unitStatusProblem}`);
      if (u.status === 'excluded' && !filled(u.reason)) p.error(label, `${at}: excluded without reason`);
      if (u.status === 'excluded') {
        if (filled(u.group)) p.error(label, `${at}: excluded with group - an excluded unit is not part of the batch`);
      } else if (!filled(u.group)) {
        if (draft) p.warn(label, `${at}: no group - units are grouped by screen during slicing (a standalone is a group of one)`);
        else p.error(label, `${at}: no group - every unit in progress belongs to a group`);
      } else if (!SLUG.test(String(u.group))) {
        p.error(label, `${at}: group "${u.group}" is not a slug (lowercase latin, digits, hyphen)`);
      }
      if (u.status === 'closed' && !filled(u.protocol)) {
        p.error(label, `${at}: closed without protocol - a unit closes via its group's acceptance (promote cascade)`);
      }
      if (filled(u.protocol) && Array.isArray(ctx.protocolFiles) && !ctx.protocolFiles.includes(String(u.protocol))) {
        const list = ctx.protocolFiles.length > 0 ? ctx.protocolFiles.join(', ') : 'none';
        p.error(label, `${at}: protocol "${u.protocol}" not found in the feature folder (available: ${list})`);
      }
      if (u.status === 'excluded' && filled(u.protocol)) {
        p.error(label, `${at}: excluded with protocol - an excluded unit is not checked`);
      }
    });

    const lastIndex = new Map();
    let prevGid = null;
    units.forEach((u) => {
      if (!isObject(u) || u.status === 'excluded' || !filled(u.group)) return;
      const gid = String(u.group);
      if (gid !== prevGid && lastIndex.has(gid)) {
        p.error(label, `units[${u.id}]: group ${gid} is split - units of the same group must be contiguous in units[] (one run)`);
      }
      lastIndex.set(gid, true);
      prevGid = gid;
    });
  }

  const approvalProblem = gateProblem(form.approval, 'approval');
  if (approvalProblem) p.error(label, approvalProblem);
  if (['approved', 'closed'].includes(form.status) && !filled(form.approval?.decision)) {
    p.error(label, `approval: status ${form.status} without a recorded decision - promote is what moves statuses`);
  }
  if (form.approval?.units !== undefined && !Array.isArray(form.approval.units)) {
    p.error(label, 'approval: units - not a list of unit ids (the slicing seal is written by promote at gate 1)');
  }
  if (['approved', 'closed'].includes(form.status)) {
    for (const u of unsealedUnits(form)) {
      p.error(label, `units[${u.id}]: unit added after the slicing approval (seal approval.units) - adding it later is authorized by a declaration question: questions[] with units: [${u.id}] and a recorded decision`);
    }
  }
  if (form.approval?.groups !== undefined && form.approval?.groups !== null && !isObject(form.approval.groups)) {
    p.error(label, 'approval: groups - not an object { gid: [units] } (the grouping seal is written by promote at gate 1)');
  }
  if (['approved', 'closed'].includes(form.status) && isObject(form.approval?.groups)) {
    const sanctioned = new Set();
    for (const q of Array.isArray(form.questions) ? form.questions : []) {
      if (!filled(q?.decision)) continue;
      for (const id of Array.isArray(q?.units) ? q.units : []) sanctioned.add(String(id));
    }
    const sealedGroupOf = new Map();
    for (const [gid, list] of Object.entries(form.approval.groups)) {
      for (const id of Array.isArray(list) ? list : []) sealedGroupOf.set(String(id), String(gid));
    }
    for (const u of Array.isArray(form.units) ? form.units : []) {
      if (!isObject(u) || u.status === 'excluded' || !filled(u.id) || sanctioned.has(String(u.id))) continue;
      const sealed = sealedGroupOf.get(String(u.id));
      if (sealed !== undefined && String(u.group ?? '') !== sealed) {
        p.error(label, `units[${u.id}]: group "${u.group ?? 'empty'}" does not match the grouping seal (approval.groups: ${sealed}) - regrouping after approval is authorized by a declaration question`);
      }
    }
  }
}

export function validateProtocol(form, p, ctx = {}) {
  const label = ctx.label ?? 'protocol.yaml';
  if (!isObject(form)) {
    p.error(label, 'empty or not an object - the protocol form is described in SCHEMA.md');
    return;
  }
  checkShape(form, p, label, 'protocol', PROTOCOL_KEYS, PROTOCOL_REQUIRED);
  const statusProblem = enumProblem(form.status, PROTOCOL_STATUSES);
  if (statusProblem) p.error(label, `status: ${statusProblem}`);

  // header - where we looked in the app and what that corresponds to in the mockup.
  let header = null;
  if (isObject(form.header)) {
    header = form.header;
    checkKeys(header, p, label, 'header', HEADER_KEYS);
    if (filled(header.data_source)) {
      const problem = enumProblem(header.data_source, DATA_SOURCES);
      if (problem) p.error(label, `header: data_source ${problem}`);
    }
    if (filled(header.link)) {
      const problem = mockupLinkProblem(header.link, header.node ?? null);
      if (problem) p.error(label, `header: link - ${problem}`);
    }
  } else if (form.header !== null && form.header !== undefined) {
    p.error(label, 'header: not an object - header fields are listed in SCHEMA.md');
  }
  const headerFilled = HEADER_KEYS.every((key) => filled(header?.[key]));

  // etalon - what the mockup promises: values (authoritative), structure, component semantics.
  let values = [];
  if (isObject(form.etalon)) {
    const etalon = form.etalon;
    checkKeys(etalon, p, label, 'etalon', ETALON_KEYS);
    if (etalon.values === null || etalon.values === undefined) values = [];
    else if (!Array.isArray(etalon.values)) p.error(label, 'etalon: values is not a list');
    else values = etalon.values;
    values.forEach((v, i) => {
      const at = `etalon.values[${i}]`;
      if (!isObject(v)) {
        p.error(label, `${at}: not an object { prop, value, token, node }`);
        return;
      }
      checkKeys(v, p, label, at, ['prop', 'value', 'token', 'node']);
      for (const field of ['prop', 'value', 'node']) {
        if (!filled(v[field])) p.error(label, `${at}: missing ${field} - an etalon is a node property, not an impression from a screenshot`);
      }
    });
    const semantics = etalon.semantics ?? [];
    if (!Array.isArray(semantics)) {
      p.error(label, 'etalon: semantics is not a list');
    } else {
      semantics.forEach((s, i) => {
        const at = `etalon.semantics[${i}]`;
        if (!isObject(s)) {
          p.error(label, `${at}: not an object { figma, component }`);
          return;
        }
        checkKeys(s, p, label, at, ['figma', 'component']);
        for (const field of ['figma', 'component']) {
          if (!filled(s[field])) p.error(label, `${at}: missing ${field}`);
        }
      });
    }
    if (filled(etalon.structure) && typeof etalon.structure !== 'string') {
      p.error(label, 'etalon: structure is not a string - the layout tree is written as a single string');
    }
  } else if (form.etalon !== null && form.etalon !== undefined) {
    p.error(label, 'etalon: not an object { values, structure, semantics }');
  }

  // rows - protocol rows: discrepancies (diff) and questions to the mockup/user (question).
  let rows = [];
  if (form.rows === null || form.rows === undefined) rows = [];
  else if (!Array.isArray(form.rows)) p.error(label, 'rows: not a list');
  else rows = form.rows;
  const rowIds = new Set();
  const groupApprovedPlus = GROUP_APPROVED_PLUS.includes(ctx.group?.form?.status);
  rows.forEach((row, i) => {
    const at = `rows[${filled(row?.id) ? row.id : i}]`;
    if (!isObject(row)) {
      p.error(label, `${at}: not an object - the row form is in SCHEMA.md`);
      return;
    }
    if (!filled(row.id)) p.error(label, `${at}: missing id`);
    else if (rowIds.has(row.id)) p.error(label, `${at}: duplicate id`);
    else rowIds.add(row.id);
    if (!filled(row.what)) p.error(label, `${at}: missing what - what is being compared, in words`);
    const typeProblem = enumProblem(row.type, ROW_TYPES);
    if (typeProblem) {
      p.error(label, `${at}: type ${typeProblem}`);
      return;
    }
    if (row.type === 'question') {
      checkKeys(row, p, label, at, [...ROW_COMMON_KEYS, ...ROW_QUESTION_KEYS, ...ROW_DIFF_KEYS]);
      const diffFields = ROW_DIFF_KEYS.filter((field) => filled(row[field]));
      if (diffFields.length > 0) {
        p.error(label, `${at}: question does not carry diff-row fields (extra: ${diffFields.join(', ')}; a question is closed by a recorded decision)`);
      }
      return;
    }
    checkKeys(row, p, label, at, [...ROW_COMMON_KEYS, ...ROW_DIFF_KEYS]);
    const levelProblem = enumProblem(row.level, ROW_LEVELS);
    if (levelProblem) p.error(label, `${at}: level ${levelProblem}`);
    const rowStatusProblem = enumProblem(row.status, ROW_STATUSES);
    if (rowStatusProblem) p.error(label, `${at}: status ${rowStatusProblem}`);
    if (!filled(row.expected?.value) || !filled(row.expected?.ref)) {
      p.error(label, `${at}: expected missing a value/ref - number against number, both ends are required`);
    }
    if (!filled(row.actual?.value) || !filled(row.actual?.selector)) {
      p.error(label, `${at}: actual missing a value/selector - number against number, both ends are required`);
    }
    if (row.status === 'verified' && (!filled(row.remeasure?.value) || !filled(row.remeasure?.at))) {
      p.error(label, `${at}: status verified, but remeasure is incomplete - verified only after a re-measurement (value and at)`);
    }
    if (['fixed', 'verified'].includes(row.status) && !groupApprovedPlus) {
      p.error(label, `${at}: fixes before the collected approval (gate 2)`);
    }
  });

  // Staging: header -> etalon -> rows. The reverse order means the check was done by eye.
  if (rows.length > 0 && values.length === 0) {
    p.error(label, 'rows: diff rows with an empty etalon - etalon comes first (staging)');
  }
  if (values.length > 0 && !headerFilled) {
    p.error(label, 'etalon: etalon with an empty header - header comes first (staging)');
  }

  // Connectivity with the registry: a unit's protocol only lives under an approved slicing.
  const registryRef = filled(form.registry) ? String(form.registry) : null;
  const unitRef = filled(form.unit) ? String(form.unit) : null;
  const entry = ctx.registry ?? null;
  if (registryRef) {
    if (!entry) {
      p.error(label, `registry: registry '${registryRef}' not found in the hub`);
    } else {
      const units = Array.isArray(entry.form?.units) ? entry.form.units : [];
      const unit = unitRef ? units.find((u) => u?.id === unitRef) : null;
      if (!unitRef) p.error(label, 'unit: the protocol is tied to a registry, but no unit is named');
      else if (!unit) p.error(label, `unit: unit '${unitRef}' is missing from the registry`);
      else {
        if (unit.status === 'excluded') {
          p.error(label, `unit: unit '${unitRef}' is excluded from the check (excluded) - no protocol is opened for it`);
        }
        if (filled(unit.node) && filled(header?.node) && String(unit.node) !== String(header.node)) {
          p.error(label, `header: node "${header.node}" does not match unit '${unitRef}''s node ("${unit.node}")`);
        }
      }
      if (!['approved', 'closed'].includes(entry.form?.status)) {
        p.error(label, `registry: registry '${registryRef}' is not approved (status: ${entry.form?.status ?? 'empty'}) - a unit's protocol is opened after the slicing approval (approved)`);
      }
    }
  } else if (unitRef) {
    p.error(label, `unit: unit '${unitRef}' is named without a registry - a standalone protocol goes with registry: null and unit: null`);
  }

  const group = ctx.group ?? null;
  if (!group) {
    p.error(label, 'group: the unit\'s group form was not found in the folder - it is created by sbs new protocol (<gid>.group.yaml)');
  } else {
    if (form.status === 'closed' && group.form?.status !== 'closed') {
      p.error(label, `status: closed while the group is in status ${group.form?.status ?? 'empty'} - the group is what closes the protocol`);
    }
  }
}

// The registry declares group membership (units[].group); a standalone one by folder proximity.
export function memberUnitsOf(registryForm, gid) {
  const units = Array.isArray(registryForm?.units) ? registryForm.units : [];
  return units.filter((u) => isObject(u) && String(u.group ?? '') === String(gid));
}

export function groupOf(hub, proto) {
  const inFolder = hub.groups.filter((g) => g.slug === proto.slug);
  const ref = filled(proto.form?.registry) ? String(proto.form.registry) : null;
  if (!ref) return inFolder[0] ?? null;
  const registry = hub.registries.get(ref) ?? null;
  const units = Array.isArray(registry?.form?.units) ? registry.form.units : [];
  const unit = units.find((u) => u?.id === proto.form?.unit);
  const gid = filled(unit?.group) ? String(unit.group) : null;
  return gid ? inFolder.find((g) => String(g.form?.group ?? '') === gid) ?? null : null;
}

export function memberProtocolsOf(hub, group) {
  const protos = hub.protocols.filter((p) => p.slug === group.slug);
  const ref = filled(group.form?.registry) ? String(group.form.registry) : null;
  if (!ref) return protos;
  const registry = hub.registries.get(ref) ?? null;
  const ids = new Set(memberUnitsOf(registry?.form, group.form?.group).map((u) => String(u.id)));
  return protos.filter((p) => ids.has(String(p.form?.unit ?? '')));
}

export function validateGroup(form, p, ctx = {}) {
  const label = ctx.label ?? 'group.yaml';
  if (!isObject(form)) {
    p.error(label, 'empty or not an object - the group form is described in SCHEMA.md');
    return;
  }
  checkShape(form, p, label, 'group', GROUP_KEYS, GROUP_REQUIRED);
  const statusProblem = enumProblem(form.status, GROUP_STATUSES);
  if (statusProblem) p.error(label, `status: ${statusProblem}`);
  if (!filled(form.group)) p.error(label, 'group: missing group id');
  else if (!SLUG.test(String(form.group))) p.error(label, `group: "${form.group}" is not a slug (lowercase latin, digits, hyphen)`);
  else if (filled(ctx.file) && String(ctx.file).replace(/\.group\.yaml$/, '') !== String(form.group)) {
    p.error(label, `group: "${form.group}" does not match the file name "${ctx.file}" - the group id is the <gid>.group.yaml file itself`);
  }
  if (form.screen !== null && form.screen !== undefined && typeof form.screen !== 'string') {
    p.error(label, 'screen: not a string - the full path to the screen from the address');
  }
  const approvalProblem = gateProblem(form.approval, 'approval');
  if (approvalProblem) p.error(label, approvalProblem);
  const acceptanceProblem = gateProblem(form.acceptance, 'acceptance');
  if (acceptanceProblem) p.error(label, acceptanceProblem);
  if (GROUP_APPROVED_PLUS.includes(form.status) && !filled(form.approval?.decision)) {
    p.error(label, `approval: status ${form.status} without a recorded decision - promote is what moves statuses`);
  }

  const ref = filled(form.registry) ? String(form.registry) : null;
  if (ref) {
    const registry = ctx.registry ?? null;
    if (!registry) p.error(label, `registry: registry '${ref}' not found in the hub`);
    else if (memberUnitsOf(registry.form, form.group).length === 0) {
      p.error(label, `group: no units with group: ${form.group} in registry '${ref}' - a group with no members`);
    }
  }

  const members = Array.isArray(ctx.members) ? ctx.members : [];
  const diffRefs = new Set();
  let hasDiff = false;
  for (const m of members) {
    const base = String(m.file ?? '').replace(/\.protocol\.yaml$/, '');
    for (const row of Array.isArray(m.form?.rows) ? m.form.rows : []) {
      if (!isObject(row) || row.type === 'question') continue;
      hasDiff = true;
      diffRefs.add(`${base}/${row.id ?? '?'}`);
    }
  }
  if (form.status === 'closed') {
    if (hasDiff && !filled(form.acceptance?.decision)) {
      p.error(label, 'acceptance: status closed without a recorded acceptance - promote is what moves statuses');
    }
    for (const m of members) {
      if (m.form?.status !== 'closed') p.error(label, `group members are not closed (${m.rel}: ${m.form?.status ?? 'empty'}) - the group's promote cascades the closing`);
    }
  }
  if (['awaiting-acceptance', 'closed'].includes(form.status) && hasDiff && !filled(form.sweep?.at)) {
    p.error(label, `sweep: status ${form.status} with diff rows and no recorded sweep - sweep is written before handoff`);
  }
  if (form.sweep !== null && form.sweep !== undefined) {
    if (!isObject(form.sweep)) p.error(label, 'sweep: not an object { at, rows } - the trace of the sweep');
    else {
      checkKeys(form.sweep, p, label, 'sweep', ['at', 'rows']);
      if (!filled(form.sweep.at)) p.error(label, 'sweep: missing at - time of the sweep (ISO to the minute)');
      if (form.sweep.rows !== undefined && !Array.isArray(form.sweep.rows)) {
        p.error(label, 'sweep: rows - not a list of row references ("u1/r1")');
      } else {
        for (const r of Array.isArray(form.sweep.rows) ? form.sweep.rows : []) {
          if (!diffRefs.has(String(r))) p.error(label, `sweep: rows - row "${r}" not found among the group members' diff rows`);
        }
      }
    }
  }
}

// A form's validation dispatches on its kind, gathering the same cross-references (registry,
// group/members) that promote's transition table needs to check the bundle before it moves.
export function validateOne(hub, entry, problems) {
  const ref = typeof entry.form?.registry === 'string' ? entry.form.registry : null;
  const registry = ref ? hub.registries.get(ref) ?? null : null;
  if (entry.kind === 'registry') {
    validateRegistry(entry.form, problems, { label: entry.rel, slug: entry.slug, protocolFiles: entry.protocolFiles });
    return;
  }
  if (entry.kind === 'group') {
    validateGroup(entry.form, problems, { label: entry.rel, file: entry.file, registry, members: memberProtocolsOf(hub, entry) });
    return;
  }
  validateProtocol(entry.form, problems, { label: entry.rel, registry, group: groupOf(hub, entry) });
}

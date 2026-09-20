// Work stage = kind + status of the form, and the promote transition table that moves it. The
// skill doesn't choose what to read: it asks the form.

import { HEADER_KEYS, makeProblems, formsOf } from './forms.js';
import { filled, isObject, memberUnitsOf, groupOf, memberProtocolsOf, validateOne } from './validate.js';

// The `what` caption lives here, not in the skill text: otherwise the rule list drifts from the core.
export const RULE_WHAT = {
  'registry.md': 'slicing a feature into units: how to walk the mockup, what counts as a unit, what gets excluded and why',
  'etalon.md': 'a unit\'s etalon: header and node properties - what the mockup promises and how it\'s proven',
  'rows.md': 'protocol rows: number against number, what gets filed as a diff and what as a question',
  'fixing.md': 'fixing against an approved protocol: re-check radius, re-measurement, verified',
  'group.md': 'working as a group: batch = group, shown in one message, the sweep and recording it',
  'decisions.md': 'the log of past runs\' decisions: when a question to the human is closed by a recorded decision, and when it gets asked again',
};

// `waiting` - the human's stage: the core doesn't advise how to work, it reminds what's awaited and where to write it.
export const STAGES = {
  'registry/draft': {
    task: 'slice the feature mockup into units and record boundary questions',
    rules: ['registry.md', 'decisions.md'],
    write: 'units[], questions[] in the registry',
    done: 'every unit has title, node and link; an excluded one has a reason; questions are recorded verbatim',
    next: 'sbs promote <form> - send the slicing for approval',
  },
  'registry/awaiting-approval': {
    task: 'the slicing has been sent for approval - waiting for the human\'s decision',
    rules: [],
    waiting: 'wait for the human\'s decision and record it verbatim in the form: approval.decision (and decision for every question in questions[])',
    write: 'approval: { decision, at }, questions[].decision',
    done: 'the decision on the slicing and on every question is recorded verbatim',
    next: 'sbs promote <form> - record the slicing approval',
  },
  'registry/approved': {
    task: 'the slicing is approved - create unit protocols; if the mockup was updated - re-slice (registry.md)',
    rules: ['registry.md', 'decisions.md'],
    write: 'unit statuses are moved by new protocol and promote; re-slicing: new units[] + a declaration question in questions[] (units: [id], the human\'s decision verbatim)',
    done: 'every unit is closed or excluded',
    next: 'sbs new protocol <feature>/<unit>; once no units are open - sbs promote <form>',
  },
  'registry/closed': {
    task: 'the feature is checked and closed',
    rules: [],
    write: 'nothing - a closed form is never edited',
    done: 'closed',
    next: 'archive it with the decision log - /sbs:archive; to reopen it: sbs reopen <form> --reason "..."',
  },
  'protocol/draft': {
    task: 'capture the unit\'s header and etalon and file the diff rows',
    rules: ['etalon.md', 'rows.md', 'decisions.md'],
    write: 'header, etalon.values/structure/semantics, rows[]',
    done: 'the header is filled in completely, the etalon is non-empty, every row has both ends (number against number)',
    next: 'sbs promote <form> - record the material (collected)',
  },
  'protocol/collected': {
    task: 'the material is collected - work continues at the group level',
    rules: [],
    write: 'rows[].status and remeasure - by the group\'s instructions, once the group is approved',
    done: 'the group\'s promote closes the protocol',
    next: 'sbs instructions <group> - this unit\'s group stage',
  },
  'protocol/closed': {
    task: 'the unit is checked and accepted',
    rules: [],
    write: 'nothing - a closed form is never edited',
    done: 'closed',
    next: 'to reopen it: sbs reopen <form> --reason "..."',
  },
  'group/draft': {
    task: 'collect the material for every unit in the group (protocols up to collected) and the screen path',
    rules: ['group.md'],
    write: 'screen; unit material - in their protocols (sbs instructions <feature>/<unit>.protocol.yaml)',
    done: 'every unit in the group has a protocol in collected; screen is recorded',
    next: 'sbs promote <form> - send the group for approval',
  },
  'group/awaiting-approval': {
    task: 'the group has been sent for approval - waiting for the human\'s decision',
    rules: [],
    waiting: 'wait for the human\'s decision and record it verbatim: the group\'s approval.decision; decisions on questions - in rows[].decision of the member protocols',
    write: 'approval: { decision, at }, rows[].decision on members\' questions',
    done: 'the decision is recorded verbatim',
    next: 'sbs promote <form> - record approval of the collected material (gate 2); with no diff rows, promote closes the group right away',
  },
  'group/approved': {
    task: 'fix the layout by the members\' rows, re-check and run the sweep',
    rules: ['fixing.md', 'group.md', 'decisions.md'],
    write: 'rows[].status and remeasure in the member protocols; the group\'s sweep',
    done: 'every member diff row is verified; every question has a decision; sweep is recorded after the last fix',
    next: 'sbs promote <form> - send the group for acceptance',
  },
  'group/awaiting-acceptance': {
    task: 'the group has been sent for acceptance - waiting for the human\'s decision',
    rules: [],
    waiting: 'wait for the human\'s decision and record it verbatim in the form: acceptance.decision',
    write: 'acceptance: { decision, at }',
    done: 'the acceptance is recorded verbatim',
    next: 'sbs promote <form> - close the group, its protocols and units',
  },
  'group/closed': {
    task: 'the group is checked and accepted',
    rules: [],
    write: 'nothing - a closed form is never edited',
    done: 'closed',
    next: 'to reopen it: sbs reopen <form> --reason "..."',
  },
};

// Closing a group is the only path to closing protocols and units - the cascade writes the group's promote.
export function closeGroupCascade(hub, entry, members) {
  const writes = [];
  const notes = [];
  for (const m of members) {
    if (m.form?.status === 'closed') continue;
    m.form.status = 'closed';
    writes.push(m);
    notes.push(`${m.rel}: -> closed`);
  }
  const ref = filled(entry.form.registry) ? String(entry.form.registry) : null;
  const registry = ref ? hub.registries.get(ref) ?? null : null;
  if (!registry || !isObject(registry.form)) return { writes, notes };
  for (const u of memberUnitsOf(registry.form, entry.form.group)) {
    u.status = 'closed';
    const proto = members.find((m) => m.form?.unit === u.id);
    if (proto && !filled(u.protocol)) u.protocol = proto.file;
    notes.push(`${registry.rel}: units[${u.id}] -> closed`);
  }
  if (!writes.includes(registry)) writes.push(registry);
  const units = Array.isArray(registry.form.units) ? registry.form.units : [];
  const open = units.filter((u) => !['closed', 'excluded'].includes(u?.status));
  if (open.length > 0) {
    notes.push(`registry ${registry.slug} still has open units: ${open.map((u) => u?.id ?? '?').join(', ')}`);
    return { writes, notes };
  }
  if (registry.form.status === 'approved') {
    const problems = makeProblems();
    for (const sibling of formsOf(hub).filter((f) => f.slug === registry.slug)) {
      if (!sibling.parsed || !isObject(sibling.form)) problems.error(sibling.rel, 'does not read as YAML');
      else validateOne(hub, sibling, problems);
    }
    if (problems.errors.length === 0) {
      registry.form.status = 'closed';
      notes.push(`registry ${registry.slug} closed: every unit is closed or excluded`);
    } else {
      notes.push(`registry ${registry.slug} is ready to close, but the bundle does not pass validate - close it by hand after fixing: sbs promote ${registry.rel}`);
    }
  }
  return { writes, notes };
}

export function promotePlan(entry, hub) {
  const form = entry.form;
  const from = form.status;
  const label = entry.rel;
  const reasons = [];
  const push = (at, msg) => reasons.push({ where: at ? `${label}: ${at}` : label, msg });
  const idAt = (list, item, i) => `${list}[${filled(item?.id) ? item.id : i}]`;

  if (entry.kind === 'registry') {
    const units = Array.isArray(form.units) ? form.units : [];
    if (from === 'draft') {
      if (units.length === 0) push('units', 'slicing is empty - there is nothing to bring to approval');
      units.forEach((u, i) => {
        const at = idAt('units', u, i);
        for (const [field, what] of [['title', 'human-readable unit name'], ['node', 'mockup frame id'], ['link', 'link to this node in the mockup']]) {
          if (!filled(u?.[field])) push(at, `missing ${field} (${what}) - a unit goes to approval filled in`);
        }
        if (u?.status === 'excluded' && !filled(u.reason)) push(at, 'excluded without reason - the exclusion is explained in words');
        if (u?.status !== 'excluded' && !filled(u?.group)) {
          push(at, 'no group - a unit goes to approval assigned to a group (screen)');
        }
      });
      return { to: 'awaiting-approval', reasons, next: `show the slicing to the user, record the decision in approval.decision, then sbs promote ${label}` };
    }
    if (from === 'awaiting-approval') {
      if (!filled(form.approval?.decision)) push('approval', 'the user\'s decision is not recorded - gate 1 only passes with a verbatim decision');
      const questions = Array.isArray(form.questions) ? form.questions : [];
      questions.forEach((q, i) => {
        if (filled(q?.decision)) return;
        push(idAt('questions', q, i), `question with no decision${filled(q?.text) ? `: "${q.text}"` : ''} - the user's answer is recorded verbatim`);
      });
      return {
        to: 'approved',
        reasons,
        next: `open the units' protocols: sbs new protocol ${entry.slug}/<unit>`,
        apply: () => {
          // The seal: the human's signature stands under a specific set - record it by name.
          form.approval.units = units.map((u) => String(u.id));
          const groups = {};
          for (const u of units) {
            if (!isObject(u) || u.status === 'excluded' || !filled(u.group)) continue;
            (groups[String(u.group)] ??= []).push(String(u.id));
          }
          form.approval.groups = groups;
          return { writes: [], notes: [
            `approval.units: slicing seal - ${units.length} unit(s)`,
            `approval.groups: grouping seal - ${Object.keys(groups).length} group(s)`,
          ] };
        },
      };
    }
    if (from === 'approved') {
      units.forEach((u, i) => {
        if (['closed', 'excluded'].includes(u?.status)) return;
        push(idAt('units', u, i), `status ${u?.status ?? 'empty'} - the registry closes once every unit is closed or excluded`);
      });
      return { to: 'closed', reasons, next: 'the feature is fully checked' };
    }
    return null;
  }

  if (entry.kind === 'group') {
    const members = memberProtocolsOf(hub, entry);
    const ref = filled(form.registry) ? String(form.registry) : null;
    const registry = ref ? hub.registries.get(ref) ?? null : null;
    const diffRows = [];
    const questionRows = [];
    for (const m of members) {
      const base = String(m.file ?? '').replace(/\.protocol\.yaml$/, '');
      for (const row of Array.isArray(m.form?.rows) ? m.form.rows : []) {
        if (!isObject(row)) continue;
        if (row.type === 'question') questionRows.push({ m, row });
        else diffRows.push({ m, row, ref: `${base}/${row.id ?? '?'}` });
      }
    }
    if (from === 'draft') {
      if (!filled(form.screen)) push('screen', 'no path to the screen - screen is written at the group\'s first unit');
      const units = registry ? memberUnitsOf(registry.form, form.group) : [];
      if (registry) {
        for (const u of units) {
          const proto = members.find((m) => m.form?.unit === u.id);
          if (!proto) push(`units[${u.id}]`, `the group's unit has no protocol - create one: sbs new protocol ${entry.slug}/${u.id}`);
          else if (proto.form?.status !== 'collected') push(proto.rel, `protocol in status ${proto.form?.status ?? 'empty'} - a group goes to approval with its members collected`);
        }
      } else {
        if (members.length === 0) push('group', 'no protocol in the folder - a group brings collected material to approval');
        for (const m of members) {
          if (m.form?.status !== 'collected') push(m.rel, `protocol in status ${m.form?.status ?? 'empty'} - a group goes to approval with its members collected`);
        }
      }
      return { to: 'awaiting-approval', reasons, next: `show the group to the user in one message, record the decision in approval.decision, then sbs promote ${label}` };
    }
    if (from === 'awaiting-approval') {
      if (!filled(form.approval?.decision)) push('approval', 'the user\'s decision is not recorded - gate 2 only passes with a verbatim decision');
      if (diffRows.length === 0) {
        for (const { m, row } of questionRows) {
          if (filled(row.decision)) continue;
          push(`${m.rel}: rows[${row.id ?? '?'}]`, `question with no decision${filled(row.what) ? `: "${row.what}"` : ''} - a group with no diff rows closes on approval, its questions are closed too`);
        }
        return { to: 'closed', reasons, next: 'the group is checked: no discrepancies, the fix and acceptance stages are skipped', apply: () => closeGroupCascade(hub, entry, members) };
      }
      return { to: 'approved', reasons, next: `fix per the members' rows and recheck: sbs instructions ${label}` };
    }
    if (from === 'approved') {
      for (const { m, row } of questionRows) {
        if (!filled(row.decision)) push(`${m.rel}: rows[${row.id ?? '?'}]`, `question with no decision${filled(row.what) ? `: "${row.what}"` : ''} - it must be closed before acceptance`);
      }
      for (const d of diffRows) {
        const at = `${d.m.rel}: rows[${d.row.id ?? '?'}]`;
        if (d.row.status !== 'verified') push(at, `row in status ${d.row.status ?? 'empty'} - only verified rows go to acceptance`);
        else if (!filled(d.row.remeasure?.value) || !filled(d.row.remeasure?.at)) push(at, 'verified with an incomplete remeasure (value and at) - a re-measurement after the fix is required');
      }
      if (!isObject(form.sweep) || !filled(form.sweep.at)) {
        push('sweep', 'sweep is not recorded - before handoff, do one pass over this round\'s rows; its time and list go in sweep');
      } else {
        const sweepAt = String(form.sweep.at);
        const swept = new Set((Array.isArray(form.sweep.rows) ? form.sweep.rows : []).map(String));
        if (swept.size === 0) push('sweep', 'rows is empty - the sweep lists the re-measured rows');
        for (const d of diffRows) {
          const at = String(d.row.remeasure?.at ?? '');
          if (at > sweepAt) push('sweep', `remeasure ${d.ref} (${at}) is later than the sweep (${sweepAt}) - the sweep is the last measurement, repeat it`);
          if (at === sweepAt && !swept.has(d.ref)) push('sweep', `rows: row ${d.ref} was measured at the sweep's time but is not declared in sweep.rows`);
          if (swept.has(d.ref) && at !== sweepAt) push('sweep', `rows: row ${d.ref} is declared in the sweep, but its remeasure.at (${at || 'empty'}) != sweep.at`);
        }
      }
      return { to: 'awaiting-acceptance', reasons, next: `show the group's summary to the user in one message, record the acceptance in acceptance.decision, then sbs promote ${label}` };
    }
    if (from === 'awaiting-acceptance') {
      if (!filled(form.acceptance?.decision)) push('acceptance', 'the acceptance is not recorded - gate 3 only passes with a verbatim user decision');
      return { to: 'closed', reasons, next: 'the group is checked and accepted', apply: () => closeGroupCascade(hub, entry, members) };
    }
    return null;
  }

  if (from === 'draft') {
    for (const key of HEADER_KEYS) {
      if (!filled(form.header?.[key])) push('header', `missing ${key} - the header goes to collected filled in`);
    }
    const values = Array.isArray(form.etalon?.values) ? form.etalon.values : [];
    if (values.length === 0) push('etalon.values', 'the etalon is empty - what goes to collected is taken from the mockup, not an impression from a screenshot');
    const ref = filled(form.registry) ? String(form.registry) : null;
    if (ref) {
      const registry = hub.registries.get(ref) ?? null;
      const units = Array.isArray(registry?.form?.units) ? registry.form.units : [];
      if (!registry) {
        push('registry', `registry '${ref}' not found in the hub`);
      } else {
        if (registry.form?.status !== 'approved') {
          push('registry', `registry '${ref}' is in status ${registry.form?.status ?? 'empty'} - a unit's protocol lives under an approved slicing (approved)`);
        }
        if (!units.some((u) => u?.id === form.unit)) {
          push('unit', `unit '${form.unit ?? 'empty'}' is missing from registry '${ref}'`);
        }
      }
    }
    const group = groupOf(hub, entry);
    return { to: 'collected', reasons, next: `the unit's material is collected - next is the group: sbs instructions ${group ? group.rel : '<group>'}` };
  }
  if (from === 'collected') {
    const group = groupOf(hub, entry);
    return { to: 'closed', reasons: [{ where: label, msg: `the group is what closes the protocol - sbs promote ${group ? group.rel : '<group>'}` }], next: '' };
  }
  return null;
}

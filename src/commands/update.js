// sbs update - refreshes the generated skills/commands after upgrading the package. Only ever
// touches files this tool generated itself (isGenerated); a tool that was never installed (no
// file on disk) is left alone, and hand-edited files are reported as kept, not overwritten.
// Never touches .screen-by-screen/ - the hub's forms are the human's data, not a template output.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fail } from '../output.js';
import { pkgVersion } from '../paths.js';
import { TOOLS } from '../install/targets.js';
import { isGenerated, generatedVersion } from '../install/generate.js';

function toRel(root, absPath) {
  return relative(root, absPath).split(sep).join('/');
}

function printGroup(label, items) {
  if (items.length === 0) return;
  console.log(label);
  for (const item of items) console.log(`  ${item}`);
}

export function cmdUpdate(pathArg, flags) {
  const project = resolve(pathArg ?? '.');
  const version = pkgVersion();

  const updated = [];
  const staleUpdated = new Set(); // rels rewritten because the version was older - for the text note only
  const unchanged = [];
  const kept = [];
  let anyGenerated = false;

  for (const tool of Object.values(TOOLS)) {
    for (const { path: absPath, content } of tool.files(project, version)) {
      if (!existsSync(absPath)) continue; // tool not installed - nothing to refresh
      const rel = toRel(project, absPath);
      const existing = readFileSync(absPath, 'utf8');
      if (!isGenerated(existing)) {
        kept.push(rel);
        continue;
      }
      anyGenerated = true;
      if (existing === content) {
        unchanged.push(rel);
        continue;
      }
      // Any rewrite is `updated`, whether the version was older or the body was hand-edited
      // under the same version - both leave the file different from the template on disk.
      const stale = generatedVersion(existing) !== version;
      writeFileSync(absPath, content);
      updated.push(rel);
      if (stale) staleUpdated.add(rel);
    }
  }

  if (!anyGenerated) {
    fail('nothing to update - run sbs init first');
  }

  if (flags.json) {
    console.log(JSON.stringify({ ok: true, updated, unchanged, kept }, null, 2));
    return 0;
  }
  printGroup(
    'updated:',
    updated.map((rel) => (staleUpdated.has(rel) ? `${rel} (was older)` : rel)),
  );
  printGroup('unchanged:', unchanged);
  printGroup('kept:', kept);
  return 0;
}

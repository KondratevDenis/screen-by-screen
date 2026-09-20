// sbs init - installs the hub (.screen-by-screen/) and the sbs skills/commands for the chosen
// tools into a project. Idempotent: a second run touches only what changed, and never clobbers a
// file it did not itself generate.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fail } from '../output.js';
import { pkgVersion } from '../paths.js';
import { TOOLS } from '../install/targets.js';
import { isGenerated } from '../install/generate.js';

function toRel(root, absPath) {
  return relative(root, absPath).split(sep).join('/');
}

function writeFile(absPath, content) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content);
}

function printGroup(label, items) {
  if (items.length === 0) return;
  console.log(label);
  for (const item of items) console.log(`  ${item}`);
}

export function cmdInit(pathArg, flags) {
  const project = resolve(pathArg ?? '.');
  if (flags.tools === true) fail('--tools needs a value', 'example: --tools claude,codex');
  const toolNames = (typeof flags.tools === 'string' ? flags.tools : 'claude,codex')
    .split(',').map((t) => t.trim()).filter(Boolean);
  for (const name of toolNames) {
    if (!TOOLS[name]) fail(`unknown tool "${name}"`, 'known: claude, codex');
  }

  const written = [];
  const unchanged = [];
  const kept = [];

  // The hub: config.yaml + the three decisions journals. Created only when missing - an existing
  // journal is the human's record, never regenerated content.
  const hub = join(project, '.screen-by-screen');
  const hubFiles = [
    [join(hub, 'config.yaml'), 'version: 3\n'],
    [join(hub, 'decisions', 'scope.yaml'), '[]\n'],
    [join(hub, 'decisions', 'ds.yaml'), '[]\n'],
    [join(hub, 'decisions', 'mockup.yaml'), '[]\n'],
  ];
  for (const [absPath, content] of hubFiles) {
    const rel = toRel(project, absPath);
    if (existsSync(absPath)) {
      unchanged.push(rel);
      continue;
    }
    writeFile(absPath, content);
    written.push(rel);
  }

  const version = pkgVersion();
  for (const name of toolNames) {
    for (const { path: absPath, content } of TOOLS[name].files(project, version)) {
      const rel = toRel(project, absPath);
      if (!existsSync(absPath)) {
        writeFile(absPath, content);
        written.push(rel);
        continue;
      }
      const existing = readFileSync(absPath, 'utf8');
      if (!isGenerated(existing)) {
        kept.push(rel);
        continue;
      }
      if (existing === content) {
        unchanged.push(rel);
        continue;
      }
      writeFile(absPath, content);
      written.push(rel);
    }
  }

  if (flags.json) {
    console.log(JSON.stringify({ ok: true, written, unchanged, kept }, null, 2));
    return 0;
  }
  printGroup('written:', written);
  printGroup('unchanged:', unchanged);
  printGroup('kept:', kept);
  console.log('next: /sbs:explore <mockup link>');
  return 0;
}

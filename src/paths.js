// Filesystem anchors: the package root and the folders that hang off it, plus the two "find a
// root directory upward from here" walks (the artifact hub, the host project).

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const RULES_DIR = join(PKG_ROOT, 'rules');
export const TEMPLATES_DIR = join(PKG_ROOT, 'templates');
export const SKILLS_DIR = join(PKG_ROOT, 'skills');
export const COMMANDS_DIR = join(PKG_ROOT, 'commands');
export const SCHEMA_PATH = join(PKG_ROOT, 'SCHEMA.md');

// The hub v3: a `.screen-by-screen` folder walked up for from the working directory.
export function findHub(start) {
  let dir = resolve(start);
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, '.screen-by-screen'))) return join(dir, '.screen-by-screen');
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// The host project: walked up looking for `.git`, so a fresh hub is created next to the repo
// root, not in whatever folder the command happened to run from.
export function projectRoot(start) {
  let dir = resolve(start);
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start);
}

export function pkgVersion() {
  const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

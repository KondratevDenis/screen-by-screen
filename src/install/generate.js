// Turns the package's own skills/commands sources into per-project generated files. The
// frontmatter (name/description[/category/tags]) is kept from the source and stamped with a
// metadata.generatedBy marker; the body is spliced in as text (not re-serialized through YAML)
// so it stays byte-identical to what ships in the package.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SKILLS_DIR, COMMANDS_DIR } from '../paths.js';

export const MARKER = 'generatedBy';

// Lives here (not in targets.js) so claude.js/codex.js can depend on it without a circular
// import back through targets.js - targets.js re-exports it for anything that wants it from there.
export const SKILL_NAMES = ['explore', 'propose', 'fix', 'archive'];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function splitFrontmatter(text) {
  const m = text.match(FRONTMATTER_RE);
  if (!m) throw new Error('source file has no frontmatter block');
  return { frontmatter: m[1], body: m[2] };
}

function frontmatterOf(text) {
  const m = text.match(FRONTMATTER_RE);
  return m ? m[1] : null;
}

function stamp(source, version) {
  const { frontmatter, body } = splitFrontmatter(source);
  const stamped = `${frontmatter}\nmetadata:\n  author: screen-by-screen\n  ${MARKER}: "${version}"`;
  return `---\n${stamped}\n---\n${body}`;
}

export function renderSkill(name, version) {
  const source = readFileSync(join(SKILLS_DIR, `sbs-${name}`, 'SKILL.md'), 'utf8');
  return stamp(source, version);
}

export function renderCommand(name, version) {
  const source = readFileSync(join(COMMANDS_DIR, 'sbs', `${name}.md`), 'utf8');
  return stamp(source, version);
}

export function isGenerated(text) {
  const fm = frontmatterOf(text);
  return fm !== null && new RegExp(`^\\s*${MARKER}:`, 'm').test(fm);
}

export function generatedVersion(text) {
  const fm = frontmatterOf(text);
  if (fm === null) return null;
  const m = fm.match(new RegExp(`${MARKER}:\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

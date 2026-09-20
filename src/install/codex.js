// The Codex target: skills only, at .agents/skills/sbs-<x>/SKILL.md - Codex has no slash-command
// registry of its own to install into.

import { join } from 'node:path';
import { renderSkill, SKILL_NAMES } from './generate.js';

export const codex = {
  id: 'codex',
  files(projectRoot, version) {
    return SKILL_NAMES.map((name) => ({
      path: join(projectRoot, '.agents', 'skills', `sbs-${name}`, 'SKILL.md'),
      content: renderSkill(name, version),
    }));
  },
};

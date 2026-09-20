// The Claude Code target: skills at .claude/skills/sbs-<x>/SKILL.md, plus a thin slash-command
// wrapper at .claude/commands/sbs/<x>.md that just points at the installed skill.

import { join } from 'node:path';
import { renderSkill, renderCommand, SKILL_NAMES } from './generate.js';

export const claude = {
  id: 'claude',
  files(projectRoot, version) {
    const files = [];
    for (const name of SKILL_NAMES) {
      files.push({
        path: join(projectRoot, '.claude', 'skills', `sbs-${name}`, 'SKILL.md'),
        content: renderSkill(name, version),
      });
      files.push({
        path: join(projectRoot, '.claude', 'commands', 'sbs', `${name}.md`),
        content: renderCommand(name, version),
      });
    }
    return files;
  },
};

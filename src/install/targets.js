// The install targets registry: what "sbs init"/"sbs update" know how to install, and into which
// tool-specific locations. Adding a tool means adding one file here plus a new module next to
// claude.js/codex.js - cmdInit/cmdUpdate never hardcode a tool's paths themselves.

import { claude } from './claude.js';
import { codex } from './codex.js';

export const TOOLS = { claude, codex };

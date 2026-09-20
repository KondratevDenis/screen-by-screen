#!/usr/bin/env node
// sbs - core of the sbs family: bookkeeping for artifacts (.screen-by-screen/) and issuing briefs.
// Forms v3 - feature registry (registry.yaml), unit protocol (<unit>.protocol.yaml) and group
// (<gid>.group.yaml); the form contract,
// transition table and exact wording of domain checks - SCHEMA.md at the package root.
// The core checks paperwork, not the build: it never touches the network and never verifies the
// truth of numbers - only what is visible in the forms themselves (fields filled, dictionaries,
// staging, registry/protocol connectivity).
// Skills don't know their own paths: what to read and where to write is printed by
// `sbs instructions <command>`.

import { findHub } from './paths.js';
import { fail, nearest, setJsonMode } from './output.js';
import { loadConfig } from './forms.js';
import { cmdStatus } from './commands/status.js';
import { cmdInstructions } from './commands/instructions.js';
import { cmdValidate } from './commands/validate.js';
import { cmdNew } from './commands/new.js';
import { cmdPromote } from './commands/promote.js';
import { cmdReopen } from './commands/reopen.js';
import { cmdInit } from './commands/init.js';
import { cmdUpdate } from './commands/update.js';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['source', 'standalone', 'reason', 'tools'];
const BOOL_FLAGS = ['json', 'help'];

function usage() {
  console.log('sbs - the core of the sbs family: bookkeeping for layout-check forms (feature registry, unit protocols and group)\n');
  console.log('  sbs status                                 hub summary: what stands where, what waits on the human, what is in progress');
  console.log('  sbs instructions <form>                    this form\'s stage: task, rules, where to write, what\'s next');
  console.log('  sbs validate [<feature>]                   check v3 forms (exit 1 on errors)');
  console.log('  sbs new registry <feature> --source <link> create a feature registry from the template');
  console.log('  sbs new protocol <feature>/<unit>          create a unit protocol (registry must be approved)');
  console.log('  sbs new protocol --standalone <slug>       create a standalone screen protocol with no registry');
  console.log('  sbs promote <form>                         next status per the transition table - it is the only thing that moves statuses');
  console.log('  sbs reopen <form> --reason "..."           return a form to approved with a recorded reason');
  console.log('  sbs init [path] [--tools claude,codex]     install the hub and the sbs skills/commands into a project');
  console.log('  sbs update [path]                          refresh the generated skills/commands after upgrading the package');
  console.log('\n  <form> - path from the hub: okr-drawer/registry.yaml, okr-drawer/u1.protocol.yaml');
  console.log('  --json on any command - a machine-readable response shape, including on failure');
}

// Flags are parsed before positional arguments: otherwise `validate --json` would eat the flag
// as a folder name.
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith('--') && token !== '-h') {
    positional.push(token);
    continue;
  }
  const name = token === '-h' ? 'help' : token.slice(2);
  if (BOOL_FLAGS.includes(name)) flags[name] = true;
  else if (VALUE_FLAGS.includes(name)) {
    flags[name] = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : true;
  } else {
    setJsonMode(argv.includes('--json'));
    fail(`unknown flag "${token}"`, `known: ${[...BOOL_FLAGS, ...VALUE_FLAGS].map((f) => `--${f}`).join(', ')}`);
  }
}
setJsonMode(Boolean(flags.json));
const [command, arg] = positional;
const COMMANDS = ['instructions', 'status', 'validate', 'new', 'promote', 'reopen', 'init', 'update'];

if (!command || flags.help) {
  usage();
  process.exit(0);
}
if (!COMMANDS.includes(command)) {
  const near = nearest(command, COMMANDS);
  usage();
  fail(`unknown command "${command}"`, near ? `did you mean "${near}"` : `available: ${COMMANDS.join(', ')}`);
}

const root = findHub(process.cwd());
if (root) loadConfig(root);
// Read commands do not depend on the hub: no hub or an empty one means no forms, and that is a
// green answer with a hint, not a startup failure. `new` creates the first form and creates the
// hub itself. Only commands that need a specific form (promote / instructions / reopen) fail.
const HUB_OPTIONAL = new Set(['validate', 'status', 'new', 'init', 'update']);
if (!root && !HUB_OPTIONAL.has(command)) {
  fail('no .screen-by-screen folder found', 'install the hub and the agent files: sbs init');
}

switch (command) {
  case 'validate':
    process.exit(cmdValidate(root, arg, flags.json));
    break;
  case 'instructions':
    process.exit(cmdInstructions(root, arg, flags.json));
    break;
  case 'status':
    process.exit(cmdStatus(root, flags.json));
    break;
  case 'new':
    process.exit(cmdNew(root, arg, positional[2], flags));
    break;
  case 'promote':
    process.exit(cmdPromote(root, arg, flags.json));
    break;
  case 'reopen':
    process.exit(cmdReopen(root, arg, flags.reason, flags.json));
    break;
  case 'init':
    process.exit(cmdInit(arg, flags));
    break;
  case 'update':
    process.exit(cmdUpdate(arg, flags));
    break;
  default:
    usage();
    process.exit(2);
}

---
name: sbs-archive
description: >-
  Use for /sbs:archive, "archive the sbs feature", "move the check to the archive", "write the check's decisions to the log" - when a feature's registry is `closed` (or the feature is knowingly abandoned) and the human's decisions need to be distilled into the `.screen-by-screen/decisions/` logs and the feature's folder moved from the hub to the archive. Not for slicing, collecting the etalon, or fixes - that is /sbs:explore, /sbs:propose, /sbs:fix.
---

Distill the human's decisions on a feature into the `.screen-by-screen/decisions/<class>.yaml` logs and move the feature's folder into the hub's archive. The log classes, the entry format, and the consumption rule are owned by `rules/decisions.md` (not this skill): get its absolute path from `sbs instructions <feature>/registry.yaml --json` → `rules[].path`, and read it first.

**First thing**: `sbs status --json` - the hub's features and their statuses.

1. **Feature.** From the user's argument; if there's none or it's ambiguous, pick it via AskUserQuestion from the hub's features. Don't guess and don't pick it yourself.
2. **Readiness.** The feature's registry is `closed` (a standalone screen: `main.group.yaml` is `closed`), archive it without asking. Not `closed`: show what's still open (units, groups, open questions) and ask for confirmation - an abandoned feature can be archived, but that's the human's decision, not yours.
3. **Distillation.** Gather every human decision from the feature's forms:
   - registry `questions[]` with a non-empty `decision`;
   - `question` rows in protocol `rows[]` with a non-empty `decision`;
   - `excluded` units: their `reason` as the decision (if it doesn't duplicate a question already captured).
   A question with no decision (an abandoned feature) doesn't go into the log - the log holds decisions, not questions. For every entry: `source`, `at`, `question` and `decision` verbatim from the form, `context` - the facts the decision was made under, condensed. One decision covering several spots (the same gap in two units) is one entry, with `source` comma-separated.
4. **Logs.** Sort the entries into classes (`scope` / `ds` / `mockup` - criteria in `rules/decisions.md`) and show the user in one message: class, question -> decision, not raw YAML. Then append to `.screen-by-screen/decisions/<class>.yaml`: `id` continues the class file's numbering, don't touch existing entries; if the same question is decided again, update its entry (`decision`, `at`, `source`) instead of duplicating it.
5. **Move.** `mkdir -p <hub>/archive && mv <hub>/<feature> <hub>/archive/YYYY-MM-DD-<feature>` (today's date). If the target already exists, stop with an error, the human sorts it out. After the move, the feature disappears from `sbs status` (the scanner only reads the hub's first level) - that is the point.
6. **Result** in one message: the feature, where it moved to, which logs were updated and how many entries (new / updated). The logs are in git: the human commits them, remind them of that; don't commit it yourself.

**NEVER**: don't invent decisions that aren't in the forms, the log carries verbatim `decision`s, not your conclusions; don't archive something unclosed without confirmation; don't fix code or forms, archiving changes nothing in the feature, it only writes out and moves.

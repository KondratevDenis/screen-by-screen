// Failure format and the little "what did you mean" lookups shared by every command. In --json
// exactly one document goes to stdout - the skill parses it, not the text.

let JSON_MODE = false;

export function setJsonMode(value) {
  JSON_MODE = Boolean(value);
}

export function fail(msg, fix) {
  if (JSON_MODE) {
    console.log(JSON.stringify({ ok: false, status: [{ severity: 'error', message: msg, fix: fix ?? null }] }, null, 2));
  } else {
    console.error(`sbs: ${msg}`);
    if (fix) console.error(`     how to fix: ${fix}`);
  }
  process.exit(2);
}

// Failure with a list: every violated condition is named by hand - the form, the field, what exactly
// is wrong. A single "conditions not met" line forces searching on your own, and the search should
// be done by whoever already knows.
export function failList(msg, reasons, fix) {
  if (JSON_MODE) {
    const status = [
      { severity: 'error', message: msg, fix: fix ?? null },
      ...reasons.map((r) => ({ severity: 'error', where: String(r.where), message: r.msg })),
    ];
    console.log(JSON.stringify({ ok: false, status }, null, 2));
  } else {
    console.error(`sbs: ${msg}`);
    for (const r of reasons) console.error(`  ✗ ${r.where}: ${r.msg}`);
    if (fix) console.error(`     how to fix: ${fix}`);
  }
  process.exit(2);
}

// Got the name wrong - show what existing one it resembles (Levenshtein distance).
export function nearest(word, candidates) {
  const dist = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j += 1) d[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  };
  let best = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = dist(String(word), String(c));
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore <= Math.max(2, Math.floor(String(word).length / 2)) ? best : null;
}

export function notFound(kind, name, candidates) {
  const near = nearest(name, candidates);
  const list = candidates.length > 0 ? `available: ${candidates.join(', ')}` : 'none available';
  fail(`${kind} "${name}" not found - ${list}`, near ? `did you mean "${near}"` : undefined);
}

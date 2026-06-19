// ============================================================
// Beherrschungs-Engine (3.18) — Leitner-Light, pro Kind in progress.mastery.
// Jeder konkrete Fakt (z. B. "7×8", "13−5") trägt eine Box-Stufe 1–5:
//   richtig -> eine Box hoch + längeres Intervall; falsch -> zurück auf Box 1, sofort fällig.
// "fällig" = bereits gesehen, Fälligkeitszeit erreicht, noch nicht voll beherrscht (Box < 5).
// Diese Fakt-Statistik speist Wiederholungen, Eltern-Auswertung und adaptive Schwierigkeit.
// Reine Funktionen (kein React, kein Modulzustand) -> keine Import-Zyklen mit core.js.
// ============================================================

export const MASTERY_TARGET = 5;
const DAY = 86400000;
// Intervall bis zur nächsten Fälligkeit, sobald eine Box erreicht ist (Index = box-1).
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];

// Stabiler Schlüssel eines Fakts. Kommutative Operationen (+, ×) werden normalisiert,
// damit "7×8" und "8×7" denselben Fakt teilen.
export function factKey(p) {
  const { op, a, b } = p;
  if (op === "add") { const [x, y] = [a, b].sort((m, n) => m - n); return `add:${x}+${y}`; }
  if (op === "mul") { const [x, y] = [a, b].sort((m, n) => m - n); return `mul:${x}x${y}`; }
  if (op === "sub") return `sub:${a}-${b}`;
  if (op === "div") return `div:${a}:${b}`;
  if (op === "double" || op === "half" || op === "square" || op === "cube" || op === "pow4" || op === "sqrt") return `${op}:${a}`;
  return `${op}:${p.prompt}`; // chain/frac/decimal: prompt-basiert
}

// Minimal-Skelett eines Problems, das in der Mastery-Map gespeichert wird
// (genug, um die Aufgabe später neu „anzuziehen").
export function skeletonOf(p) {
  return {
    op: p.op, a: p.a, b: p.b, answer: p.answer, sym: p.sym,
    prompt: p.prompt, den: p.den, allowDecimal: p.allowDecimal,
    factKey: p.factKey || factKey(p),
  };
}

export function isDue(entry, now) {
  return !!entry && entry.seen > 0 && entry.due <= now && entry.box < MASTERY_TARGET;
}

export function dueCount(mastery, now) {
  let n = 0;
  for (const k in (mastery || {})) if (isDue(mastery[k], now)) n++;
  return n;
}

// Serien-Ergebnisse auf die Mastery-Map anwenden. results: [{ key, p (Skelett), ok }]
export function applyResults(mastery, results, now) {
  const m = { ...(mastery || {}) };
  for (const r of results || []) {
    if (!r || !r.key) continue;
    const e = m[r.key] || { box: 1, due: now, seen: 0, correct: 0, wrong: 0, p: r.p };
    const box = r.ok ? Math.min(MASTERY_TARGET, e.box + 1) : 1;
    m[r.key] = {
      box,
      due: now + INTERVALS[box - 1],
      seen: e.seen + 1,
      correct: e.correct + (r.ok ? 1 : 0),
      wrong: e.wrong + (r.ok ? 0 : 1),
      p: r.p || e.p,
    };
  }
  return m;
}

// Fällige/schwache Aufgaben-Skelette für eine Wiederholungs-Serie.
// ops = null -> alle Rechenarten; sonst nur diese. Schwächste/älteste zuerst.
export function duePool(mastery, now, ops, count) {
  return Object.values(mastery || {})
    .filter((e) => e.seen > 0 && e.due <= now && e.p)
    .filter((e) => !ops || ops.includes(e.p.op))
    .sort((a, b) => (a.box - b.box) || (a.due - b.due))
    .slice(0, count)
    .map((e) => ({ ...e.p }));
}

// Konkrete schwache Fakten für die Eltern-Auswertung (CR #19) — lesbare Labels (p.prompt).
export function weakFacts(mastery, n = 4) {
  return Object.values(mastery || {})
    .filter((e) => e.p && e.seen >= 2 && e.box <= 2 && e.wrong >= 1)
    .sort((a, b) => (a.box - b.box) || (b.wrong / b.seen - a.wrong / a.seen))
    .slice(0, n)
    .map((e) => ({ label: e.p.prompt, box: e.box, wrong: e.wrong, seen: e.seen }));
}

// Kompakte Zusammenfassung für die Eltern-Auswertung (3.14).
export function masterySummary(mastery) {
  const vals = Object.values(mastery || {});
  const secure = vals.filter((e) => e.box >= 4).length;     // sicher
  const learning = vals.filter((e) => e.box >= 2 && e.box < 4).length;
  const weak = vals.filter((e) => e.box <= 1 && e.seen > 0).length;
  return { total: vals.length, secure, learning, weak };
}

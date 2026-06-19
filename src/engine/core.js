/* ============================================================
   Felix' Mathe-Trainer — Datenmodell, Mathe-Engine, Speicher
   ============================================================ */

import { factKey, duePool } from "./mastery.js";
import { effectiveDifficulty } from "./adaptive.js";

/* ---------- Rechenarten ---------- */
const OPS = {
  add:    { sym: "+", label: "Plus",        kid: "Plus" },
  sub:    { sym: "−", label: "Minus",       kid: "Minus" },
  mul:    { sym: "×", label: "Mal (Reihen)", kid: "Mal" },
  div:    { sym: "÷", label: "Geteilt",     kid: "Teilen" },
  double: { sym: "·2", label: "Verdoppeln", kid: "Verdoppeln" },
  half:   { sym: ":2", label: "Halbieren",  kid: "Halbieren" },
  square: { sym: "²", label: "x²",          kid: "x²" },
  cube:   { sym: "³", label: "x³",          kid: "x³" },
  pow4:   { sym: "⁴", label: "x⁴",          kid: "x⁴" },
  sqrt:   { sym: "√", label: "Wurzel",      kid: "Wurzel" },
  chain:  { sym: "…", label: "Kettenrechnung", kid: "Kette" },
  frac:   { sym: "/", label: "Bruchrechnen", kid: "Brüche" },
  decimal:{ sym: ".", label: "Kommazahlen", kid: "Komma" },
};

/* ---------- Zahlenbereich-Stufen (Slider) ---------- */
const RANGE_SNAPS = [10, 20, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

/* ---------- Eingabemodi ---------- */
const INPUTS = {
  type:      { label: "Eintippen",      hint: "Antwort mit Ziffernfeld eingeben" },
  mc:        { label: "Multiple Choice", hint: "Aus 4 Antworten die richtige tippen" },
  truefalse: { label: "Wahr oder Falsch", hint: "Stimmt die Rechnung? Daumen hoch/runter" },
  missing:   { label: "Lückenrechnung", hint: "Die fehlende Zahl finden: 34 + ? = 62" },
};

/* ---------- Spielmodi (Verpackung) ---------- */
const MODES = {
  calm:  { label: "Ruhig üben",     icon: "🌱", desc: "Kein Timer, kein Druck.",            timer: false },
  time:  { label: "Zeit-Challenge", icon: "⏱️", desc: "Gegen die Uhr — schlag deinen Rekord!", timer: true },
  boss:  { label: "Boss-Kampf",     icon: "🥊", desc: "Jede richtige Antwort trifft den Boss.", timer: false },
  quest: { label: "Trail / Quest",  icon: "🗺️", desc: "Etappen auf der Karte freischalten.", timer: false },
};

/* ---------- Welten (Themes) ---------- */
const WORLDS = {
  stadion: {
    label: "Stadion", emoji: "⚽",
    grad: "radial-gradient(120% 85% at 50% 0%, oklch(0.80 0.15 150), oklch(0.46 0.13 152))",
    accent: "oklch(0.82 0.14 88)", soft: "oklch(0.70 0.16 150)",
    win: "Toooor!", boss: "Torwart", correct: ["Tor!", "Volltreffer!", "Goal!", "Bombe!"],
  },
  weltraum: {
    label: "Weltraum", emoji: "🚀",
    grad: "linear-gradient(165deg, oklch(0.34 0.13 275), oklch(0.20 0.12 300))",
    accent: "oklch(0.85 0.12 200)", soft: "oklch(0.55 0.16 290)",
    win: "Orbit erreicht!", boss: "Asteroid", correct: ["Liftoff!", "Boost!", "Zoom!", "Volltreffer!"],
  },
  street: {
    label: "Skate & Street", emoji: "🛹",
    grad: "linear-gradient(160deg, oklch(0.32 0.07 280), oklch(0.20 0.06 285))",
    accent: "oklch(0.70 0.16 200)", soft: "oklch(0.62 0.16 305)",
    win: "Trick gelandet!", boss: "Highscore", correct: ["Clean!", "Combo!", "Sick!", "Style!"],
  },
  trail: {
    label: "MTB-Trail", emoji: "🚵",
    grad: "linear-gradient(160deg, oklch(0.55 0.13 150), oklch(0.60 0.15 60))",
    accent: "oklch(0.82 0.14 88)", soft: "oklch(0.70 0.15 90)",
    win: "Gipfel erreicht!", boss: "Steile Rampe", correct: ["Bergauf!", "Stark!", "Weiter!", "Schwung!"],
  },
};

/* ---------- Level (aus GELÖSTEN RECHNUNGEN abgeleitet, CR #15) ---------- */
const RANKS = ["Rookie", "Talent", "Könner", "Profi", "Held", "Champion", "Legende"];
// Level steigt nur hoch, getrieben von den gelösten Rechnungen (= totalCorrect).
// Schritte: 20, dann +10 je Stufe (20, 30, 40, …). "name" = Levelname.
function levelFromSolved(solved) {
  solved = solved || 0;
  let lvl = 1, acc = 0, step = 20;
  while (solved >= acc + step) { acc += step; lvl++; step += 10; }
  const name = RANKS[Math.min(RANKS.length - 1, lvl - 1)];
  return { level: lvl, into: solved - acc, need: step, name, rank: name };
}
// Bonus-Münzen beim Erreichen von Level `lvl` (leicht skalierend): 10 × Level.
function levelUpBonus(lvl) { return 10 * lvl; }

/* ---------- Diplome ---------- */
const DIPLOMAS = [
  { id: "first",   title: "Erste Lektion",   sub: "Du hast deine erste Serie geschafft!", emoji: "🎓", test: s => s.child.totalSeries >= 1 },
  { id: "ten",     title: "10 Serien",        sub: "10 Übungsserien gemeistert.",          emoji: "🔟", test: s => s.child.totalSeries >= 10 },
  { id: "hundred", title: "100 Aufgaben",     sub: "100 Aufgaben richtig gelöst!",         emoji: "💯", test: s => s.child.totalCorrect >= 100 },
  { id: "boss",    title: "Boss-Bezwinger",   sub: "Einen Boss-Kampf gewonnen.",           emoji: "🥊", test: s => s.child.bossWins >= 1 },
  { id: "streak3", title: "3-Tage-Serie",     sub: "An 3 Tagen geübt — dranbleiben!",      emoji: "🔥", test: s => s.child.streak >= 3 },
  { id: "lvl5",    title: "Level Held",       sub: "Aufgestiegen auf Level Held.",         emoji: "⭐", test: s => levelFromSolved(s.child.totalCorrect).level >= 5 },
  { id: "perfect", title: "Perfekte Serie",   sub: "Eine ganze Serie ohne Fehler!",        emoji: "✨", test: s => s.child.perfectSeries >= 1 },
  { id: "champion",title: "Mathe-Champion",   sub: "500 Aufgaben richtig gelöst.",         emoji: "🏆", test: s => s.child.totalCorrect >= 500 },
];

/* ---------- Standard-Lektionen (2. Klasse ZH) ---------- */
function defaultLessons() {
  // Genau EINE vorkonfigurierte Starter-Lektion für neue Familien (2.-Klasse-tauglich).
  // Eltern bauen weitere Lektionen selbst bzw. duplizieren diese als Vorlage.
  return [
    { id: "l_starter", name: "Plus & Minus bis 20", ops: ["add", "sub"], rangeMax: 20, carry: true, count: 10, difficulty: 1, inputMode: "type", timerPerQ: 0, timerPerSerie: 0, recommended: true, randomize: true, starter: true },
  ];
}

/* ---------- Default-Status ---------- */
function defaultState() {
  return {
    v: 1,
    pin: "1234",
    onboarded: false,
    child: {
      name: "Felix", avatar: "🦊", world: "stadion",
      coins: 0, xp: 0, streak: 0, lastPlayedDay: null,
      totalCorrect: 0, totalWrong: 0, totalSeries: 0, bossWins: 0, perfectSeries: 0,
      diplomas: [], history: [], opStats: {}, wrongPool: [], lessonStats: {},
    },
    lessons: defaultLessons(),
    todayPlan: ["l_starter"],
    prizes: [], // keine Beispiel-Preise: eine echte Familie hinterlegt eigene (3.11)
    settings: { sound: true, animations: true, dailyGoal: 2, autoDifficulty: true, worldMode: "choose", praiseStyle: "effort" },
  };
}

/* ---------- Speicher ---------- */
const STORE_KEY = "felix_mathe_v1";
// Rohzustand mit Defaults zusammenführen + migrieren.
// Genutzt von loadState (localStorage) UND der Sync-Schicht (Cloud-Dokument),
// damit beide Quellen identisch hydratisiert werden.
function hydrateState(s) {
  const merged = { ...defaultState(), ...s, child: { ...defaultState().child, ...s.child }, settings: { ...defaultState().settings, ...s.settings } };
  // Migration: Heute-Plan aus altem recommended-Flag herleiten
  if (!Array.isArray(s.todayPlan)) {
    const fromFlag = (merged.lessons || []).filter(l => l.recommended).map(l => l.id);
    merged.todayPlan = fromFlag.length ? fromFlag : (merged.lessons[0] ? [merged.lessons[0].id] : []);
  }
  // verwaiste Plan-Einträge entfernen
  const ids = new Set((merged.lessons || []).map(l => l.id));
  merged.todayPlan = (merged.todayPlan || []).filter(id => ids.has(id));
  if (!merged.child.lessonStats) merged.child.lessonStats = {};
  return merged;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return hydrateState(JSON.parse(raw));
  } catch (e) { return defaultState(); }
}
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }

/* ============================================================
   MATHE-ENGINE
   ============================================================ */
/* ---- Zufall: umschaltbar zwischen echt-zufällig und seed-reproduzierbar ---- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let _rng = Math.random;
function randomSeed() { return Math.floor(Math.random() * 2147483647) + 1; }
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}
const rnd = (min, max) => Math.floor(_rng() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(_rng() * arr.length)];

function genOne(lesson, op) {
  const D = lesson.difficulty || 1;
  const R = lesson.rangeMax || 20;
  let a = null, b = null, answer, sym = OPS[op].sym, prompt = null, den = null, allowDecimal = false, p_decimals = 1;

  if (op === "add") {
    answer = rnd(Math.min(5, R), R);
    a = rnd(1, answer - 1); b = answer - a;
    if (!lesson.carry) { // Einer-Summe < 10
      a = rnd(1, Math.max(1, R - 1));
      const aOnes = a % 10; b = rnd(0, 9 - aOnes);
      if (a + b > R) b = Math.max(0, R - a);
      answer = a + b;
    }
  } else if (op === "sub") {
    a = rnd(Math.min(5, R), R); b = rnd(1, a); answer = a - b;
    if (!lesson.carry && (a % 10) < (b % 10)) { b = b - (b % 10) + rnd(0, a % 10); answer = a - b; }
  } else if (op === "mul") {
    const top = D >= 2 ? 10 : 5;
    a = rnd(1, top); b = rnd(1, top); answer = a * b;
  } else if (op === "div") {
    const top = D >= 3 ? 10 : 5;
    b = rnd(2, top); answer = rnd(1, top); a = b * answer; sym = "÷";
  } else if (op === "double") {
    a = rnd(2, Math.min(50, R)); answer = a * 2; prompt = `2 · ${a}`;
  } else if (op === "half") {
    answer = rnd(1, Math.min(50, R)); a = answer * 2; prompt = `${a} : 2`;
  } else if (op === "square") {
    // CR #24: Zahlenbereich gilt für die BASIS (gedeckelt, damit das Ergebnis handhabbar bleibt)
    a = rnd(2, Math.min(R, D >= 3 ? 15 : 12)); answer = a * a; prompt = `${a}²`;
  } else if (op === "cube") {
    a = rnd(2, Math.min(R, 12)); answer = a * a * a; prompt = `${a}³`;
  } else if (op === "pow4") {
    a = rnd(2, Math.min(R, 7)); answer = a * a * a * a; prompt = `${a}⁴`;
  } else if (op === "sqrt") {
    answer = rnd(2, D >= 3 ? 12 : 10); a = answer * answer; prompt = `√${a}`;
  } else if (op === "chain") {
    const terms = D >= 4 ? 4 : 3;
    const tmax = Math.min(R, R <= 20 ? R : 50);
    let cur = rnd(2, Math.max(3, Math.min(tmax, 12)));
    prompt = "" + cur;
    for (let i = 1; i < terms; i++) {
      const plus = (cur <= 1) || _rng() < 0.6;
      if (plus) { const t = rnd(1, Math.max(1, Math.min(tmax, R - cur))); cur += t; prompt += ` + ${t}`; }
      else { const t = rnd(1, cur - 1); cur -= t; prompt += ` − ${t}`; }
    }
    answer = cur;
  } else if (op === "frac") {
    den = rnd(2, D >= 3 ? 10 : 6);
    const na = rnd(1, den - 1);
    if (_rng() < 0.4 && na > 1) { const nb = rnd(1, na); answer = na - nb; prompt = `${na}/${den} − ${nb}/${den}`; }
    else { const nb = rnd(1, den - na); answer = na + nb; prompt = `${na}/${den} + ${nb}/${den}`; }
  } else if (op === "decimal") {
    allowDecimal = true;
    // CR #23: Anzahl Kommastellen wählbar (1–3)
    const dec = Math.max(1, Math.min(3, lesson.decimals || 1));
    const scale = Math.pow(10, dec);
    const top = Math.min(Math.max(R, 10), 1000);
    let ai = rnd(2, top * scale), bi = rnd(1, top * scale);
    const sub = _rng() < 0.5;
    if (sub && bi > ai) { const tmp = ai; ai = bi; bi = tmp; }
    a = ai / scale; b = bi / scale;
    answer = Math.round((sub ? a - b : a + b) * scale) / scale;
    sym = sub ? "−" : "+";
    p_decimals = dec;
    prompt = `${a.toFixed(dec)} ${sym} ${b.toFixed(dec)}`.replace(/\./g, ",");
  } else { a = rnd(1, R); b = rnd(1, R); answer = a + b; }

  if (prompt === null) prompt = `${a} ${sym} ${b}`;
  return { op, a, b, answer, sym, prompt, den, allowDecimal, decimals: p_decimals, id: Math.random().toString(36).slice(2) };
}

function makeChoices(answer, maxV) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    let c = answer + pick([-1, 1, -2, 2, -3, 3, -10, 10]);
    if (c < 0) c = Math.abs(c) + 1;
    if (maxV != null && c > maxV) continue;
    if (c !== answer) set.add(c);
  }
  return [...set].sort(() => _rng() - 0.5);
}

function makeChoicesDec(answer, dec = 1) {
  const scale = Math.pow(10, dec);
  const unit = 1 / scale; // kleinste Stufe für plausible Distraktoren (CR #23)
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    let c = Math.round((answer + pick([-unit, unit, -2 * unit, 2 * unit, -1, 1, -2, 2])) * scale) / scale;
    if (c < 0) c = Math.abs(c);
    if (c !== answer) set.add(c);
  }
  return [...set].sort(() => _rng() - 0.5);
}

// „Anziehen" eines (frischen ODER aus dem Pool stammenden) Problems mit dem Eingabemodus.
// Unverändert aus buildProblem extrahiert -> identische RNG-Reihenfolge (Reproduzierbarkeit).
function dressProblem(p, lesson) {
  const op = p.op;
  const mode = lesson.inputMode || "type";
  p.inputMode = mode;

  const dec = p.decimals || 1, decScale = Math.pow(10, dec);
  if (mode === "mc") {
    p.choices = op === "decimal" ? makeChoicesDec(p.answer, dec) : makeChoices(p.answer, op === "frac" ? p.den : null);
  } else if (mode === "truefalse") {
    const showCorrect = _rng() < 0.5;
    let shown;
    if (op === "decimal") shown = showCorrect ? p.answer : Math.round((p.answer + pick([-2 / decScale, -1 / decScale, 1 / decScale, 2 / decScale, 1, -1])) * decScale) / decScale;
    else shown = showCorrect ? p.answer : p.answer + pick([-2, -1, 1, 2, 3, -3]);
    if (shown < 0) shown = p.answer + 1;
    p.tfCorrect = (shown === p.answer);
    if (op === "frac") p.display = `${p.prompt} = ${shown}/${p.den}`;
    else if (op === "decimal") p.display = `${p.prompt} = ${Number(shown).toFixed(dec).replace(".", ",")}`;
    else p.display = `${p.prompt} = ${shown}`;
  } else if (mode === "missing") {
    // verstecke einen Operanden bei +/−/×; sonst Fallback type
    if (["add", "sub", "mul", "div"].includes(op) && p.b !== null) {
      const hideA = _rng() < 0.5;
      p.missingAns = hideA ? p.a : p.b;
      p.display = hideA ? `? ${p.sym} ${p.b} = ${p.answer}` : `${p.a} ${p.sym} ? = ${p.answer}`;
    } else {
      p.inputMode = "type";
    }
  }
  return p;
}

function buildProblem(lesson) {
  const op = pick(lesson.ops && lesson.ops.length ? lesson.ops : ["add"]);
  const p = genOne(lesson, op);
  p.factKey = factKey(p); // rein abgeleitet, verbraucht keinen Zufall
  return dressProblem(p, lesson);
}

// Klassische Serie (frisch gewürfelt). Bleibt für Rückwärtskompatibilität erhalten.
function buildSerie(lesson, seed) {
  const prev = _rng;
  if (seed != null) _rng = mulberry32(seed >>> 0);
  const out = [];
  for (let i = 0; i < (lesson.count || 10); i++) out.push(buildProblem(lesson));
  _rng = prev;
  return out;
}

// Serie inkl. adaptiver Schwierigkeit, Wiederholungs-Pool und Auto-Einmischen (Phase 4).
// progress = Fortschritt des aktiven Kindes (für mastery + adaptive). Ohne neue Flags
// verhält sich das EXAKT wie buildSerie (gleiche RNG-Reihenfolge).
function buildSeries(lesson, seed, progress) {
  const prev = _rng;
  if (seed != null) _rng = mulberry32(seed >>> 0);
  const count = lesson.count || 10;
  const eff = effectiveDifficulty(lesson, progress || {});
  const L = eff === (lesson.difficulty || 1) ? lesson : { ...lesson, difficulty: eff };
  const now = Date.now();
  const mastery = (progress && progress.mastery) || {};
  let out = [];

  if (lesson.repeat) {
    // Wiederholungs-Lektion (CR #16): GENAU die fälligen Fakten, kein Auffüllen mit fremden
    // Aufgaben. Serie ist fertig, wenn die fälligen durch sind. (count = Obergrenze.)
    const ops = lesson.repeatScope === "all" ? null : (lesson.ops && lesson.ops.length ? lesson.ops : null);
    const pool = duePool(mastery, now, ops, count);
    out = pool.map((sk) => dressProblem({ ...sk }, L));
  } else {
    for (let i = 0; i < count; i++) out.push(buildProblem(L));
    if (lesson.mixDue) {
      // Auto-Einmischen: einige fällige Wiederholungs-Items hinten einmischen (z. B. 8 neu + 2 fällig).
      const k = Math.min(count, Math.max(1, Math.round(count * 0.2)));
      const pool = duePool(mastery, now, null, k).map((sk) => dressProblem({ ...sk }, L));
      for (let i = 0; i < pool.length; i++) out[out.length - 1 - i] = pool[i];
    }
  }
  _rng = prev;
  return out;
}

function checkAnswer(p, value) {
  if (p.inputMode === "truefalse") return value === p.tfCorrect; // value: bool
  if (p.inputMode === "missing")   return Number(value) === p.missingAns;
  if (p.op === "decimal") return Math.abs(parseFloat(String(value).replace(",", ".")) - p.answer) < 0.5 / Math.pow(10, p.decimals || 1);
  return Number(value) === p.answer;
}

/* ---------- Preis-Fortschritt (Kind & Ergebnis), CR #15 ----------
   Zwei Typen: "coins" (Kauf — Kosten in Münzen) und "milestone" (gelöste Rechnungen). */
function prizeType(p) { return p.type || (p.cost != null ? "coins" : "milestone"); }
function prizeProgress(state, p) {
  const c = state.child;
  if (prizeType(p) === "milestone") {
    const goal = p.threshold || 0;
    const cur = c.totalCorrect || 0;
    return { type: "milestone", cur, goal, remaining: Math.max(0, goal - cur), unit: "Rechnungen", icon: "🧮", pct: goal ? Math.min(100, cur / goal * 100) : 0, done: cur >= goal };
  }
  const goal = p.cost || 0;          // Münz-Kauf
  const cur = c.coins || 0;
  return { type: "coins", cur, goal, remaining: Math.max(0, goal - cur), unit: "Münzen", icon: "🪙", pct: goal ? Math.min(100, cur / goal * 100) : 0, done: cur >= goal };
}

/* ---------- Tageslogik / Streak ---------- */
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

/* ---------- Lektions-Status (für Sortierung & Heute-Plan) ----------
   cat 0 = noch nicht geübt · 1 = geübt, aber schwach (<70%) · 2 = gut erfüllt (≥70%) */
const LESSON_PASS = 70;
function lessonStatusOf(state, id) {
  const st = (state.child.lessonStats || {})[id];
  if (!st || !st.doneCount) return { cat: 0, doneCount: 0, bestAcc: null, lastAcc: null, doneToday: false };
  const doneToday = st.lastDay === todayKey();
  const cat = (st.bestAcc >= LESSON_PASS) ? 2 : 1;
  return { cat, doneCount: st.doneCount, bestAcc: st.bestAcc, lastAcc: st.lastAcc, doneToday };
}

export {OPS, INPUTS, MODES, WORLDS, RANKS, DIPLOMAS,
  levelFromSolved, levelUpBonus, prizeType, defaultLessons, defaultState, loadState, saveState, hydrateState,
  buildProblem, buildSerie, buildSeries, dressProblem, checkAnswer, makeChoices, makeChoicesDec, genOne,
  todayKey, rnd, pick, RANGE_SNAPS, lessonStatusOf, LESSON_PASS, randomSeed, mulberry32, hashSeed, prizeProgress};


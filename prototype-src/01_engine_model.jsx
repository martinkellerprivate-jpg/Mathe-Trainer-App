/* ============================================================
   Felix' Mathe-Trainer — Datenmodell, Mathe-Engine, Speicher
   ============================================================ */

/* ---------- Rechenarten ---------- */
const OPS = {
  add:    { sym: "+", label: "Plus",        kid: "Plus" },
  sub:    { sym: "−", label: "Minus",       kid: "Minus" },
  mul:    { sym: "×", label: "Mal (Reihen)", kid: "Mal" },
  div:    { sym: "÷", label: "Geteilt",     kid: "Teilen" },
  double: { sym: "·2", label: "Verdoppeln", kid: "Verdoppeln" },
  half:   { sym: ":2", label: "Halbieren",  kid: "Halbieren" },
  square: { sym: "²", label: "Quadrat",     kid: "Quadrat" },
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
  action: {
    label: "Action", emoji: "💥",
    grad: "linear-gradient(160deg, oklch(0.62 0.18 18), oklch(0.45 0.16 25))",
    accent: "oklch(0.82 0.14 88)", soft: "oklch(0.64 0.18 18)",
    win: "K.O.!", boss: "Gegner", correct: ["POW!", "BAM!", "Treffer!", "Wumm!"],
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

/* ---------- Ränge / Level (aus Münzen abgeleitet, bewusst langsam) ---------- */
const RANKS = ["Rookie", "Talent", "Könner", "Profi", "Held", "Champion", "Legende"];
function levelFromCoins(coins) {
  // langsamer Aufstieg: Stufe 1 ab 0, dann 200, +100 pro Stufe
  let lvl = 1, need = 200, acc = 0;
  coins = coins || 0;
  while (coins >= acc + need) { acc += need; lvl++; need = 200 + (lvl - 1) * 100; }
  return { level: lvl, into: coins - acc, need, rank: RANKS[Math.min(RANKS.length - 1, lvl - 1)] };
}
const levelFromXp = levelFromCoins; // Alias (Altbestand)

/* ---------- Diplome ---------- */
const DIPLOMAS = [
  { id: "first",   title: "Erste Lektion",   sub: "Du hast deine erste Serie geschafft!", emoji: "🎓", test: s => s.child.totalSeries >= 1 },
  { id: "ten",     title: "10 Serien",        sub: "10 Übungsserien gemeistert.",          emoji: "🔟", test: s => s.child.totalSeries >= 10 },
  { id: "hundred", title: "100 Aufgaben",     sub: "100 Aufgaben richtig gelöst!",         emoji: "💯", test: s => s.child.totalCorrect >= 100 },
  { id: "boss",    title: "Boss-Bezwinger",   sub: "Einen Boss-Kampf gewonnen.",           emoji: "🥊", test: s => s.child.bossWins >= 1 },
  { id: "streak3", title: "3-Tage-Serie",     sub: "An 3 Tagen geübt — dranbleiben!",      emoji: "🔥", test: s => s.child.streak >= 3 },
  { id: "lvl5",    title: "Rang Held",        sub: "Aufgestiegen zum Rang Held.",          emoji: "⭐", test: s => levelFromCoins(s.child.coins).level >= 5 },
  { id: "perfect", title: "Perfekte Serie",   sub: "Eine ganze Serie ohne Fehler!",        emoji: "✨", test: s => s.child.perfectSeries >= 1 },
  { id: "champion",title: "Mathe-Champion",   sub: "500 Aufgaben richtig gelöst.",         emoji: "🏆", test: s => s.child.totalCorrect >= 500 },
];

/* ---------- Standard-Lektionen (2. Klasse ZH) ---------- */
function defaultLessons() {
  return [
    { id: "l_plus20",  name: "Plus & Minus bis 20", ops: ["add", "sub"], rangeMax: 20,  carry: true,  count: 10, difficulty: 1, inputMode: "type", timerPerQ: 0, timerPerSerie: 0, recommended: true, randomize: true },
    { id: "l_plus100", name: "Plus & Minus bis 100", ops: ["add", "sub"], rangeMax: 100, carry: true,  count: 12, difficulty: 2, inputMode: "type", timerPerQ: 0, timerPerSerie: 0, recommended: false, randomize: true },
    { id: "l_mc20",    name: "Schnell-Quiz bis 20", ops: ["add", "sub"], rangeMax: 20,  carry: false, count: 10, difficulty: 1, inputMode: "mc",   timerPerQ: 0, timerPerSerie: 0, recommended: false, randomize: true },
    { id: "l_reihen",  name: "Mal-Reihen (Einmaleins)", ops: ["mul"],    rangeMax: 10,  carry: true,  count: 10, difficulty: 2, inputMode: "mc",   timerPerQ: 0, timerPerSerie: 0, recommended: false, randomize: true },
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
    todayPlan: ["l_plus20", "l_reihen"],
    prizes: [
      { id: "p1", name: "Eis essen", emoji: "🍦", trigger: "coins", threshold: 300, redeemed: false },
      { id: "p2", name: "Kino-Abend", emoji: "🎬", trigger: "level", threshold: 5, redeemed: false },
    ],
    settings: { sound: true, animations: true, dailyGoal: 2, autoDifficulty: true, worldMode: "choose", praiseStyle: "effort" },
  };
}

/* ---------- Speicher ---------- */
const STORE_KEY = "felix_mathe_v1";
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
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
  let a = null, b = null, answer, sym = OPS[op].sym, prompt = null, den = null, allowDecimal = false;

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
    a = rnd(2, D >= 3 ? 12 : 10); answer = a * a; prompt = `${a}²`;
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
    const top = Math.min(Math.max(R, 10), 1000);
    let ai = rnd(2, top * 10), bi = rnd(1, top * 10);
    const sub = _rng() < 0.5;
    if (sub && bi > ai) { const tmp = ai; ai = bi; bi = tmp; }
    a = ai / 10; b = bi / 10;
    answer = sub ? Math.round((a - b) * 10) / 10 : Math.round((a + b) * 10) / 10;
    sym = sub ? "−" : "+";
    prompt = `${a.toFixed(1)} ${sym} ${b.toFixed(1)}`.replace(/\./g, ",");
  } else { a = rnd(1, R); b = rnd(1, R); answer = a + b; }

  if (prompt === null) prompt = `${a} ${sym} ${b}`;
  return { op, a, b, answer, sym, prompt, den, allowDecimal, id: Math.random().toString(36).slice(2) };
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

function makeChoicesDec(answer) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    let c = Math.round((answer + pick([-0.1, 0.1, -0.2, 0.2, -1, 1, -2, 2])) * 10) / 10;
    if (c < 0) c = Math.abs(c);
    if (c !== answer) set.add(c);
  }
  return [...set].sort(() => _rng() - 0.5);
}

function buildProblem(lesson) {
  const op = pick(lesson.ops && lesson.ops.length ? lesson.ops : ["add"]);
  const p = genOne(lesson, op);
  const mode = lesson.inputMode || "type";
  p.inputMode = mode;

  if (mode === "mc") {
    p.choices = op === "decimal" ? makeChoicesDec(p.answer) : makeChoices(p.answer, op === "frac" ? p.den : null);
  } else if (mode === "truefalse") {
    const showCorrect = _rng() < 0.5;
    let shown;
    if (op === "decimal") shown = showCorrect ? p.answer : Math.round((p.answer + pick([-0.2, -0.1, 0.1, 0.2, 1, -1])) * 10) / 10;
    else shown = showCorrect ? p.answer : p.answer + pick([-2, -1, 1, 2, 3, -3]);
    if (shown < 0) shown = p.answer + 1;
    p.tfCorrect = (shown === p.answer);
    if (op === "frac") p.display = `${p.prompt} = ${shown}/${p.den}`;
    else if (op === "decimal") p.display = `${p.prompt} = ${Number(shown).toFixed(1).replace(".", ",")}`;
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

function buildSerie(lesson, seed) {
  const prev = _rng;
  if (seed != null) _rng = mulberry32(seed >>> 0);
  const out = [];
  for (let i = 0; i < (lesson.count || 10); i++) out.push(buildProblem(lesson));
  _rng = prev;
  return out;
}

function checkAnswer(p, value) {
  if (p.inputMode === "truefalse") return value === p.tfCorrect; // value: bool
  if (p.inputMode === "missing")   return Number(value) === p.missingAns;
  if (p.op === "decimal") return Math.abs(parseFloat(String(value).replace(",", ".")) - p.answer) < 0.05;
  return Number(value) === p.answer;
}

/* ---------- Preis-Fortschritt (Kind & Ergebnis) ---------- */
function prizeProgress(state, p) {
  let cur, unit, icon;
  if (p.trigger === "coins") { cur = state.child.coins; unit = "Münzen"; icon = "🪙"; }
  else if (p.trigger === "level") { cur = levelFromCoins(state.child.coins).level; unit = "Level"; icon = "⭐"; }
  else if (p.trigger === "series") { cur = state.child.totalSeries || 0; unit = "Serien"; icon = "🎯"; }
  else { cur = (state.child.diplomas || []).length; unit = "Diplome"; icon = "🎖️"; }
  const goal = p.threshold;
  return { cur, goal, remaining: Math.max(0, goal - cur), unit, icon, pct: Math.min(100, cur / goal * 100), done: cur >= goal };
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

Object.assign(window, {
  OPS, INPUTS, MODES, WORLDS, RANKS, DIPLOMAS,
  levelFromXp, levelFromCoins, defaultLessons, defaultState, loadState, saveState,
  buildProblem, buildSerie, checkAnswer, makeChoices, makeChoicesDec, genOne,
  todayKey, rnd, pick, RANGE_SNAPS, lessonStatusOf, LESSON_PASS, randomSeed, mulberry32, hashSeed, prizeProgress,
});

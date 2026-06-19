// ============================================================
// Adaptive Schwierigkeit (3.2 + CR #22) — pro Lektion pro Kind in progress.adaptive[lessonId].
// Drei Modi:
//   "fixed"    — lesson.difficulty gilt fest (1–5).
//   "adaptive" — gewählte Stufe = Start; die Stufe wird nach jeder SERIE über die
//                Trefferquote nachgeführt (nur Schwierigkeit).
//   "auto"     — Vollautomatik: SCHWIERIGKEIT live & reaktiv pro Antwort (rollendes Fenster,
//                Hysterese), TEMPO träge/sekundär. Stand = { level, tempo, recent }.
// Konfliktregeln (CR #22): Schwierigkeit hat Vorrang; steigt die Stufe → Tempo „entspannt";
// Fehler → beides leichter/lockerer; pro Schritt bewegt sich nur ein Hebel.
// Reine Funktionen — kein React, kein Modulzustand.
// ============================================================

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const ADAPT_MODES = new Set(["adaptive", "auto"]);

// Aktuell wirksame Schwierigkeit einer Lektion für dieses Kind.
export function effectiveDifficulty(lesson, progress) {
  if (!lesson || !ADAPT_MODES.has(lesson.difficultyMode)) return (lesson && lesson.difficulty) || 1;
  const a = (progress && progress.adaptive) ? progress.adaptive[lesson.id] : null;
  const lvl = a && typeof a.level === "number" ? a.level : (lesson.difficulty || 1);
  return clamp(lvl, 1, 5);
}

// Neue adaptive-Map nach einer Serie (nur Modus "adaptive", reine Schwierigkeit).
export function nextAdaptive(lesson, progress, accuracyPct) {
  const adaptive = { ...((progress && progress.adaptive) || {}) };
  if (!lesson || lesson.difficultyMode !== "adaptive") return adaptive;
  const cur = effectiveDifficulty(lesson, progress);
  let lvl = cur;
  if (accuracyPct >= 85) lvl = Math.min(5, cur + 1);
  else if (accuracyPct <= 50) lvl = Math.max(1, cur - 1);
  adaptive[lesson.id] = { ...(adaptive[lesson.id] || {}), level: lvl };
  return adaptive;
}

export function defaultDifficultyMode(settings) {
  // Globaler Schalter -> "adaptive" als Default für neue Lektionen (User-Entscheidung).
  return settings && settings.autoDifficulty ? "adaptive" : "fixed";
}

// ============================================================
// Vollautomatik (CR #22)
// ============================================================
const WINDOW = 6;            // rollendes Fenster
const TEMPO_MIN = 0.8, TEMPO_MAX = 1.4, TEMPO_START = 1.2; // Zeit-Multiplikator (1=Basis)

// Erwartete Antwortzeit (ms) für Stufe + Eingabemodus. Höhere Stufe -> mehr Zeit erwartet.
export function expectedTimeMs(level, inputMode) {
  const base = { type: 5200, mc: 3600, truefalse: 2600, missing: 5600 }[inputMode] || 4600;
  return base * (0.8 + clamp(level, 1, 5) * 0.18);
}

// Zeitbudget (Sekunden) für Zeit-Challenge im Auto-Modus.
export function autoTimeBudgetSec(autoState, inputMode) {
  const exp = expectedTimeMs(autoState.level, inputMode) * autoState.tempo;
  return Math.max(3, Math.round((exp * 1.5) / 1000)); // Mindestzeit 3s, etwas Puffer
}

function zoneOf(correct, timeMs, level, inputMode, tempo) {
  if (!correct) return "hard";
  const exp = expectedTimeMs(level, inputMode) * tempo;
  if (timeMs <= exp * 0.6) return "easy";   // richtig & schnell
  if (timeMs >= exp * 1.6) return "hard";   // sehr langsam
  return "fit";
}

// Start-Zustand für eine Auto-Lektion.
export function initAuto(lesson, progress) {
  const a = (progress && progress.adaptive) ? progress.adaptive[lesson.id] : null;
  return {
    level: effectiveDifficulty(lesson, progress),
    tempo: a && typeof a.tempo === "number" ? clamp(a.tempo, TEMPO_MIN, TEMPO_MAX) : TEMPO_START,
    recent: Array.isArray(a && a.recent) ? a.recent.slice(-WINDOW) : [],
  };
}

// Eine Antwort verarbeiten -> neuer Auto-Zustand (live Schwierigkeit, träges Tempo).
// answer = { correct, timeMs, inputMode }
export function updateAuto(st, answer) {
  let level = clamp(st.level, 1, 5);
  let tempo = clamp(st.tempo || TEMPO_START, TEMPO_MIN, TEMPO_MAX);
  const z = zoneOf(answer.correct, answer.timeMs, level, answer.inputMode, tempo);
  let recent = [...(st.recent || []), { zone: z, correct: !!answer.correct }].slice(-WINDOW);

  const easy = recent.filter((r) => r.zone === "easy").length;
  const hard = recent.filter((r) => r.zone === "hard").length;
  let leverMoved = false;

  // 1) SCHWIERIGKEIT zuerst (Vorrang), live, mit Hysterese (Fenster muss gefüllt sein).
  if (recent.length >= 4 && hard >= 2 && level > 1) {
    level -= 1; tempo = clamp(tempo + 0.15, TEMPO_MIN, TEMPO_MAX); // Fehler -> leichter + lockerer
    recent = []; leverMoved = true;
  } else if (recent.length >= 5 && easy >= Math.ceil(recent.length * 0.7) && hard === 0 && level < 5) {
    level += 1; tempo = TEMPO_START; // zu leicht -> Stufe hoch, Tempo auf „entspannt"
    recent = []; leverMoved = true;
  }

  // 2) TEMPO nur, wenn die Schwierigkeit NICHT bewegt wurde (ein Hebel pro Schritt) — und träge.
  if (!leverMoved) {
    if (hard >= 1) {
      tempo = clamp(tempo + 0.08, TEMPO_MIN, TEMPO_MAX);            // bei Fehler/zu langsam sofort lockern
    } else if (recent.length >= WINDOW && easy >= 3 && hard === 0) {
      tempo = clamp(tempo - 0.04, TEMPO_MIN, TEMPO_MAX);            // sanft straffen (nur bei vollem, sauberem Fenster)
    }
  }

  return { level, tempo, recent };
}

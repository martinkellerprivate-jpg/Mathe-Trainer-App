import { defaultState, defaultLessons } from "../engine/core.js";

// ============================================================
// Dokument-Modell (7.2/7.4 + CR #3 „alles pro Kind"):
//   config              — familienweit: pin, settings (sound/animations/autoDifficulty), children[]-Roster
//   progress:<childId>  — pro Kind: world, lessons, todayPlan, prizes, diplomas, coins,
//                         solved, mastery, adaptive, Statistik UND die kind-spezifischen
//                         Einstellungen dailyGoal/praiseStyle/worldMode.
//
// Die Komponenten arbeiten weiter mit der gemergten Shape (state.lessons, state.settings.X,
// state.child.*). composeState/decompose übersetzen zwischen beiden Welten -> UI unverändert.
// hydrateConfig/hydrateProgress machen ältere Dokumente vorwärtskompatibel (automatische,
// idempotente Migration alter Buckets).
// ============================================================

// Pro-Kind-Felder, die in state.child landen.
const CHILD_DATA = [
  "world", "coins", "xp", "streak", "lastPlayedDay", "practiceDays",
  "totalCorrect", "totalWrong", "totalSeries", "bossWins", "perfectSeries",
  "diplomas", "history", "opStats", "wrongPool", "lessonStats", "mastery", "adaptive",
];
// Pro-Kind-Einstellungen (erscheinen in state.settings, liegen aber im progress-Doc).
const CHILD_SETTINGS = ["dailyGoal", "praiseStyle", "worldMode"];
// Familienweite Einstellungen (config.settings).
const FAMILY_SETTINGS = ["sound", "animations", "autoDifficulty"];

export function genChildId() {
  return "c_" + Math.random().toString(36).slice(2, 9);
}

export function newChild(name, avatar = "🦊") {
  return { id: genChildId(), name: name || "Kind", avatar };
}

// Brandneue Familie: leerer Roster, nur familienweite Defaults.
export function defaultConfig() {
  const s = defaultState();
  return {
    v: s.v, pin: s.pin, onboarded: false,
    children: [],
    settings: { sound: true, animations: true, autoDifficulty: !!s.settings.autoDifficulty },
  };
}

// Frischer Kind-Datensatz: Starter-Lektion, leere Preise, Null-Fortschritt.
export function defaultProgress() {
  const s = defaultState();
  return {
    world: "stadion",
    lessons: defaultLessons(), todayPlan: [...(s.todayPlan || [])], prizes: [],
    coins: 0, xp: 0, streak: 0, lastPlayedDay: null, practiceDays: 0,
    totalCorrect: 0, totalWrong: 0, totalSeries: 0, bossWins: 0, perfectSeries: 0,
    diplomas: [], history: [], opStats: {}, wrongPool: [], lessonStats: {},
    mastery: {}, adaptive: {},
    dailyGoal: 2, praiseStyle: "effort", worldMode: "choose",
  };
}

// Beliebiges (auch altes) config-Dokument vorwärtskompatibel machen — verwirft alte
// Pro-Kind-Buckets (lessons/todayPlan/prizes), behält nur familienweite Settings.
export function hydrateConfig(raw) {
  const d = defaultConfig();
  const settings = {};
  for (const f of FAMILY_SETTINGS) settings[f] = (raw.settings && f in raw.settings) ? raw.settings[f] : d.settings[f];
  return {
    v: raw.v ?? d.v, pin: raw.pin ?? d.pin, onboarded: raw.onboarded ?? false,
    children: raw.children || [], settings,
  };
}

// Beliebiges (auch altes) progress-Dokument auf die vollständige Pro-Kind-Form bringen.
export function hydrateProgress(raw) {
  const d = defaultProgress();
  const p = { ...d, ...(raw || {}) };
  if (p.world === "action") p.world = "weltraum"; // CR #11: Welt umbenannt
  p.opStats = (raw && raw.opStats) || {};
  p.mastery = (raw && raw.mastery) || {};
  p.adaptive = (raw && raw.adaptive) || {};
  if (!Array.isArray(p.lessons) || p.lessons.length === 0) p.lessons = d.lessons;
  if (!Array.isArray(p.todayPlan)) p.todayPlan = d.todayPlan;
  if (!Array.isArray(p.prizes)) p.prizes = [];
  if (!Array.isArray(p.diplomas)) p.diplomas = [];
  // verwaiste Tagesplan-Einträge entfernen
  const ids = new Set(p.lessons.map((l) => l.id));
  p.todayPlan = p.todayPlan.filter((id) => ids.has(id));
  return p;
}

// Migration: Phase-2-Single-Blob ("state"-Dokument) -> { config, childId, progress }.
export function splitState(blob) {
  const child = blob.child || {};
  const id = child.id || "c_legacy"; // deterministisch -> idempotent
  const identity = { id, name: child.name || "Kind", avatar: child.avatar || "🦊" };
  const rawProgress = {
    ...child,
    lessons: blob.lessons, todayPlan: blob.todayPlan, prizes: blob.prizes,
    dailyGoal: blob.settings && blob.settings.dailyGoal,
    praiseStyle: blob.settings && blob.settings.praiseStyle,
    worldMode: blob.settings && blob.settings.worldMode,
  };
  const progress = hydrateProgress(rawProgress);
  const config = hydrateConfig({ v: blob.v, pin: blob.pin, onboarded: blob.onboarded, children: [identity], settings: blob.settings });
  return { config, childId: id, progress };
}

// config + aktives Kind + progress -> gemergte Shape für die Komponenten.
export function composeState(config, activeId, progress) {
  const ident = (config.children || []).find((c) => c.id === activeId) || {};
  const child = {};
  for (const f of CHILD_DATA) child[f] = progress[f];
  Object.assign(child, ident); // id, name, avatar
  const settings = { ...(config.settings || {}) };
  for (const f of CHILD_SETTINGS) settings[f] = progress[f];
  return {
    v: config.v, pin: config.pin, onboarded: config.onboarded,
    children: config.children || [], activeChildId: activeId,
    lessons: progress.lessons, todayPlan: progress.todayPlan, prizes: progress.prizes,
    settings, child,
  };
}

// gemergten next-State zurück in config + progress des aktiven Kindes zerlegen.
export function decompose(next) {
  const activeId = next.activeChildId;
  const c = next.child || {};
  const s = next.settings || {};
  const progress = {};
  for (const f of CHILD_DATA) if (f in c) progress[f] = c[f];
  progress.lessons = next.lessons;
  progress.todayPlan = next.todayPlan;
  progress.prizes = next.prizes;
  for (const f of CHILD_SETTINGS) progress[f] = s[f];
  const familySettings = {};
  for (const f of FAMILY_SETTINGS) familySettings[f] = s[f];
  const children = (next.children || []).map((ch) => (ch.id === activeId ? { ...ch, id: activeId, name: c.name, avatar: c.avatar } : ch));
  const config = { v: next.v, pin: next.pin, onboarded: next.onboarded, children, settings: familySettings };
  return { activeId, config, progress };
}

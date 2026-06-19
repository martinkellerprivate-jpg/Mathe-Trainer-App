// ============================================================
// Sound-Effekte via Web Audio API (CR #10 + Welt-Immersion Sound-Packs).
// Keine Asset-Dateien (0 Byte, offline-tauglich, lizenzfrei). Pro Welt eine
// eigene Klangfarbe. iOS: AudioContext muss nach einer Nutzergeste laufen —
// blip() ruft resume() innerhalb des Klick-Handlers auf.
// Aufrufer prüfen settings.sound, bevor sie spielen.
// ============================================================

let ctx = null;
function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}

// Innerhalb einer Nutzergeste aufrufen (iOS-Freischaltung).
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

function blip({ freq = 440, dur = 0.12, type = "sine", gain = 0.18, slideTo = null, when = 0 }) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Welt-Klangfarbe: Grundton + Oszillator-Typ pro Welt.
const WORLD_TONE = {
  stadion:  { base: 1.0, type: "triangle" }, // hell, sportlich
  street:   { base: 0.9, type: "sawtooth" }, // urban, kantig
  weltraum: { base: 1.12, type: "sine" },    // klar, schwebend
  trail:    { base: 0.95, type: "triangle" },// natürlich, weich
};
function tone(world) { return WORLD_TONE[world] || WORLD_TONE.stadion; }

export function sfxCorrect(world) {
  const { base, type } = tone(world);
  blip({ freq: 523 * base, slideTo: 784 * base, dur: 0.14, type, gain: 0.16 });
}
export function sfxWrong(world) {
  const { type } = tone(world);
  blip({ freq: 300, slideTo: 170, dur: 0.22, type, gain: 0.14 });
}
export function sfxCombo(world) {
  const { base, type } = tone(world);
  [523, 659, 784, 1047].forEach((f, i) => blip({ freq: f * base, dur: 0.1, type, gain: 0.13, when: i * 0.06 }));
}
export function sfxFinish(world) {
  const { base, type } = tone(world);
  [523, 659, 784, 1047, 1319].forEach((f, i) => blip({ freq: f * base, dur: 0.22, type, gain: 0.15, when: i * 0.09 }));
}

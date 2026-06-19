// ============================================================
// Welt-Immersion Stufe 1 (datengetriebene Theme-Kits).
// Pro Welt: Maskottchen (SVG, Zustände idle/correct/wrong/cheer), dezente Szenerie,
// Fortschritts-Metapher (Figur bewegt sich vorwärts) und Abschluss-Jubelszene.
// Reine Präsentationsschicht — KEIN Eingriff in Aufgaben/RNG/Mastery/Adaptiv.
// Sounds liegen in ../audio/sfx.js. Animationen über CSS (respektiert no-anim /
// prefers-reduced-motion). Neue Welten = neuer Eintrag hier, keine Komponenten-Änderung.
// ============================================================
import { WORLDS } from "../engine/core.js";

/* ---------- Maskottchen (SVG) ---------- */
// Jede Figur in einem 64×64-Koordinatensystem. `state` steuert nur CSS-Klassen.
function StadionMascot() { // Fussballer
  return (
    <g>
      <ellipse className="m-shadow" cx="32" cy="58" rx="14" ry="3" />
      <g className="m-body">
        <rect x="24" y="30" width="16" height="18" rx="6" fill="#2f8f4e" />
        <circle cx="32" cy="20" r="9" fill="#ffd7a8" />
        <path d="M23 18a9 9 0 0 1 18 0z" fill="#6b3f1d" />
        <rect x="20" y="34" width="6" height="12" rx="3" fill="#ffd7a8" className="m-arm-l" />
        <rect x="38" y="34" width="6" height="12" rx="3" fill="#ffd7a8" className="m-arm-r" />
        <circle cx="32" cy="13" r="1.6" fill="#1a1a1a" className="m-eye" />
      </g>
      <circle cx="46" cy="50" r="6" fill="#fff" stroke="#1a1a1a" strokeWidth="1.2" className="m-prop" />
      <path d="M46 46l2 2-1 3-2 0-1-3z" fill="#1a1a1a" className="m-prop" />
    </g>
  );
}
function StreetMascot() { // Skater
  return (
    <g>
      <ellipse className="m-shadow" cx="32" cy="58" rx="15" ry="3" />
      <g className="m-body">
        <rect x="25" y="28" width="14" height="17" rx="6" fill="#7c5cff" />
        <circle cx="32" cy="19" r="8" fill="#ffd7a8" />
        <path d="M24 17h16v-3a8 8 0 0 0-16 0z" fill="#1a1a1a" />
        <circle cx="32" cy="14" r="1.5" fill="#1a1a1a" className="m-eye" />
      </g>
      <g className="m-prop">
        <rect x="18" y="50" width="28" height="4" rx="2" fill="#222" />
        <circle cx="23" cy="56" r="2.4" fill="#39d0ff" />
        <circle cx="41" cy="56" r="2.4" fill="#39d0ff" />
      </g>
    </g>
  );
}
function WeltraumMascot() { // Astronaut
  return (
    <g>
      <ellipse className="m-shadow" cx="32" cy="58" rx="13" ry="3" />
      <g className="m-body">
        <rect x="24" y="30" width="16" height="18" rx="7" fill="#dfe6ff" />
        <circle cx="32" cy="20" r="10" fill="#cfd8f5" />
        <circle cx="32" cy="20" r="7" fill="#10203f" />
        <circle cx="29" cy="18" r="2.2" fill="#7fe0ff" className="m-eye" />
        <rect x="19" y="33" width="6" height="12" rx="3" fill="#dfe6ff" className="m-arm-l" />
        <rect x="39" y="33" width="6" height="12" rx="3" fill="#dfe6ff" className="m-arm-r" />
      </g>
      <path d="M28 48h8l-2 7a2 2 0 0 1-4 0z" fill="#ff8a3d" className="m-prop m-flame" />
    </g>
  );
}
function TrailMascot() { // Mountainbiker
  return (
    <g>
      <ellipse className="m-shadow" cx="32" cy="58" rx="16" ry="3" />
      <g className="m-prop">
        <circle cx="22" cy="50" r="7" fill="none" stroke="#222" strokeWidth="2.4" />
        <circle cx="44" cy="50" r="7" fill="none" stroke="#222" strokeWidth="2.4" />
        <path d="M22 50l8-9 12 9M30 41h7" stroke="#e0671d" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <g className="m-body">
        <rect x="27" y="26" width="11" height="13" rx="5" fill="#3f8f4e" transform="rotate(-8 32 32)" />
        <circle cx="35" cy="20" r="7" fill="#ffd7a8" />
        <path d="M28 19a7 7 0 0 1 14 0z" fill="#e0671d" />
        <circle cx="36" cy="18" r="1.4" fill="#1a1a1a" className="m-eye" />
      </g>
    </g>
  );
}

const MASCOTS = { stadion: StadionMascot, street: StreetMascot, weltraum: WeltraumMascot, trail: TrailMascot };

// Welt-spezifische Texte/Symbole der Fortschritts-Metapher & Jubelszene.
export const KITS = {
  stadion:  { goal: "🥅", trackVerb: "Lauf zum Tor",      cheer: "Toooor!",        confetti: ["⚽", "🎉", "🟢"] },
  street:   { goal: "🏁", trackVerb: "Line durch den Park", cheer: "Trick gelandet!", confetti: ["🛹", "✨", "🟣"] },
  weltraum: { goal: "🪐", trackVerb: "Aufstieg ins All",   cheer: "Orbit erreicht!", confetti: ["🚀", "⭐", "🌟"] },
  trail:    { goal: "⛰️", trackVerb: "Trail bergauf",      cheer: "Gipfel erreicht!", confetti: ["🚵", "🌲", "🟡"] },
};
export function kitFor(world) { return KITS[world] || KITS.stadion; }

/* ---------- Maskottchen-Komponente ---------- */
export function Mascot({ world, state = "idle", size = 64 }) {
  const M = MASCOTS[world] || MASCOTS.stadion;
  return (
    <svg className={"mascot is-" + state} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <M />
    </svg>
  );
}

/* ---------- Szenerie (dezenter Hintergrund) ---------- */
export function Scenery({ world }) {
  // Leichte, themenpassende Motive — lenken nicht von der Aufgabe ab (opacity gedeckelt via CSS).
  let motif;
  if (world === "weltraum") {
    motif = (<>
      {[[10, 18], [30, 10], [52, 22], [70, 14], [86, 30], [20, 40], [60, 44], [90, 60]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} fill="#fff" className="sc-twinkle" style={{ animationDelay: i * 0.3 + "s" }} />
      ))}
      <circle cx="78" cy="78" r="10" fill="#ffffff" opacity="0.18" />
    </>);
  } else if (world === "street") {
    motif = (<>
      <path d="M0 86 H100" stroke="#ffffff" strokeWidth="0.6" opacity="0.25" strokeDasharray="6 5" />
      <rect x="68" y="40" width="26" height="40" fill="#ffffff" opacity="0.07" />
      <rect x="10" y="52" width="18" height="34" fill="#ffffff" opacity="0.07" />
    </>);
  } else if (world === "trail") {
    motif = (<>
      <path d="M0 80 L26 50 L44 66 L66 38 L100 72 V100 H0 Z" fill="#ffffff" opacity="0.08" />
      <circle cx="80" cy="20" r="9" fill="#ffe08a" opacity="0.5" />
    </>);
  } else { // stadion
    motif = (<>
      <path d="M0 84 H100 M0 90 H100" stroke="#ffffff" strokeWidth="0.5" opacity="0.2" />
      <ellipse cx="50" cy="86" rx="30" ry="8" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.2" />
    </>);
  }
  return (
    <svg className="scenery" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {motif}
    </svg>
  );
}

/* ---------- Fortschritts-Metapher: Figur bewegt sich zum Ziel ---------- */
export function WorldTrack({ world, done, total, mascotState }) {
  const pct = total ? Math.max(0, Math.min(1, done / total)) : 0;
  const kit = kitFor(world);
  return (
    <div className="world-track">
      <div className="wt-line"><i style={{ width: pct * 100 + "%" }} /></div>
      <div className="wt-mascot" style={{ left: "calc(" + pct * 100 + "% )" }}>
        <Mascot world={world} state={mascotState} size={52} />
      </div>
      <div className="wt-goal">{kit.goal}</div>
    </div>
  );
}

/* ---------- Abschluss-Jubelszene ---------- */
export function Celebration({ world, onDone }) {
  const kit = kitFor(world);
  const grad = (WORLDS[world] || WORLDS.stadion).grad;
  return (
    <div className="celebrate" style={{ background: grad }} onClick={onDone}>
      <Scenery world={world} />
      <div className="cel-inner">
        <div className="cel-mascot"><Mascot world={world} state="cheer" size={140} /></div>
        <div className="cel-text">{kit.cheer}</div>
        <div className="cel-confetti">{kit.confetti.map((e, i) => <span key={i} style={{ animationDelay: i * 0.12 + "s" }}>{e}</span>)}</div>
        <button className="btn-primary cel-go" onClick={(e) => { e.stopPropagation(); onDone(); }}>Belohnung ansehen →</button>
      </div>
    </div>
  );
}

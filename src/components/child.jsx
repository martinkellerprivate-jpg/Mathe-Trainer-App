import { useState, useEffect, useRef } from "react";
import { OPS, WORLDS, MODES, DIPLOMAS, levelFromSolved, todayKey, prizeProgress, prizeType, lessonStatusOf, buildSeries, buildProblem, checkAnswer, pick } from "../engine/core.js";
import { skeletonOf, dueCount } from "../engine/mastery.js";
import { initAuto, updateAuto, autoTimeBudgetSec } from "../engine/adaptive.js";
import { unlockAudio, sfxCorrect, sfxWrong, sfxCombo } from "../audio/sfx.js";
import { Scenery, WorldTrack } from "../worlds/kits.jsx";

// Meilenstein-Abzeichen für gelöste Rechnungen (CR #15)
const SOLVE_BADGES = [100, 500, 2000, 5000];
function badgeInfo(solved) {
  const earned = SOLVE_BADGES.filter((b) => solved >= b).length;
  const next = SOLVE_BADGES.find((b) => solved < b) || null;
  return { earned, next, remaining: next ? next - solved : 0 };
}

/* ============================================================
   Kind-App: Home, Welt, Modus, Übung, Ergebnis, Diplom
   ============================================================ */
/* ---------- kleine Bausteine ---------- */
function ProgressBar({ value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="pbar"><i style={{ width: pct + "%", background: color || "var(--w-accent)" }}></i></div>
  );
}

function Numpad({ value, onKey, onClear, onOk, okLabel, allowDecimal }) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="numpad">
      {digits.map(k => <button key={k} className="np" onClick={() => onKey(k)}>{k}</button>)}
      {allowDecimal
        ? <button className="np" onClick={() => onKey(".")}>,</button>
        : <span className="np-spacer"></span>}
      <button className="np" onClick={() => onKey("0")}>0</button>
      <button className="np np-fn" onClick={onClear}>⌫</button>
      <button className="np np-ok np-wide" onClick={onOk}>{okLabel || "OK"}</button>
    </div>
  );
}

/* ---------- HOME ---------- */
function Home({ state, onPlay, onStartDue, onSetWorld, onOpenLessons, onOpenParent, onOpenDiplomas, onOpenPrizes }) {
  const c = state.child;
  const [worldOpen, setWorldOpen] = useState(false); // CR #17: Welt-Dropdown im Header
  const lv = levelFromSolved(c.totalCorrect);
  const badge = badgeInfo(c.totalCorrect || 0);
  const world = WORLDS[c.world] || WORLDS.stadion;
  const dueN = dueCount(c.mastery, Date.now()); // fällige Wiederholungen (3.18)
  const today = todayKey();
  const ls = c.lessonStats || {};
  const plan = (state.todayPlan || []).map(id => state.lessons.find(l => l.id === id)).filter(Boolean).filter(l => l.active !== false); // CR #21: inaktive raus
  const isDoneToday = l => ls[l.id] && ls[l.id].lastDay === today;
  const planTotal = plan.length;
  const planDone = plan.filter(isDoneToday).length;
  const next = plan.find(l => !isDoneToday(l));
  const allDone = planTotal > 0 && !next;

  // Preis-Motivation (CR #15): noch nicht überreichte Preise
  const prizeList = (state.prizes || []).filter(p => (p.status || "open") !== "redeemed").map(p => ({ p, ...prizeProgress(state, p) }));
  const reachedPrize = prizeList.find(x => x.done);
  const nearestPrize = prizeList.filter(x => !x.done).sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="screen-pad home" style={{ "--w-grad": world.grad, "--w-accent": world.accent }}>
      {/* App-weite Immersion: dezenter, welt-getönter Wash hinter dem Home-Inhalt */}
      <div className="world-wash" style={{ background: world.grad }}></div>
      <div className="home-top">
        <div className="world-switch">
          <button className="avatar-btn" onClick={() => setWorldOpen(o => !o)} title="Welt wechseln">
            <span className="ava">{c.avatar}</span>
            <span className="world-pill">{world.emoji} {world.label} ▾</span>
          </button>
          {worldOpen && (<>
            <div className="prof-scrim" onClick={() => setWorldOpen(false)}></div>
            <div className="world-dd">
              {Object.entries(WORLDS).map(([k, w]) => (
                <button key={k} className={"world-card" + (c.world === k ? " sel" : "")} style={{ background: w.grad }}
                  onClick={() => { onSetWorld(k); setWorldOpen(false); }}>
                  <span className="wc-emoji">{w.emoji}</span><span className="wc-label">{w.label}</span>
                </button>
              ))}
            </div>
          </>)}
        </div>
        <button className="gear" onClick={onOpenParent} title="Eltern">🔒</button>
      </div>

      <div className="hello">
        <h1>Hoi {c.name}!</h1>
        <p>Bereit für ein paar Aufgaben?</p>
      </div>

      <div className="stat-strip">
        <div className="ss"><b>🪙 {c.coins}</b><span>Münzen</span></div>
        <div className="ss"><b>⭐ {lv.level}</b><span>Level · {lv.name}</span></div>
        <div className="ss"><b>🧮 {c.totalCorrect || 0}</b><span>richtig gelöst</span></div>
      </div>
      <div className="lvlbar">
        <ProgressBar value={lv.into} max={lv.need} />
        <span>Noch {lv.need - lv.into} Rechnungen bis Level {lv.level + 1}{badge.next ? ` · noch ${badge.remaining} bis 🏅` : ""}</span>
      </div>

      {(reachedPrize || nearestPrize) && (
        <button className={"motiv-banner" + (reachedPrize ? " reached" : "")} onClick={onOpenPrizes}>
          <span className="mb-emoji">{reachedPrize ? (reachedPrize.type === "coins" ? "🪙" : "🎉") : nearestPrize.p.emoji}</span>
          <span className="mb-text">
            {reachedPrize
              ? (reachedPrize.type === "coins"
                  ? <><b>Genug Münzen!</b> Du kannst {reachedPrize.p.emoji} {reachedPrize.p.name} einlösen.</>
                  : <><b>Geschafft!</b> {reachedPrize.p.emoji} {reachedPrize.p.name} freigeschaltet!</>)
              : <>Noch <b>{nearestPrize.remaining} {nearestPrize.unit}</b> bis {nearestPrize.p.emoji} {nearestPrize.p.name}!</>}
          </span>
          <span className="mb-go">›</span>
        </button>
      )}

      {dueN > 0 && onStartDue && (
        <button className="motiv-banner" onClick={onStartDue}>
          <span className="mb-emoji">🔁</span>
          <span className="mb-text">Heute fällig: <b>{dueN} {dueN === 1 ? "Wiederholung" : "Wiederholungen"}</b></span>
          <span className="mb-go">›</span>
        </button>
      )}

      {planTotal > 0 && (
        <div className="plan-strip">
          <span className="plan-strip-label">Heute: {planDone}/{planTotal} erledigt</span>
          <div className="plan-dots">
            {plan.map((l, i) => (
              <span key={l.id} className={"pd" + (isDoneToday(l) ? " done" : "") + (l === next ? " now" : "")}>
                {isDoneToday(l) ? "✓" : i + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {next && (
        <button className="play-big" onClick={() => onPlay(next)}>
          <span className="pb-eyebrow">Heute empfohlen{planTotal > 1 ? ` · ${planDone + 1}. von ${planTotal}` : ""}</span>
          <span className="pb-title">{next.name}</span>
          <span className="pb-meta">{next.count} Aufgaben · {next.ops.map(o => OPS[o].kid).join(" · ")}</span>
          <span className="pb-go">Los geht's →</span>
        </button>
      )}

      {allDone && (
        <div className="play-big done-card">
          <span className="pb-eyebrow">Heute empfohlen</span>
          <span className="pb-title">Stark, {c.name}! 🎉</span>
          <span className="pb-meta">Du hast heute alle empfohlenen Lektionen geschafft.</span>
          <button className="pb-go as-btn" onClick={onOpenLessons}>Trotzdem weiterüben →</button>
        </div>
      )}

      {planTotal === 0 && (
        <button className="play-big" onClick={onOpenLessons}>
          <span className="pb-eyebrow">Heute empfohlen</span>
          <span className="pb-title">Such dir was aus!</span>
          <span className="pb-meta">Heute ist kein Plan hinterlegt — wähle selbst eine Lektion.</span>
          <span className="pb-go">Alle Lektionen →</span>
        </button>
      )}

      <div className="home-actions">
        <button className="ha" onClick={onOpenLessons}><b>📚</b>Lektionen</button>
        <button className="ha" onClick={onOpenPrizes}><b>🏆</b>Preise &amp; Diplome</button>
      </div>

      <MotivationPopup state={state} onOpenPrizes={onOpenPrizes} />
    </div>
  );
}

/* ---------- MOTIVATIONS-POPUP (Home, einmal pro Tag/Session) ---------- */
function MotivationPopup({ state, onOpenPrizes }) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState(null);
  useEffect(() => {
    const prizes = (state.prizes || []).filter(p => (p.status || "open") !== "redeemed").map(p => ({ p, ...prizeProgress(state, p) }));
    const reached = prizes.find(x => x.done);
    const nearest = prizes.filter(x => !x.done).sort((a, b) => b.pct - a.pct)[0];
    const pick2 = reached || nearest;
    if (!pick2) return;
    setData({ reached: !!reached, item: pick2 });
    try { if (sessionStorage.getItem("felix_motiv") !== todayKey()) setShow(true); }
    catch (e) { setShow(true); }
  }, []);
  function close() { try { sessionStorage.setItem("felix_motiv", todayKey()); } catch (e) {} setShow(false); }
  if (!show || !data) return null;
  const it = data.item;
  const lines = ["Weiter so — du packst das!", "Jede Aufgabe bringt dich näher ans Ziel!", "Sammle fleissig — der Preis wartet!"];
  return (
    <div className="sheet-modal" onClick={close}>
      <div className="motiv-pop" onClick={e => e.stopPropagation()}>
        <div className="motiv-emoji">{data.reached ? "🎉" : it.p.emoji}</div>
        {data.reached ? (
          <>
            <h2>Geschafft!</h2>
            <p>Du hast genug für <b>{it.p.emoji} {it.p.name}</b> gesammelt. Sag deinen Eltern Bescheid!</p>
          </>
        ) : (
          <>
            <h2>Noch {it.remaining} {it.unit}!</h2>
            <p>Dann gehört dir <b>{it.p.emoji} {it.p.name}</b>. {pick(lines)}</p>
            <div className="motiv-bar"><ProgressBar value={it.cur} max={it.goal} color="var(--gold)" /></div>
            <span className="motiv-sub">{it.cur} / {it.goal} {it.unit}</span>
          </>
        )}
        <div className="motiv-actions">
          <button className="btn-primary" onClick={() => { close(); onOpenPrizes(); }}>Preise &amp; Diplome ansehen</button>
          <button className="btn-text" onClick={close}>Los geht's!</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- PREISE & DIPLOME (Kind), CR #15 ---------- */
function PrizesAndDiplomas({ state, onShowDiploma, onClose, onRequestPrize }) {
  const prizes = (state.prizes || []).map(p => ({ p, status: p.status || "open", ...prizeProgress(state, p) }));
  const sorted = prizes.sort((a, b) =>
    ((a.status === "redeemed" ? 1 : 0) - (b.status === "redeemed" ? 1 : 0)) || ((b.done ? 1 : 0) - (a.done ? 1 : 0)) || (b.pct - a.pct));
  const owned = new Set(state.child.diplomas);
  return (
    <div className="screen-pad list-screen">
      <div className="ls-top"><button className="back" onClick={onClose}>←</button><h2>Preise &amp; Diplome</h2></div>

      <div className="lg-head"><span className="lg-dot c1"></span>Preise<small>Deine Ziele</small></div>
      {prizes.length === 0 && <p className="ls-sub">Noch keine Preise hinterlegt — frag deine Eltern, ob sie dir ein Ziel setzen! 🎁</p>}
      <div className="prize-kid-list">
        {sorted.map(({ p, status, type, cur, goal, remaining, unit, icon, pct, done }) => {
          const isCoin = type === "coins";
          const cls = status === "redeemed" ? " redeemed" : (status === "reached" || (isCoin && status === "open" && done)) ? " reached" : "";
          let statusText, action = null;
          if (status === "redeemed") statusText = "✅ überreicht — schon deins!";
          else if (status === "requested") statusText = "⏳ Angefragt — warte auf deine Eltern";
          else if (isCoin && done) { statusText = "Genug Münzen — du kannst einlösen!"; action = <button className="btn-primary xs" onClick={() => onRequestPrize(p.id)}>Einlösen</button>; }
          else if (!isCoin && (status === "reached" || done)) statusText = "🎉 Freigeschaltet! Sag deinen Eltern Bescheid";
          else statusText = `Noch ${remaining} ${unit} ${icon}`;
          return (
            <div key={p.id} className={"prize-kid" + cls}>
              <div className="pk-top">
                <span className="pk-emoji">{p.emoji}</span>
                <div className="pk-info">
                  <b>{p.name} <span className="lc-badge neu">{isCoin ? "Kauf" : "Meilenstein"}</span></b>
                  <span className="pk-status">{statusText}</span>
                </div>
                {action}
              </div>
              <ProgressBar value={cur} max={goal} color={status === "redeemed" ? "var(--ink-soft)" : done ? "var(--grass)" : "var(--gold)"} />
              <div className="pk-foot"><span>{cur} / {goal} {unit}</span><span>{Math.round(pct)}%</span></div>
            </div>
          );
        })}
      </div>

      <div className="lg-head" style={{ marginTop: 20 }}><span className="lg-dot c2"></span>Diplome<small>{owned.size}/{DIPLOMAS.length} freigeschaltet</small></div>
      <div className="dip-grid">
        {DIPLOMAS.map(d => {
          const has = owned.has(d.id);
          return (
            <button key={d.id} className={"dip-cell" + (has ? "" : " locked")} disabled={!has} onClick={() => has && onShowDiploma(d)}>
              <span className="dc-emoji">{has ? d.emoji : "🔒"}</span>
              <b>{d.title}</b>
              <span>{has ? d.sub : "Noch nicht freigeschaltet"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- WELT-AUSWAHL ---------- */
function WorldPicker({ state, onPick, onClose }) {
  return (
    <div className="sheet-modal" onClick={onClose}>
      <div className="sheet-card" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"></div>
        <h2>Wähle deine Welt</h2>
        <div className="world-grid">
          {Object.entries(WORLDS).map(([k, w]) => (
            <button key={k} className={"world-card" + (state.child.world === k ? " sel" : "")}
              style={{ background: w.grad }} onClick={() => onPick(k)}>
              <span className="wc-emoji">{w.emoji}</span>
              <span className="wc-label">{w.label}</span>
            </button>
          ))}
        </div>
        <button className="btn-ghost" onClick={onClose}>Fertig</button>
      </div>
    </div>
  );
}

/* ---------- LEKTIONS-LISTE (Kind) ---------- */
function LessonBadge({ s }) {
  if (s.cat === 0) return <span className="lc-badge neu">Neu</span>;
  if (s.cat === 1) return <span className="lc-badge low">{s.bestAcc}%</span>;
  return <span className="lc-badge ok">✓ {s.bestAcc}%</span>;
}

function LessonList({ state, onPlay, onClose }) {
  const groups = [[], [], []];
  state.lessons.forEach(l => {
    const s = lessonStatusOf(state, l.id);
    groups[s.cat].push({ l, s });
  });
  const sections = [
    { key: 0, title: "Noch offen", hint: "Diese hast du noch nicht geübt" },
    { key: 1, title: "Zum Verbessern", hint: "Hier geht noch mehr" },
    { key: 2, title: "Erledigt", hint: "Stark gemacht!" },
  ];
  return (
    <div className="screen-pad list-screen">
      <div className="ls-top"><button className="back" onClick={onClose}>←</button><h2>Lektionen</h2></div>
      {sections.map(sec => groups[sec.key].length > 0 && (
        <div key={sec.key} className="lesson-group">
          <div className="lg-head"><span className={"lg-dot c" + sec.key}></span>{sec.title}<small>{sec.hint}</small></div>
          <div className="lesson-cards">
            {groups[sec.key].map(({ l, s }) => (
              <button key={l.id} className={"lesson-card cat" + s.cat} onClick={() => onPlay(l)}>
                <div className="lc-main">
                  <div className="lc-titlerow"><span className="lc-name">{l.name}</span><LessonBadge s={s} /></div>
                  <div className="lc-meta">{l.count} Aufgaben · {l.ops.map(o => OPS[o].kid).join(", ")} · bis {l.rangeMax.toLocaleString("de-CH")}</div>
                </div>
                <span className="lc-go">▶</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- MODUS-AUSWAHL ---------- */
function ModeSelect({ lesson, onStart, onClose }) {
  return (
    <div className="screen-pad list-screen">
      <div className="ls-top"><button className="back" onClick={onClose}>←</button><h2>Spielmodus</h2></div>
      <p className="ls-sub">{lesson.name}</p>
      <div className="mode-grid">
        {Object.entries(MODES).map(([k, m]) => (
          <button key={k} className="mode-card" onClick={() => onStart(k)}>
            <span className="mc-ic">{m.icon}</span>
            <b>{m.label}</b>
            <span>{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- ÜBUNG (Engine) ---------- */
function solutionText(p) {
  let solAns = p.answer;
  if (p.op === "frac") solAns = `${p.answer}/${p.den}`;
  else if (p.op === "decimal") solAns = p.answer.toFixed(p.decimals || 1).replace(".", ",");
  return p.inputMode === "missing" ? p.display.replace("?", p.missingAns) : `${p.prompt} = ${solAns}`;
}

function Practice({ lesson, mode, seed, state, onFinish, onQuit }) {
  const world = WORLDS[state.child.world] || WORLDS.stadion;
  const autoSecs = lesson.autoAdvanceSecs == null ? 3 : lesson.autoAdvanceSecs;
  const isAuto = lesson.difficultyMode === "auto"; // CR #22 Vollautomatik
  const [phase, setPhase] = useState("main");     // main | fix
  const [queue, setQueue] = useState(() => buildSeries(lesson, seed, state.child));
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [fb, setFb] = useState(null);             // {ok, msg, sol, gain}
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [coins, setCoins] = useState(0);
  const [bossHp, setBossHp] = useState(lesson.count || 10);
  const [hearts, setHearts] = useState(3);
  const [qLeft, setQLeft] = useState(lesson.timerPerQ || 0);
  const [serieLeft, setSerieLeft] = useState(lesson.timerPerSerie || 0);
  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());            // Startzeit der aktuellen Frage (CR #22)
  const autoRef = useRef(isAuto ? initAuto(lesson, state.child) : null); // Vollautomatik-Zustand
  const wrongRef = useRef([]);                     // falsch gerechnete Aufgaben dieser Phase
  const lockRef = useRef(false);
  const opStatsRef = useRef({});
  const factResultsRef = useRef([]);               // {key, p, ok} je Hauptrunden-Antwort (Beherrschungs-Engine)

  const p = queue[idx];
  // CR #16: bei Wiederholung ist die echte Serienlänge = Anzahl fälliger Fakten.
  const total = lesson.repeat ? queue.length : (lesson.count || 10);
  const phaseTotal = phase === "main" ? total : queue.length;
  const phaseDone = phase === "main" ? (correct + wrong) : idx;
  // CR #22: in Vollautomatik + Zeit-Challenge adaptiert das Zeitbudget; sonst fester Wert.
  const timerPerQ = (isAuto && mode === "time" && p) ? autoTimeBudgetSec(autoRef.current, p.inputMode) : (lesson.timerPerQ || 0);

  // Startzeit jeder neuen Frage merken (für die Antwortzeit der Vollautomatik)
  useEffect(() => { if (!fb) qStartRef.current = Date.now(); }, [idx, phase, fb]);

  /* Serien-Timer (nur Hauptrunde) */
  useEffect(() => {
    if (!lesson.timerPerSerie || phase !== "main") return;
    const t = setInterval(() => setSerieLeft(s => {
      if (s <= 1) { clearInterval(t); finish(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  /* Aufgaben-Timer */
  useEffect(() => {
    if (!timerPerQ || fb || phase !== "main") return;
    setQLeft(timerPerQ);
    const t = setInterval(() => setQLeft(s => {
      if (s <= 1) { clearInterval(t); handle(null, true); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [idx, fb, phase]);

  function afterAnswer() {
    setValue("");
    lockRef.current = false;
    if (idx + 1 >= queue.length) endPhase();
    else setIdx(idx + 1);
  }

  function nextProblem() {
    setFb(null);
    afterAnswer();
  }

  /* Auto-weiter: Pop-up nach X Sek automatisch schliessen */
  useEffect(() => {
    if (!fb) return;
    const t = setTimeout(() => nextProblem(), Math.max(0, autoSecs * 1000));
    return () => clearTimeout(t);
  }, [fb]);

  function endPhase() {
    if (phase === "main" && wrongRef.current.length > 0) {
      setPhase("announce");           // Zwischenscreen: Score + Nachsitz-Ankündigung
      lockRef.current = false;
    } else {
      finish();
    }
  }

  function startFix() {
    const fixQ = wrongRef.current.slice();
    wrongRef.current = [];
    setPhase("fix"); setQueue(fixQ); setIdx(0); setValue("");
    setFb(null); setCombo(0); lockRef.current = false;
  }

  function finish() {
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    onFinish({
      lesson, mode, correct, wrong, coins, opStats: opStatsRef.current,
      factResults: factResultsRef.current,
      autoState: isAuto ? autoRef.current : null, // CR #22: gelernten Stand persistieren
      total: correct + wrong, elapsed,
      perfect: wrong === 0 && correct > 0,
      bossWin: mode === "boss" && bossHp <= 0,
      questDone: mode === "quest",
    });
  }

  function handle(ans, timedOut) {
    if (lockRef.current) return;
    lockRef.current = true;
    unlockAudio(); // iOS: AudioContext innerhalb der Geste freischalten
    const ok = !timedOut && checkAnswer(p, ans);
    const sol = solutionText(p);
    const sound = state.settings.sound !== false;

    if (phase === "main") {
      const os = opStatsRef.current;
      os[p.op] = os[p.op] || { c: 0, w: 0 };
      if (ok) os[p.op].c++; else os[p.op].w++;
      // Beherrschungs-Engine: Ergebnis pro Fakt sammeln (Anwendung in App.finish)
      factResultsRef.current.push({ key: p.factKey, p: skeletonOf(p), ok });
      // CR #22 Vollautomatik: Antwortzeit auswerten, Schwierigkeit LIVE nachführen.
      if (isAuto) {
        const timeMs = Date.now() - qStartRef.current;
        const beforeLevel = autoRef.current.level;
        autoRef.current = updateAuto(autoRef.current, { correct: ok, timeMs, inputMode: p.inputMode });
        if (autoRef.current.level !== beforeLevel) {
          const lvl = autoRef.current.level; // kommende Aufgaben sofort auf neue Stufe neu erzeugen
          setQueue(q => {
            const nq = q.slice(0, idx + 1);
            for (let i = idx + 1; i < q.length; i++) nq.push(buildProblem({ ...lesson, difficulty: lvl }));
            return nq;
          });
        }
      }
    }

    if (ok) {
      let gain = 0;
      if (phase === "main") {
        const newCombo = combo + 1;
        gain = 5 + (newCombo >= 3 ? 3 : 0) + (mode === "time" ? 2 : 0);
        setCombo(newCombo); setCorrect(c => c + 1); setCoins(c => c + gain);
        if (mode === "boss") setBossHp(h => Math.max(0, h - 1));
        if (sound) { (newCombo >= 3 && newCombo % 3 === 0) ? sfxCombo(state.child.world) : sfxCorrect(state.child.world); }
      } else if (sound) { sfxCorrect(state.child.world); }
      setFb({ ok: true, msg: phase === "fix" ? "Jetzt sitzt es!" : pick(world.correct), gain });
    } else {
      if (phase === "main") {
        setCombo(0); setWrong(w => w + 1);
        if (mode === "boss") setHearts(h => Math.max(0, h - 1));
      }
      if (sound) sfxWrong(state.child.world);
      if (!wrongRef.current.find(x => x.id === p.id)) wrongRef.current.push(p);
      setFb({ ok: false, msg: "Fast! So geht's:", sol });
    }
  }

  function submitType() {
    if (value === "" || fb) return;
    handle(value);
  }

  // CR #16: Wiederholungs-Lektion ohne fällige Fakten -> freundlicher Hinweis statt leerer Übung.
  if (queue.length === 0) {
    return (
      <div className="practice announce" style={{ background: world.grad }}>
        <div className="ann-card">
          <div className="ann-emoji">🎉</div>
          <h2>Alles erledigt!</h2>
          <div className="ann-note">Gerade ist nichts fällig — du bist top im Stoff. Komm später für Wiederholungen wieder.</div>
          <button className="btn-primary ann-btn" onClick={onQuit}>Zurück</button>
        </div>
      </div>
    );
  }
  if (!p) return null;

  /* Zwischenscreen: Score der Hauptrunde + Ankündigung der Nachsitzrechnungen */
  if (phase === "announce") {
    const n = wrongRef.current.length;
    return (
      <div className="practice announce" style={{ background: world.grad }}>
        <div className="ann-card">
          <div className="ann-emoji">✅</div>
          <h2>Runde geschafft!</h2>
          <div className="ann-score">{correct} von {correct + wrong} richtig</div>
          <div className="ann-note">
            📝 <b>Nachsitzrechnungen</b><br />
            Jetzt kommen deine {n} {n === 1 ? "falsche Aufgabe" : "falschen Aufgaben"} nochmal — dann sitzt es!
          </div>
          <button className="btn-primary ann-btn" onClick={startFix}>Los geht's →</button>
        </div>
      </div>
    );
  }

  const eqBlock = (
    <div className="eq">
      {p.inputMode === "type" && (p.op === "frac"
        ? <span>{p.prompt} <span className="eq-eq">=</span> <span className="eq-blank">{value || "?"}</span><span className="eq-den">/{p.den}</span></span>
        : <>{p.prompt} <span className="eq-eq">=</span> <span className="eq-blank">{value || "?"}</span></>)}
      {p.inputMode === "missing" && <span>{p.display.replace("?", value || "?")}</span>}
      {p.inputMode === "mc" && (p.op === "frac"
        ? <span>{p.prompt} <span className="eq-eq">=</span> <span className="eq-blank">?</span><span className="eq-den">/{p.den}</span></span>
        : <>{p.prompt} <span className="eq-eq">=</span> <span className="eq-blank">?</span></>)}
      {p.inputMode === "truefalse" && <span>{p.display}</span>}
    </div>
  );

  const mascotState = fb ? (fb.ok ? "correct" : "wrong") : "idle";
  const showTrack = phase === "main" && (mode === "calm" || mode === "time");

  return (
    <div className="practice" style={{ background: world.grad, "--w-accent": world.accent }}>
      <Scenery world={state.child.world} />
      {/* HUD */}
      <div className="p-hud">
        <button className="p-quit" onClick={onQuit}>✕</button>
        <div className="p-mid">
          {phase === "fix" && <span className="p-quest">🔁 Korrektur {phaseDone}/{phaseTotal}</span>}
          {phase === "main" && mode === "boss" && <span className="hearts">{"❤️".repeat(hearts)}{"🖤".repeat(3 - hearts)}</span>}
          {phase === "main" && mode === "time" && <span className="p-timer">⏱️ {Math.round((Date.now() - startRef.current) / 1000)}s</span>}
          {phase === "main" && mode === "quest" && <span className="p-quest">🚩 {phaseDone}/{phaseTotal}</span>}
          {phase === "main" && mode === "calm" && <span className="p-quest">{phaseDone}/{phaseTotal}</span>}
        </div>
        <span className="p-coins">🪙 {coins}</span>
      </div>

      {/* Korrektur-Banner */}
      {phase === "fix" && (
        <div className="fix-banner">🔁 Diese Aufgaben nochmal — du schaffst das!</div>
      )}

      {/* Modus-Visual (nur Hauptrunde) */}
      {phase === "main" && mode === "boss" && (
        <div className="boss-wrap">
          <div className="boss-face">{bossHp <= 0 ? "😵" : "👹"}</div>
          <div className="boss-name">{world.boss}</div>
          <ProgressBar value={bossHp} max={lesson.count || 10} color="oklch(0.64 0.2 18)" />
        </div>
      )}
      {phase === "main" && mode === "quest" && (
        <div className="quest-wrap">
          <div className="quest-track">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={"q-dot" + (i < phaseDone ? " done" : "") + (i === phaseDone ? " now" : "")}>
                {i === phaseDone ? state.child.avatar : (i < phaseDone ? "●" : "○")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fortschritts-Metapher: Maskottchen läuft zum Ziel (Ruhig/Zeit-Modus) */}
      {showTrack && <WorldTrack world={state.child.world} done={phaseDone} total={phaseTotal} mascotState={mascotState} />}

      <div className="p-progress">
        {(phase === "fix" || (!lesson.timerPerSerie && mode !== "quest" && mode !== "boss" && !showTrack)) &&
          <ProgressBar value={phaseDone} max={phaseTotal} />}
        {phase === "main" && lesson.timerPerSerie > 0 && <div className="serie-timer">⏳ {serieLeft}s</div>}
      </div>

      {/* Frage */}
      <div className="p-question">
        {phase === "main" && timerPerQ > 0 && !fb && (
          <div className="qtimer"><i style={{ width: (qLeft / timerPerQ * 100) + "%" }}></i></div>
        )}
        {eqBlock}
        {combo >= 3 && !fb && <div className="combo">🔥 Combo ×{combo}</div>}
      </div>

      {/* Eingabe */}
      <div className="p-input">
        {(p.inputMode === "type" || p.inputMode === "missing") && (
          <Numpad value={value} allowDecimal={p.allowDecimal}
            onKey={k => { if (fb) return; setValue(v => {
              if (k === ".") return (v.includes(".") ? v : (v === "" ? "0." : v + "."));
              return v.length < 8 ? v + k : v;
            }); }}
            onClear={() => !fb && setValue(v => v.slice(0, -1))}
            onOk={submitType} okLabel="OK" />
        )}
        {p.inputMode === "mc" && (
          <div className="mc-grid">
            {p.choices.map((c, i) => (
              <button key={i} className="mc-btn" disabled={!!fb} onClick={() => handle(c)}>{p.op === "frac" ? `${c}/${p.den}` : c}</button>
            ))}
          </div>
        )}
        {p.inputMode === "truefalse" && (
          <div className="tf-grid">
            <button className="tf-btn tf-no" disabled={!!fb} onClick={() => handle(false)}>👎 Falsch</button>
            <button className="tf-btn tf-yes" disabled={!!fb} onClick={() => handle(true)}>👍 Stimmt</button>
          </div>
        )}
      </div>

      {/* Feedback-Pop-up (schliesst automatisch nach autoSecs; Tippen überspringt) */}
      {fb && (
        <div className={"fb " + (fb.ok ? "fb-ok" : "fb-no")} onClick={nextProblem}>
          <div className="fb-card">
            <div className="fb-emoji">{fb.ok ? "🎉" : "💡"}</div>
            <div className="fb-msg">{fb.msg}</div>
            {fb.ok && fb.gain > 0 && <div className="fb-gain">+{fb.gain} 🪙</div>}
            {!fb.ok && <div className="fb-sol">{fb.sol}</div>}
            {autoSecs > 0
              ? <div className="fb-auto" key={p.id + "-" + idx}><i style={{ animationDuration: autoSecs + "s" }}></i><span>Tippen für weiter</span></div>
              : <button className="fb-next">Weiter →</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export {Home, WorldPicker, LessonList, ModeSelect, Practice, Numpad, ProgressBar, PrizesAndDiplomas, MotivationPopup};


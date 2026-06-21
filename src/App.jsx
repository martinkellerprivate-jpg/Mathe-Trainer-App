import { useState } from "react";
import { WORLDS, pick, hashSeed, randomSeed, levelFromSolved, levelUpBonus, prizeType, todayKey, DIPLOMAS } from "./engine/core.js";
import { applyResults, dueCount } from "./engine/mastery.js";
import { nextAdaptive } from "./engine/adaptive.js";
import { sfxFinish } from "./audio/sfx.js";
import { Celebration } from "./worlds/kits.jsx";
import { useAppState } from "./state/StateProvider.jsx";
import { Home, LessonList, ModeSelect, Practice, PrizesAndDiplomas } from "./components/child.jsx";
import { Result, DiplomaView, Diplomas } from "./components/reward.jsx";
import { PinGate, Parent } from "./components/parent.jsx";
import { PrintModal, TipsModal } from "./components/modals.jsx";

/* ============================================================
   Root-App: Navigation, Belohnungs-Logik, Persistenz
   ============================================================ */
function App() {
  const { state, setState } = useAppState();
  const [view, setView] = useState("home");      // home|lessons|modeselect|practice|result|diplomas|diploma|parent
  const [pinView, setPinView] = useState(false);
  const [printLesson, setPrintLesson] = useState(null);
  const [tips, setTips] = useState(false);

  const [lesson, setLesson] = useState(null);
  const [mode, setMode] = useState("calm");
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState(null);
  const [newDiplomas, setNewDiplomas] = useState([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [curDiploma, setCurDiploma] = useState(null);

  // Persistenz & setState kommen jetzt aus <StateProvider> (Cache + Cloud-Sync).

  /* ---- Spiel starten ---- */
  function play(l) {
    setLesson(l);
    if (state.settings.worldMode === "rotate") {
      const keys = Object.keys(WORLDS);
      setState(s => ({ ...s, child: { ...s.child, world: pick(keys) } }));
    }
    setView("modeselect");
  }
  // Kind-Hinweis „Heute fällig" -> Wiederholungs-Serie mit GENAU den fälligen Fakten (CR #16)
  function startDue() {
    const n = dueCount(state.child.mastery, Date.now());
    if (!n) return;
    play({
      id: "__due", name: "Wiederholung",
      ops: ["add", "sub", "mul", "div"], rangeMax: 100, carry: true, count: n,
      difficulty: 2, inputMode: "type", timerPerQ: 0, timerPerSerie: 0,
      randomize: true, autoAdvanceSecs: 3, repeat: true, repeatScope: "all", dueOnly: true,
    });
  }
  function startMode(m) {
    setMode(m);
    // Fixe Lektion (randomize=false) → stabiler Seed; sonst neuer Zufalls-Seed
    setSeed(lesson && lesson.randomize === false ? hashSeed(lesson.id) : randomSeed());
    setView("practice");
  }
  function replaySame() { setView("practice"); }            // gleiche Zahlen (Seed bleibt)
  function replayNew() { setSeed(randomSeed()); setView("practice"); } // neue Zahlen

  /* ---- Serie beendet: Belohnung berechnen ---- */
  function finish(data) {
    const beforeLevel = levelFromSolved(state.child.totalCorrect).level;
    const c = { ...state.child };
    // Streak
    const today = todayKey();
    if (c.lastPlayedDay !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
      c.streak = (c.lastPlayedDay === yKey) ? (c.streak || 0) + 1 : 1;
      c.lastPlayedDay = today;
      c.practiceDays = (c.practiceDays || 0) + 1; // CR #18: eindeutige Übungstage
    }
    c.coins += data.coins;              // verdiente Münzen (Wallet)
    c.totalCorrect += data.correct;     // gelöste Rechnungen (treibt das Level)
    c.totalWrong += data.wrong;
    c.totalSeries += 1;
    // Level-up: Bonus-Münzen für jede neu erreichte Stufe (10 × Level)
    const afterLevel = levelFromSolved(c.totalCorrect).level;
    let levelBonus = 0;
    for (let L = beforeLevel + 1; L <= afterLevel; L++) levelBonus += levelUpBonus(L);
    c.coins += levelBonus;
    if (data.bossWin) c.bossWins = (c.bossWins || 0) + 1;
    if (data.perfect) c.perfectSeries = (c.perfectSeries || 0) + 1;
    // opStats
    const os = { ...(c.opStats || {}) };
    Object.entries(data.opStats || {}).forEach(([op, v]) => {
      const prev = os[op] || { c: 0, w: 0 }; os[op] = { c: prev.c + v.c, w: prev.w + v.w };
    });
    c.opStats = os;
    // Lektions-Lernstand (für Heute-Plan & Sortierung)
    const acc = data.total ? Math.round(data.correct / data.total * 100) : 0;
    const lsMap = { ...(c.lessonStats || {}) };
    const prevLs = lsMap[data.lesson.id] || { doneCount: 0, bestAcc: 0 };
    lsMap[data.lesson.id] = {
      doneCount: prevLs.doneCount + 1, lastDay: today,
      lastAcc: acc, bestAcc: Math.max(prevLs.bestAcc || 0, acc),
    };
    c.lessonStats = lsMap;
    // Beherrschungs-Engine (3.18): Leitner-Boxen aus den Fakt-Ergebnissen fortschreiben
    c.mastery = applyResults(c.mastery, data.factResults, Date.now());
    // Adaptive Schwierigkeit (3.2): Stufe der Lektion anhand der Trefferquote nachführen
    c.adaptive = nextAdaptive(data.lesson, { adaptive: c.adaptive }, acc);
    // CR #22 Vollautomatik: live gelernten Stand (Stufe + Tempo) pro Lektion sichern
    if (data.lesson.difficultyMode === "auto" && data.autoState) {
      c.adaptive = { ...c.adaptive, [data.lesson.id]: { level: data.autoState.level, tempo: data.autoState.tempo, recent: data.autoState.recent } };
    }
    // History
    c.history = [...(c.history || []), { lesson: data.lesson.name, mode: data.mode, correct: data.correct, total: data.total, day: today }].slice(-30);
    // Diplome prüfen
    const probe = { ...state, child: c };
    const earned = DIPLOMAS.filter(d => !c.diplomas.includes(d.id) && d.test(probe));
    if (earned.length) c.diplomas = [...c.diplomas, ...earned.map(d => d.id)];

    setLeveledUp(afterLevel > beforeLevel);
    setNewDiplomas(earned);
    // Meilenstein-Preise (gelöste Rechnungen) automatisch freischalten
    const newPrizes = (state.prizes || []).map(p =>
      (prizeType(p) === "milestone" && (p.status || "open") === "open" && c.totalCorrect >= (p.threshold || Infinity))
        ? { ...p, status: "reached" } : p
    );
    // CR #21: Lektion bei Bestehen (≥70%) automatisch inaktiv — außer "Aktiv lassen"/Wiederholung.
    let newLessons = state.lessons;
    const passedAcc = (lsMap[data.lesson.id] || {}).bestAcc || 0;
    if (passedAcc >= 70 && !data.lesson.keepActive && !data.lesson.repeat && data.lesson.active !== false) {
      newLessons = state.lessons.map(l => l.id === data.lesson.id ? { ...l, active: false } : l);
    }
    setState(s => ({ ...s, child: c, prizes: newPrizes, lessons: newLessons }));
    if (state.settings.sound !== false) sfxFinish(c.world);
    setResult({ ...data, levelBonus });
    setView("celebrate"); // Welt-Jubelszene zuerst, dann Belohnungs-Enthüllung
  }

  function showDiploma(d) { setCurDiploma(d); setView("diploma"); }
  // Kind fragt Münz-Preis an (CR #15): Status -> "angefragt"; Eltern bestätigen den Abzug.
  function requestPrize(id) {
    setState(s => ({ ...s, prizes: (s.prizes || []).map(p => p.id === id ? { ...p, status: "requested" } : p) }));
  }

  /* ---- Render ---- */
  return (
    <div className={"app-root" + (state.settings.animations === false ? " no-anim" : "")}>
      {/* Scroll-Ebene: Seiteninhalt scrollt INNERHALB des festen Rahmens (CR #1) */}
      <div className="app-scroll">
        {view === "home" && (
          <Home state={state} onPlay={play} onStartDue={startDue}
            onSetWorld={k => setState(s => ({ ...s, child: { ...s.child, world: k } }))}
            onOpenLessons={() => setView("lessons")}
            onOpenDiplomas={() => setView("diplomas")}
            onOpenPrizes={() => setView("prizes")}
            onOpenParent={() => setPinView(true)} />
        )}

        {view === "lessons" && <LessonList state={state} onPlay={play} onClose={() => setView("home")} />}
        {view === "modeselect" && <ModeSelect lesson={lesson} onStart={startMode} onClose={() => setView("home")} />}
        {view === "practice" && <Practice lesson={lesson} mode={mode} seed={seed} state={state} onFinish={finish} onQuit={() => setView("home")} />}
        {view === "celebrate" && <Celebration world={state.child.world} onDone={() => setView("result")} />}
        {view === "result" && result && (
          <Result data={result} state={state} newDiplomas={newDiplomas} leveledUp={leveledUp}
            onAgainSame={replaySame} onAgainNew={replayNew} onHome={() => setView("home")} onShowDiploma={showDiploma} />
        )}
        {view === "diplomas" && <Diplomas state={state} onShow={showDiploma} onClose={() => setView("home")} />}
        {view === "prizes" && <PrizesAndDiplomas state={state} onShowDiploma={showDiploma} onClose={() => setView("home")} onRequestPrize={requestPrize} />}
        {view === "diploma" && curDiploma && <DiplomaView diploma={curDiploma} state={state} onClose={() => setView(newDiplomas.length ? "result" : "prizes")} />}

        {view === "parent" && (
          <Parent state={state} setState={setState} onClose={() => setView("home")}
            onPrint={l => setPrintLesson(l)} onTips={() => setTips(true)} />
        )}
      </div>

      {/* Overlays — am App-Rahmen verankert (CR #12) */}
      {pinView && <PinGate pin={state.pin} onClose={() => setPinView(false)}
        onOk={() => { setPinView(false); setView("parent"); }} />}

      {printLesson && <PrintModal lesson={printLesson} onClose={() => setPrintLesson(null)} />}
      {tips && <TipsModal onClose={() => setTips(false)} />}
    </div>
  );
}

export default App;

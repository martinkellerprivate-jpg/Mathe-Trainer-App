/* ============================================================
   Root-App: Navigation, Belohnungs-Logik, Persistenz
   ============================================================ */
function App() {
  const [state, setStateRaw] = useState(loadState);
  const [view, setView] = useState("home");      // home|lessons|modeselect|practice|result|diplomas|diploma|parent
  const [pinView, setPinView] = useState(false);
  const [worldPicker, setWorldPicker] = useState(false);
  const [printLesson, setPrintLesson] = useState(null);
  const [tips, setTips] = useState(false);

  const [lesson, setLesson] = useState(null);
  const [mode, setMode] = useState("calm");
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState(null);
  const [newDiplomas, setNewDiplomas] = useState([]);
  const [leveledUp, setLeveledUp] = useState(false);
  const [curDiploma, setCurDiploma] = useState(null);

  useEffect(() => { saveState(state); }, [state]);
  const setState = updater => setStateRaw(s => (typeof updater === "function" ? updater(s) : updater));

  /* ---- Spiel starten ---- */
  function play(l) {
    setLesson(l);
    if (state.settings.worldMode === "rotate") {
      const keys = Object.keys(WORLDS);
      setState(s => ({ ...s, child: { ...s.child, world: pick(keys) } }));
    }
    setView("modeselect");
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
    const beforeLevel = levelFromCoins(state.child.coins).level;
    const c = { ...state.child };
    // Streak
    const today = todayKey();
    if (c.lastPlayedDay !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
      c.streak = (c.lastPlayedDay === yKey) ? (c.streak || 0) + 1 : 1;
      c.lastPlayedDay = today;
    }
    c.coins += data.coins;
    c.totalCorrect += data.correct;
    c.totalWrong += data.wrong;
    c.totalSeries += 1;
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
    // History
    c.history = [...(c.history || []), { lesson: data.lesson.name, mode: data.mode, correct: data.correct, total: data.total, day: today }].slice(-30);
    // Diplome prüfen
    const probe = { ...state, child: c };
    const earned = DIPLOMAS.filter(d => !c.diplomas.includes(d.id) && d.test(probe));
    if (earned.length) c.diplomas = [...c.diplomas, ...earned.map(d => d.id)];

    setLeveledUp(levelFromCoins(c.coins).level > beforeLevel);
    setNewDiplomas(earned);
    setState(s => ({ ...s, child: c }));
    setResult(data);
    setView("result");
  }

  function showDiploma(d) { setCurDiploma(d); setView("diploma"); }

  /* ---- Render ---- */
  return (
    <div className="app-root">
      {view === "home" && (
        <Home state={state} onPlay={play}
          onPickWorld={() => setWorldPicker(true)}
          onOpenLessons={() => setView("lessons")}
          onOpenDiplomas={() => setView("diplomas")}
          onOpenPrizes={() => setView("prizes")}
          onOpenParent={() => setPinView(true)} />
      )}

      {view === "lessons" && <LessonList state={state} onPlay={play} onClose={() => setView("home")} />}
      {view === "modeselect" && <ModeSelect lesson={lesson} onStart={startMode} onClose={() => setView("home")} />}
      {view === "practice" && <Practice lesson={lesson} mode={mode} seed={seed} state={state} onFinish={finish} onQuit={() => setView("home")} />}
      {view === "result" && result && (
        <Result data={result} state={state} newDiplomas={newDiplomas} leveledUp={leveledUp}
          onAgainSame={replaySame} onAgainNew={replayNew} onHome={() => setView("home")} onShowDiploma={showDiploma} />
      )}
      {view === "diplomas" && <Diplomas state={state} onShow={showDiploma} onClose={() => setView("home")} />}
      {view === "prizes" && <PrizesAndDiplomas state={state} onShowDiploma={showDiploma} onClose={() => setView("home")} />}
      {view === "diploma" && curDiploma && <DiplomaView diploma={curDiploma} state={state} onClose={() => setView(newDiplomas.length ? "result" : "prizes")} />}

      {/* Overlays */}
      {worldPicker && <WorldPicker state={state} onClose={() => setWorldPicker(false)}
        onPick={k => { setState(s => ({ ...s, child: { ...s.child, world: k } })); setWorldPicker(false); }} />}

      {pinView && <PinGate pin={state.pin} onClose={() => setPinView(false)}
        onOk={() => { setPinView(false); setView("parent"); }} />}

      {view === "parent" && (
        <Parent state={state} setState={setState} onClose={() => setView("home")}
          onPrint={l => setPrintLesson(l)} onTips={() => setTips(true)} />
      )}

      {printLesson && <PrintModal lesson={printLesson} onClose={() => setPrintLesson(null)} />}
      {tips && <TipsModal onClose={() => setTips(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

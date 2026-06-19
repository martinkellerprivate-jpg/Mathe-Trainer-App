/* ============================================================
   Eltern-Bereich: PIN, Lernstand, Lektions-Editor, Preise,
   Einstellungen, Druck-Pop-up, Lerntipps
   ============================================================ */

/* ---------- PIN-GATE ---------- */
function PinGate({ pin, onOk, onClose }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  function press(k) {
    if (k === "del") { setVal(v => v.slice(0, -1)); return; }
    const nv = (val + k).slice(0, 4);
    setVal(nv);
    if (nv.length === 4) {
      if (nv === pin) onOk();
      else { setErr(true); setTimeout(() => { setVal(""); setErr(false); }, 600); }
    }
  }
  return (
    <div className="pin-screen">
      <button className="back abs" onClick={onClose}>←</button>
      <div className="pin-inner">
        <div className="pin-lock">🔒</div>
        <h2>Eltern-Bereich</h2>
        <p>PIN eingeben (Standard: 1234)</p>
        <div className={"pin-dots" + (err ? " shake" : "")}>
          {[0, 1, 2, 3].map(i => <span key={i} className={val.length > i ? "on" : ""}></span>)}
        </div>
        <div className="pin-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
            k === "" ? <span key={i}></span> :
              <button key={i} className="pin-key" onClick={() => press(k)}>{k === "del" ? "⌫" : k}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- ELTERN-SHELL ---------- */
function Parent({ state, setState, onClose, onPrint, onTips }) {
  const [tab, setTab] = useState("home");
  const tabs = [["home", "Übersicht", "📊"], ["lessons", "Lektionen", "📚"], ["prizes", "Preise", "🎁"], ["settings", "Einstellungen", "⚙️"]];
  return (
    <div className="parent">
      <div className="parent-head">
        <h2>Eltern-Bereich</h2>
        <button className="btn-ghost sm" onClick={onClose}>Fertig ✕</button>
      </div>
      <div className="parent-body">
        {tab === "home" && <ParentHome state={state} onTips={onTips} />}
        {tab === "lessons" && <ParentLessons state={state} setState={setState} onPrint={onPrint} />}
        {tab === "prizes" && <ParentPrizes state={state} setState={setState} />}
        {tab === "settings" && <ParentSettings state={state} setState={setState} />}
      </div>
      <div className="parent-tabs">
        {tabs.map(([k, l, ic]) => (
          <button key={k} className={"ptab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
            <span>{ic}</span>{l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- ÜBERSICHT / LERNSTAND ---------- */
function ParentHome({ state, onTips }) {
  const c = state.child;
  const lv = levelFromCoins(c.coins);
  const totalAns = c.totalCorrect + c.totalWrong;
  const acc = totalAns ? Math.round(c.totalCorrect / totalAns * 100) : 0;
  const ops = Object.entries(c.opStats || {});
  // Detail-Auswertung: Stärken & Übungsfelder
  const assessed = ops.map(([op, st]) => {
    const t = st.c + st.w; return { op, label: OPS[op] ? OPS[op].label : op, t, a: t ? Math.round(st.c / t * 100) : 0 };
  }).filter(x => x.t >= 4);
  const fmt = arr => arr.map(x => `${x.label} (${x.a}%)`).join(", ");
  const strengths = assessed.filter(x => x.a >= 80);
  const solid = assessed.filter(x => x.a >= 60 && x.a < 80);
  const focus = assessed.filter(x => x.a < 60).sort((a, b) => a.a - b.a);
  const hasData = assessed.length > 0;
  const recent = (c.history || []).slice(-3);
  const recentAcc = recent.length ? Math.round(recent.reduce((s, h) => s + (h.total ? h.correct / h.total : 0), 0) / recent.length * 100) : null;
  const strengthsText = strengths.length
    ? `Sicher bei ${fmt(strengths)}.${solid.length ? ` Auf gutem Weg bei ${fmt(solid)}.` : ""}`
    : (solid.length ? `Auf gutem Weg bei ${fmt(solid)}.` : "Die Grundlagen werden gerade aufgebaut — jede Serie hilft.");
  const focusText = focus.length
    ? `${fmt(focus)} — am besten mit kleinen Zahlen und in Ruhe üben.`
    : "Aktuell keine Schwächen erkennbar — stark!";
  let tipText = "Kurze, tägliche Einheiten bringen mehr als seltenes langes Üben.";
  if (focus.some(x => x.op === "mul" || x.op === "div")) tipText = "Mal- und Teil-Reihen täglich kurz wiederholen festigt sie am schnellsten.";
  else if (focus.some(x => x.op === "add" || x.op === "sub")) tipText = "Beim Zehnerübergang hilft das Auffüllen bis 10 (z.B. 8+5 → 8+2+3).";
  else if (focus.some(x => x.op === "frac" || x.op === "decimal")) tipText = "Brüche und Kommazahlen mit Bildern/Geld veranschaulichen — das macht sie greifbar.";
  return (
    <div className="pcontent">
      <div className="tip-banner" onClick={onTips}>
        <span>💡</span><div><b>Lerntipps für Eltern</b><span>Wissenschaftlich fundiert — so unterstützt du am besten</span></div><span className="tb-go">→</span>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><b>{c.totalSeries}</b><span>Serien gesamt</span></div>
        <div className="kpi"><b>{acc}%</b><span>Trefferquote</span></div>
        <div className="kpi"><b>{c.totalCorrect}</b><span>richtig gelöst</span></div>
        <div className="kpi"><b>🔥 {c.streak}</b><span>Tage-Serie</span></div>
      </div>

      <div className="pcard">
        <h3>Fortschritt</h3>
        <div className="lvl-row"><span>Rang {lv.level} · {lv.rank}</span><span>🪙 {c.coins}</span></div>
        <ProgressBar value={lv.into} max={lv.need} color="var(--sky)" />
        <div className="lvl-row" style={{ marginTop: 14 }}><span>Noch {lv.need - lv.into} Münzen bis Rang {lv.level + 1}</span><span>🎖️ {c.diplomas.length} Diplome</span></div>
      </div>

      <div className="pcard assess-card">
        <h3>Können &amp; Verbesserung</h3>
        {!hasData ? (
          <p className="assess-empty">Noch zu wenig Daten. Nach ein paar Serien erscheint hier eine persönliche Auswertung mit Stärken und Übungsfeldern.</p>
        ) : (
          <>
            <div className="assess-block good"><span className="ab-ic">💪</span><div><b>Das kann {c.name} gut</b><p>{strengthsText}</p></div></div>
            <div className="assess-block work"><span className="ab-ic">🎯</span><div><b>Hier lohnt sich Üben</b><p>{focusText}</p></div></div>
            {recentAcc != null && (
              <div className="assess-trend">Letzte {recent.length} Serien: ø {recentAcc}% Trefferquote
                {recentAcc >= acc ? " — Tendenz aufwärts 📈" : ""}</div>
            )}
            <p className="assess-tip">💡 {tipText}</p>
          </>
        )}
      </div>

      {ops.length > 0 && (
        <div className="pcard">
          <h3>Nach Rechenart</h3>
          {ops.map(([op, st]) => {
            const t = st.c + st.w; const a = t ? Math.round(st.c / t * 100) : 0;
            return (
              <div key={op} className="op-row">
                <span className="op-name">{OPS[op] ? OPS[op].label : op}</span>
                <div className="op-bar"><ProgressBar value={st.c} max={t} color={a >= 70 ? "var(--grass)" : "var(--sun)"} /></div>
                <span className="op-pct">{a}%</span>
              </div>
            );
          })}
        </div>
      )}

      {c.history && c.history.length > 0 && (
        <div className="pcard">
          <h3>Letzte Serien</h3>
          {c.history.slice(-6).reverse().map((h, i) => (
            <div key={i} className="hist-row">
              <span>{h.lesson}</span>
              <span className="hist-meta">{h.correct}/{h.total} · {MODES[h.mode] ? MODES[h.mode].label : h.mode}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- LEKTIONEN ---------- */
function ParentLessons({ state, setState, onPrint }) {
  const [editing, setEditing] = useState(null); // lesson or 'new'
  if (editing) return <LessonEditor lesson={editing === "new" ? null : editing} state={state} setState={setState} onClose={() => setEditing(null)} />;

  const plan = (state.todayPlan || []);
  const inPlan = id => plan.includes(id);
  const addToPlan = id => setState(s => ({ ...s, todayPlan: [...(s.todayPlan || []), id] }));
  const removeFromPlan = id => setState(s => ({ ...s, todayPlan: (s.todayPlan || []).filter(x => x !== id) }));
  const movePlan = (id, dir) => setState(s => {
    const arr = (s.todayPlan || []).slice();
    const i = arr.indexOf(id); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return s;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...s, todayPlan: arr };
  });
  const planLessons = plan.map(id => state.lessons.find(l => l.id === id)).filter(Boolean);

  return (
    <div className="pcontent">
      {/* Heute-Plan (Serie) */}
      <div className="pcard plan-card">
        <h3>🎯 Heute empfohlen (Serie)</h3>
        <p className="field-hint">{state.child.name} arbeitet diese Lektionen der Reihe nach ab. Heute Erledigte verschwinden automatisch von der Startseite.</p>
        {planLessons.length === 0 && <p className="plan-empty">Noch keine Lektion im Plan — unten mit <b>＋ Plan</b> hinzufügen.</p>}
        {planLessons.map((l, i) => (
          <div key={l.id} className="plan-row">
            <span className="plan-num">{i + 1}</span>
            <span className="plan-name">{l.name}</span>
            <div className="plan-row-actions">
              <button disabled={i === 0} onClick={() => movePlan(l.id, -1)}>↑</button>
              <button disabled={i === planLessons.length - 1} onClick={() => movePlan(l.id, 1)}>↓</button>
              <button className="pr-remove" onClick={() => removeFromPlan(l.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <button className="add-lesson" onClick={() => setEditing("new")}>＋ Neue Lektion</button>

      {state.lessons.map(l => {
        const s = lessonStatusOf(state, l.id);
        return (
          <div key={l.id} className="plesson">
            <div className="pl-main" onClick={() => setEditing(l)}>
              <b>{l.name} {s.cat === 2 && <span className="rec-tag ok-tag">✓ {s.bestAcc}%</span>}{s.cat === 1 && <span className="rec-tag low-tag">{s.bestAcc}%</span>}</b>
              <span>{l.count} Aufg. · {l.ops.map(o => OPS[o].kid).join(", ")} · bis {l.rangeMax.toLocaleString("de-CH")} · {INPUTS[l.inputMode].label}</span>
            </div>
            <div className="pl-actions">
              {inPlan(l.id)
                ? <button className="plan-btn on" title="Aus Plan entfernen" onClick={() => removeFromPlan(l.id)}>✓ Plan</button>
                : <button className="plan-btn" title="Zum Heute-Plan" onClick={() => addToPlan(l.id)}>＋ Plan</button>}
              <button title="Drucken" onClick={() => onPrint(l)}>🖨️</button>
              <button title="Bearbeiten" onClick={() => setEditing(l)}>✏️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- LEKTIONS-EDITOR ---------- */
function LessonEditor({ lesson, state, setState, onClose }) {
  const [l, setL] = useState(() => lesson ? { ...lesson } : {
    id: "l_" + Math.random().toString(36).slice(2, 7), name: "Neue Lektion",
    ops: ["add"], rangeMax: 20, carry: true, count: 10, difficulty: 1,
    inputMode: "type", timerPerQ: 0, timerPerSerie: 0, recommended: false, randomize: true, autoAdvanceSecs: 1,
  });
  const set = (k, v) => setL(p => ({ ...p, [k]: v }));
  const toggleOp = op => setL(p => ({ ...p, ops: p.ops.includes(op) ? p.ops.filter(o => o !== op) : [...p.ops, op] }));

  // Live-Vorschau einer Beispielrechnung
  const [sample, setSample] = useState(null);
  useEffect(() => {
    try { setSample(buildProblem(l)); } catch (e) { setSample(null); }
  }, [JSON.stringify(l.ops), l.rangeMax, l.carry, l.difficulty, l.inputMode]);
  function previewOf(s) {
    if (!s) return { q: "…", a: "" };
    let a = s.answer;
    if (s.op === "frac") a = `${s.answer}/${s.den}`;
    else if (s.op === "decimal") a = String(s.answer).replace(".", ",");
    if (s.inputMode === "truefalse") return { q: s.display, a: s.tfCorrect ? "Stimmt ✓" : "Falsch ✗" };
    if (s.inputMode === "missing") return { q: s.display.replace("?", "□"), a: s.missingAns };
    if (s.op === "frac") return { q: `${s.prompt} = ?/${s.den}`, a };
    return { q: `${s.prompt} = ?`, a };
  }
  const pv = previewOf(sample);

  function save() {
    if (!l.ops.length) { set("ops", ["add"]); return; }
    setState(s => {
      const lessons = s.lessons.slice();
      const i = lessons.findIndex(x => x.id === l.id);
      if (i >= 0) lessons[i] = l; else lessons.push(l);
      return { ...s, lessons };
    });
    onClose();
  }
  function del() {
    setState(s => ({ ...s, lessons: s.lessons.filter(x => x.id !== l.id), todayPlan: (s.todayPlan || []).filter(id => id !== l.id) }));
    onClose();
  }

  return (
    <div className="pcontent editor">
      <div className="ed-head"><button className="back" onClick={onClose}>←</button><h3>Lektion bearbeiten</h3></div>

      <div className="lesson-preview">
        <div className="lp-head"><span className="lp-label">👀 Beispiel-Vorschau</span>
          <button className="lp-refresh" onClick={() => setSample(buildProblem(l))}>🎲 Neu</button></div>
        <div className="lp-eq">{pv.q}</div>
        <div className="lp-foot"><span className="lp-ans">Lösung: <b>{pv.a}</b></span><span className="lp-mode">{INPUTS[l.inputMode].label}</span></div>
      </div>

      <label className="field"><span>Name</span>
        <input className="inp" value={l.name} onChange={e => set("name", e.target.value)} /></label>

      <div className="field"><span>Rechenarten</span>
        <div className="op-toggle">
          {Object.entries(OPS).map(([k, o]) => (
            <button key={k} className={"opt" + (l.ops.includes(k) ? " on" : "")} onClick={() => toggleOp(k)}>{o.label}</button>
          ))}
        </div>
      </div>

      <div className="field"><span>Zahlenbereich bis <b>{l.rangeMax.toLocaleString("de-CH")}</b></span>
        <input className="range" type="range" min="0" max={RANGE_SNAPS.length - 1} step="1"
          value={Math.max(0, RANGE_SNAPS.indexOf(l.rangeMax))}
          onChange={e => set("rangeMax", RANGE_SNAPS[+e.target.value])} />
        <div className="range-ticks"><span>10</span><span>1’000</span><span>1 Mio.</span></div>
      </div>

      <div className="field-row">
        <label className="toggle"><span>Zehnerübergang erlauben</span>
          <input type="checkbox" checked={l.carry} onChange={e => set("carry", e.target.checked)} /><i></i></label>
      </div>

      <div className="field"><span>Anzahl Aufgaben: <b>{l.count}</b></span>
        <input className="range" type="range" min="5" max="50" step="1" value={l.count} onChange={e => set("count", +e.target.value)} /></div>

      <div className="field"><span>Schwierigkeit: <b>{l.difficulty}/5</b></span>
        <input className="range" type="range" min="1" max="5" step="1" value={l.difficulty} onChange={e => set("difficulty", +e.target.value)} /></div>

      <div className="field"><span>Eingabemodus</span>
        <div className="seg wrap">
          {Object.entries(INPUTS).map(([k, m]) => <button key={k} className={l.inputMode === k ? "on" : ""} onClick={() => set("inputMode", k)}>{m.label}</button>)}
        </div>
        <p className="field-hint">{INPUTS[l.inputMode].hint}</p>
      </div>

      <div className="field"><span>Zeitlimit pro Aufgabe</span>
        <div className="seg wrap">
          {[0, 5, 10, 15, 20].map(t => <button key={t} className={l.timerPerQ === t ? "on" : ""} onClick={() => set("timerPerQ", t)}>{t === 0 ? "Aus" : t + "s"}</button>)}
        </div>
      </div>

      <div className="field"><span>Zeitlimit pro Serie</span>
        <div className="seg wrap">
          {[0, 60, 120, 180, 300].map(t => <button key={t} className={l.timerPerSerie === t ? "on" : ""} onClick={() => set("timerPerSerie", t)}>{t === 0 ? "Aus" : (t / 60) + "min"}</button>)}
        </div>
      </div>

      <div className="field-row">
        <label className="toggle"><span>Zahlen bei jedem Start neu würfeln</span>
          <input type="checkbox" checked={l.randomize !== false} onChange={e => set("randomize", e.target.checked)} /><i></i></label>
      </div>
      <p className="field-hint">{l.randomize !== false
        ? "Bei jedem Start andere Rechnungen — ideal zum Üben."
        : "Immer dieselben Rechnungen — gut zum gezielten Wiederholen."}</p>

      <div className="field"><span>Pop-up: automatisch weiter nach</span>
        <div className="seg wrap">
          {[0, 1, 2, 3, 4, 5].map(t => <button key={t} className={(l.autoAdvanceSecs == null ? 1 : l.autoAdvanceSecs) === t ? "on" : ""} onClick={() => set("autoAdvanceSecs", t)}>{t === 0 ? "Sofort" : t + "s"}</button>)}
        </div>
        <p className="field-hint">Nach jeder Aufgabe erscheint die Lösung im Pop-up und wechselt nach dieser Zeit von selbst weiter (Antippen überspringt).</p>
      </div>

      <p className="field-hint plan-note">💡 Zum „Heute empfohlen"-Plan hinzufügen kannst du diese Lektion in der Liste mit <b>＋ Plan</b>.</p>

      <div className="ed-actions">
        <button className="btn-primary" onClick={save}>Speichern</button>
        {lesson && <button className="btn-danger" onClick={del}>Löschen</button>}
      </div>
    </div>
  );
}

/* ---------- PREISE ---------- */
function ParentPrizes({ state, setState }) {
  const [draft, setDraft] = useState(null);
  function progress(p) { const pp = prizeProgress(state, p); return [pp.cur, pp.goal]; }
  function save(pz) {
    setState(s => {
      const arr = s.prizes.slice(); const i = arr.findIndex(x => x.id === pz.id);
      if (i >= 0) arr[i] = pz; else arr.push(pz);
      return { ...s, prizes: arr };
    });
    setDraft(null);
  }
  function del(id) { setState(s => ({ ...s, prizes: s.prizes.filter(p => p.id !== id) })); }
  function redeem(id) { setState(s => ({ ...s, prizes: s.prizes.map(p => p.id === id ? { ...p, redeemed: true } : p) })); }
  function unredeem(id) { setState(s => ({ ...s, prizes: s.prizes.map(p => p.id === id ? { ...p, redeemed: false } : p) })); }

  if (draft) return <PrizeEditor prize={draft} onSave={save} onClose={() => setDraft(null)} />;

  return (
    <div className="pcontent">
      <p className="pcontent-intro">Hinterlege echte Belohnungen. {state.child.name} sieht den Fortschritt als Balken — ein starkes Fernziel.</p>
      <button className="add-lesson" onClick={() => setDraft({ id: "p_" + Math.random().toString(36).slice(2, 7), name: "", emoji: "🎁", trigger: "coins", threshold: 300, redeemed: false })}>＋ Neuer Preis</button>
      {state.prizes.map(p => {
        const [cur, goal] = progress(p);
        const done = cur >= goal;
        const unit = prizeProgress(state, p).unit;
        const status = p.redeemed ? "archived" : done ? "reached" : "open";
        return (
          <div key={p.id} className={"prize-item" + (p.redeemed ? " redeemed" : done ? " reached" : "")}>
            <span className="pi-emoji">{p.emoji}</span>
            <div className="pi-main">
              <b>{p.name || "Preis"} <span className={"pi-badge " + status}>{p.redeemed ? "überreicht" : done ? "erreicht 🎉" : "offen"}</span></b>
              <span>{unit}: {cur}/{goal} · {Math.round(Math.min(100, cur / goal * 100))}%</span>
              <ProgressBar value={cur} max={goal} color={p.redeemed ? "var(--ink-soft)" : done ? "var(--grass)" : "var(--gold)"} />
            </div>
            <div className="pi-actions">
              {!p.redeemed && done && <button className="btn-primary xs" onClick={() => redeem(p.id)}>Preis überreicht</button>}
              {p.redeemed && <button className="xs-ghost" title="Wieder aktiv setzen" onClick={() => unredeem(p.id)}>↩︎ aktiv</button>}
              {!done && !p.redeemed && <button title="Bearbeiten" onClick={() => setDraft(p)}>✏️</button>}
              <button title="Löschen" onClick={() => del(p.id)}>🗑️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrizeEditor({ prize, onSave, onClose }) {
  const [p, setP] = useState({ ...prize });
  const set = (k, v) => setP(s => ({ ...s, [k]: v }));
  const emojis = ["🍦", "🎮", "🎬", "⚽", "🛹", "🚵", "🍕", "🏊", "🎁", "🦖", "🍫", "🎨"];
  return (
    <div className="pcontent editor">
      <div className="ed-head"><button className="back" onClick={onClose}>←</button><h3>Preis festlegen</h3></div>
      <label className="field"><span>Belohnung</span>
        <input className="inp" placeholder="z.B. Eis essen" value={p.name} onChange={e => set("name", e.target.value)} /></label>
      <div className="field"><span>Symbol</span>
        <div className="emoji-pick">{emojis.map(e => <button key={e} className={p.emoji === e ? "on" : ""} onClick={() => set("emoji", e)}>{e}</button>)}</div>
      </div>
      <div className="field"><span>Auslöser</span>
        <div className="seg wrap">
          <button className={p.trigger === "coins" ? "on" : ""} onClick={() => set("trigger", "coins")}>Münzen</button>
          <button className={p.trigger === "level" ? "on" : ""} onClick={() => set("trigger", "level")}>Rang</button>
          <button className={p.trigger === "series" ? "on" : ""} onClick={() => set("trigger", "series")}>Übungsserien</button>
          <button className={p.trigger === "diploma" ? "on" : ""} onClick={() => set("trigger", "diploma")}>Diplome</button>
        </div>
        <p className="field-hint">{p.trigger === "series" ? "Belohnt das Dranbleiben: erreicht nach so vielen abgeschlossenen Übungsserien." : p.trigger === "coins" ? "An die gesammelten Münzen gebunden." : p.trigger === "level" ? "An den erreichten Rang gebunden." : "An die Zahl der Diplome gebunden."}</p>
      </div>
      <div className="field"><span>Schwelle: <b>{p.threshold}</b> {p.trigger === "coins" ? "Münzen" : p.trigger === "level" ? "Rang" : p.trigger === "series" ? "Serien" : "Diplome"}</span>
        <input className="range" type="range"
          min={p.trigger === "coins" ? 50 : 1}
          max={p.trigger === "coins" ? 2000 : p.trigger === "level" ? 12 : p.trigger === "series" ? 100 : 8}
          step={p.trigger === "coins" ? 50 : p.trigger === "series" ? 1 : 1}
          value={p.threshold} onChange={e => set("threshold", +e.target.value)} /></div>
      <div className="ed-actions"><button className="btn-primary" onClick={() => onSave(p)} disabled={!p.name}>Speichern</button></div>
    </div>
  );
}

/* ---------- EINSTELLUNGEN ---------- */
function ParentSettings({ state, setState }) {
  const s = state.settings;
  const setS = (k, v) => setState(st => ({ ...st, settings: { ...st.settings, [k]: v } }));
  const [pinDraft, setPinDraft] = useState("");
  return (
    <div className="pcontent">
      <div className="pcard">
        <h3>Kind</h3>
        <label className="field"><span>Name</span>
          <input className="inp" value={state.child.name} onChange={e => setState(st => ({ ...st, child: { ...st.child, name: e.target.value } }))} /></label>
        <div className="field"><span>Avatar</span>
          <div className="emoji-pick">{["🦊", "🐯", "🦁", "🐉", "🦖", "🐺", "🦅", "🦈", "🚀", "⚡"].map(a =>
            <button key={a} className={state.child.avatar === a ? "on" : ""} onClick={() => setState(st => ({ ...st, child: { ...st.child, avatar: a } }))}>{a}</button>)}</div>
        </div>
      </div>

      <div className="pcard">
        <h3>Global</h3>
        <label className="toggle row"><span>Töne</span><input type="checkbox" checked={s.sound} onChange={e => setS("sound", e.target.checked)} /><i></i></label>
        <label className="toggle row"><span>Animationen</span><input type="checkbox" checked={s.animations} onChange={e => setS("animations", e.target.checked)} /><i></i></label>
        <label className="toggle row"><span>Schwierigkeits-Automatik</span><input type="checkbox" checked={s.autoDifficulty} onChange={e => setS("autoDifficulty", e.target.checked)} /><i></i></label>
        <div className="field" style={{ marginTop: 12 }}><span>Tages-Lernziel: <b>{s.dailyGoal}</b> Serien</span>
          <input className="range" type="range" min="1" max="6" value={s.dailyGoal} onChange={e => setS("dailyGoal", +e.target.value)} /></div>
        <div className="field"><span>Lob-Stil</span>
          <div className="seg"><button className={s.praiseStyle === "effort" ? "on" : ""} onClick={() => setS("praiseStyle", "effort")}>Anstrengung loben</button>
            <button className={s.praiseStyle === "result" ? "on" : ""} onClick={() => setS("praiseStyle", "result")}>Ergebnis zeigen</button></div>
        </div>
        <div className="field"><span>Welt-Modus</span>
          <div className="seg"><button className={s.worldMode === "choose" ? "on" : ""} onClick={() => setS("worldMode", "choose")}>Kind wählt</button>
            <button className={s.worldMode === "rotate" ? "on" : ""} onClick={() => setS("worldMode", "rotate")}>Zufällig</button></div>
        </div>
      </div>

      <div className="pcard">
        <h3>Eltern-PIN</h3>
        <label className="field"><span>Neue 4-stellige PIN</span>
          <input className="inp" inputMode="numeric" maxLength="4" placeholder={state.pin} value={pinDraft}
            onChange={e => setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 4))} /></label>
        <button className="btn-primary sm" disabled={pinDraft.length !== 4} onClick={() => { setState(st => ({ ...st, pin: pinDraft })); setPinDraft(""); }}>PIN speichern</button>
      </div>

      <div className="pcard danger-card">
        <h3>Zurücksetzen</h3>
        <p className="field-hint">Löscht Fortschritt, Münzen und Diplome (Lektionen &amp; Preise bleiben).</p>
        <button className="btn-danger sm" onClick={() => { if (confirm("Fortschritt wirklich zurücksetzen?")) setState(st => ({ ...st, child: { ...defaultState().child, name: st.child.name, avatar: st.child.avatar, world: st.child.world } })); }}>Fortschritt zurücksetzen</button>
      </div>
    </div>
  );
}

Object.assign(window, { PinGate, Parent, LessonEditor, PrizeEditor, ParentSettings });

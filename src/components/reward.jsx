import { WORLDS, levelFromSolved, prizeProgress, DIPLOMAS } from "../engine/core.js";
import { ProgressBar } from "./child.jsx";

/* ============================================================
   Belohnung: Ergebnis, Level-Up, Diplome, Preis-Fortschritt
   ============================================================ */

/* ---------- ERGEBNIS ---------- */
function Result({ data, state, newDiplomas, leveledUp, onAgainSame, onAgainNew, onHome, onShowDiploma }) {
  const world = WORLDS[state.child.world] || WORLDS.stadion;
  const acc = data.total ? Math.round(data.correct / data.total * 100) : 0;
  const lv = levelFromSolved(state.child.totalCorrect);

  // nächster Preis (CR #15)
  const nextPrize = (state.prizes || []).filter(p => (p.status || "open") !== "redeemed")
    .map(p => ({ ...p, ...prizeProgress(state, p) }))
    .sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="screen-pad result" style={{ background: world.grad }}>
      <div className="result-inner">
        <div className="rb-emoji">{data.bossWin ? "🏆" : (acc >= 80 ? "🌟" : "💪")}</div>
        <h1>{data.bossWin ? world.win : (acc === 100 ? "Perfekt!" : acc >= 60 ? "Stark gemacht!" : "Weiter so!")}</h1>
        <p className="r-praise">
          {state.settings.praiseStyle === "effort"
            ? "Du hast clever gerechnet und drangeblieben!"
            : `${data.correct} von ${data.total} richtig.`}
        </p>

        <div className="r-stats">
          <div><b>{data.correct}/{data.total}</b><span>richtig</span></div>
          <div><b>{acc}%</b><span>Treffer</span></div>
          <div><b>+{data.coins}</b><span>🪙 Münzen</span></div>
          <div><b>{data.elapsed}s</b><span>Zeit</span></div>
        </div>

        {leveledUp && (
          <div className="levelup">⭐ Level {lv.level} erreicht — {lv.name}!{data.levelBonus > 0 ? ` +${data.levelBonus} 🪙` : ""}</div>
        )}

        {newDiplomas.length > 0 && (
          <div className="newdip" onClick={() => onShowDiploma(newDiplomas[0])}>
            <span className="nd-emoji">{newDiplomas[0].emoji}</span>
            <div><b>Neues Diplom!</b><span>{newDiplomas[0].title} — ansehen &amp; drucken</span></div>
          </div>
        )}

        {nextPrize && (
          <div className="prize-track">
            <div className="pt-head"><span>{nextPrize.emoji} {nextPrize.name}</span><span>{nextPrize.cur}/{nextPrize.goal}</span></div>
            <ProgressBar value={nextPrize.cur} max={nextPrize.goal} color="var(--gold)" />
            <span className="pt-note">{nextPrize.done ? (nextPrize.type === "coins" ? "🪙 Genug Münzen — einlösen!" : "🎉 Freigeschaltet! Sag deinen Eltern Bescheid.") : "Dein Ziel — bleib dran!"}</span>
          </div>
        )}

        <div className="r-actions">
          <button className="btn-primary" onClick={onAgainNew}>Nochmal · neue Zahlen</button>
          <button className="btn-ghost light" onClick={onAgainSame}>Nochmal · gleiche Zahlen</button>
          <button className="btn-text light" onClick={onHome}>Zur Startseite</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- EINZEL-DIPLOM (druckbar) ---------- */
function DiplomaView({ diploma, state, onClose }) {
  const lv = levelFromSolved(state.child.totalCorrect);
  const date = new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="dip-screen">
      <div className="dip-bar no-print">
        <button className="back" onClick={onClose}>←</button>
        <button className="btn-primary sm" onClick={() => window.print()}>🖨️ Drucken</button>
      </div>
      <div className="diploma" id="diploma-print">
        <div className="dip-border">
          <div className="dip-top">Mathe-Trainer · Urkunde</div>
          <div className="dip-emoji">{diploma.emoji}</div>
          <div className="dip-title">{diploma.title}</div>
          <p className="dip-for">verliehen an</p>
          <div className="dip-name">{state.child.name}</div>
          <p className="dip-sub">{diploma.sub}</p>
          <div className="dip-foot">
            <div><b>{lv.name}</b><span>Level {lv.level}</span></div>
            <div className="dip-seal">★</div>
            <div><b>{date}</b><span>Datum</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- DIPLOM-GALERIE ---------- */
function Diplomas({ state, onShow, onClose }) {
  const owned = new Set(state.child.diplomas);
  return (
    <div className="screen-pad list-screen">
      <div className="ls-top"><button className="back" onClick={onClose}>←</button><h2>Meine Diplome</h2></div>
      <p className="ls-sub">{owned.size} von {DIPLOMAS.length} freigeschaltet</p>
      <div className="dip-grid">
        {DIPLOMAS.map(d => {
          const has = owned.has(d.id);
          return (
            <button key={d.id} className={"dip-cell" + (has ? "" : " locked")} disabled={!has}
              onClick={() => has && onShow(d)}>
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

export {Result, DiplomaView, Diplomas};


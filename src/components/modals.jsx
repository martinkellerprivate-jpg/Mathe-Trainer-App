import { useState } from "react";
import { OPS, genOne, pick } from "../engine/core.js";

/* ============================================================
   Pop-ups: Druck (Übungs- + Lösungsblatt) und Lerntipps
   ============================================================ */

/* ---------- DRUCK ---------- */
function PrintModal({ lesson, onClose }) {
  const [items] = useState(() => {
    const out = [];
    for (let i = 0; i < (lesson.count || 12); i++) {
      const op = pick(lesson.ops && lesson.ops.length ? lesson.ops : ["add"]);
      const p = genOne(lesson, op);
      out.push({ prompt: p.prompt, answer: p.answer });
    }
    return out;
  });
  const date = new Date().toLocaleDateString("de-CH");
  const meta = `${lesson.ops.map(o => OPS[o].kid).join(", ")} · bis ${lesson.rangeMax}`;

  const Sheet = ({ withAnswers, title }) => (
    <div className="print-sheet">
      <div className="ps-head">
        <div>
          <div className="ps-title">{title}</div>
          <div className="ps-meta">{lesson.name} · {meta}</div>
        </div>
        <div className="ps-fields">
          {!withAnswers && <><span>Name: ______________</span><span>Datum: __________</span></>}
          {withAnswers && <span className="ps-loes">Lösungen</span>}
        </div>
      </div>
      <ol className="ps-list">
        {items.map((it, i) => (
          <li key={i}>
            <span className="ps-q">{it.prompt} =</span>
            <span className={"ps-a" + (withAnswers ? " filled" : "")}>{withAnswers ? it.answer : ""}</span>
          </li>
        ))}
      </ol>
      <div className="ps-foot">Felix' Mathe-Trainer · {date}</div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal print-region" onClick={e => e.stopPropagation()}>
        <div className="modal-bar no-print">
          <h3>🖨️ Drucken — {lesson.name}</h3>
          <div className="mb-actions">
            <button className="btn-primary sm" onClick={() => window.print()}>Drucken / PDF</button>
            <button className="btn-ghost sm" onClick={onClose}>Schliessen</button>
          </div>
        </div>
        <p className="print-hint no-print">Es werden zwei Seiten gedruckt: <b>Übungsblatt</b> (zum Rechnen) und <b>Lösungsblatt</b> (zur Kontrolle).</p>
        <div className="print-pages">
          <div className="page-wrap"><Sheet title="Übungsblatt" withAnswers={false} /></div>
          <div className="page-wrap page-2"><Sheet title="Lösungsblatt" withAnswers={true} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- LERNTIPPS ---------- */
const TIPS = [
  { ic: "⏱️", t: "Kurz & täglich schlägt lang & selten", b: "10 Minuten an fünf Tagen bringen mehr als eine Stunde am Sonntag. Regelmässige, verteilte Wiederholung verankert Rechenwege im Langzeitgedächtnis (Spacing-Effekt)." },
  { ic: "🌱", t: "Mit Erfolg starten", b: "Beginne eine Einheit bewusst etwas leichter. Frühe Erfolge geben Sicherheit und Lust — danach darf es schwieriger werden. Kompetenz-Erleben ist der stärkste Motor der Motivation." },
  { ic: "💪", t: "Anstrengung loben, nicht „Talent“", b: "Sag „Du hast clever überlegt und drangeblieben!“ statt „Du bist ein Mathe-Genie“. Das fördert ein Wachstums-Mindset: Fähigkeiten kann man üben — Fehler gehören dazu." },
  { ic: "💡", t: "Fehler sind Lernchancen", b: "Ruhig bleiben, gemeinsam den Weg anschauen statt nur das Ergebnis korrigieren. Wer Fehler ohne Scham analysieren darf, lernt nachhaltiger." },
  { ic: "🧩", t: "Strategien statt Auswendig", b: "Zeig Tricks: bis zum Zehner auffüllen (8+5 → 8+2+3), verdoppeln (6+7 = 6+6+1), zerlegen. Verstehen geht vor Tempo — Geschwindigkeit kommt von selbst." },
  { ic: "⚽", t: "Mathe im Alltag", b: "Beim Einkaufen rechnen lassen, Tore zusammenzählen, Backzutaten verdoppeln. Sichtbarer Nutzen macht Zahlen relevant und festigt das Geübte." },
  { ic: "🎯", t: "Klein & klar zielen", b: "Ein konkretes Tagesziel („zwei Serien“) ist greifbarer als „üb mal Mathe“. Sichtbarer Fortschritt hält die Motivation oben." },
  { ic: "🤝", t: "Begleiten statt kontrollieren", b: "Interesse zeigen, mitfeiern, gelegentlich danebensitzen. Verbundenheit und etwas Autonomie (Kind wählt Welt & Modus) steigern das Engagement deutlich." },
];

function TipsModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal tips-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-bar">
          <h3>💡 Lerntipps für Eltern</h3>
          <button className="btn-ghost sm" onClick={onClose}>Schliessen ✕</button>
        </div>
        <p className="tips-intro">Acht Prinzipien aus Lernpsychologie und Mathematikdidaktik — kompakt und alltagstauglich.</p>
        <div className="tips-list">
          {TIPS.map((tip, i) => (
            <div key={i} className="tip-card">
              <span className="tip-ic">{tip.ic}</span>
              <div><b>{tip.t}</b><p>{tip.b}</p></div>
            </div>
          ))}
        </div>
        <p className="tips-foot">Diese App ist als Ergänzung gedacht — der wichtigste Faktor bleibt eure gemeinsame, entspannte Zeit mit Zahlen.</p>
      </div>
    </div>
  );
}

export {PrintModal, TipsModal, TIPS};


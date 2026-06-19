import { useState } from "react";
import { WORLDS } from "../engine/core.js";
import { useAppState } from "../state/StateProvider.jsx";

const AVATARS = ["🦊", "🐯", "🦁", "🐉", "🦖", "🐺", "🦅", "🦈", "🚀", "⚡"];

// Kind wählt sein Profil per Antippen (kein Login, kein Passwort — 3.1/7.3).
export default function ProfilePicker() {
  const { roster, selectChild, addChild } = useAppState();
  const [creating, setCreating] = useState(roster.length === 0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🦊");

  function create() {
    const id = addChild(name.trim() || "Kind", avatar);
    selectChild(id);
  }

  if (creating) {
    return (
      <div className="screen-pad" style={{ justifyContent: "center", maxWidth: "var(--appw)", margin: "0 auto" }}>
        <div className="pcard" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.4rem" }}>{avatar}</div>
            <h2 style={{ fontSize: "1.4rem" }}>Neues Profil</h2>
            <p className="field-hint">Wie heisst das Kind? (Spitzname genügt)</p>
          </div>
          <label className="field"><span>Name</span>
            <input className="inp" autoFocus value={name} maxLength={20}
              onChange={(e) => setName(e.target.value)} placeholder="z.B. Felix" /></label>
          <div className="field"><span>Avatar</span>
            <div className="emoji-pick">
              {AVATARS.map((a) => (
                <button key={a} className={avatar === a ? "on" : ""} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="ed-actions">
            <button className="btn-primary" onClick={create} disabled={!name.trim()}>Profil erstellen</button>
            {roster.length > 0 && <button className="btn-ghost" onClick={() => setCreating(false)}>Zurück</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-pad" style={{ justifyContent: "center", maxWidth: "var(--appw)", margin: "0 auto", gap: 22 }}>
      <h1 style={{ textAlign: "center", fontSize: "1.8rem" }}>Wer übt heute?</h1>
      <div className="world-grid">
        {roster.map((c) => (
          <button key={c.id} className="world-card" style={{ background: WORLDS.stadion.grad }} onClick={() => selectChild(c.id)}>
            <span className="wc-emoji">{c.avatar}</span>
            <span className="wc-label">{c.name}</span>
          </button>
        ))}
        <button className="world-card" style={{ background: "var(--cloud)", color: "var(--ink-soft)" }}
          onClick={() => { setName(""); setAvatar("🦊"); setCreating(true); }}>
          <span className="wc-emoji">＋</span>
          <span className="wc-label">Neues Profil</span>
        </button>
      </div>
    </div>
  );
}

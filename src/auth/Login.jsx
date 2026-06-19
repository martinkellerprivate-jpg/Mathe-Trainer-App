import { useState } from "react";
import { supabase } from "../state/supabase.js";

// Eltern-Login (7.3): E-Mail + Passwort via Supabase Auth.
// Ruhig/sachlich gehalten (Eltern-Bereich-Ästhetik). Kinder loggen sich NICHT ein.
export default function Login() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg({ ok: true, text: "Konto erstellt. Falls eine Bestätigungs-E-Mail nötig ist, bitte den Link darin öffnen." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange im Root rendert danach automatisch die App.
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Anmeldung fehlgeschlagen." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen-pad" style={{ justifyContent: "center", maxWidth: "var(--appw)", margin: "0 auto" }}>
      <div className="pcard" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem" }}>🦊</div>
          <h2 style={{ fontSize: "1.4rem" }}>Eltern-Anmeldung</h2>
          <p className="field-hint">Für den Cloud-Stand. Das Kind übt danach ohne eigenes Login.</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="field"><span>E-Mail</span>
            <input className="inp" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field"><span>Passwort</span>
            <input className="inp" type="password" autoComplete="current-password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} /></label>

          {msg && (
            <p className="field-hint" style={{ color: msg.ok ? "var(--grass)" : "var(--berry)" }}>{msg.text}</p>
          )}

          <button className="btn-primary" type="submit" disabled={busy || !email || !password}>
            {busy ? "…" : mode === "signup" ? "Konto erstellen" : "Anmelden"}
          </button>
        </form>

        <button className="btn-text" style={{ color: "var(--ink-soft)" }}
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(null); }}>
          {mode === "signup" ? "Schon ein Konto? Anmelden" : "Neu hier? Konto erstellen"}
        </button>
      </div>
    </div>
  );
}

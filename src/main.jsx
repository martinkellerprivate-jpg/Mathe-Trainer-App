import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { StateProvider, useAppState } from "./state/StateProvider.jsx";
import { supabase, supabaseEnabled } from "./state/supabase.js";
import Login from "./auth/Login.jsx";
import ProfilePicker from "./auth/ProfilePicker.jsx";
import "./styles/fonts.css";
import "./styles/app.css";

// Kein StrictMode: der Prototyp lief ohne — doppelte Effekt-Ausführung würde
// Timer/Session-Logik (Motivations-Popup) verändern. Verhalten 1:1 erhalten.

function Splash() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#888", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.4rem" }}>🦊</div>
        <div style={{ marginTop: 8, fontSize: ".9rem" }}>Lädt …</div>
      </div>
    </div>
  );
}

// Innerhalb des Providers: ohne gewähltes Profil den Picker zeigen (Netflix-Modell),
// sonst die App. Splash, solange das Progress-Dokument lädt.
function ProfileGate() {
  const { activeChildId, state } = useAppState();
  if (!activeChildId) return <ProfilePicker />;
  if (!state) return <Splash />;
  return <App />;
}

function Root() {
  // Ohne Supabase-Konfiguration: lokal-only (IndexedDB), kein Login-Gate.
  if (!supabaseEnabled) {
    return <StateProvider><ProfileGate /></StateProvider>;
  }

  const [session, setSession] = useState(undefined); // undefined = lädt
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Splash />;
  if (!session) return <Login />;
  // key=user.id: bei Kontowechsel wird der StateProvider frisch geladen.
  return (
    <StateProvider key={session.user.id} ownerId={session.user.id}>
      <ProfileGate />
    </StateProvider>
  );
}

// Root einmalig erzeugen und über HMR hinweg wiederverwenden
// (sonst warnt React beim Hot-Reload „createRoot on a container that has already…").
const container = document.getElementById("root");
const root = (window.__mtRoot ||= createRoot(container));
root.render(<Root />);

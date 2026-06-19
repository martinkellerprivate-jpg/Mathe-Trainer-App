import { createClient } from "@supabase/supabase-js";

// Nur der PUBLISHABLE/anon-Key gehört ins Frontend (öffentlich unbedenklich).
// Der secret key niemals hier. Werte aus .env (siehe .env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ohne Konfiguration läuft die App lokal weiter (IndexedDB-only) — kein harter Fehler.
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase = supabaseEnabled
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

export const APP_ID = "zahlenheld";

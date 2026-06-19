import { supabase, supabaseEnabled, APP_ID } from "./supabase.js";
import { idbGet, idbPut, idbDelete, idbEnqueue, idbQueueAll, idbQueueDelete } from "./idb.js";

// Gekapselte Sync-Schicht (7.5): loadDoc / saveDoc pro Dokument.
// - IndexedDB als lokaler Cache, Cloud als Quelle der Wahrheit.
// - Last-Write-Wins pro Dokument über updated_at (ISO-String, monoton vergleichbar).
// - Write-Through in die Cloud, entprellt; offline gepuffert und beim Reconnect geflusht.
// KEINE DB-Logik in den Komponenten — alles läuft über diese Funktionen.

// Der lokale Cache (IndexedDB) wird PRO NUTZER namespaced, damit auf einem geteilten
// Browser kein Cache-Bleed zwischen Accounts entsteht. Der Cloud-doc_key bleibt OHNE
// Namespace — dort trennt RLS (owner_id) die Familien.
let cacheNs = "";
export function setCacheNamespace(ns) { cacheNs = ns ? ns + "::" : ""; }
const ck = (key) => cacheNs + key; // nur für IndexedDB-Cache + Queue

function newer(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return (a.updated_at || "") >= (b.updated_at || "") ? a : b;
}

// Liefert { data, updated_at } oder null.
export async function loadDoc(key) {
  const local = (await idbGet(ck(key))) || null;
  if (!supabaseEnabled || !navigator.onLine) return local;
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("data, updated_at")
      .eq("app_id", APP_ID)
      .eq("doc_key", key)
      .maybeSingle(); // RLS scoped automatisch auf auth.uid()
    if (error) throw error;
    const remote = data ? { data: data.data, updated_at: data.updated_at } : null;
    const win = newer(local, remote);
    if (win && win === remote) await idbPut(ck(key), remote); // Cache auffrischen
    return win;
  } catch (e) {
    console.warn("[sync] loadDoc -> Cache (Cloud nicht erreichbar):", e.message);
    return local;
  }
}

const timers = {};
// Schreibt sofort in den Cache und stößt den Cloud-Push an — entprellt (Standard) oder
// bei debounceMs=0 sofort und awaitbar (für Migrations-/Einmal-Schreibvorgänge).
export async function saveDoc(key, data, { debounceMs = 800 } = {}) {
  const updated_at = new Date().toISOString(); // explizit gesetzt (LWW); DB-Trigger ist Backstop
  await idbPut(ck(key), { data, updated_at });
  if (timers[key]) { clearTimeout(timers[key]); timers[key] = null; }
  if (debounceMs === 0) { await pushCloud(key, data, updated_at); return; }
  timers[key] = setTimeout(() => { pushCloud(key, data, updated_at); }, debounceMs);
}

async function pushCloud(key, data, updated_at) {
  if (!supabaseEnabled) return;
  if (!navigator.onLine) { await idbEnqueue({ ns: cacheNs, key, data, updated_at }); return; }
  try {
    const { data: u } = await supabase.auth.getUser();
    const owner_id = u?.user?.id;
    if (!owner_id) return; // nicht eingeloggt -> nichts pushen
    const { error } = await supabase
      .from("app_state")
      .upsert({ owner_id, app_id: APP_ID, doc_key: key, data, updated_at },
              { onConflict: "owner_id,app_id,doc_key" });
    if (error) throw error;
  } catch (e) {
    console.warn("[sync] pushCloud -> Queue:", e.message);
    await idbEnqueue({ ns: cacheNs, key, data, updated_at });
  }
}

// Dokument löschen (Cache + Cloud). Genutzt für Migrations-Cleanup und gelöschte Profile.
export async function deleteDoc(key) {
  await idbDelete(ck(key));
  if (!supabaseEnabled || !navigator.onLine) return;
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user?.id) return;
    const { error } = await supabase.from("app_state").delete().eq("app_id", APP_ID).eq("doc_key", key);
    if (error) throw error;
  } catch (e) {
    console.warn("[sync] deleteDoc:", e.message);
  }
}

// Beim Login / 'online'-Event aufrufen: gepufferte Schreibvorgänge DES AKTUELLEN
// Nutzers nachziehen. Einträge anderer Namespaces bleiben unangetastet.
export async function flushQueue() {
  if (!supabaseEnabled || !navigator.onLine) return;
  const items = await idbQueueAll();
  for (const it of items) {
    if (it.ns !== cacheNs) continue;     // nur eigene Einträge
    await idbQueueDelete(it.id);          // erst entfernen, Fehlschlag re-enqueued sich
    await pushCloud(it.key, it.data, it.updated_at);
  }
}

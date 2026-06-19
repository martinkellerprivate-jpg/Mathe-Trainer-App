import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { loadDoc, saveDoc, deleteDoc, flushQueue, setCacheNamespace } from "./sync.js";
import {
  defaultConfig, defaultProgress, splitState, composeState, decompose, newChild,
  hydrateConfig, hydrateProgress,
} from "./model.js";

const CONFIG_KEY = "config";
const progressKey = (id) => "progress:" + id;
const activeStorageKey = (owner) => "mt_active_" + (owner || "local");

const AppStateCtx = createContext(null);
export function useAppState() {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error("useAppState muss innerhalb von <StateProvider> stehen");
  return ctx;
}

function Splash() {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#888", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: "2.4rem" }}>🦊</div>
        <div style={{ marginTop: 8, fontSize: ".9rem" }}>Lädt …</div></div>
    </div>
  );
}

// ownerId gesetzt = Cloud-Modus (eingeloggter Eltern-Account); null = lokal-only.
export function StateProvider({ ownerId = null, children }) {
  const [config, setConfig] = useState(null);     // null = lädt
  const [activeId, setActiveId] = useState(null); // null = kein Profil gewählt -> Picker
  const [progress, setProgress] = useState(null);

  const configRef = useRef(null); configRef.current = config;
  const progressRef = useRef(null); progressRef.current = progress;
  const activeRef = useRef(null); activeRef.current = activeId;

  // 1) Config laden (+ Migration aus Phase-2 "state") beim Mount / Owner-Wechsel
  useEffect(() => {
    let alive = true;
    (async () => {
      setCacheNamespace(ownerId || "local");
      let cfg;
      const cfgDoc = await loadDoc(CONFIG_KEY);
      if (cfgDoc?.data) {
        const wasOldShape = "lessons" in cfgDoc.data; // CR #3: alte config trug Pro-Kind-Buckets
        cfg = hydrateConfig(cfgDoc.data);
        if (wasOldShape) await saveDoc(CONFIG_KEY, cfg, { debounceMs: 0 }); // bereinigte config sofort persistieren
      } else {
        const legacy = await loadDoc("state"); // Phase-2-Single-Blob?
        if (legacy?.data) {
          const { config: mc, childId, progress: mp } = splitState(legacy.data);
          cfg = mc;
          await saveDoc(CONFIG_KEY, mc, { debounceMs: 0 });
          await saveDoc(progressKey(childId), mp, { debounceMs: 0 });
          await deleteDoc("state"); // Legacy-Doc entfernen -> keine erneute Migration
        } else {
          cfg = defaultConfig();
          await saveDoc(CONFIG_KEY, cfg, { debounceMs: 0 });
        }
      }
      if (!alive) return;
      setConfig(cfg);
      const stored = localStorage.getItem(activeStorageKey(ownerId));
      const valid = stored && (cfg.children || []).some((c) => c.id === stored) ? stored : null;
      setActiveId(valid);
      await flushQueue();
    })();
    return () => { alive = false; };
  }, [ownerId]);

  // 2) Progress des aktiven Kindes laden, wenn sich das aktive Profil ändert
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!config || !activeId) { setProgress(null); return; }
      const doc = await loadDoc(progressKey(activeId));
      // hydrateProgress migriert alte progress-Docs (fehlende lessons/prizes/settings ergänzen).
      const needsSave = !doc || !("lessons" in (doc.data || {}));
      const p = doc?.data ? hydrateProgress(doc.data) : defaultProgress();
      if (!alive) return;
      setProgress(p);
      if (needsSave) await saveDoc(progressKey(activeId), p, { debounceMs: 0 });
    })();
    return () => { alive = false; };
  }, [activeId, config]);

  // In-App-setState: arbeitet auf der gemergten Shape, schreibt getrennt zurück.
  // Nur das tatsächlich geänderte Dokument wird gespeichert (config vs. progress) —
  // genau das löst den Mehrgeräte-Konflikt (LWW pro Dokument).
  const setState = useCallback((updater) => {
    const cfg = configRef.current, prog = progressRef.current, aid = activeRef.current;
    if (!cfg || !aid || !prog) return;
    const merged = composeState(cfg, aid, prog);
    const next = typeof updater === "function" ? updater(merged) : updater;
    const { config: nc, progress: np } = decompose(next);
    if (JSON.stringify(nc) !== JSON.stringify(cfg)) { setConfig(nc); saveDoc(CONFIG_KEY, nc); }
    if (JSON.stringify(np) !== JSON.stringify(prog)) { setProgress(np); saveDoc(progressKey(aid), np); }
  }, []);

  // Profil-API (operiert direkt auf config — auch vor Profilwahl nutzbar)
  const selectChild = useCallback((id) => {
    localStorage.setItem(activeStorageKey(ownerId), id);
    setActiveId(id);
  }, [ownerId]);

  const backToPicker = useCallback(() => {
    localStorage.removeItem(activeStorageKey(ownerId));
    setActiveId(null);
  }, [ownerId]);

  const addChild = useCallback((name, avatar) => {
    const ch = newChild(name, avatar);
    const cfg = configRef.current;
    const nc = { ...cfg, children: [...(cfg.children || []), ch] };
    setConfig(nc); saveDoc(CONFIG_KEY, nc);
    return ch.id;
  }, []);

  const updateChild = useCallback((id, patch) => {
    const cfg = configRef.current;
    const nc = { ...cfg, children: (cfg.children || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    setConfig(nc); saveDoc(CONFIG_KEY, nc);
  }, []);

  const removeChild = useCallback((id) => {
    const cfg = configRef.current;
    const nc = { ...cfg, children: (cfg.children || []).filter((c) => c.id !== id) };
    setConfig(nc); saveDoc(CONFIG_KEY, nc);
    deleteDoc(progressKey(id)); // Fortschritts-Dokument des gelöschten Profils entfernen
    if (activeRef.current === id) backToPicker();
  }, [backToPicker]);

  if (config === null) return <Splash />;

  const state = (config && activeId && progress) ? composeState(config, activeId, progress) : null;

  return (
    <AppStateCtx.Provider value={{
      state, setState,
      roster: config.children || [], activeChildId: activeId,
      selectChild, backToPicker, addChild, updateChild, removeChild,
    }}>
      {children}
    </AppStateCtx.Provider>
  );
}

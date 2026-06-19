# Felix' Mathe-Trainer

Re-Platforming des funktionierenden Single-File-Prototyps auf eine solide Basis:
**React + Vite**, später **Supabase** (Auth + Postgres), dokument-basierter Sync, PWA,
Auslieferung über GitHub Pages. Verhalten und UI des Prototyps sind die verbindliche Referenz.

Siehe `Briefing_Claude_Code_v3.md` (Spezifikation, v.a. Abschnitt 7 = Zielarchitektur).

## Projektstruktur

```
prototype-src/        Byte-getreu aus dem Artefakt extrahierter Original-Code (Referenz, nicht gebaut)
tools/                Extraktions-/Konvertierungsskripte (Python, einmalig)
src/
  engine/core.js      Datenmodell, Mathe-Engine, Speicher (seed-RNG, Leitner folgt in Phase 4)
  components/         child.jsx · reward.jsx · parent.jsx · modals.jsx
  App.jsx            Navigation, Belohnungs-Logik, Persistenz-Verdrahtung
  main.jsx           React-Bootstrap
  styles/            fonts.css (lokale Schriften) · app.css (komplettes Stylesheet)
public/fonts/         8 eingebettete woff2 (Fredoka, Nunito)
```

Die Module wurden **deterministisch** aus dem Prototyp konvertiert (`tools/to_esm.py`):
global-scope `Object.assign(window, …)` → ES-`export`, Hooks per `import` aus `react`.
Funktionskörper unverändert → Verhalten 1:1.

## Lokal starten

Voraussetzung: **Node ≥ 18**.

```bash
npm install
npm run dev      # Vite-Dev-Server, öffnet http://localhost:5173
```

Build / Vorschau:

```bash
npm run build && npm run preview
```

## Stand (Phasen)

- [x] **Phase 0** — Quellcode extrahiert
- [~] **Phase 1** — Vite-Projekt, ESM-Module, lokal lauffähig *(Persistenz noch localStorage)*
- [ ] **Phase 2** — Supabase Auth + dokument-basierter Sync (IndexedDB-Cache)
- [ ] **Phase 3** — Multi-Profil / Eltern-Account
- [ ] **Phase 4** — Spaced Repetition (Leitner) + adaptive Schwierigkeit
- [ ] **Phase 5** — PWA + GitHub-Pages-Deploy

## Assets neu erzeugen (nur bei Bedarf)

```bash
python3 tools/extract.py        # Prototyp-Module + Fonts aus der HTML extrahieren
python3 tools/to_esm.py         # prototype-src → src/ (ESM)
python3 tools/build_assets.py   # CSS + Fonts → src/styles + public/fonts
```

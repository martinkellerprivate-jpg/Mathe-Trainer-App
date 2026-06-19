#!/usr/bin/env python3
"""
Phase 0 — Quellcode-Extraktion aus dem Claude-Artefakt-Bundle.

Liest die Single-File-HTML (Manifest + Template), dekodiert alle Assets
(base64 + optional gzip) und schreibt:
  - prototype-src/   die 6 App-Module byte-getreu (.jsx) als Referenz
  - public/fonts/    die 8 woff2-Fonts mit sprechenden Namen
  - prototype-src/_template.html  das entpackte Template (für CSS/Struktur)
  - prototype-src/_extract_report.txt  Verifikations-Report

Verändert nichts am Original. Idempotent.
"""
import re, json, base64, gzip, hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_HTML = os.path.join(os.path.expanduser("~"), "Downloads", "Mathe-Trainer (offline).html")

# UUID-Präfix -> (Zielname, Beschreibung)
APP_MODULES = {
    "275d800b": ("01_engine_model.jsx", "Datenmodell, Mathe-Engine, Speicher"),
    "5190ac75": ("02_child_app.jsx",    "Kind-App: Home, Welt, Modus, Uebung, Ergebnis"),
    "6f048901": ("03_reward.jsx",       "Belohnung: Ergebnis, Level-Up, Diplome, Preise"),
    "acb87385": ("04_parent.jsx",       "Eltern-Bereich: PIN, Editor, Preise, Settings"),
    "da8a250d": ("05_modals.jsx",       "Pop-ups: Druck + Lerntipps"),
    "72d212c2": ("06_root_app.jsx",     "Root-App: Navigation, Belohnungs-Logik, Persistenz"),
}
VENDOR = {  # nicht uebernehmen (kommt ueber npm), nur im Report vermerken
    "559edbd1": "react.development.js",
    "f6229d67": "react-dom (vendor)",
    "25a349bc": "babel-standalone (vendor)",
}

def decode(entry):
    data = base64.b64decode(entry["data"])
    if entry.get("compressed"):
        data = gzip.decompress(data)
    return data

def main():
    if not os.path.exists(SRC_HTML):
        sys.exit(f"Quelldatei nicht gefunden: {SRC_HTML}")
    html = open(SRC_HTML, encoding="utf-8").read()
    manifest = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)</script>', html, re.S).group(1))
    template = json.loads(re.search(r'<script type="__bundler/template">(.*?)</script>', html, re.S).group(1))

    proto_dir = os.path.join(ROOT, "prototype-src")
    fonts_dir = os.path.join(ROOT, "public", "fonts")
    os.makedirs(proto_dir, exist_ok=True)
    os.makedirs(fonts_dir, exist_ok=True)

    # @font-face aus Template: UUID -> (family, weight, unicode-range-Hinweis)
    faces = {}
    for m in re.finditer(r"@font-face\s*{([^}]*)}", template, re.S):
        block = m.group(1)
        fam = re.search(r"font-family:\s*'([^']+)'", block)
        wt  = re.search(r"font-weight:\s*(\d+)", block)
        url = re.search(r'url\("([0-9a-f\-]{8,})"\)', block)
        if url:
            faces.setdefault(url.group(1)[:8], (fam.group(1) if fam else "Font",
                                                wt.group(1) if wt else "400"))

    report = []
    by_prefix = {k[:8]: k for k in manifest}

    # App-Module schreiben
    for pref, (name, desc) in APP_MODULES.items():
        full = by_prefix[pref]
        data = decode(manifest[full])
        text = data.decode("utf-8")
        path = os.path.join(proto_dir, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        report.append(f"APP   {pref}  {len(data):>8d}B  sha256={hashlib.sha256(data).hexdigest()[:12]}  -> prototype-src/{name}  ({desc})")

    # Fonts schreiben
    font_idx = {}
    for pref in [k for k in by_prefix if decode(manifest[by_prefix[k]])[:4] == b"wOF2"]:
        data = decode(manifest[by_prefix[pref]])
        fam, wt = faces.get(pref, ("Font", "400"))
        n = font_idx.get((fam, wt), 0)
        font_idx[(fam, wt)] = n + 1
        suffix = f"_{n}" if n else ""
        fname = f"{fam}-{wt}{suffix}.woff2"
        with open(os.path.join(fonts_dir, fname), "wb") as f:
            f.write(data)
        report.append(f"FONT  {pref}  {len(data):>8d}B  {fam} {wt}  -> public/fonts/{fname}")

    # Vendor nur vermerken
    for pref, desc in VENDOR.items():
        full = by_prefix.get(pref)
        if full:
            data = decode(manifest[full])
            report.append(f"VEND  {pref}  {len(data):>8d}B  {desc}  (nicht extrahiert; via npm)")

    # Template ablegen (fuer CSS/Struktur-Referenz)
    with open(os.path.join(proto_dir, "_template.html"), "w", encoding="utf-8") as f:
        f.write(template)
    report.append(f"TMPL  template  {len(template):>8d}B  -> prototype-src/_template.html")

    with open(os.path.join(proto_dir, "_extract_report.txt"), "w", encoding="utf-8") as f:
        f.write(f"Quelle: {SRC_HTML}\nAssets im Manifest: {len(manifest)}\n\n" + "\n".join(report) + "\n")
    print("\n".join(report))
    print(f"\nFertig. {len(APP_MODULES)} Module + {sum(font_idx.values())} Fonts extrahiert.")

if __name__ == "__main__":
    main()

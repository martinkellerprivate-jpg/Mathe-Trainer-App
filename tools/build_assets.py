#!/usr/bin/env python3
"""
Phase 1 — CSS + Fonts aus dem entpackten Template extrahieren.

Schreibt:
  - public/fonts/<uuid8>.woff2         (alle eingebetteten Schriften)
  - src/styles/fonts.css               (@font-face, url() auf lokale Pfade umgeschrieben)
  - src/styles/app.css                 (komplettes App-Stylesheet inkl. @media print
                                         und prefers-reduced-motion, unveraendert)

Idempotent. Loescht die frueheren mehrdeutig benannten Font-Dateien.
"""
import re, os, json, base64, gzip

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_HTML = os.path.join(os.path.expanduser("~"), "Downloads", "Mathe-Trainer (offline).html")
TEMPLATE = os.path.join(ROOT, "prototype-src", "_template.html")


def main():
    html = open(SRC_HTML, encoding="utf-8").read()
    manifest = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)</script>', html, re.S).group(1))
    tmpl = open(TEMPLATE, encoding="utf-8").read()

    fonts_dir = os.path.join(ROOT, "public", "fonts")
    styles_dir = os.path.join(ROOT, "src", "styles")
    os.makedirs(fonts_dir, exist_ok=True)
    os.makedirs(styles_dir, exist_ok=True)

    # alte mehrdeutige Font-Namen aufraeumen
    for f in os.listdir(fonts_dir):
        if f.endswith(".woff2"):
            os.remove(os.path.join(fonts_dir, f))

    by_prefix = {k[:8]: k for k in manifest}

    def decode(pref):
        e = manifest[by_prefix[pref]]
        d = base64.b64decode(e["data"])
        return gzip.decompress(d) if e.get("compressed") else d

    # alle url("uuid")-Referenzen im Template -> lokale Dateien schreiben + Map bauen
    uuid_map = {}
    for full_uuid in set(re.findall(r'url\("([0-9a-f]{8}-[0-9a-f-]+)"\)', tmpl)):
        pref = full_uuid[:8]
        data = decode(pref)
        assert data[:4] == b"wOF2", f"{pref} ist keine woff2"
        fname = f"{pref}.woff2"
        with open(os.path.join(fonts_dir, fname), "wb") as f:
            f.write(data)
        uuid_map[full_uuid] = fname

    # zwei <style>-Bloecke aus dem Template ziehen
    styles = re.findall(r"<style>(.*?)</style>", tmpl, re.S)
    font_css, app_css = styles[0], styles[1]

    # url("uuid") -> url("/fonts/<uuid8>.woff2")  (absolute Pfade; Vite kopiert public/ nach /)
    def repl(m):
        u = m.group(1)
        return f'url("/fonts/{uuid_map[u]}")'
    font_css = re.sub(r'url\("([0-9a-f]{8}-[0-9a-f-]+)"\)', repl, font_css)

    open(os.path.join(styles_dir, "fonts.css"), "w", encoding="utf-8").write(font_css.strip() + "\n")
    open(os.path.join(styles_dir, "app.css"), "w", encoding="utf-8").write(app_css.strip() + "\n")

    print(f"  {len(uuid_map)} Fonts -> public/fonts/")
    print(f"  fonts.css ({len(font_css)} B), app.css ({len(app_css)} B) -> src/styles/")


if __name__ == "__main__":
    main()

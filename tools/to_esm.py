#!/usr/bin/env python3
"""
Phase 1 — Deterministische ESM-Konvertierung der 6 Prototyp-Module.

Transformiert die global-scope `text/babel`-Module in echte ES-Module:
  - entfernt `const { useState, ... } = React;`  (Hooks kommen per import)
  - ersetzt `Object.assign(window, { ... });`  durch  `export { ... };`
  - entfernt die `ReactDOM.createRoot(...).render(<App/>)`-Zeile (-> main.jsx)
  - stellt jedem Modul den passenden import-Header voran

Die FUNKTIONSKÖRPER bleiben byte-identisch -> Verhalten/UI 1:1 erhalten.
JSX laeuft ueber den automatischen Runtime (kein `import React` noetig).
"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "prototype-src")

H_CORE = ""  # core.js braucht keine Imports (nur stdlib)

H_CHILD = (
    'import { useState, useEffect, useRef } from "react";\n'
    'import { OPS, WORLDS, MODES, DIPLOMAS, levelFromCoins, todayKey, '
    'prizeProgress, lessonStatusOf, buildSerie, checkAnswer, pick } from "../engine/core.js";\n\n'
)
H_REWARD = (
    'import { WORLDS, levelFromCoins, DIPLOMAS } from "../engine/core.js";\n'
    'import { ProgressBar } from "./child.jsx";\n\n'
)
H_PARENT = (
    'import { useState, useEffect } from "react";\n'
    'import { OPS, INPUTS, MODES, RANGE_SNAPS, levelFromCoins, lessonStatusOf, '
    'buildProblem, prizeProgress, defaultState } from "../engine/core.js";\n'
    'import { ProgressBar } from "./child.jsx";\n\n'
)
H_MODALS = (
    'import { useState } from "react";\n'
    'import { OPS, genOne, pick } from "../engine/core.js";\n\n'
)
H_APP = (
    'import { useState, useEffect } from "react";\n'
    'import { loadState, saveState, WORLDS, pick, hashSeed, randomSeed, '
    'levelFromCoins, todayKey, DIPLOMAS } from "./engine/core.js";\n'
    'import { Home, WorldPicker, LessonList, ModeSelect, Practice, PrizesAndDiplomas } from "./components/child.jsx";\n'
    'import { Result, DiplomaView, Diplomas } from "./components/reward.jsx";\n'
    'import { PinGate, Parent } from "./components/parent.jsx";\n'
    'import { PrintModal, TipsModal } from "./components/modals.jsx";\n\n'
)

JOBS = [
    ("01_engine_model.jsx", "engine/core.js",       H_CORE,   "core"),
    ("02_child_app.jsx",    "components/child.jsx",  H_CHILD,  "comp"),
    ("03_reward.jsx",       "components/reward.jsx", H_REWARD, "comp"),
    ("04_parent.jsx",       "components/parent.jsx", H_PARENT, "comp"),
    ("05_modals.jsx",       "components/modals.jsx", H_MODALS, "comp"),
    ("06_root_app.jsx",     "App.jsx",               H_APP,    "app"),
]

RE_ASSIGN = re.compile(r"Object\.assign\(\s*window\s*,\s*\{(.*?)\}\s*\)\s*;", re.S)
RE_REACT_DESTRUCT = re.compile(r"^const \{[^}]*\} = React;\s*\n", re.M)
RE_CREATEROOT = re.compile(r"ReactDOM\.createRoot\([^\n]*\.render\(<App\s*/>\)\s*;\s*", re.S)


def convert(text, kind):
    if kind in ("comp", "core"):
        text = RE_REACT_DESTRUCT.sub("", text)
        m = RE_ASSIGN.search(text)
        if not m:
            raise SystemExit("Kein Object.assign(window,...) gefunden!")
        names = m.group(1).strip().rstrip(",")
        text = text[:m.start()] + "export {" + names + "};\n" + text[m.end():]
    elif kind == "app":
        text = RE_CREATEROOT.sub("", text)
        text = text.rstrip() + "\n\nexport default App;\n"
    return text


def main():
    n = 0
    for src_name, dst_rel, header, kind in JOBS:
        text = open(os.path.join(SRC, src_name), encoding="utf-8").read()
        out = header + convert(text, kind)
        dst = os.path.join(ROOT, "src", dst_rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"  {src_name:22s} -> src/{dst_rel}  ({len(out)} B)")
        n += 1
    print(f"\n{n} Module zu ESM konvertiert.")


if __name__ == "__main__":
    main()

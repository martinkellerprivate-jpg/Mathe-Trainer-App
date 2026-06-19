// Rastert public/icon.svg in die PWA-PNG-Icons. Aufruf: node tools/gen_icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const pub = join(root, "public");

const targets = [
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "maskable-512x512.png", size: 512 }, // gleiches Vollbild-Motiv (für Maskable geeignet)
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-64.png", size: 64 },
];

for (const t of targets) {
  await sharp(svg, { density: 384 }).resize(t.size, t.size).png().toFile(join(pub, t.name));
  console.log("✓", t.name, t.size + "px");
}
console.log("Icons erzeugt.");

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: lokal "/"; beim GitHub-Pages-Build via Env VITE_BASE="/<repo>/" gesetzt
// (Project-Pages liegen unter https://<user>.github.io/<repo>/).
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon-64.png", "icon.svg", "fonts/*.woff2"],
      manifest: {
        name: "Felix' Mathe-Trainer",
        short_name: "Mathe-Trainer",
        description: "Spielerischer Mathe-Trainer für Kinder — Rechnen üben mit Welten, Belohnungen und Wiederholungen.",
        lang: "de",
        theme_color: "#2f8f4e",
        background_color: "#faf9f5",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
        cleanupOutdatedCaches: true,
        navigateFallback: base + "index.html",
      },
    }),
  ],
});

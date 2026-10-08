import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    // Phase 4.1-fix — reset global des stores Zustand avant chaque
    // test. Voir src/test-setup.ts pour la rationale.
    setupFiles: ["./src/test-setup.ts"],
    // Phase 4.3 — jsdom partagé par worker (vs. 1 jsdom par fichier).
    // Garde l'isolation per-file (setupFiles + beforeEach global).
    pool: "vmThreads",
  },
});

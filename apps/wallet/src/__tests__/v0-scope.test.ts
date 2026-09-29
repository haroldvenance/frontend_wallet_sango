import { describe, expect, it } from "vitest";

/**
 * Charge tous les sources de `src/` en texte brut via Vite.
 *
 * `import.meta.glob` est transformé au build par Vite/Vitest : aucun
 * accès FS, aucun besoin de `@types/node` dans l'app browser.
 * `eager: true` → résolu au chargement du module de test.
 * `query: "?raw"` → contenu textuel brut (pas de transformation).
 * `import: "default"` → on récupère la string par défaut.
 */
const SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function read(rel: string): string {
  // rel = "hooks/use-transactions.ts"
  const key = `../${rel}`;
  const content = SOURCES[key];
  if (typeof content !== "string") {
    throw new Error(
      `Source introuvable : ${key}\nClés disponibles : ${Object.keys(SOURCES).slice(0, 5).join(", ")}…`,
    );
  }
  return content;
}

/**
 * Tests de gel du périmètre V0.
 *
 * Vérifient que les décisions D-SESS-N sont documentées dans le code,
 * pour éviter qu'une future refonte ne "redécouvre" ces contraintes
 * par accident.
 */
describe("V0 scope — décisions documentées", () => {
  it("use-transactions.ts documente D-SESS-9 (reste sur SDK)", () => {
    const c = read("hooks/use-transactions.ts");
    expect(c).toMatch(/D-SESS-9/);
    expect(c).toMatch(/V0\.2/);
  });

  it("history.tsx documente D-SESS-9", () => {
    const c = read("routes/history.tsx");
    expect(c).toMatch(/D-SESS-9/);
  });

  it("history-detail.tsx documente D-SESS-9", () => {
    const c = read("routes/history-detail.tsx");
    expect(c).toMatch(/D-SESS-9/);
  });

  it("use-chain-info.ts documente D-SESS-6", () => {
    const c = read("hooks/use-chain-info.ts");
    expect(c).toMatch(/D-SESS-6/);
  });

  it("use-recent-blocks.ts documente D-SESS-6", () => {
    const c = read("hooks/use-recent-blocks.ts");
    expect(c).toMatch(/D-SESS-6/);
  });

  it("use-send-tx.tsx documente D-SESS-7 (waitForInclusion sur SDK)", () => {
    const c = read("hooks/use-send-tx.tsx");
    expect(c).toMatch(/D-SESS-7/);
  });

  it("use-account.ts utilise la session (pas client.rpc)", () => {
    const c = read("hooks/use-account.ts");
    expect(c).toMatch(/useWalletSession/);
    expect(c).not.toMatch(/client\.rpc\.getAccount/);
  });

  it("use-send-tx.tsx utilise la session (pas client.send)", () => {
    const c = read("hooks/use-send-tx.tsx");
    expect(c).toMatch(/session\.send/);
    expect(c).not.toMatch(/client\.send\(/);
  });
});

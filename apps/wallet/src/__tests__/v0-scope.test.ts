import { describe, expect, it } from "vitest";

/**
 * Charge tous les sources de `src/` en texte brut via Vite.
 *
 * `import.meta.glob` est transformé au build par Vite/Vitest : aucun
 * accès FS, aucun besoin de `@types/node` dans l'app browser.
 */
const SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function read(rel: string): string {
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
 * Tests de gel du périmètre V0 / V0.2.
 *
 * Vérifient que les décisions D-SESS-N sont documentées dans le code
 * et que les migrations annoncées sont effectives, pour éviter qu'une
 * future refonte ne "redécouvre" ces contraintes par accident.
 */
describe("V0 scope — décisions documentées", () => {
  // --- V0 (étapes 7.a → 7.g) ------------------------------------------------

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

  it("use-account.ts utilise la session (pas client.rpc.getAccount)", () => {
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

describe("V0.2 scope — migration staking effective", () => {
  // --- Sources : plus d'appel direct aux méthodes métier du SDK ----------

  it("use-staking-actions.tsx n'appelle plus les méthodes staking du SDK", () => {
    const c = read("hooks/use-staking-actions.tsx");
    // Doit utiliser session.send
    expect(c).toMatch(/session\.send/);
    // Ne doit plus appeler les méthodes SDK dédiées
    expect(c).not.toMatch(/client\.bond\(/);
    expect(c).not.toMatch(/client\.unbond\(/);
    expect(c).not.toMatch(/client\.delegate\(/);
    expect(c).not.toMatch(/client\.undelegate\(/);
    expect(c).not.toMatch(/client\.claimRewards\(/);
    expect(c).not.toMatch(/client\.registerValidator\(/);
    expect(c).not.toMatch(/client\.updateCommission\(/);
    expect(c).not.toMatch(/client\.unjail\(/);
    // Doit garder waitForInclusion (D-SESS-7)
    expect(c).toMatch(/client\.waitForInclusion/);
  });

  it("use-my-delegations.ts utilise la session", () => {
    const c = read("hooks/use-my-delegations.ts");
    expect(c).toMatch(/session\.getDelegations/);
    expect(c).toMatch(/session\.getPendingUnbondings/);
    expect(c).not.toMatch(/client\.getMyDelegations/);
    expect(c).not.toMatch(/client\.getMyPendingUnbondings/);
  });

  it("use-validators.ts utilise la session", () => {
    const c = read("hooks/use-validators.ts");
    expect(c).toMatch(/session\.listValidators/);
    expect(c).toMatch(/session\.getValidatorInfo/);
    expect(c).not.toMatch(/client\.getValidators/);
    expect(c).not.toMatch(/client\.getValidatorInfo/);
  });

  // --- wallet-chains : SendParams discriminé ----------------------------

  it("SendParams est une union discriminée keyed on kind", () => {
    const c = read("../packages/wallet-chains/src/capabilities/transaction-builder.ts");
    expect(c).toMatch(/D-SESS-10/);
    // Les 9 variants doivent être présents
    expect(c).toMatch(/kind: "transfer"/);
    expect(c).toMatch(/kind: "bond"/);
    expect(c).toMatch(/kind: "unbond"/);
    expect(c).toMatch(/kind: "delegate"/);
    expect(c).toMatch(/kind: "undelegate"/);
    expect(c).toMatch(/kind: "claimRewards"/);
    expect(c).toMatch(/kind: "registerValidator"/);
    expect(c).toMatch(/kind: "updateCommission"/);
    expect(c).toMatch(/kind: "unjail"/);
    // Pas de `from` dans SendParams (résolu par la session)
    expect(c).not.toMatch(/readonly from\??:/);
  });

  // --- cleanup -----------------------------------------------------------

  it("GAS_BY_TX_KIND n'existe plus dans apps/wallet/config.ts (orphelin V0.2)", () => {
    const c = read("lib/config.ts");
    // La constante ne doit plus être EXPORTÉE (le commentaire explique
    // la suppression — on cherche l'export, pas le nom dans un commentaire)
    expect(c).not.toMatch(/export const GAS_BY_TX_KIND/);
  });

  it("sdk-store.ts documente les 3 catégories résiduelles V0.2", () => {
    const c = read("stores/sdk-store.ts");
    expect(c).toMatch(/V0\.2 — réduction/);
    // Les 3 catégories actives
    expect(c).toMatch(/D-SESS-6/);   // chainInfo
    expect(c).toMatch(/D-SESS-9/);   // history
    expect(c).toMatch(/D-SESS-7/);   // waitForInclusion
    // La liste de ce qui a migré
    expect(c).toMatch(/client\.bond\(\).*session\.send/);
  });
});

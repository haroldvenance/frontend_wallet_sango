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
 * Retire les commentaires (JSDoc, blocs, lignes `//`) pour tester
 * uniquement le **code exécutable**.
 *
 * Utilisé pour les assertions "ne contient PAS cet appel" : la doc
 * peut légitimement mentionner `client.getMyDelegations()` comme
 * référence de migration sans que ce soit un appel réel.
 */
function readCode(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/**
 * Regex tolérante au formatage multi-ligne (prettier éclate souvent
 * `session\n  .send(` sur 2 lignes) : `\s*\.\s*` entre les tokens.
 */
const D = "\\s*\\.\\s*"; // "session.sed" pattern tokens
function re(parts: string): RegExp {
  // parts contient les tokens séparés par des espaces, on remplace les
  // espaces par le pattern "D" tolérant aux retours à la ligne.
  return new RegExp(parts.trim().split(/\s+/).join("\\s*\\.\\s*"));
}
function reCall(tokens: string): RegExp {
  // Comme `re`, mais exige une parenthèse ouvrante à la fin (appel réel).
  return new RegExp(
    tokens.trim().split(/\s+/).join("\\s*\\.\\s*") + "\\s*\\(",
  );
}
// (silence unused warning en cas de future suppression)
void D;
void re;
void reCall;

/**
 * Tests de gel du périmètre V0 / V0.2.
 *
 * Vérifient que les décisions D-SESS-N sont documentées dans le code
 * et que les migrations annoncées sont effectives.
 */
describe("V0 scope — décisions documentées", () => {
  it("use-transactions.ts utilise la session (D-SESS-9 résolu en V0.3)", () => {
    const c = readCode("hooks/use-transactions.ts");
    expect(c).toMatch(/session\s*\.\s*getTransactionPage/);
    expect(c).toMatch(/session\s*\.\s*getTransactionByHash/);
    expect(c).not.toMatch(/client\s*\.\s*rpc\s*\.\s*getTransactionsByAddress/);
    expect(c).not.toMatch(/client\s*\.\s*rpc\s*\.\s*getTransactionByHash/);
    // Adaptateurs explicites de frontière
    expect(c).toMatch(/function toTx\b/);
    expect(c).toMatch(/function toTxPage\b/);
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
    const c = readCode("hooks/use-account.ts");
    expect(c).toMatch(/useWalletSession/);
    expect(c).not.toMatch(/client\s*\.\s*rpc\s*\.\s*getAccount/);
  });

  it("use-send-tx.tsx utilise la session (pas client.send)", () => {
    const c = readCode("hooks/use-send-tx.tsx");
    expect(c).toMatch(/session\s*\.\s*send/);
    expect(c).not.toMatch(/client\s*\.\s*send\s*\(/);
  });
});

describe("V0.2 scope — migration staking effective", () => {
  it("use-staking-actions.tsx n'appelle plus les méthodes staking du SDK", () => {
    const c = readCode("hooks/use-staking-actions.tsx");
    // Doit utiliser session.send (\s* tolère les retours à la ligne)
    expect(c).toMatch(/session\s*\.\s*send/);
    // Ne doit plus appeler les méthodes SDK dédiées
    expect(c).not.toMatch(/client\s*\.\s*bond\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*unbond\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*delegate\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*undelegate\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*claimRewards\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*registerValidator\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*updateCommission\s*\(/);
    expect(c).not.toMatch(/client\s*\.\s*unjail\s*\(/);
    // Doit garder waitForInclusion (D-SESS-7)
    expect(c).toMatch(/client\s*\.\s*waitForInclusion/);
  });

  it("use-my-delegations.ts utilise la session", () => {
    const c = readCode("hooks/use-my-delegations.ts");
    expect(c).toMatch(/session\s*\.\s*getDelegations/);
    expect(c).toMatch(/session\s*\.\s*getPendingUnbondings/);
    // readCode() retire les commentaires : on vérifie l'absence
    // d'APPEL réel, pas de mention dans la doc de migration.
    expect(c).not.toMatch(/client\s*\.\s*getMyDelegations/);
    expect(c).not.toMatch(/client\s*\.\s*getMyPendingUnbondings/);
  });

  it("use-validators.ts utilise la session", () => {
    const c = readCode("hooks/use-validators.ts");
    expect(c).toMatch(/session\s*\.\s*listValidators/);
    expect(c).toMatch(/session\s*\.\s*getValidatorInfo/);
    // readCode() retire les commentaires.
    expect(c).not.toMatch(/client\s*\.\s*getValidators/);
    expect(c).not.toMatch(/client\s*\.\s*getValidatorInfo/);
  });

  it("GAS_BY_TX_KIND n'existe plus dans apps/wallet/config.ts (orphelin V0.2)", () => {
    const c = readCode("lib/config.ts");
    // La constante ne doit plus être EXPORTÉE. readCode() retire le
    // commentaire explicatif qui mentionne le nom.
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

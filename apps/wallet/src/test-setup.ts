import { beforeEach } from "vitest";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Setup global Vitest — Phase 4.1-fix.
 *
 * **Problème** : les stores Zustand (`useWalletStore`, `useSdkStore`)
 * sont des **singletons de module**. Vitest partage les modules entre
 * fichiers dans un même worker → un fichier qui laisse le store dans
 * un état non-standard (ex. `format: "sango-legacy"` + `wallet: X`
 * sans reset) pollue les fichiers suivants.
 *
 * **Fix** : reset `beforeEach` **global**, exécuté avant les
 * `beforeEach` locaux de chaque fichier de test. Chaque test repart
 * d'un état propre.
 *
 * Les tests qui ont besoin d'un état spécifique peuvent toujours le
 * poser dans leur propre `beforeEach` — il s'exécutera après celui-ci.
 */
beforeEach(() => {
  // ── localStorage (persist zustand) ────────────────────────
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }

  // ── wallet-store ──────────────────────────────────────────
  useWalletStore.setState({
    // Runtime
    wallets: {},
    wallet: null,
    // Persisté
    activeId: null,
    walletAccounts: {},
    walletNetworks: {},
    // Effectif
    format: null,
    networkId: "sango-devnet",
    family: "sango",
    network: "testnet",
    status: "no-wallet",
  });

  // ── sdk-store ─────────────────────────────────────────────
  useSdkStore.setState({
    endpoint: "http://test",
    customEndpoint: null,
  });
});

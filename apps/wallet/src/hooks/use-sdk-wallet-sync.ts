/**
 * Synchronise le `Wallet` SANGO déverrouillé avec le `SangoClient`.
 *
 * ⚠️ V0.1 — nécessaire uniquement pour le staking (V0.2 migrera vers
 * WalletSession). Les hooks migrés (`use-account`, `use-send-tx`)
 * n'ont plus besoin du wallet attaché.
 *
 * ⚠️ Le `SangoClient` (SDK) n'accepte QUE les Wallet SANGO Ed25519.
 * Les wallets BIP-39 (EVM/Bitcoin) passent par EvmAdapter /
 * wallet-chains — on détache donc systématiquement le SDK pour eux.
 *
 * **Garanties** :
 *   - `detachWallet()` est appelé au cleanup (unmount) → pas de
 *     référence pendante à un wallet détruit.
 *   - Chaque appel attach/detach est isolé par try/catch (un échec
 *     n'interrompt pas la session — le SDK continuera de throw à
 *     l'appel suivant, ce qui est préférable à un état incohérent).
 */
import { Wallet } from "@sango/wallet-core";
import { useEffect } from "react";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

export function useSdkWalletSync(): void {
  const { client } = useSdkStore();
  const { wallet, status } = useWalletStore();

  useEffect(() => {
    const shouldAttach = status === "unlocked" && wallet instanceof Wallet;

    if (shouldAttach) {
      try {
        client.attachWallet(wallet);
      } catch (err) {
        // Le SDK peut throw si un wallet est déjà attaché (aucun cas
        // normal, mais défensif) ou si le client est fermé.
        if (import.meta.env.DEV) {
          console.warn("[useSdkWalletSync] attachWallet failed", err);
        }
      }
    } else {
      try {
        client.detachWallet();
      } catch {
        /* detach idempotent, throw signifie "déjà détaché" */
      }
    }

    // Cleanup : détache au unmount du composant qui monte ce hook
    // (App.tsx à la racine). Évite une référence pendante à `wallet`
    // si le composant disparaît alors qu'un wallet est déverrouillé.
    return () => {
      try {
        client.detachWallet();
      } catch {
        /* ignore */
      }
    };
  }, [client, wallet, status]);
}
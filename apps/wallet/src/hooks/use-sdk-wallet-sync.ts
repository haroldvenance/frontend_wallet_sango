import { useEffect } from "react";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Synchronise le `Wallet` déverrouillé avec le `SangoClient`.
 *
 * Sans ce hook, `SangoClient` n'a pas de wallet attaché et toute méthode
 * qui signe (`send`, `bond`, `delegate`, `registerValidator`, …) lève
 * "No wallet attached".
 *
 * À monter **une seule fois** dans `App`. Le hook se ré-attache
 * automatiquement quand :
 *  - le wallet passe à `unlocked` / `locked` ;
 *  - l'instance `client` change (changement de réseau dans `sdk-store`).
 */
export function useSdkWalletSync(): void {
  const { client } = useSdkStore();
  const { wallet, status } = useWalletStore();

  useEffect(() => {
    if (status === "unlocked" && wallet) {
      client.attachWallet(wallet);
    } else {
      client.detachWallet();
    }
  }, [client, wallet, status]);
}

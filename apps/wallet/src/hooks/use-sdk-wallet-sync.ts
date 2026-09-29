/**
 * Synchronise le `Wallet` déverrouillé avec le `SangoClient`.
 *
 * ⚠️ V0.1 — encore nécessaire pour le staking (V0.2).
 *
 * Les hooks migrés vers WalletSession (`use-account`, `use-send-tx`)
 * n'ont plus besoin du wallet attaché au client : la session signe via
 * le `Signer` dérivé du `Wallet` directement.
 *
 * Mais les hooks staking appellent toujours les méthodes dédiées du
 * `SangoClient` (bond, delegate, undelegate, claimRewards, unjail,
 * updateCommission). Ces méthodes exigent un wallet attaché (sinon
 * "No wallet attached"). Ce hook doit donc rester monté tant que le
 * staking n'a pas migré vers WalletSession (V0.2).
 *
 * Note : `client.send()` — la méthode générique du SDK — n'est plus
 * utilisée depuis la migration de `use-send-tx` (D-SESS-8).
 *
 * Migration future : quand WalletSession exposera un `StakingProvider`,
 * retirer ce hook et le montage dans `App.tsx`.
 */

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

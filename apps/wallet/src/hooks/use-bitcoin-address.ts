import { useMemo } from "react";

import { Bip39Wallet } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";

import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Adresse Bitcoin P2WPKH du wallet BIP-39 courant — E2.1.b.6.2.
 *
 * **D-E2.1-9 / D-E2.1-19** — l'adresse est dérivée côté client via
 * `Bip39Wallet.getBitcoinIdentity()`. Pas d'appel réseau, pas de
 * `BitcoinAccountProvider` (Bitcoin n'a pas d'`AccountState`).
 *
 * **Index HD** : dérivé de `account.accountIndex` (issu du
 * `NetworkQueryContext`). Pas de hardcode 0 — le jour où on supportera
 * le multi-compte HD, seule la source de `accountIndex` changera.
 *
 * Retourne `null` si :
 *   - le wallet actif n'est pas BIP-39 ;
 *   - la famille n'est pas Bitcoin (garde de cohérence D-E2.1-18).
 */
export interface BitcoinAddressInfo {
  readonly address: string;
  readonly publicKeyCompressed: Uint8Array;
  readonly path: string;
  readonly network: BitcoinNetwork;
}

export function useBitcoinAddress(): BitcoinAddressInfo | null {
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);
  const { family, networkId, account } = useNetworkQueryContext();

  return useMemo(() => {
    if (family !== "bitcoin") return null;
    if (format !== "bip39") return null;
    if (!(wallet instanceof Bip39Wallet)) return null;

    const network: BitcoinNetwork =
      networkId === "bitcoin-mainnet" ? "mainnet" : "testnet";

    const identity = wallet.getBitcoinIdentity(
      network,
      0,
      account.accountIndex,
    );
    return {
      address: identity.address,
      publicKeyCompressed: identity.publicKeyCompressed,
      path: identity.path,
      network,
    };
  }, [wallet, format, family, networkId, account.accountIndex]);
}

import { useMemo } from "react";

import {
  bitcoinNetworkById,
  evmNetworkById,
  type AssetRef,
  type ChainFamily,
} from "@sango/wallet-chains";

import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useBitcoinBalance } from "@/hooks/use-bitcoin-balance";
import { useEvmAccount } from "@/hooks/use-evm-account";
import { useEvmTokens } from "@/hooks/use-evm-tokens";
import { useAccount } from "@/hooks/use-account";
import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Résolution d'un actif pour la page détail (`/asset/:assetId`) —
 * Phase 6.
 *
 * **D6-c·A** — l'actif est résolu dans le **contexte courant** :
 *   - `family` (SANGO/EVM/Bitcoin) ;
 *   - `networkId` sélectionné ;
 *   - wallet et compte actifs.
 *
 * **Résolution** :
 *   - `sango` + family=sango    → SANGO natif
 *   - `btc`   + family=bitcoin  → BTC natif
 *   - `{nativeAsset}` + family=evm → ETH ou BNB natif
 *   - `usdc`/`usdt` + family=evm   → token ERC-20 (recherche dans
 *                                    `useEvmTokens()`)
 *
 * **Cas "not found"** : l'assetId n'existe pas dans le contexte courant.
 * Ex. `/asset/btc` sur un wallet EVM → notFound.
 *
 * **Invariant D6-c** — le solde affiché provient **toujours** du
 * contexte réel (networkId + compte). Aucun mélange de réseaux.
 */

export interface AssetDetail {
  readonly assetId: string;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly balance: bigint | null;
  readonly family: ChainFamily;
  readonly networkId: string;
  readonly networkName: string;
  readonly assetRef: AssetRef;
  /** Adresse de réception dans le contexte courant (EVM/BTC/SANGO). */
  readonly address: string;
  /** Adresse du contrat ERC-20 — `null` pour les natifs. */
  readonly contract: string | null;
  /** `true` si natif, `false` si token. */
  readonly isNative: boolean;
}

export interface UseAssetDetailResult {
  readonly detail: AssetDetail | null;
  readonly loading: boolean;
  readonly notFound: boolean;
}

export function useAssetDetail(
  assetId: string | undefined,
): UseAssetDetailResult {
  const family = useWalletStore((s) => s.family);
  const networkId = useWalletStore((s) => s.networkId);

  // Tous les hooks sont appelés inconditionnellement (règle des hooks),
  // la sélection se fait dans le useMemo.
  const sangoAccount = useAccount();
  const evmAccount = useEvmAccount();
  const btcBalance = useBitcoinBalance();
  const evmTokens = useEvmTokens();
  const sangoWallet = useSangoWallet();
  const btcAddress = useBitcoinAddress();

  return useMemo<UseAssetDetailResult>(() => {
    if (!assetId) {
      return { detail: null, loading: false, notFound: true };
    }
    const lower = assetId.toLowerCase();

    // ── SANGO ──────────────────────────────────────────────
    if (family === "sango") {
      if (lower !== "sango") {
        return { detail: null, loading: false, notFound: true };
      }
      const balance = sangoAccount.data
        ? BigInt(sangoAccount.data.balance)
        : null;
      const addr = sangoWallet?.identity.addressBech32 ?? "";
      return {
        detail: {
          assetId: "sango",
          symbol: "SANGO",
          name: "SangoCoin",
          decimals: 7,
          balance,
          family: "sango",
          networkId,
          networkName: "Sango",
          assetRef: { kind: "native", assetId: "sango", networkId },
          address: addr,
          contract: null,
          isNative: true,
        },
        loading: sangoAccount.isLoading,
        notFound: false,
      };
    }

    // ── Bitcoin ────────────────────────────────────────────
    if (family === "bitcoin") {
      if (lower !== "btc") {
        return { detail: null, loading: false, notFound: true };
      }
      const network = bitcoinNetworkById(networkId);
      return {
        detail: {
          assetId: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          decimals: 8,
          balance: btcBalance.data?.amount ?? null,
          family: "bitcoin",
          networkId,
          networkName: network?.name ?? "Bitcoin",
          assetRef: { kind: "native", assetId: "btc", networkId },
          address: btcAddress?.address ?? "",
          contract: null,
          isNative: true,
        },
        loading: btcBalance.isLoading,
        notFound: false,
      };
    }

    // ── EVM ────────────────────────────────────────────────
    if (family === "evm") {
      const network = evmNetworkById(networkId);
      if (!network) {
        return { detail: null, loading: false, notFound: true };
      }

      // Natif ?
      if (lower === network.nativeAsset) {
        const symbol = network.nativeAsset.toUpperCase();
        return {
          detail: {
            assetId: lower,
            symbol,
            name: `${symbol} · ${network.name}`,
            decimals: 18,
            balance: evmAccount.data?.balance ?? null,
            family: "evm",
            networkId,
            networkName: network.name,
            assetRef: {
              kind: "native",
              assetId: network.nativeAsset,
              networkId,
            },
            address: evmAccount.data?.address ?? "",
            contract: null,
            isNative: true,
          },
          loading: evmAccount.isLoading,
          notFound: false,
        };
      }

      // Token ERC-20 ?
      const tokens = evmTokens.data ?? [];
      const entry = tokens.find((t) => t.token.assetId === lower);
      if (!entry) {
        // Si on n'a pas fini de charger les tokens, ce n'est pas un
        // "not found" définitif.
        return {
          detail: null,
          loading: evmTokens.isLoading,
          notFound: !evmTokens.isLoading,
        };
      }
      return {
        detail: {
          assetId: lower,
          symbol: entry.token.metadata.symbol,
          name: entry.token.metadata.name,
          decimals: entry.token.metadata.decimals,
          balance: entry.balance,
          family: "evm",
          networkId,
          networkName: network.name,
          assetRef: {
            kind: "token",
            networkId,
            contract: entry.token.contract,
          },
          address: evmAccount.data?.address ?? "",
          contract: entry.token.contract,
          isNative: false,
        },
        loading: false,
        notFound: false,
      };
    }

    return { detail: null, loading: false, notFound: true };
  }, [
    assetId,
    family,
    networkId,
    sangoAccount.data,
    sangoAccount.isLoading,
    evmAccount.data,
    evmAccount.isLoading,
    btcBalance.data,
    btcBalance.isLoading,
    evmTokens.data,
    evmTokens.isLoading,
    sangoWallet,
    btcAddress,
  ]);
}

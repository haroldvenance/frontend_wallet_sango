import { useMemo } from "react";

import type { AssetRef, ChainFamily } from "@sango/wallet-chains";

import {
  getDisplayAssetId,
  useAllWalletAssets,
  type WalletAsset,
} from "@/hooks/use-all-wallet-assets";
import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useSangoWallet } from "@/hooks/use-sango-wallet";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Résolution d'un actif pour la page détail — Phase 9.4.
 *
 * **D9-i·A** — la route canonique est
 * `/asset/:networkId/:assetId`. Le `networkId` permet de distinguer
 * deux tokens portant le même symbole sur des réseaux différents
 * (ex. `USDT·Ethereum` vs `USDT·BNB`).
 *
 * **Source de vérité** : `useAllWalletAssets()` — le même hook qui
 * alimente la liste du dashboard. Ce choix garantit :
 *   - cohérence entre la liste et la page détail ;
 *   - pas de dépendance au réseau **actif** du store ;
 *   - pas de refetch RPC redondant (React Query cache partagé).
 *
 * **Invariant D9-c** — le solde affiché provient **toujours** du
 * couple `(networkId, assetId)`, jamais d'un autre contexte.
 *
 * Retourne :
 *   - `notFound: true` si l'asset n'existe pas sur ce réseau.
 *   - `loading: true` tant que l'agrégat n'a pas convergé.
 */

export interface AssetDetail {
  readonly networkId: string;
  readonly assetId: string;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly balance: bigint | null;
  readonly family: ChainFamily;
  readonly networkName: string;
  readonly assetRef: AssetRef;
  /** Adresse de réception dans le contexte du wallet actif. */
  readonly address: string;
  /** Adresse du contrat ERC-20 — `null` pour les natifs. */
  readonly contract: string | null;
  readonly isNative: boolean;
}

export interface UseAssetDetailResult {
  readonly detail: AssetDetail | null;
  readonly loading: boolean;
  readonly notFound: boolean;
}

export function useAssetDetail(
  networkId: string | undefined,
  assetId: string | undefined,
): UseAssetDetailResult {
  const { assets, loading } = useAllWalletAssets();
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);
  const sangoWallet = useSangoWallet();
  const btcAddress = useBitcoinAddress();

  return useMemo<UseAssetDetailResult>(() => {
    if (!networkId || !assetId) {
      return { detail: null, loading: false, notFound: true };
    }

    const lower = assetId.toLowerCase();
    const match: WalletAsset | undefined = assets.find(
      (a) =>
        a.networkId === networkId &&
        getDisplayAssetId(a).toLowerCase() === lower,
    );

    if (!match) {
      // Tant que l'agrégat charge, ne pas crier "not found".
      return {
        detail: null,
        loading,
        notFound: !loading && format !== null,
      };
    }

    // Résolution de l'adresse de réception (par famille).
    let address = "";
    if (match.family === "sango") {
      address = sangoWallet?.identity.addressBech32 ?? "";
    } else if (match.family === "bitcoin") {
      address = btcAddress?.address ?? "";
    } else if (match.family === "evm" && wallet) {
      // Bip39Wallet.getIdentity(0).addressHex
      // On évite `instanceof` : discriminant `format` (store).
      if (format === "bip39") {
        const w = wallet as { getIdentity?: (i: number) => { addressHex: string } };
        address = w.getIdentity?.(match.accountIndex).addressHex ?? "";
      }
    }

    const native = match.assetRef.kind === "native";
    const contract = native ? null : match.assetRef.contract;

    return {
      detail: {
        networkId: match.networkId,
        assetId: lower,
        symbol: match.symbol,
        name: match.name,
        decimals: match.decimals,
        balance: match.balance,
        family: match.family,
        networkName: match.subtitle,
        assetRef: match.assetRef,
        address,
        contract,
        isNative: native,
      },
      loading: false,
      notFound: false,
    };
  }, [
    networkId,
    assetId,
    assets,
    loading,
    wallet,
    format,
    sangoWallet,
    btcAddress,
  ]);
}

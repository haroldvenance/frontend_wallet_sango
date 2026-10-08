import type { WalletFormat } from "@sango/wallet-core";
import type { ChainFamily } from "@sango/wallet-chains";
import { useMemo } from "react";

import { resolveChainFamily } from "@/lib/chain-family";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Vue **metadata** d'un wallet déverrouillé, pour l'UI (Phase 3.3).
 *
 * **D-Phase3-2** — pas de balance, pas de token, pas de compte, pas
 * de RPC, pas de lecture keyring. Le hook est une dérivation **pure**
 * du store :
 *
 *   wallets (runtime)          →  id, label, format, createdAt
 *   walletNetworks / entry     →  networkId effectif → family
 *   activeId                   →  isActive
 *
 * Corollaire : un wallet non déverrouillé (session `locked`) n'est
 * **pas** listé. Le hook est destiné aux vues qui opèrent session
 * ouverte (dashboard, settings, modal 3.3).
 *
 * Les balances sont chargées **à la demande** par le picker Phase 3.3
 * uniquement pour le wallet déplié (D7). Ne pas transformer ce hook
 * en agrégateur wallet × accounts × balances × tokens.
 */
export interface WalletSummary {
  readonly id: string;
  readonly label: string;
  /** Discriminant de construction (`bip39` vs `sango-legacy`). */
  readonly format: WalletFormat;
  /** Famille déduite du `networkId` effectif. */
  readonly family: ChainFamily;
  /**
   * Réseau **effectif** : préférence `walletNetworks[id]` si présente,
   * sinon `networkId` structurel du keyring.
   */
  readonly networkId: string;
  readonly isActive: boolean;
  /** Timestamp keyring (ms). Sert au tri stable "Wallet 1 / Wallet 2". */
  readonly createdAt: number;
}

export interface UseWalletsResult {
  /** Trié par `createdAt` croissant (ordre stable pour l'UI). */
  readonly wallets: readonly WalletSummary[];
  readonly activeWalletId: string | null;
  /**
   * `null` si `activeId` est `null` ou périmé (pas dans `wallets`).
   * Ne pas confondre avec `activeId` persisté qui peut pointer vers un
   * wallet non déverrouillé après `lock()`.
   */
  readonly activeWallet: WalletSummary | null;
}

/**
 * Liste les wallets **déverrouillés** avec leurs metadata essentielles.
 *
 * Cf. `WalletSummary` pour le contrat exact et D-Phase3-2 pour le
 * périmètre volontairement restreint.
 */
export function useWallets(): UseWalletsResult {
  const wallets = useWalletStore((s) => s.wallets);
  const activeId = useWalletStore((s) => s.activeId);
  const walletNetworks = useWalletStore((s) => s.walletNetworks);

  return useMemo<UseWalletsResult>(() => {
    const list: WalletSummary[] = Object.entries(wallets).map(
      ([id, entry]) => {
        const effectiveNetworkId = walletNetworks[id] ?? entry.networkId;
        return {
          id,
          label: entry.label,
          format: entry.format,
          family: resolveChainFamily(effectiveNetworkId),
          networkId: effectiveNetworkId,
          isActive: id === activeId,
          createdAt: entry.createdAt,
        };
      },
    );

    // Tri stable : permet à l'UI d'afficher "Wallet 1 / Wallet 2…"
    // indépendamment de l'ordre d'itération des clés de l'objet.
    list.sort((a, b) => a.createdAt - b.createdAt);

    const activeWallet = activeId
      ? (list.find((w) => w.id === activeId) ?? null)
      : null;

    return {
      wallets: list,
      activeWalletId: activeId,
      activeWallet,
    };
  }, [wallets, activeId, walletNetworks]);
}

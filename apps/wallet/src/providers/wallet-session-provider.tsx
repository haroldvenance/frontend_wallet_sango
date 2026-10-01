import { useMemo, type ReactNode } from "react";

import { SangoRpcClient } from "@sango/rpc";
import {
  ALL_EVM_NETWORKS,
  SANGO_DEVNET,
  createChainRegistry,
  evmAdapterFactory,
  sangoAdapterFactory,
  type SangoNetwork,
} from "@sango/wallet-chains";
import {
  InMemoryAccountList,
  InMemoryAssetList,
  SANGO_NATIVE_ASSET,
  ETH_NATIVE_ASSET,
  createWalletSession,
  signerFromAnyWallet,
  type WalletSession,
} from "@sango/wallet-session";
import { createRpcPool, EvmRpcUsingPool } from "@sango/wallet-providers";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletSessionContext } from "./wallet-session-context";

/**
 * Construit la `WalletSession` dès que le wallet passe à `unlocked`.
 *
 * **E1.5 (D-NET-1 étendu)** — deux familles enregistrées :
 *   - SANGO_DEVNET       : legacy SANGO Ed25519 (SangoRpcClient).
 *   - 4 réseaux EVM      : Sepolia, Mainnet, Base, Arbitrum One
 *                          (RpcPool + EvmRpcUsingPool).
 *
 * Le `signer` est multi-courbe (D-SIGNER-1) : `signerFromAnyWallet`
 * route selon le type concret du wallet.
 *
 * **D-RPC-3 (status quo)** : chaque réseau EVM a son propre `RpcPool`
 * déterministe et séquentiel. Pas de load balancing, pas de circuit
 * breaker. Le pool est un mécanisme de fallback, pas un scheduler.
 *
 * **D-UI-3** : le réseau actif d'un wallet BIP-39 est figé à sa
 * création (`wallet-store.networkId`). Les 4 réseaux sont enregistrés
 * dans le registry pour que la session puisse router n'importe quel
 * `AccountRef.networkId` — mais l'UI n'expose que celui du wallet.
 *
 * D-SESS-5 : la session n'est pas reconstruite au changement de réseau
 * sélectionné (le réseau cible vit dans `AccountRef.networkId`).
 */
interface WalletSessionProviderProps {
  children: ReactNode;
}

function hexChainIdToNumber(hex: string): number {
  return Number.parseInt(hex, 16);
}

export function WalletSessionProvider({ children }: WalletSessionProviderProps) {
  const wallet = useWalletStore((s) => s.wallet);
  const status = useWalletStore((s) => s.status);
  const endpoint = useSdkStore((s) => s.endpoint);

  const session = useMemo<WalletSession | null>(() => {
    if (status !== "unlocked" || !wallet) return null;

    const signer = signerFromAnyWallet(wallet);
    const chainRegistry = createChainRegistry();

    // ── SANGO (legacy Ed25519) ───────────────────────────────
    const sangoRpc = new SangoRpcClient(endpoint);
    chainRegistry.register(SANGO_DEVNET, (network) =>
      sangoAdapterFactory(network as SangoNetwork, {
        rpc: sangoRpc,
        signer,
      }),
    );

    // ── EVM (4 réseaux) ──────────────────────────────────────
    // Un RpcPool par réseau : chaque pool est isolé, avec sa propre
    // liste d'endpoints priorisés (D-RPC-3).
    for (const network of ALL_EVM_NETWORKS) {
      const pool = createRpcPool();
      pool.register(
        network.id,
        network.defaultRpcEndpoints.map((url, i) => ({
          url,
          priority: i,
        })),
      );
      const evmRpc = new EvmRpcUsingPool(pool, network.id);
      const chainId = hexChainIdToNumber(network.chainId);

      chainRegistry.register(network, () =>
        evmAdapterFactory(network, {
          rpc: evmRpc,
          signer,
          chainId,
        }),
      );
    }

    // ── Assets ───────────────────────────────────────────────
    const assets = new InMemoryAssetList();
    assets.register(SANGO_NATIVE_ASSET);
    assets.register(ETH_NATIVE_ASSET);

    return createWalletSession({
      chainRegistry,
      signer,
      accounts: new InMemoryAccountList(),
      assets,
    });
  }, [wallet, status, endpoint]);

  return (
    <WalletSessionContext.Provider value={session}>
      {children}
    </WalletSessionContext.Provider>
  );
}

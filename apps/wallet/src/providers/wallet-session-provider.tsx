import { useMemo, type ReactNode } from "react";

import { SangoRpcClient } from "@sango/rpc";
import {
  ETHEREUM_SEPOLIA,
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
 * Construit la `WalletSession` dès que le wallet passe à `unlocked`,
 * et la reconstruit quand le wallet ou l'endpoint RPC SANGO change.
 *
 * **Patch 5 (E1)** — deux réseaux enregistrés :
 *   - SANGO_DEVNET  : legacy SANGO Ed25519 (SangoRpcClient).
 *   - ETHEREUM_SEPOLIA : BIP-39 EVM (RpcPool + EvmRpcUsingPool).
 *
 * Le `signer` est multi-courbe (D-SIGNER-1) : `signerFromAnyWallet`
 * route selon le type concret du wallet. Chaque signer applique son
 * `assertFamily` — un wallet SANGO ne peut pas signer pour EVM, et
 * inversement.
 *
 * D-SESS-5 : la session n'est pas reconstruite au changement de réseau
 * sélectionné. Le réseau cible vit dans `AccountRef.networkId`.
 *
 * ⚠️ L'endpoint `endpoint` du `sdk-store` pilote **uniquement** le
 *    RPC SANGO. Les endpoints EVM sont fixés dans `ETHEREUM_SEPOLIA`
 *    (publics, sans clé API) — la sélection d'endpoint EVM viendra
 *    en E1.5.
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

    // ── Registre ─────────────────────────────────────────────
    const chainRegistry = createChainRegistry();

    // SANGO (legacy Ed25519) — utilise le SangoRpcClient existant.
    const sangoRpc = new SangoRpcClient(endpoint);
    chainRegistry.register(SANGO_DEVNET, (network) =>
      sangoAdapterFactory(network as SangoNetwork, {
        rpc: sangoRpc,
        signer,
      }),
    );

    // EVM (Sepolia) — utilise le RpcPool générique (D-RPC-2).
    const evmPool = createRpcPool();
    evmPool.register(
      ETHEREUM_SEPOLIA.id,
      ETHEREUM_SEPOLIA.defaultRpcEndpoints.map((url, i) => ({
        url,
        priority: i,
      })),
    );
    const evmRpc = new EvmRpcUsingPool(evmPool, ETHEREUM_SEPOLIA.id);
    chainRegistry.register(ETHEREUM_SEPOLIA, (network) =>
      evmAdapterFactory(network, {
        rpc: evmRpc,
        signer,
        chainId: hexChainIdToNumber(ETHEREUM_SEPOLIA.chainId),
      }),
    );

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

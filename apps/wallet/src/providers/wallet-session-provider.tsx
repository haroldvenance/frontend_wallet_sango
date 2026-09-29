import { useMemo, type ReactNode } from "react";

import { SangoRpcClient } from "@sango/rpc";
import {
  SANGO_DEVNET,
  createChainRegistry,
  sangoAdapterFactory,
  type SangoNetwork,
} from "@sango/wallet-chains";
import {
  InMemoryAccountList,
  InMemoryAssetList,
  SANGO_NATIVE_ASSET,
  createWalletSession,
  signerFromWallet,
  type WalletSession,
} from "@sango/wallet-session";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletSessionContext } from "./wallet-session-context";

/**
 * Construit la `WalletSession` dès que le wallet passe à `unlocked`,
 * et la reconstruit uniquement quand :
 *   - le wallet change (unlock / lock) ;
 *   - l'endpoint RPC change (sdk-store).
 *
 * D-SESS-5 : **la session n'est pas reconstruite au changement de
 * réseau sélectionné**. Le `networkId` cible est porté par
 * `AccountRef.networkId` / `AssetRef.networkId` dans chaque appel.
 * En V0 tous les labels pointent vers `sango-devnet`
 * (cf. `resolveSangoNetworkId`).
 *
 * D-REG-2 : un seul réseau enregistré (SANGO_DEVNET). Aucune
 * constante placeholder.
 */
interface WalletSessionProviderProps {
  children: ReactNode;
}

export function WalletSessionProvider({ children }: WalletSessionProviderProps) {
  const wallet = useWalletStore((s) => s.wallet);
  const status = useWalletStore((s) => s.status);
  const endpoint = useSdkStore((s) => s.endpoint);

  const session = useMemo<WalletSession | null>(() => {
    if (status !== "unlocked" || !wallet) return null;

    const rpc = new SangoRpcClient(endpoint);
    const signer = signerFromWallet(wallet);

    const chainRegistry = createChainRegistry();
    chainRegistry.register(SANGO_DEVNET, (network) =>
      sangoAdapterFactory(network as SangoNetwork, { rpc, signer }),
    );

    const assets = new InMemoryAssetList();
    assets.register(SANGO_NATIVE_ASSET);

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

import { SangoRpcClient } from "@sango/rpc";
import {
  ALL_BITCOIN_NETWORKS,
  ALL_EVM_NETWORKS,
  SANGO_DEVNET,
  bitcoinAdapterFactory,
  createChainRegistry,
  evmAdapterFactory,
  sangoAdapterFactory,
  type SangoNetwork,
  BitcoinChangeAddressProviderImpl,
} from "@sango/wallet-chains";
import { Bip39Wallet, Wallet } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";

/**
 * Union locale — `@sango/wallet-core` n'exporte pas d'alias commun.
 * (Le store exporte déjà `AnyWallet` mais on évite la dépendance
 * circulaire `lib/ → stores/`.)
 */
type AnyWallet = Wallet | Bip39Wallet;
import {
  InMemoryAccountList,
  InMemoryAssetList,
  SANGO_NATIVE_ASSET,
  ETH_NATIVE_ASSET,
  BNB_NATIVE_ASSET,
  BTC_NATIVE_ASSET,
  createWalletSession,
  signerFromAnyWallet,
  type WalletSession,
} from "@sango/wallet-session";
import {
  EtherscanIndexer,
  MempoolSpaceRpc,
  createRpcPool,
  EvmRpcUsingPool,
} from "@sango/wallet-providers";

import { ETHERSCAN_API_KEY } from "@/lib/config";

/**
 * Construit une `WalletSession` pour un wallet donné.
 *
 * **Phase 4** — extrait du `WalletSessionProvider` sans modification :
 * sert au provider (wallet actif) ET au hook `useUnifiedAssets()`
 * (sessions secondaires pour les wallets non-actifs).
 *
 * Le signer est multi-courbe (D-SIGNER-1) : `signerFromAnyWallet`
 * route selon le type concret du wallet.
 *
 * D-RPC-3 : chaque réseau EVM a son propre `RpcPool` déterministe.
 * D-INDEXER-1/2 : l'indexer Etherscan V2 est conditionnel à la clé.
 * D-SESS-5 : la session n'est pas reconstruite au changement de réseau
 *           sélectionné (le réseau cible vit dans `AccountRef.networkId`).
 */
export function buildWalletSession(
  wallet: AnyWallet,
  endpoint: string,
): WalletSession {
  const signer = signerFromAnyWallet(wallet);
  const chainRegistry = createChainRegistry();

  // ── SANGO (legacy Ed25519) ───────────────────────────────
  const sangoRpc = new SangoRpcClient(endpoint);
  chainRegistry.register(SANGO_DEVNET, (network) =>
    sangoAdapterFactory(network as SangoNetwork, { rpc: sangoRpc, signer }),
  );

  // ── EVM ──────────────────────────────────────────────────
  for (const network of ALL_EVM_NETWORKS) {
    const pool = createRpcPool();
    pool.register(
      network.id,
      network.defaultRpcEndpoints.map((url, i) => ({ url, priority: i })),
    );
    const evmRpc = new EvmRpcUsingPool(pool, network.id);
    const chainId = Number.parseInt(network.chainId, 16);

    const indexer = ETHERSCAN_API_KEY
      ? new EtherscanIndexer({ apiKey: ETHERSCAN_API_KEY, chainId })
      : undefined;

    chainRegistry.register(network, () =>
      evmAdapterFactory(network, { rpc: evmRpc, signer, chainId, indexer }),
    );
  }

  // ── Bitcoin (uniquement si BIP-39) ───────────────────────
  if (wallet instanceof Bip39Wallet) {
    for (const btcNetwork of ALL_BITCOIN_NETWORKS) {
      const btcFamily: BitcoinNetwork = btcNetwork.isTestnet
        ? "testnet"
        : "mainnet";
      const mempoolRpc = new MempoolSpaceRpc({
        baseUrl: btcNetwork.defaultRpcEndpoints[0]!,
      });
      const changeProvider = new BitcoinChangeAddressProviderImpl(
        wallet,
        btcFamily,
        btcNetwork.id,
      );
      chainRegistry.register(btcNetwork, (network) =>
        bitcoinAdapterFactory(network, {
          rpc: mempoolRpc,
          changeProvider,
          btcNetwork: btcFamily,
          // Patch A.1 — nécessaire pour dériver l'adresse de
          // réception BIP-84 via `addressProvider`.
          wallet,
        }),
      );
    }
  }

  // ── Assets ───────────────────────────────────────────────
  const assets = new InMemoryAssetList();
  assets.register(SANGO_NATIVE_ASSET);
  assets.register(ETH_NATIVE_ASSET);
  assets.register(BNB_NATIVE_ASSET);
  assets.register(BTC_NATIVE_ASSET);

  return createWalletSession({
    chainRegistry,
    signer,
    accounts: new InMemoryAccountList(),
    assets,
  });
}

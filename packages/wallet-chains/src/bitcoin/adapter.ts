import type { Bip39Wallet, BitcoinNetwork } from "@sango/wallet-core";

import type { Address } from "../types/address";
import type { ChainAdapter } from "../registry/chain-adapter";
import type { Network } from "../types/network";
import { BitcoinBalanceProvider } from "./balance-provider";
import { BitcoinBroadcaster } from "./broadcaster";
import type { BitcoinChangeAddressProvider } from "./change-address-provider";
import { BitcoinFeeRateProvider } from "./fee-rate-provider";
import { BitcoinHistoryProvider } from "./history-provider";
import type { BitcoinRpc } from "./rpc";
import { BitcoinTransactionBuilder } from "./transaction-builder";
import { BitcoinTransactionSigner } from "./transaction-signer";
import { BitcoinUtxoProvider } from "./utxo-provider";

/**
 * Dépendances injectées à l'adaptateur Bitcoin (E2.1.b.5).
 *
 * **Architecture** (D-E2.1-17) :
 *   - `rpc`      : interface structurelle (impl. `MempoolSpaceRpc` dans
 *                  wallet-providers). Pas de JSON-RPC, REST Esplora.
 *   - `changeProvider` : fournit l'adresse change + gère le compteur
 *                  `nextChangeIndex`. C'est le broadcaster qui commit.
 *   - `network`  : `BitcoinNetwork` (`mainnet` / `testnet`).
 *
 * **Pas de `Signer` ici** : le signer n'est utilisé qu'au moment de
 * `session.sign()` — l'adapter ne le stocke pas. Même logique que
 * SANGO / EVM.
 */
export interface BitcoinAdapterDeps {
  readonly rpc: BitcoinRpc;
  readonly changeProvider: BitcoinChangeAddressProvider;
  readonly btcNetwork: BitcoinNetwork;
  /**
   * **Patch A.1** — requis pour dériver l'adresse de **réception**
   * (`m/84'/…/0/{accountIndex}`) via `addressProvider`. Le change
   * provider détient déjà une instance, mais on rend la dépendance
   * explicite pour ne pas la cacher.
   */
  readonly wallet: Bip39Wallet;
}

/**
 * Fabrique l'adaptateur Bitcoin complet (E2.1.b.5).
 *
 * Capacités exposées :
 *   - balanceProvider     : Σ UTXO.value (BitcoinBalanceProvider)
 *   - transactionBuilder  : P2WPKH build-only (b.3)
 *   - transactionSigner   : BIP-143 / DER (b.4)
 *   - broadcaster         : POST /tx + commit change (b.5)
 *
 * Capacités exposées (E2.1.b.6.3) :
 *   - feeRateProvider : taux Fast/Normal/Slow (sats/vbyte) pour le
 *     sélecteur de priorité côté UI.
 *
 * Capacités ABSENTES (non applicables / reportées) :
 *   - addressProvider   : implémenté en patch A.1 (dérivation BIP-84
 *                         via `Bip39Wallet.getBitcoinIdentity`).
 *   - accountProvider   : Bitcoin n'a pas d'`AccountState` (D-E2.1-9,
 *                         l'invariant UTXO-native). À introduire
 *                         séparément si nécessaire.
 *   - feeEstimator      : le fee rate vient du `BitcoinFeeRateProvider`
 *                         + choix utilisateur. Le builder reçoit un
 *                         `feeRate` explicite.
 *   - historyProvider   : implémenté en patch A.2 (Esplora /txs).
 *   - tokenProvider     : N/A (pas de tokens sur Bitcoin natif).
 *   - stakingProvider   : N/A.
 *   - txDetailProvider  : N/A.
 */
export function bitcoinAdapterFactory(
  network: Network,
  deps: BitcoinAdapterDeps,
): ChainAdapter {
  if (network.family !== "bitcoin") {
    throw new Error(
      `bitcoinAdapterFactory: expected family "bitcoin", got "${network.family}"`,
    );
  }

  const utxoProvider = new BitcoinUtxoProvider(deps.rpc);

  return {
    network,
    balanceProvider: new BitcoinBalanceProvider(utxoProvider, network.id),
    // Patch A.1 — implémentation réelle. Dérive l'adresse P2WPKH
    // BIP-84 `m/84'/coinType'/0'/0/{accountIndex}` (branche receive).
    addressProvider: {
      async deriveAddress(account) {
        if (account.networkId !== network.id) {
          throw new Error(
            `Bitcoin adapter: account.networkId="${account.networkId}" does not match adapter network "${network.id}"`,
          );
        }
        const identity = deps.wallet.getBitcoinIdentity(
          deps.btcNetwork,
          0,
          account.accountIndex,
        );
        return identity.address as Address;
      },
      validateAddress(address) {
        return network.isTestnet
          ? address.startsWith("tb1")
          : address.startsWith("bc1");
      },
    },
    // Patch A.2 — historique réel via Esplora `/address/{addr}/txs`.
    // Le provider calcule le delta net (D3·A) et résout le
    // counterparty (D8·B).
    historyProvider: new BitcoinHistoryProvider(deps.rpc, network.id),
    transactionBuilder: new BitcoinTransactionBuilder(
      {
        utxoProvider,
        changeAddressProvider: deps.changeProvider,
      },
      network.id,
      deps.btcNetwork,
    ),
    transactionSigner: new BitcoinTransactionSigner(),
    broadcaster: new BitcoinBroadcaster(deps.rpc, deps.changeProvider),
    feeRateProvider: new BitcoinFeeRateProvider(deps.rpc),
  };
}

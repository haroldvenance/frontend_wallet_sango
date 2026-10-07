import type { BitcoinNetwork } from "@sango/wallet-core";

import type { ChainAdapter } from "../registry/chain-adapter";
import type { Network } from "../types/network";
import { BitcoinBalanceProvider } from "./balance-provider";
import { BitcoinBroadcaster } from "./broadcaster";
import type { BitcoinChangeAddressProvider } from "./change-address-provider";
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
 * Capacités ABSENTES (non applicables / reportées) :
 *   - addressProvider   : Bitcoin n'a pas d'`AddressProvider` uniforme
 *                         (dérivation BIP-84 dans wallet-core).
 *                         À introduire si l'UI en a besoin.
 *   - accountProvider   : Bitcoin n'a pas d'`AccountState` (D-E2.1-9,
 *                         l'invariant UTXO-native). À introduire
 *                         séparément si nécessaire.
 *   - feeEstimator      : le fee rate vient du `BitcoinFeeRateProvider`
 *                         + choix utilisateur. Le builder reçoit un
 *                         `feeRate` explicite.
 *   - historyProvider   : pas d'indexer configuré en E2.1.b.5.
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
    // Placeholder : ChainAdapter exige un addressProvider. Bitcoin
    // n'en a pas — on lève clairement si jamais quelqu'un l'appelle.
    addressProvider: {
      async deriveAddress(): Promise<never> {
        throw new Error(
          "Bitcoin adapter: no addressProvider. Bitcoin addresses are derived via wallet-core (BIP-84).",
        );
      },
      validateAddress(): boolean {
        return false;
      },
    },
    // Placeholder : même chose pour history.
    historyProvider: {
      async getHistory() {
        return { total: 0, items: [] };
      },
    },
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
  };
}

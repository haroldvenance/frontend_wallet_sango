import { Transaction, TEST_NETWORK, NETWORK } from "@scure/btc-signer";
import type { BTC_NETWORK } from "@scure/btc-signer/utils.js";
import { scriptPubKeyFromP2WPKHAddress } from "@sango/wallet-core";
import type { BitcoinNetwork } from "@sango/wallet-core";

import type {
  SendParams,
  TransactionBuilder,
} from "../capabilities/transaction-builder";
import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type {
  TxMeta,
  UnsignedTransaction as ChainsUnsignedTx,
} from "../types/tx";
import type {
  BitcoinChangeAddress,
  BitcoinChangeAddressProvider,
} from "./change-address-provider";
import { BITCOIN_NATIVE_ASSET_ID } from "./constants";
import type { Utxo } from "./rpc";
import type { BitcoinUtxoProvider } from "./utxo-provider";
import { selectUtxosGreedy } from "./utxo-selector";

/**
 * Construction d'une transaction Bitcoin P2WPKH non signée — E2.1.b.3.
 *
 * **D-E2.1-13** — Le payload produit est une instance
 * `@scure/btc-signer.Transaction` (PSBT-compatible) déjà peuplée avec
 * inputs + outputs + witnessUtxo metadata. Le signer (b.4) opérera
 * dessus via `preimageWitnessV0` + `updateInput` + `finalizeIdx`
 * (D-E2.1-9) — on n'utilise PAS `tx.signIdx`.
 *
 * **Ce que le builder NE fait PAS** :
 *   - Aucune signature (b.4).
 *   - Aucun appel réseau direct : UTXOs et change viennent de
 *     providers injectés.
 *   - Aucun accès au seed : le change est fourni par le
 *     `BitcoinChangeAddressProvider` (b.5 l'implémente).
 *
 * **Invariant** : aucun appel à `changeAddressProvider.commit()` ici.
 * Le commit n'a lieu qu'après broadcast réussi (D-E2.1-3), et c'est
 * le `BitcoinBroadcaster` qui l'orchestre (b.5).
 */

export interface BitcoinTransactionBuilderDeps {
  readonly utxoProvider: BitcoinUtxoProvider;
  readonly changeAddressProvider: BitcoinChangeAddressProvider;
}

/**
 * Payload exposé dans `ChainsUnsignedTx.payload`.
 *
 * Le signer (b.4) le cast vers ce type. Le broadcaster (b.5) utilise
 * `hasChange` pour savoir s'il doit appeler `commit()`.
 */
export interface BitcoinUnsignedPayload {
  /** Instance PSBT-like de @scure/btc-signer. */
  readonly tx: Transaction;
  /** Adresse change utilisée (null si aucun change). */
  readonly changeAddress: BitcoinChangeAddress | null;
  /** Frais calculés (sats). */
  readonly fee: bigint;
  /** Taux de frais utilisé (sats/vbyte). */
  readonly feeRate: bigint;
  /** UTXOs dépensés (pour debug / réconciliation). */
  readonly spentUtxos: readonly Utxo[];
}

export class BitcoinTransactionBuilder implements TransactionBuilder {
  readonly #utxoProvider: BitcoinUtxoProvider;
  readonly #changeProvider: BitcoinChangeAddressProvider;
  readonly #networkId: string;
  readonly #btcNetwork: BitcoinNetwork;

  constructor(
    deps: BitcoinTransactionBuilderDeps,
    networkId: string,
    btcNetwork: BitcoinNetwork,
  ) {
    this.#utxoProvider = deps.utxoProvider;
    this.#changeProvider = deps.changeAddressProvider;
    this.#networkId = networkId;
    this.#btcNetwork = btcNetwork;
  }

  async build(
    params: SendParams,
    sender: Address,
  ): Promise<ChainsUnsignedTx> {
    if (params.kind !== "transferBitcoin") {
      throw new Error(
        `BitcoinTransactionBuilder: unsupported kind "${params.kind}" (expected "transferBitcoin")`,
      );
    }

    const { to, amount, feeRate, assetRef } = params;

    // 1. Validation assetRef + réseau.
    assertNativeBitcoin(assetRef, this.#networkId);

    // 2. Validation montant.
    if (amount <= 0n) {
      throw new Error(
        `BitcoinTransactionBuilder: amount must be > 0 (got ${amount})`,
      );
    }
    if (feeRate < 1n) {
      throw new Error(
        `BitcoinTransactionBuilder: feeRate must be ≥ 1 sat/vB (got ${feeRate})`,
      );
    }

    // 3. Le réseau de `to` doit correspondre à celui du builder.
    assertAddressNetwork(to, this.#btcNetwork);

    // 4. Fetch UTXOs du sender.
    const utxos = await this.#utxoProvider.getUtxos(sender);
    if (utxos.length === 0) {
      throw new Error(
        "BitcoinTransactionBuilder: no spendable UTXOs for sender",
      );
    }

    // 5. Sélection gloutonne.
    const selection = selectUtxosGreedy(utxos, amount, feeRate);

    // 6. Script de l'input (déduit de l'adresse sender).
    const senderScript = scriptPubKeyFromP2WPKHAddress(sender);

    // 7. Réservation d'adresse change (sans commit — D-E2.1-3).
    //    L'adresse porte son `derivationIndex` explicite (E2.1.b.5),
    //    ce qui permettra au broadcaster de commit sans parsing.
    let changeAddress: BitcoinChangeAddress | null = null;
    if (selection.hasChange) {
      changeAddress = await this.#changeProvider.getChangeAddress();
      assertAddressNetwork(changeAddress.address, this.#btcNetwork);
    }

    // 8. Construction de la Transaction @scure/btc-signer.
    const tx = new Transaction();

    for (const utxo of selection.inputs) {
      tx.addInput({
        txid: hexToBytes(utxo.txid),
        index: utxo.vout,
        witnessUtxo: {
          amount: utxo.value,
          script: senderScript,
        },
      });
    }

    tx.addOutputAddress(to, amount, this.#btcNetworkToScure());

    if (changeAddress) {
      tx.addOutputAddress(
        changeAddress.address,
        selection.change,
        this.#btcNetworkToScure(),
      );
    }

    // 9. Meta lisible.
    const meta: TxMeta = {
      from: sender,
      to,
      assetRef,
      amount,
    };

    const payload: BitcoinUnsignedPayload = {
      tx,
      changeAddress,
      fee: selection.fee,
      feeRate,
      spentUtxos: selection.inputs,
    };

    return {
      family: "bitcoin",
      networkId: this.#networkId,
      payload,
      meta,
    };
  }

  #btcNetworkToScure(): BTC_NETWORK {
    return this.#btcNetwork === "mainnet" ? NETWORK : TEST_NETWORK;
  }
}

// ── Helpers ────────────────────────────────────────────────

function assertNativeBitcoin(assetRef: AssetRef, networkId: string): void {
  if (assetRef.kind !== "native") {
    throw new Error(
      `BitcoinTransactionBuilder: only native BTC supported (got kind="${assetRef.kind}")`,
    );
  }
  if (assetRef.assetId !== BITCOIN_NATIVE_ASSET_ID) {
    throw new Error(
      `BitcoinTransactionBuilder: unsupported asset "${assetRef.assetId}" (expected "${BITCOIN_NATIVE_ASSET_ID}")`,
    );
  }
  if (assetRef.networkId !== networkId) {
    throw new Error(
      `BitcoinTransactionBuilder: network mismatch (expected "${networkId}", got "${assetRef.networkId}")`,
    );
  }
}

function assertAddressNetwork(
  address: string,
  expected: BitcoinNetwork,
): void {
  const isTestnet = address.startsWith("tb1");
  const isMainnet = address.startsWith("bc1");
  if (!isTestnet && !isMainnet) {
    throw new Error(
      `BitcoinTransactionBuilder: address "${address.slice(0, 8)}…" is not a recognized P2WPKH address`,
    );
  }
  const addressNetwork: BitcoinNetwork = isTestnet ? "testnet" : "mainnet";
  if (addressNetwork !== expected) {
    throw new Error(
      `BitcoinTransactionBuilder: address network "${addressNetwork}" does not match builder network "${expected}"`,
    );
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`hexToBytes: odd length (${hex.length})`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

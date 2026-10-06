import type { BalanceProvider } from "../capabilities/balance-provider";
import type { Address } from "../types/address";
import type { AssetRef } from "../types/asset";
import type { Balance } from "../types/balance";
import { BITCOIN_DECIMALS, BITCOIN_NATIVE_ASSET_ID } from "./constants";
import type { BitcoinUtxoProvider } from "./utxo-provider";

/**
 * Solde Bitcoin = somme des UTXOs dépensables (E2.1.b.2).
 *
 * **D-E2.1-8** — `BitcoinBalanceProvider` **implémente l'interface
 * universelle** `BalanceProvider`. C'est légitime : un solde natif
 * (assetId + networkId + amount + decimals) a un sens en Bitcoin,
 * même si le modèle sous-jacent (UTXO) est différent d'EVM (compte).
 *
 * ⚠️ Ne pas confondre avec `BitcoinAccountState` (qui inclut les
 *    UTXOs bruts, défini dans wallet-session, D-E2.1-9). Ce provider
 *    n'expose que la **somme**, à l'image d'EVM.
 *
 * **Filtres appliqués** : `BitcoinUtxoProvider` écarte déjà les
 * outputs dust (`value === 0`). On somme donc tous les UTXOs
 * retournés, confirmés ou non (les UTXOs mempool sont utilisables
 * pour envoyer).
 */
export class BitcoinBalanceProvider implements BalanceProvider {
  readonly #utxoProvider: BitcoinUtxoProvider;
  readonly #networkId: string;

  constructor(utxoProvider: BitcoinUtxoProvider, networkId: string) {
    this.#utxoProvider = utxoProvider;
    this.#networkId = networkId;
  }

  async getBalance(address: Address, assetRef: AssetRef): Promise<Balance> {
    assertNativeBitcoin(assetRef, this.#networkId);

    const utxos = await this.#utxoProvider.getUtxos(address);
    const total = utxos.reduce((sum, u) => sum + u.value, 0n);

    return {
      assetId: BITCOIN_NATIVE_ASSET_ID,
      networkId: this.#networkId,
      amount: total,
      decimals: BITCOIN_DECIMALS,
    };
  }
}

function assertNativeBitcoin(assetRef: AssetRef, networkId: string): void {
  if (assetRef.kind !== "native") {
    throw new Error(
      `BitcoinBalanceProvider: only native BTC supported (got kind="${assetRef.kind}")`,
    );
  }
  if (assetRef.assetId !== BITCOIN_NATIVE_ASSET_ID) {
    throw new Error(
      `BitcoinBalanceProvider: unsupported asset "${assetRef.assetId}" (expected "${BITCOIN_NATIVE_ASSET_ID}")`,
    );
  }
  if (assetRef.networkId !== networkId) {
    throw new Error(
      `BitcoinBalanceProvider: network mismatch (expected "${networkId}", got "${assetRef.networkId}")`,
    );
  }
}

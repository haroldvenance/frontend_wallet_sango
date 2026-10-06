import type { BitcoinRpc, Utxo } from "./rpc";

/**
 * Accès aux UTXOs d'une adresse Bitcoin (E2.1.b.2).
 *
 * **D-E2.1-6** — `BitcoinUtxoProvider` est un fin wrapper au-dessus de
 * `BitcoinRpc`. Son rôle est double :
 *
 *   1. **Point d'injection** : `BitcoinBalanceProvider` et
 *      (b.3) `BitcoinTransactionBuilder` dépendent du provider, pas
 *      directement du RPC. On peut remplacer mempool.space par
 *      Esplora/Blockstream/nœud Core sans toucher au reste.
 *
 *   2. **Validation minimale** : on vérifie la forme des UTXOs
 *      retournés (txid 64 hex, value > 0) avant de les propager aux
 *      couches supérieures. Un RPC bogué ne doit pas produire de
 *      transaction silencieusement incorrecte.
 *
 * Contrairement à EVM, il n'y a **pas de notion de decimals ici** :
 * tout est en satoshis (entier).
 */
export class BitcoinUtxoProvider {
  readonly #rpc: BitcoinRpc;

  constructor(rpc: BitcoinRpc) {
    this.#rpc = rpc;
  }

  /**
   * Retourne les UTXOs d'une adresse, filtrés et validés.
   *
   * ⚠️ Les UTXOs avec `value === 0` sont **filtrés** : un output nul
   *    est une opcode `OP_RETURN` ou un dust output, jamais dépensable.
   *    mempool.space les remonte parfois ; on les ignore.
   */
  async getUtxos(address: string): Promise<readonly Utxo[]> {
    const raw = await this.#rpc.getUtxos(address);
    return raw.filter(isSpendableUtxo);
  }
}

const TXID_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 * Un UTXO est "spendable" s'il a un txid valide (64 hex), un vout
 * entier ≥ 0, et une valeur strictement positive.
 *
 * Les dust outputs (value = 0) et les formats exotiques sont écartés
 * silencieusement — c'est un cas normal, pas une erreur.
 */
function isSpendableUtxo(u: Utxo): boolean {
  return (
    TXID_REGEX.test(u.txid) &&
    Number.isInteger(u.vout) &&
    u.vout >= 0 &&
    u.value > 0n
  );
}

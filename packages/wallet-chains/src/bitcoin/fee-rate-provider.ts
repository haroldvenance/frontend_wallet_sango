import type { BitcoinFeeRates, BitcoinRpc } from "./rpc";

/**
 * Accès aux taux de frais Bitcoin (E2.1.b.2).
 *
 * **D-E2.1-7** — Séparé d'`UtxoProvider` : les frais et les UTXOs
 * sont deux problèmes orthogonaux. mempool.space les expose aujourd'hui
 * via le même backend, mais Esplora/Blockstream ou un nœud Core
 * pourraient ne fournir que l'un des deux.
 *
 * Le builder (E2.1.b.3) reçoit un **`feeRate` explicite** en entrée
 * (sats/vbyte), jamais un accès direct au provider. L'UI (E2.1.b.6)
 * utilisera ce provider pour proposer "Fast / Normal / Slow".
 *
 * Toute valeur invalide retournée par le RPC (0, négative, non
 * entière) est remplacée par un fallback conservateur.
 */
export class BitcoinFeeRateProvider {
  readonly #rpc: BitcoinRpc;

  constructor(rpc: BitcoinRpc) {
    this.#rpc = rpc;
  }

  /**
   * Retourne les taux de frais recommandés (sats/vbyte).
   *
   * **Fallback** : si une valeur est ≤ 0 (RPC bogué, testnet sans
   * trafic, réponse inattendue), on retombe sur un minimum de
   * 1 sat/vbyte. Un fee rate de 0 produirait une tx non relayée.
   */
  async getFeeRates(): Promise<BitcoinFeeRates> {
    const rates = await this.#rpc.getFeeRates();
    return {
      fast: sanitizeRate(rates.fast),
      normal: sanitizeRate(rates.normal),
      slow: sanitizeRate(rates.slow),
    };
  }
}

const MIN_FEE_RATE = 1n;

function sanitizeRate(rate: bigint): bigint {
  if (rate < MIN_FEE_RATE) return MIN_FEE_RATE;
  return rate;
}

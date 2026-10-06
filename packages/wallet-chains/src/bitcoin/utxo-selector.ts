import type { Utxo } from "./rpc";
import { BITCOIN_DUST_LIMIT, estimateP2WPKHVsize } from "./vsize";

/**
 * Sélection gloutonne décroissante (D-E2.1-11) — E2.1.b.3.
 *
 * **Algorithme** :
 *   1. Trier les UTXOs par valeur **décroissante**.
 *   2. Accumuler jusqu'à couvrir `target + fee + dust`.
 *   3. À chaque itération, tester **deux scénarios** :
 *      a. avec output change : si `total ≥ target + fee_with_change + DUST`
 *      b. sans output change : si `total ≥ target + fee_without_change`
 *   4. Retourner dès qu'un scénario est viable. Sinon, ajouter le
 *      prochain UTXO et recommencer.
 *
 * **Itération `select → vbytes → fee → reselect`** (demande user) :
 * chaque ajout d'input recalcule le fee à partir de la nouvelle
 * `vsize`, donc l'algorithme converge. Pas de fee fixe préjugée.
 *
 * **Déterminisme** : à entrées égales, résultat identique. Tri stable
 * en cas d'égalité de valeur (ordre d'entrée préservé).
 *
 * **Échec** : si tous les UTXOs sont épuisés et que la cible n'est
 * toujours pas couverte, throw `InsufficientFundsError`.
 */

export class InsufficientFundsError extends Error {
  readonly required: bigint;
  readonly available: bigint;
  readonly feeRate: bigint;

  constructor(required: bigint, available: bigint, feeRate: bigint) {
    super(
      `Insufficient funds: required ~${required} sats, available ${available} sats (fee rate ${feeRate} sat/vB)`,
    );
    this.name = "InsufficientFundsError";
    this.required = required;
    this.available = available;
    this.feeRate = feeRate;
  }
}

export interface UtxoSelectionResult {
  readonly inputs: readonly Utxo[];
  /** Frais calculés (sats). */
  readonly fee: bigint;
  /** Change rendu au wallet (sats). `0n` si absorbé dans les frais. */
  readonly change: bigint;
  /** Vrai si un output change est nécessaire. */
  readonly hasChange: boolean;
  /** Vsize estimée de la tx finale. */
  readonly vsize: number;
}

export function selectUtxosGreedy(
  utxos: readonly Utxo[],
  target: bigint,
  feeRate: bigint,
): UtxoSelectionResult {
  if (target <= 0n) {
    throw new Error("selectUtxosGreedy: target must be > 0");
  }
  if (feeRate < 1n) {
    throw new Error("selectUtxosGreedy: feeRate must be ≥ 1 sat/vB");
  }

  // Tri décroissant stable (Array.prototype.sort est stable en ES2019+).
  const sorted = [...utxos].sort((a, b) =>
    a.value > b.value ? -1 : a.value < b.value ? 1 : 0,
  );

  const selected: Utxo[] = [];
  let total = 0n;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;

    const n = selected.length;

    // Scénario 1 : avec change (2 outputs).
    const vsizeWithChange = estimateP2WPKHVsize(n, 2);
    const feeWithChange = BigInt(vsizeWithChange) * feeRate;
    const changeIfWith = total - target - feeWithChange;
    if (changeIfWith >= BITCOIN_DUST_LIMIT) {
      return {
        inputs: selected,
        fee: feeWithChange,
        change: changeIfWith,
        hasChange: true,
        vsize: vsizeWithChange,
      };
    }

    // Scénario 2 : sans change (1 output) — le surplus va aux frais.
    const vsizeNoChange = estimateP2WPKHVsize(n, 1);
    const feeNoChange = BigInt(vsizeNoChange) * feeRate;
    if (total >= target + feeNoChange) {
      // Absorber le surplus restant dans les frais : c'est le cas
      // où le change calculé serait < DUST, donc non économique.
      const effectiveFee = total - target;
      return {
        inputs: selected,
        fee: effectiveFee,
        change: 0n,
        hasChange: false,
        vsize: vsizeNoChange,
      };
    }

    // Sinon, continuer l'accumulation.
  }

  const totalAvailable = sorted.reduce((s, u) => s + u.value, 0n);
  // "required" pour le message d'erreur : montant cible + une fee
  // indicative avec tous les UTXOs en inputs.
  const fullVsize = estimateP2WPKHVsize(sorted.length || 1, 1);
  const required = target + BigInt(fullVsize) * feeRate;
  throw new InsufficientFundsError(required, totalAvailable, feeRate);
}

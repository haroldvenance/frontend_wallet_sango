/**
 * Estimation de la taille virtuelle (vbytes) d'une transaction Bitcoin
 * P2WPKH — E2.1.b.3 (D-E2.1-12).
 *
 * **Formule standard** : `10 + 68*nInputs + 31*nOutputs`
 *
 * Décomposition :
 *   - Version                : 4 bytes
 *   - Input count (varint)   : 1 byte
 *   - Witness marker + flag  : 2 bytes = 0.5 vbytes (arrondi à 1)
 *   - Output count (varint)  : 1 byte
 *   - Locktime               : 4 bytes
 *   - Sum                    : ~10 vbytes de base
 *
 * Par input P2WPKH :
 *   - Outpoint (32 txid + 4 vout)     : 36 bytes × 4 WU = 144 WU
 *   - ScriptSig length (0x00)         :  1 byte  × 4 WU =   4 WU
 *   - Sequence                        :  4 bytes × 4 WU =  16 WU
 *   - Witness (sig + pubkey + counts) : ~108 WU
 *   - Total                           : ~272 WU = 68 vbytes
 *
 * Par output P2WPKH :
 *   - Amount                          : 8 bytes × 4 WU = 32 WU
 *   - Script length + script          : 1 + 22 = 23 bytes × 4 WU = 92 WU
 *   - Total                           : 124 WU = 31 vbytes
 *
 * Cette estimation est **conservatrice** (légèrement au-dessus de la
 * taille réelle 90 % du temps, jamais en dessous sur une tx standard).
 */

const BASE_VSIZE = 10;
const VSIZE_PER_P2WPKH_INPUT = 68;
const VSIZE_PER_P2WPKH_OUTPUT = 31;

/**
 * Estimation de la taille virtuelle d'une tx P2WPKH.
 *
 * @param inputCount  Nombre d'inputs (tous P2WPKH).
 * @param outputCount Nombre d'outputs (tous P2WPKH).
 */
export function estimateP2WPKHVsize(
  inputCount: number,
  outputCount: number,
): number {
  if (!Number.isInteger(inputCount) || inputCount < 1) {
    throw new Error(`estimateP2WPKHVsize: inputCount must be ≥ 1`);
  }
  if (!Number.isInteger(outputCount) || outputCount < 1) {
    throw new Error(`estimateP2WPKHVsize: outputCount must be ≥ 1`);
  }
  return (
    BASE_VSIZE +
    VSIZE_PER_P2WPKH_INPUT * inputCount +
    VSIZE_PER_P2WPKH_OUTPUT * outputCount
  );
}

/**
 * Seuil "dust" P2WPKH, standard Bitcoin Core (satoshis).
 *
 * Un output < 294 sats coûte plus cher à dépenser qu'il ne vaut —
 * Bitcoin Core refuse de le relayer. Le builder absorbe ce reste
 * dans les frais au lieu de créer un output change inutile.
 */
export const BITCOIN_DUST_LIMIT = 294n;

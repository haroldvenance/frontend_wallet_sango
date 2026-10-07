import type { Broadcaster } from "../capabilities/broadcaster";
import type { SignedTransaction } from "../types/tx";
import type { BitcoinChangeAddressProvider } from "./change-address-provider";
import type { BitcoinRpc } from "./rpc";
import type { BitcoinUnsignedPayload } from "./transaction-builder";

/**
 * Broadcast Bitcoin via Esplora (E2.1.b.5).
 *
 * **D-E2.1-3** — c'est le broadcaster qui appelle `commit()` sur le
 * change provider **après un POST /tx réussi** :
 *
 * ```
 *   broadcast(signed)
 *     ├── POST /tx (rawHex)
 *     ├── succès → commit(changeDerivationIndex)  ← D-E2.1-3
 *     └── échec  → aucun commit (index non consommé)
 * ```
 *
 * **Pourquoi le broadcaster** (et pas le builder) : c'est le seul
 * endroit où "le réseau a accepté la tx" est vrai. Le builder ne
 * peut que *réserver* un index (via `getChangeAddress()` sans
 * commit). Le commit doit être couplé à la preuve de succès réseau.
 *
 * **Pas de signer ici** : le broadcaster reçoit une `SignedTransaction`
 * déjà finalisée. Il n'a besoin ni du `Signer`, ni de l'`AccountRef`,
 * ni d'aucune courbe. La séparation des responsabilités reste nette.
 */
export class BitcoinBroadcaster implements Broadcaster {
  readonly #rpc: BitcoinRpc;
  readonly #changeProvider: BitcoinChangeAddressProvider;

  constructor(
    rpc: BitcoinRpc,
    changeProvider: BitcoinChangeAddressProvider,
  ) {
    this.#rpc = rpc;
    this.#changeProvider = changeProvider;
  }

  async broadcast(tx: SignedTransaction): Promise<string> {
    const rawHex = bytesToHexNoPrefix(tx.raw);
    const txHash = await this.#rpc.broadcastTx(rawHex);

    // Commit change UNIQUEMENT après succès du POST /tx.
    // Le payload porte `changeAddress.derivationIndex` explicitement
    // (E2.1.b.5) — pas de parsing d'adresse.
    if (tx.unsigned.family === "bitcoin") {
      const payload = tx.unsigned.payload as BitcoinUnsignedPayload;
      if (payload.changeAddress !== null) {
        this.#changeProvider.commit(payload.changeAddress.derivationIndex);
      }
    }

    return txHash;
  }
}

function bytesToHexNoPrefix(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

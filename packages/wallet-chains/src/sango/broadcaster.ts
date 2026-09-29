import type { Broadcaster } from "../capabilities/broadcaster";
import type { SignedTransaction } from "../types/tx";
import { bytesToHex } from "./hex";
import type { SangoRpc } from "./rpc";

/**
 * Broadcast via `sango_sendTransaction`.
 *
 * Le hash retourné est celui calculé par le nœud. Il doit être
 * identique au `signed.txHash` calculé localement (cf. test e2e
 * `sango-rpc/src/e2e.devnet.test.ts`).
 */
export class SangoBroadcaster implements Broadcaster {
  readonly #rpc: SangoRpc;

  constructor(rpc: SangoRpc) {
    this.#rpc = rpc;
  }

  async broadcast(tx: SignedTransaction): Promise<string> {
    const fullHex = bytesToHex(tx.raw);
    return this.#rpc.sendTransaction(fullHex);
  }
}

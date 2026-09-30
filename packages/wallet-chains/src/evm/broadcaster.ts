import type { Broadcaster } from "../capabilities/broadcaster";
import type { Hash } from "../types/address";
import type { SignedTransaction } from "../types/tx";
import type { EvmRpc } from "./rpc";

/**
 * Broadcast via `eth_sendRawTransaction`.
 *
 * Le hash retourné est celui calculé par le nœud — il doit être
 * identique à `signed.txHash` calculé localement (test de gel EVM).
 */
export class EvmBroadcaster implements Broadcaster {
  readonly #rpc: EvmRpc;

  constructor(rpc: EvmRpc) {
    this.#rpc = rpc;
  }

  async broadcast(tx: SignedTransaction): Promise<string> {
    const raw = bytesToHex(tx.raw);
    const hash = await this.#rpc.sendRawTransaction(raw);
    return hash;
  }
}

function bytesToHex(bytes: Uint8Array): Hash {
  let s = "0x";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s as Hash;
}

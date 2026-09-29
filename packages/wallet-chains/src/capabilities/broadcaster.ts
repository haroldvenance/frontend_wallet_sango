import type { SignedTransaction } from "../types/tx";

/**
 * Capacité optionnelle : broadcaster une transaction signée.
 */
export interface Broadcaster {
  broadcast(tx: SignedTransaction): Promise<string>;
}

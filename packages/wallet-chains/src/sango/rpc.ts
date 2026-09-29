/**
 * Interface structurelle minimale du client RPC SANGO.
 *
 * Elle reprend uniquement les méthodes utilisées par les providers
 * SANGO. `SangoRpcClient` (de `@sango/rpc`) la satisfait
 * **structurellement**, sans import ni modification.
 *
 * D-RPC-1 (V0) : pas de `RpcPool` complet. Cette interface est le
 * point d'extension. Un vrai pool sera introduit lorsqu'un second
 * endpoint ou un failover réel sera nécessaire (V0.2+).
 */

export interface SangoRpcAccount {
  readonly address: string;
  readonly publicKey: string | null;
  readonly balance: string;
  readonly nonce: number;
}

export interface SangoRpcTx {
  readonly hash: string;
  readonly blockHeight: number | null;
  readonly blockHash: string | null;
  readonly txIndex: number | null;
  readonly kind: "native" | "evm";
  readonly nonce: number;
  readonly sender: string;
  readonly recipient: string | null;
  readonly value: string;
  readonly txKind: number;
  readonly gasLimit: number;
  readonly maxFee: string;
  readonly priorityFee: string;
  readonly data: string;
  readonly success: boolean;
  readonly gasUsed: number;
}

export interface SangoRpcTxPage {
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly items: readonly SangoRpcTx[];
}

export interface SangoRpc {
  getChainId(): Promise<string>;
  getAccount(address: string): Promise<SangoRpcAccount | null>;
  getBaseFee(): Promise<string>;
  getTransactionsByAddress(
    address: string,
    limit: number,
    offset: number,
  ): Promise<SangoRpcTxPage>;
  sendTransaction(fullHex: string): Promise<string>;
}

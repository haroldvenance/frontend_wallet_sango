/**
 * Interface structurelle minimale du client RPC SANGO.
 *
 * `SangoRpcClient` (de `@sango/rpc`) la satisfait **structurellement**,
 * sans import ni modification. La compat est vérifiée par
 * `sango/__tests__/rpc-compat.test.ts`.
 *
 * D-RPC-1 (V0) : pas de `RpcPool` complet. Cette interface est le
 * point d'extension.
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

/**
 * Types staking **structurellement compatibles** avec `wallet-chains/types/staking.ts`.
 * Redéclarés ici pour que `SangoRpcClient` (qui retourne les types de
 * `@sango/rpc`) satisfasse l'interface sans transformation.
 */
export interface SangoRpcValidatorInfo {
  readonly address: string;
  readonly publicKey: string;
  readonly selfStake: string;
  readonly totalDelegated: string;
  readonly votingPower: string;
  readonly commissionBps: number;
  readonly jailed: boolean;
  readonly pendingCommissionBps: number | null;
  readonly pendingCommissionAt: number | null;
  readonly jailedUntil: number | null;
  readonly downtimeWindowStart: number;
  readonly downtimeMissed: number;
}

export interface SangoRpcDelegation {
  readonly delegator: string;
  readonly validator: string;
  readonly bonded: string;
  readonly unbonding: string;
  readonly unbondingUntil: number | null;
  readonly pendingRewards: string;
}

export interface SangoRpcPendingUnbonding {
  readonly id: number;
  readonly delegator: string;
  readonly validator: string;
  readonly amount: string;
  readonly matureAt: number;
}

export interface SangoRpc {
  // Compte / tx
  getChainId(): Promise<string>;
  getAccount(address: string): Promise<SangoRpcAccount | null>;
  getBaseFee(): Promise<string>;
  getTransactionsByAddress(
    address: string,
    limit: number,
    offset: number,
  ): Promise<SangoRpcTxPage>;
  sendTransaction(fullHex: string): Promise<string>;

  // Staking (lecture)
  getValidators(): Promise<SangoRpcValidatorInfo[]>;
  getValidatorInfo(address: string): Promise<SangoRpcValidatorInfo | null>;
  getDelegations(address: string): Promise<SangoRpcDelegation[]>;
  getPendingUnbondings(address: string): Promise<SangoRpcPendingUnbonding[]>;
}

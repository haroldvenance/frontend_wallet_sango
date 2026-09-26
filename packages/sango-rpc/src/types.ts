import type { AddressHex, ChainIdHex, PublicKeyHex } from "@sango/types";

export type { Hex } from "@sango/types";

/** Retour de `sango_chainInfo`. */
export interface ChainInfo {
  readonly chainId: ChainIdHex;
  readonly height: number | null;
  readonly validatorCount: number;
  readonly protocolVersion: number;
}

/** Retour de `sango_getAccount`. */
export interface Account {
  readonly address: AddressHex;
  readonly publicKey: PublicKeyHex | null;
  readonly balance: string;
  readonly nonce: number;
}

/** Options du client RPC. */
export interface SangoRpcClientOptions {
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
  readonly headers?: Record<string, string>;
}

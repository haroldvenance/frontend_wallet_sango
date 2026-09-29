import type { AssetId } from "./asset";

export interface TokenMetadata {
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
}

/**
 * Token déployé sur un réseau concret (ERC-20, SPL, etc.).
 */
export interface Token {
  readonly networkId: string;
  readonly contract: string;
  readonly assetId: AssetId;
  readonly metadata: TokenMetadata;
}

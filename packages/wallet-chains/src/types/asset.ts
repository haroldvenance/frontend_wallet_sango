/**
 * Identifiant canonique d'un asset (natif ou token).
 *
 * L'asset est indépendant du réseau : `"eth"` existe sur tous les
 * réseaux EVM, `"usdt"` existe sur Ethereum, Tron, Solana…
 */
export type AssetId = string;

export interface Asset {
  readonly id: AssetId;
  readonly symbol: string;
  readonly decimals: number;
  readonly kind: "native" | "token";
}

/**
 * Référence concrète à un asset sur un réseau donné.
 */
export type AssetRef =
  | {
      readonly kind: "native";
      readonly assetId: AssetId;
      readonly networkId: string;
    }
  | {
      readonly kind: "token";
      readonly networkId: string;
      readonly contract: string;
    };

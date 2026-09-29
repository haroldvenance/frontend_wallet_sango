/**
 * Famille de chaîne (protocole).
 *
 * Attention : ce n'est PAS un network. Ethereum mainnet et BSC sont
 * tous deux `"evm"`, mais ce sont des réseaux distincts.
 */
export type ChainFamily = "sango" | "evm" | "bitcoin" | "solana";

/**
 * Descripteur minimal d'une famille de chaîne.
 */
export interface ChainDescriptor {
  readonly family: ChainFamily;
  readonly displayName: string;
}

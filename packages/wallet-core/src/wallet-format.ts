/**
 * Format de wallet — discriminant de construction.
 *
 * **D-HD-1** — deux formats coexistent dans le codebase :
 *  - "sango-legacy" : seed Ed25519 brut (32 bytes), HRP bech32m SANGO.
 *  - "bip39"        : BIP-39 seed (64 bytes), BIP-44 multi-chaînes.
 *
 * Aucune migration automatique entre les deux. Le format est figé à
 * la création et ne change jamais pour un wallet donné.
 */
export type WalletFormat = "sango-legacy" | "bip39";

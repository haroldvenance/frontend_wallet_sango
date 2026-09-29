/**
 * Adresse opaque, sérialisée en string.
 *
 * Le format est spécifique à la chaîne :
 * - SANGO : bech32m (`tsango1…` / `sango1…`)
 * - EVM   : hex EIP-55 (`0x…`)
 * - BTC   : bech32 SegWit (`bc1…`)
 * - SOL   : base58
 *
 * Les chaînes ne doivent PAS parser une adresse d'une autre famille.
 * C'est le rôle de chaque `AddressProvider`.
 */
export type Address = string;

/**
 * Constantes Bitcoin partagées (E2.1.b.2).
 *
 * **D-E2.1-5** : Bitcoin a 8 décimales (1 satoshi = 10^-8 BTC). On
 * expose les constantes nommées pour éviter les `10n ** 8n` sauvages
 * dans les providers.
 *
 * L'`assetId` natif est `"btc"` (D-E1.7-2 étendue : pas de "tBTC").
 * Identique mainnet/testnet — l'asset décrit la chaîne, pas sa
 * variante.
 */

/** Identifiant canonique de l'asset natif Bitcoin. */
export const BITCOIN_NATIVE_ASSET_ID = "btc";

/** 8 décimales (satoshi = 10^-8 BTC). */
export const BITCOIN_DECIMALS = 8;

/** 1 BTC = 100 000 000 satoshis. */
export const SATOSHIS_PER_BTC = 100_000_000n;

import type { Network } from "@sango/types";

/**
 * Identifiant de réseau wallet-chains pour SANGO.
 *
 * En V0, un seul réseau est réellement utilisable : `sango-devnet`.
 */
export const SANGO_DEVNET_NETWORK_ID = "sango-devnet";

/**
 * Résout le `networkId` (wallet-chains) depuis un `Network`
 * (wallet-core : `"mainnet" | "testnet" | "devnet"`).
 *
 * ⚠️ LIMITATION V0 — à lire avant tout élargissement :
 *
 *   Le label `Network` de wallet-core est utilisé **uniquement** pour
 *   choisir le HRP Bech32m de l'adresse (`sango` vs `tsango`). Il ne
 *   présume pas de la disponibilité d'un endpoint.
 *
 *   Aucun réseau SANGO autre que le devnet n'étant déployé, les trois
 *   labels pointent vers `"sango-devnet"` :
 *
  *     resolveSangoNetworkId("testnet") → "sango-devnet"   // V0
 *     resolveSangoNetworkId("mainnet") → "sango-devnet"   // V0
 *
 *   Quand SANGO_TESTNET / SANGO_MAINNET seront enregistrés dans le
 *   registry avec leurs endpoints, **ce fichier est le seul à
 *   modifier** — aucun hook, aucun composant.
 */
export function resolveSangoNetworkId(network: Network): string {
  // V0 : mapping trivial, uniforme, volontairement explicite.
  void network;
  return SANGO_DEVNET_NETWORK_ID;
}

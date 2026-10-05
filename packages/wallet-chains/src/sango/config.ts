import type { Network } from "../types/network";

export const SANGO_NATIVE_ASSET_ID = "sango";

/** 1 SANGO = 10 000 000 base units (wallet-core BASE_UNITS_PER_SANGO). */
export const SANGO_DECIMALS = 7;

/**
 * ChainId32 par défaut du devnet SANGO.
 *
 * ⚠️ Valeur alignée sur le golden vector Rust (`0x1111…`). Si le
 *    devnet utilise un autre chainId, `getChainId()` fait foi à
 *    l'exécution.
 */
export const SANGO_CHAIN_ID_HEX =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

/**
 * Réseau SANGO. Étend `Network` avec la discrimination Bech32m
 * (`mainnet` → HRP `sango`, `testnet`/`devnet` → HRP `tsango`).
 *
 * ⚠️ `devnet` partage le HRP `tsango` avec testnet — c'est voulu
 *    (spec bech32m §2.1). On utilise donc `"testnet"` côté wallet-core.
 */
export interface SangoNetwork extends Network {
  readonly bech32Network: "mainnet" | "testnet";
}

export const SANGO_DEVNET: SangoNetwork = {
  id: "sango-devnet",
  family: "sango",
  name: "Sango Devnet",
  chainId: SANGO_CHAIN_ID_HEX,
  nativeAsset: SANGO_NATIVE_ASSET_ID,
  isTestnet: true,
  defaultRpcEndpoints: ["http://127.0.0.1:8545"],
  bech32Network: "testnet",
  explorer: {
    baseUrl: "http://127.0.0.1:8090",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

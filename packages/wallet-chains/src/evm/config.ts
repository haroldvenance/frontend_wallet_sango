import type { Network } from "../types/network";

/**
 * Ethereum Sepolia (testnet, E1).
 *
 * D-NET-1 : Sepolia uniquement en E1. Mainnet viendra en E1.5.
 * D-EVM-1 : les endpoints sont publics, sans clé API. Ils seront
 * consommés par le RpcPool générique (patch 3) — pas d'appel direct
 * dans wallet-chains.
 */
export const ETHEREUM_SEPOLIA: Network = {
  id: "ethereum-sepolia",
  family: "evm",
  name: "Ethereum Sepolia",
  // 11155111 décimal → 0xaa36a7
  chainId: "0xaa36a7",
  nativeAsset: "eth",
  defaultRpcEndpoints: [
    "https://ethereum-sepolia.publicnode.com",
    "https://rpc.sepolia.org",
  ],
  explorer: {
    baseUrl: "https://sepolia.etherscan.io",
    txPath: "/tx/{hash}",
    addressPath: "/address/{addr}",
  },
};

export const EVM_NATIVE_ASSET_ID = "eth";
export const EVM_DECIMALS = 18;

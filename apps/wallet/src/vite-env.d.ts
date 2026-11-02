/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Injected by Vite
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;

  // RPC SANGO
  readonly VITE_SANGO_RPC_URL?: string;
  readonly VITE_SANGO_NETWORK?: "mainnet" | "testnet";

  // Explorer web
  readonly VITE_SANGO_EXPLORER_URL?: string;
  /** @deprecated Utiliser VITE_SANGO_EXPLORER_URL. */
  readonly VITE_EXPLORER_URL?: string;

  // Faucet (dev/testnet uniquement)
  readonly VITE_SANGO_FAUCET_URL?: string;
  /** @deprecated Utiliser VITE_SANGO_FAUCET_URL. */
  readonly VITE_FAUCET_URL?: string;

  // Etherscan V2 (publique)
  readonly VITE_ETHERSCAN_API_KEY?: string;

  // Feature flags UI
  readonly VITE_SHOW_ADVANCED_RPC?: "true" | "false";

  // Legacy / debug
  readonly VITE_SANGO_TX_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
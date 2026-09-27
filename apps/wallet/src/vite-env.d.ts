/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SANGO_RPC_URL?: string;
  readonly VITE_SANGO_FAUCET_URL?: string;
  readonly VITE_SANGO_TX_MOCK?: string;
  readonly VITE_SANGO_NETWORK?: "mainnet" | "testnet";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

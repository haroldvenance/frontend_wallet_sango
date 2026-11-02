import type { Network } from "@sango/types";

/**
 * Résout une URL et refuse les valeurs dangereuses en production.
 *
 * Règles PROD (fermes) :
 *   - protocole `https:` uniquement ;
 *   - pas de localhost/127.0.0.1/0.0.0.0/[::1]/.local.
 *
 * En cas de refus : `console.warn` + chaîne vide. Une chaîne vide est
 * préférable à un appel vers `localhost` qui échouerait silencieusement.
 * Si l'opérateur oublie de configurer `VITE_SANGO_EXPLORER_URL` en prod,
 * l'Explorer sera simplement masqué au lieu de mener vers une page morte.
 *
 * En DEV : aucune validation — les fallbacks localhost sont intentionnels.
 */
function resolveSafeUrl(
  raw: string | undefined,
  fallback: string,
  label: string,
): string {
  const value = raw ?? fallback;
  if (!import.meta.env.PROD) return value;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isSafe =
      parsed.protocol === "https:" &&
      host !== "" &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "0.0.0.0" &&
      host !== "[::1]" &&
      host !== "::1" &&
      !host.endsWith(".local");
    if (!isSafe) {
      console.warn(
        `[config] ${label}: "${value}" is unsafe in production build — using empty`,
      );
      return "";
    }
    return value;
  } catch {
    console.warn(`[config] ${label}: "${value}" is not a valid URL — using empty`);
    return "";
  }
}

/**
 * Endpoint RPC SANGO.
 *
 * En DEV : fallback localhost (devnet local).
 * En PROD : `VITE_SANGO_RPC_URL` DOIT être une URL HTTPS valide.
 *           Si absent/invalide → chaîne vide (les hooks devront
 *           afficher un état "RPC non configuré", pas crasher).
 */
export const DEFAULT_ENDPOINT: string = resolveSafeUrl(
  import.meta.env.VITE_SANGO_RPC_URL,
  "http://127.0.0.1:8545",
  "VITE_SANGO_RPC_URL",
);

export const DEFAULT_NETWORK: Network =
  import.meta.env.VITE_SANGO_NETWORK ?? "testnet";

/**
 * Endpoints connus par réseau. `mainnet` n'est pas déployé.
 */
export const NETWORK_ENDPOINTS: Record<Network, string> = {
  mainnet: "",
  testnet: DEFAULT_ENDPOINT,
};

/** Auto-lock après inactivité (15 min). */
export const AUTO_LOCK_MS = 15 * 60 * 1000;

/** Clipboard auto-clear (30 s). */
export const CLIPBOARD_CLEAR_MS = 30 * 1000;

/** Max fee par défaut (base units / gas). */
export const DEFAULT_MAX_FEE = 1_000n;
export const DEFAULT_PRIORITY_FEE = 0n;

/**
 * Base URL de l'explorer web.
 *
 * Résolution : `VITE_SANGO_EXPLORER_URL` > `VITE_EXPLORER_URL` > devnet local.
 * En PROD : vide si absent — les liens "Explorer" sont masqués par les
 * composants consommateurs au lieu de pointer vers localhost.
 */
export const EXPLORER_URL: string = resolveSafeUrl(
  (import.meta.env.VITE_SANGO_EXPLORER_URL as string | undefined) ??
    (import.meta.env.VITE_EXPLORER_URL as string | undefined),
  "http://127.0.0.1:8090",
  "VITE_SANGO_EXPLORER_URL",
);

/** Endpoint faucet HTTP — dev/testnet uniquement. */
export const FAUCET_ENDPOINT: string = resolveSafeUrl(
  (import.meta.env.VITE_SANGO_FAUCET_URL as string | undefined) ??
    (import.meta.env.VITE_FAUCET_URL as string | undefined),
  "http://127.0.0.1:3001",
  "VITE_SANGO_FAUCET_URL",
);

/**
 * Etherscan V2 API key — publique, PAS un secret. Restreindre le
 * domaine côté Etherscan. Si vide : l'historique EVM est désactivé.
 */
export const ETHERSCAN_API_KEY: string =
  (import.meta.env.VITE_ETHERSCAN_API_KEY as string | undefined) ?? "";
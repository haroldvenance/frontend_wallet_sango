import { useMemo, type ReactNode } from "react";

import type { WalletSession } from "@sango/wallet-session";

import { buildWalletSession } from "@/lib/build-wallet-session";
import { useEvmRpcStore } from "@/stores/evm-rpc-store";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletSessionContext } from "./wallet-session-context";

/**
 * Construit la `WalletSession` du wallet **actif** dès qu'il passe à
 * `unlocked`.
 *
 * **Phase 4** — la logique de construction a été extraite dans
 * `lib/build-wallet-session.ts` (réutilisée par `useUnifiedAssets()`
 * pour les sessions secondaires). Zéro changement fonctionnel.
 */
interface WalletSessionProviderProps {
  children: ReactNode;
}

export function WalletSessionProvider({ children }: WalletSessionProviderProps) {
  const wallet = useWalletStore((s) => s.wallet);
  const status = useWalletStore((s) => s.status);
  const endpoint = useSdkStore((s) => s.endpoint);
  // **Phase 12-A** — sub au store custom EVM. Un changement de custom
  // endpoint invalide la session (le `useMemo` rebuilde → nouveau
  // `RpcPool` avec les nouveaux endpoints). Les tx en vol gardent une
  // référence à l'ancien pool (GC JS) — pas d'abort.
  const evmCustomEndpoints = useEvmRpcStore((s) => s.customEndpoints);

  const session = useMemo<WalletSession | null>(() => {
    if (status !== "unlocked" || !wallet) return null;
    return buildWalletSession(wallet, endpoint, evmCustomEndpoints);
  }, [wallet, status, endpoint, evmCustomEndpoints]);

  return (
    <WalletSessionContext.Provider value={session}>
      {children}
    </WalletSessionContext.Provider>
  );
}

import { useMemo, type ReactNode } from "react";

import type { WalletSession } from "@sango/wallet-session";

import { buildWalletSession } from "@/lib/build-wallet-session";
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

  const session = useMemo<WalletSession | null>(() => {
    if (status !== "unlocked" || !wallet) return null;
    return buildWalletSession(wallet, endpoint);
  }, [wallet, status, endpoint]);

  return (
    <WalletSessionContext.Provider value={session}>
      {children}
    </WalletSessionContext.Provider>
  );
}

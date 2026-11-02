import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { ErrorBoundary } from "@/components/error-boundary";
import { useApplyTheme } from "@/hooks/use-apply-theme";
import { WalletSessionProvider } from "./wallet-session-provider";

interface AppProvidersProps {
  children: ReactNode;
}

function ThemeRuntime() {
  useApplyTheme();
  return null;
}

function getStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { status?: number; response?: { status?: number } };
  const status = e.status ?? e.response?.status;
  return typeof status === "number" ? status : null;
}

/**
 * Décide si une erreur doit être réessayée.
 *
 * Permanents (pas de retry) : 400, 401, 403, 404, 422, autres 4xx.
 * Réessayables avec backoff : 408 (timeout), 425 (too early),
 *   429 (rate limit — TanStack gère le backoff exponentiel),
 *   5xx (server error), et erreurs réseau.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = getStatus(error);
  if (status !== null) {
    if (status === 408 || status === 425 || status === 429) {
      return failureCount < 3;
    }
    if (status >= 500) {
      return failureCount < 2;
    }
    if (status >= 400 && status < 500) {
      return false;
    }
  }
  return failureCount < 2;
}

/**
 * Configuration React Query.
 *
 * Politique :
 *   - AUCUN polling global.
 *   - Chaque query déclare sa cadence :
 *       · soldes         → 30 s
 *       · prix           → 60 s
 *       · historique     → pas de polling (invalidation manuelle)
 *       · tx pending     → 10 s tant que pending
 *       · config statique → staleTime 1 h
 *   - Retry différencié (voir `shouldRetry`).
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            refetchInterval: false,
            retry: shouldRetry,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRuntime />
      <ErrorBoundary scope="Application">
        <WalletSessionProvider>{children}</WalletSessionProvider>
      </ErrorBoundary>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
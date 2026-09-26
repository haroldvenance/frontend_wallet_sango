import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { useApplyTheme } from "@/hooks/use-apply-theme";

interface AppProvidersProps {
  children: ReactNode;
}

function ThemeRuntime() {
  useApplyTheme();
  return null;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchInterval: 5_000,
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRuntime />
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

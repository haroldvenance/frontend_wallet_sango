import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, type RenderHookOptions } from "@testing-library/react";
import type { ReactNode } from "react";

/** QueryClient isolé par test (pas de cache partagé). */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function Wrapper({ children, client }: { children: ReactNode; client: QueryClient }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Version test-friendly de renderHook, avec QueryClientProvider. */
export function renderHookWithQuery<Result, Props>(
  hook: (initialProps: Props) => Result,
  options: RenderHookOptions<Props> = {},
  client: QueryClient = createTestQueryClient(),
) {
  return {
    client,
    ...renderHook(hook, {
      wrapper: ({ children }) => <Wrapper client={client}>{children}</Wrapper>,
      ...options,
    }),
  };
}

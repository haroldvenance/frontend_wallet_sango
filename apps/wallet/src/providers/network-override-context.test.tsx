import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useNetworkQueryContext } from "@/hooks/use-network-query-context";
import { useWalletStore } from "@/stores/wallet-store";

import {
  NetworkOverrideProvider,
  useNetworkOverride,
} from "./network-override-context";

describe("NetworkOverrideContext — Phase 10", () => {
  it("sans Provider : override = null, contexte = store", () => {
    useWalletStore.setState({
      networkId: "ethereum-mainnet",
      family: "evm",
      format: "bip39",
      status: "unlocked",
    });

    const { result } = renderHook(() => ({
      override: useNetworkOverride(),
      ctx: useNetworkQueryContext(),
    }));

    expect(result.current.override).toBeNull();
    expect(result.current.ctx.networkId).toBe("ethereum-mainnet");
    expect(result.current.ctx.family).toBe("evm");
  });

  it("avec Provider : override prime sur le store (même famille)", () => {
    useWalletStore.setState({
      networkId: "ethereum-mainnet",
      family: "evm",
      format: "bip39",
      status: "unlocked",
    });

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <NetworkOverrideProvider networkId="bsc" family="evm">
          {children}
        </NetworkOverrideProvider>
      );
    }

    const { result } = renderHook(() => useNetworkQueryContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.networkId).toBe("bsc");
    expect(result.current.family).toBe("evm");
    // Le store n'est PAS modifié.
    expect(useWalletStore.getState().networkId).toBe("ethereum-mainnet");
  });

  it("avec Provider : override cross-family (EVM → Bitcoin)", () => {
    useWalletStore.setState({
      networkId: "ethereum-mainnet",
      family: "evm",
      format: "bip39",
      status: "unlocked",
    });

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <NetworkOverrideProvider networkId="bitcoin-mainnet" family="bitcoin">
          {children}
        </NetworkOverrideProvider>
      );
    }

    const { result } = renderHook(() => useNetworkQueryContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.networkId).toBe("bitcoin-mainnet");
    expect(result.current.family).toBe("bitcoin");
    expect(result.current.nativeAsset).toBe("btc");
    // Store inchangé.
    expect(useWalletStore.getState().networkId).toBe("ethereum-mainnet");
    expect(useWalletStore.getState().family).toBe("evm");
  });

  it("avec Provider : nativeAsset recalculé (BSC → bnb)", () => {
    useWalletStore.setState({
      networkId: "ethereum-mainnet",
      family: "evm",
      format: "bip39",
      status: "unlocked",
    });

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <NetworkOverrideProvider networkId="bsc" family="evm">
          {children}
        </NetworkOverrideProvider>
      );
    }

    const { result } = renderHook(() => useNetworkQueryContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.nativeAsset).toBe("bnb");
  });
});

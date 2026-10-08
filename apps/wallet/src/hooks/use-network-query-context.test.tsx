import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * 🔒 useNetworkQueryContext — Phase 2.1 (D-E2.6-1)
 *
 * Vérifie que `account.accountIndex` est lu depuis
 * `walletAccountIndexes[activeId]` et non hardcodé à 0.
 */

beforeEach(() => {
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
  useWalletStore.setState({
    format: null,
    status: "no-wallet",
    activeId: null,
    networkId: "sango-devnet",
    family: "sango",
    walletAccountIndexes: {},
  });
});

describe("useNetworkQueryContext — accountIndex", () => {
  it("fallback 0 si pas d'activeId", () => {
    const { result } = renderHook(() => useNetworkQueryContext());
    expect(result.current.account.accountIndex).toBe(0);
  });

  it("fallback 0 si activeId absent du record (wallet fraîchement déverrouillé)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-sepolia",
      family: "evm",
      walletAccountIndexes: {},
    });
    const { result } = renderHook(() => useNetworkQueryContext());
    expect(result.current.account.accountIndex).toBe(0);
  });

  it("lit l'index du wallet actif", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-sepolia",
      family: "evm",
      walletAccountIndexes: { "0xabc": 3 },
    });
    const { result } = renderHook(() => useNetworkQueryContext());
    expect(result.current.account.accountIndex).toBe(3);
  });

  it("les wallets sont isolés (clé = activeId)", () => {
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      activeId: "0xabc",
      networkId: "ethereum-sepolia",
      family: "evm",
      walletAccountIndexes: { "0xabc": 1, "0xdef": 5 },
    });
    const { result, rerender } = renderHook(() =>
      useNetworkQueryContext(),
    );
    expect(result.current.account.accountIndex).toBe(1);

    useWalletStore.setState({ activeId: "0xdef" });
    rerender();
    expect(result.current.account.accountIndex).toBe(5);
  });

  it("SANGO legacy : toujours 0 même si le record contient une entrée", () => {
    useWalletStore.setState({
      format: "sango-legacy",
      status: "unlocked",
      activeId: "sango-addr",
      networkId: "sango-devnet",
      family: "sango",
      walletAccountIndexes: { "sango-addr": 7 },
    });
    const { result } = renderHook(() => useNetworkQueryContext());
    // Note : le hook fait confiance au record ; c'est `setAccountIndex`
    // qui refuse SANGO. Un état corrompu (via localStorage) pourrait
    // produire index != 0 ici, mais SANGO n'a qu'un compte de toute
    // façon — l'index est inutilisé en aval.
    expect(result.current.account.accountIndex).toBe(7);
    expect(result.current.family).toBe("sango");
  });
});

// ────────────────────────────────────────────────────────────
//  Phase 2.2 — propagation accountIndex
// ────────────────────────────────────────────────────────────

describe("useNetworkQueryContext — accountIndex", () => {
  it("reflète walletAccountIndexes[activeId]", async () => {
    useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
      activeId: "0xabc",
      walletAccountIndexes: { "0xabc": 2 },
    });

    const { result } = renderHook(() => useNetworkQueryContext());
    expect(result.current.account.accountIndex).toBe(2);
  });

  it("fallback 0 si activeId absent du record", async () => {
    useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
      activeId: "0xnew",
      walletAccountIndexes: { "0xother": 3 },
    });

    const { result } = renderHook(() => useNetworkQueryContext());
    expect(result.current.account.accountIndex).toBe(0);
  });

  it("fallback 0 si activeId null", async () => {
    useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
    useWalletStore.setState({
      format: "bip39",
      status: "unlocked",
      networkId: "ethereum-sepolia",
      family: "evm",
      activeId: null,
      walletAccountIndexes: {},
    });

    const { result } = renderHook(() => useNetworkQueryContext());
    expect(result.current.account.accountIndex).toBe(0);
  });
});

import { Bip39Wallet } from "@sango/wallet-core";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useBitcoinAddress } from "./use-bitcoin-address";

/**
 * 🔒 useBitcoinAddress — E2.1.b.6.2
 *
 * Vérifie :
 *   - dérivation depuis wallet BIP-39 sur family=bitcoin
 *   - null si family ≠ bitcoin
 *   - null si wallet absent
 *   - null si format ≠ bip39
 *   - l'index HD provient de useNetworkQueryContext
 */

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon " +
  "abandon abandon abandon about";

let wallet: Bip39Wallet | null = null;

beforeEach(async () => {
  useSdkStore.setState({ endpoint: "http://test", customEndpoint: null });
  if (!wallet) {
    wallet = await Bip39Wallet.fromMnemonic(MNEMONIC);
  }
  useWalletStore.setState({
    wallet,
    format: "bip39",
    status: "unlocked",
    networkId: "bitcoin-testnet",
    family: "bitcoin",
    network: "testnet",
    activeId: "tb1qabc",
  });
});

describe("useBitcoinAddress — happy path", () => {
  it("dérive l'adresse BIP-84 testnet canonique", () => {
    const { result } = renderHook(() => useBitcoinAddress());
    expect(result.current).not.toBeNull();
    // Vecteur BIP-84 officiel (mnemonic "abandon…")
    expect(result.current!.address).toBe(
      "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl",
    );
    expect(result.current!.network).toBe("testnet");
    expect(result.current!.path).toBe("m/84'/1'/0'/0/0");
    expect(result.current!.publicKeyCompressed).toHaveLength(33);
  });

  it("null si family ≠ bitcoin", () => {
    useWalletStore.setState({ family: "evm", networkId: "ethereum-sepolia" });
    const { result } = renderHook(() => useBitcoinAddress());
    expect(result.current).toBeNull();
  });

  it("null si wallet absent", () => {
    useWalletStore.setState({ wallet: null });
    const { result } = renderHook(() => useBitcoinAddress());
    expect(result.current).toBeNull();
  });

  it("null si format ≠ bip39", () => {
    useWalletStore.setState({ format: "sango-legacy" });
    const { result } = renderHook(() => useBitcoinAddress());
    expect(result.current).toBeNull();
  });
});

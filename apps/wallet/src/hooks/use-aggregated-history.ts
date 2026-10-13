import { useMemo } from "react";

import type { TxDetail, TxDetailPage } from "@sango/wallet-chains";
import type { HistoryItem } from "@sango/wallet-chains";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Bip39Wallet, Wallet } from "@sango/wallet-core";

import { useAllWalletAssets } from "@/hooks/use-all-wallet-assets";
import { useBitcoinAddress } from "@/hooks/use-bitcoin-address";
import { useBitcoinHistory } from "@/hooks/use-bitcoin-history";
import { useEvmHistory } from "@/hooks/use-evm-history";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Agrégat **cross-chain** des transactions récentes — Phase 9.3.
 *
 * Sources (D9.3-a·A) :
 *   - 4 EVM mainnets : Ethereum, BSC, Base, Arbitrum One
 *     (`useEvmHistory(20, networkId)`) ;
 *   - Bitcoin mainnet : `useBitcoinHistory(20)` ;
 *   - Sango devnet : RPC via `session.getTransactionPage()`.
 *
 * **4 appels explicites** (règle React — pas de `.map()` sur hooks).
 *
 * **Gestion des erreurs (D9.3-f·A)** : une erreur sur un réseau
 * n'empêche pas les autres de s'afficher. Les réseaux en erreur sont
 * listés dans `sourceErrors`.
 *
 * **Dédup** sur `(networkId, txHash)`.
 *
 * **Tri (D9.3-b·A, D9.3-c·A ajusté)** :
 *   1. Transactions `pending` en premier (statut prioritaire).
 *   2. Sinon par `timestamp` décroissant.
 *   3. Tie-break : `blockHeight` desc puis networkId.
 */

export type AggregatedSourceKind = "evm" | "bitcoin" | "sango";

export interface AggregatedTx {
  readonly networkId: string;
  readonly txHash: string;
  readonly source: AggregatedSourceKind;
  readonly timestamp: number | null;
  readonly blockHeight: number | null;
  readonly status: "confirmed" | "pending" | "failed";
  readonly direction: "in" | "out" | "neutral";
  readonly symbol: string;
  readonly amount: number | null;
  readonly counterparty: string | null;
  readonly contract: string | null;
}

export interface UseAggregatedHistoryResult {
  readonly txs: readonly AggregatedTx[];
  readonly loading: boolean;
  readonly isFetching: boolean;
  readonly sourceErrors: readonly string[];
  readonly refetch: () => void;
}

const SANGO_NETWORK_ID = "sango-devnet";
const BITCOIN_NETWORK_ID = "bitcoin-mainnet";
const EVM_NETWORK_IDS = [
  "ethereum-mainnet",
  "bsc",
  "base",
  "arbitrum-one",
] as const;

export function useAggregatedHistory(
  limit = 10,
): UseAggregatedHistoryResult {
  const session = useWalletSession();
  const wallet = useWalletStore((s) => s.wallet);
  const format = useWalletStore((s) => s.format);
  const status = useWalletStore((s) => s.status);

  // 4 appels EVM explicites (ordre stable — règle React hooks).
  const eth = useEvmHistory(20, EVM_NETWORK_IDS[0]);
  const bsc = useEvmHistory(20, EVM_NETWORK_IDS[1]);
  const base = useEvmHistory(20, EVM_NETWORK_IDS[2]);
  const arb = useEvmHistory(20, EVM_NETWORK_IDS[3]);
  const btc = useBitcoinHistory(20);
  const btcAddr = useBitcoinAddress();
  const { assets } = useAllWalletAssets();

  // Sango history (V1 legacy ET V2 via SLIP-0010).
  const sangoAddress: string | null = useMemo(() => {
    if (!wallet) return null;
    if (format === "sango-legacy" && wallet instanceof Wallet) {
      return wallet.identity.addressHex;
    }
    if (format === "bip39" && wallet instanceof Bip39Wallet) {
      return wallet.getSangoIdentity(0).addressHex;
    }
    return null;
  }, [wallet, format]);

  const sangoQuery: UseQueryResult<TxDetailPage | null, Error> = useQuery({
    queryKey: ["sango-history-aggregated", sangoAddress] as const,
    queryFn: async () => {
      if (!session) return null;
      return session.getTransactionPage(
        { family: "sango", accountIndex: 0, networkId: SANGO_NETWORK_ID },
        20,
        0,
      );
    },
    enabled:
      status === "unlocked" && Boolean(session) && Boolean(sangoAddress),
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 1,
  });

  // Lookup décimales par (networkId, contract|native).
  const decimalsLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const key =
        a.assetRef.kind === "token"
          ? `${a.networkId}:${a.assetRef.contract}`
          : `${a.networkId}:native`;
      map.set(key, a.decimals);
    }
    return map;
  }, [assets]);

  // Adresse EVM (Bip39Wallet uniquement).
  const evmAddress = useMemo(() => {
    if (format === "bip39" && wallet instanceof Bip39Wallet) {
      return wallet.getIdentity(0).addressHex.toLowerCase();
    }
    return null;
  }, [wallet, format]);

  return useMemo<UseAggregatedHistoryResult>(() => {
    const txs: AggregatedTx[] = [];
    const sourceErrors: string[] = [];

    // ── EVM : 4 réseaux ────────────────────────────────────
    const evmQueries: Array<[string, typeof eth]> = [
      [EVM_NETWORK_IDS[0], eth],
      [EVM_NETWORK_IDS[1], bsc],
      [EVM_NETWORK_IDS[2], base],
      [EVM_NETWORK_IDS[3], arb],
    ];
    for (const [networkId, q] of evmQueries) {
      if (q.isError) {
        sourceErrors.push(networkId);
        continue;
      }
      for (const item of q.data?.items ?? []) {
        txs.push(mapEvmItem(item, networkId, evmAddress, decimalsLookup));
      }
    }

    // ── Bitcoin ────────────────────────────────────────────
    if (btc.isError) sourceErrors.push(BITCOIN_NETWORK_ID);
    const btcAddressLower = btcAddr?.address ?? "";
    for (const item of btc.data?.items ?? []) {
      txs.push(mapBitcoinItem(item, btcAddressLower));
    }

    // ── Sango ──────────────────────────────────────────────
    if (sangoQuery.isError) sourceErrors.push(SANGO_NETWORK_ID);
    for (const tx of sangoQuery.data?.items ?? []) {
      txs.push(mapSangoTx(tx, sangoAddress));
    }

    // ── Tri : pending first, puis timestamp desc ───────────
    txs.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      const aTs = a.timestamp ?? -1;
      const bTs = b.timestamp ?? -1;
      if (aTs !== bTs) return bTs - aTs;
      const aBh = a.blockHeight ?? -1;
      const bBh = b.blockHeight ?? -1;
      if (aBh !== bBh) return bBh - aBh;
      return a.networkId.localeCompare(b.networkId);
    });

    // ── Dédup sur (networkId, txHash) ──────────────────────
    const seen = new Set<string>();
    const deduped = txs.filter((t) => {
      const key = `${t.networkId}:${t.txHash}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const anyLoading =
      eth.isLoading ||
      bsc.isLoading ||
      base.isLoading ||
      arb.isLoading ||
      btc.isLoading ||
      sangoQuery.isLoading;

    const anyFetching =
      eth.isFetching ||
      bsc.isFetching ||
      base.isFetching ||
      arb.isFetching ||
      btc.isFetching ||
      sangoQuery.isFetching;

    return {
      txs: deduped.slice(0, limit),
      loading: anyLoading,
      isFetching: anyFetching,
      sourceErrors,
      refetch: () => {
        void eth.refetch();
        void bsc.refetch();
        void base.refetch();
        void arb.refetch();
        void btc.refetch();
        void sangoQuery.refetch();
      },
    };
  }, [
    eth,
    bsc,
    base,
    arb,
    btc,
    sangoQuery,
    evmAddress,
    btcAddr,
    sangoAddress,
    decimalsLookup,
    limit,
  ]);
}

// ── Mappers ────────────────────────────────────────────────

function decimalsOf(
  networkId: string,
  contract: string | null,
  lookup: Map<string, number>,
): number {
  const key = contract ? `${networkId}:${contract}` : `${networkId}:native`;
  return lookup.get(key) ?? 18;
}

function toNumber(amount: bigint, decimals: number): number {
  const base = 10n ** BigInt(decimals);
  const whole = Number(amount / base);
  const frac = Number(amount % base) / Number(base);
  return whole + frac;
}

function mapEvmItem(
  item: HistoryItem,
  networkId: string,
  myAddress: string | null,
  lookup: Map<string, number>,
): AggregatedTx {
  const from = item.from.toLowerCase();
  const to = item.to.toLowerCase();
  const me = myAddress ?? "";
  const isSent = from === me && to !== me;
  const isReceived = to === me && from !== me;
  const direction: AggregatedTx["direction"] = isSent
    ? "out"
    : isReceived
      ? "in"
      : "neutral";
  const counterparty = isSent ? item.to : isReceived ? item.from : null;

  const contract =
    item.assetRef.kind === "token" ? item.assetRef.contract : null;
  const symbol =
    item.assetRef.kind === "native"
      ? item.assetRef.assetId.toUpperCase()
      : "TOKEN";
  const decimals = decimalsOf(networkId, contract, lookup);

  return {
    networkId,
    txHash: item.txHash,
    source: "evm",
    timestamp: item.timestamp ?? null,
    blockHeight: item.blockHeight ?? null,
    status: item.status,
    direction,
    symbol,
    amount: toNumber(item.amount, decimals),
    counterparty,
    contract,
  };
}

function mapBitcoinItem(
  item: HistoryItem,
  myAddress: string,
): AggregatedTx {
  const isSent = item.from === myAddress && item.to !== myAddress;
  const isReceived = item.to === myAddress && item.from !== myAddress;
  const direction: AggregatedTx["direction"] = isSent
    ? "out"
    : isReceived
      ? "in"
      : "neutral";
  const counterparty = isSent ? item.to : isReceived ? item.from : null;

  return {
    networkId: BITCOIN_NETWORK_ID,
    txHash: item.txHash,
    source: "bitcoin",
    timestamp: item.timestamp ?? null,
    blockHeight: item.blockHeight ?? null,
    status: item.status,
    direction,
    symbol: "BTC",
    amount: toNumber(item.amount, 8),
    counterparty: counterparty || null,
    contract: null,
  };
}

function mapSangoTx(
  tx: TxDetail,
  myAddress: string | null,
): AggregatedTx {
  const me = (myAddress ?? "").toLowerCase();
  const sender = tx.sender.toLowerCase();
  const recipient = (tx.recipient ?? "").toLowerCase();
  const isSent = sender === me && recipient !== me;
  const isReceived = recipient === me && sender !== me;
  const direction: AggregatedTx["direction"] = isSent
    ? "out"
    : isReceived
      ? "in"
      : "neutral";
  const counterparty = isSent ? tx.recipient : isReceived ? tx.sender : null;

  const value = tx.value ? BigInt(tx.value) : 0n;

  return {
    networkId: SANGO_NETWORK_ID,
    txHash: tx.hash,
    source: "sango",
    // Sango : pas de timestamp dans `TxDetail` → `null`.
    timestamp: null,
    blockHeight: tx.blockHeight ?? null,
    status: tx.blockHeight === null ? "pending" : "confirmed",
    direction,
    symbol: "SANGO",
    amount: toNumber(value, 7),
    counterparty: counterparty || null,
    contract: null,
  };
}

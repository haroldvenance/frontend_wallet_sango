import type { AddressHex, TxHashHex } from "@sango/types";
import type { AssetRef } from "@sango/wallet-chains";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { ExplorerLink } from "@/components/branding/explorer-link";
import { useIsSangoWallet } from "@/hooks/use-is-sango-wallet";
import { useWalletSession } from "@/providers/wallet-session-context";
import { useSdkStore } from "@/stores/sdk-store";
import { shortenHash } from "@/lib/format";
import { useNetworkQueryContext } from "./use-network-query-context";

/**
 * Actions de staking SANGO.
 *
 * **V0.2 (patch 4)** — Migration vers WalletSession.
 *
 * Le pipeline build/sign/broadcast est délégué à `session.send()` avec
 * un `SendParams` discriminé (D-SESS-10). Le hook ne connaît plus les
 * méthodes dédiées du SDK (`client.bond`, `client.delegate`…) —
 * seulement `session.send` + `client.waitForInclusion` (D-SESS-7).
 *
 * Le SDK reste utilisé pour `waitForInclusion` (observer réseau, pas
 * une action wallet).
 */

interface StakingResult {
  txHash: TxHashHex;
  included: boolean;
}

function useInvalidateStaking() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["account"] });
    void qc.invalidateQueries({ queryKey: ["validators"] });
    void qc.invalidateQueries({ queryKey: ["validator"] });
    void qc.invalidateQueries({ queryKey: ["my-delegations"] });
    void qc.invalidateQueries({ queryKey: ["my-pending-unbondings"] });
  };
}

async function runStakingAction(
  send: () => Promise<{ txHash: TxHashHex }>,
  wait: (hash: TxHashHex) => Promise<{ status: string; error?: string }>,
  label: string,
): Promise<StakingResult> {
  const { txHash } = await send();
  toast.info(`${label} envoyé`, {
    description: (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono text-[11px]">{shortenHash(txHash, 6)}</span>
        <span className="text-muted-foreground">·</span>
        <ExplorerLink hash={txHash} />
      </span>
    ),
  });
  const result = await wait(txHash);

  switch (result.status) {
    case "included":
      toast.success(`${label} inclus`, {
        description: (
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[11px]">{shortenHash(txHash, 6)}</span>
            <span className="text-muted-foreground">·</span>
            <ExplorerLink hash={txHash} />
          </span>
        ),
      });
      break;
    case "rejected":
      toast.error(`${label} rejeté`, { description: result.error });
      break;
    case "dropped":
      toast.error(`${label} perdu`, { description: result.error });
      break;
    default:
      toast.warning(`${label} en attente`, {
        description: "Pas encore inclus après 15 s",
      });
  }
  return { txHash, included: result.status === "included" };
}

/**
 * Contexte partagé par les 8 mutations staking.
 *
 * - `session` : pour `session.send(params, account)`.
 * - `account` : `AccountRef` (networkId courant, accountIndex = 0).
 * - `assetRef` : assetRef natif SANGO pour le networkId courant.
 * - `client`  : SDK pour `waitForInclusion` (D-SESS-7).
 */
function useStakingContext() {
  const isSango = useIsSangoWallet();
  const session = useWalletSession();
  const { account, networkId } = useNetworkQueryContext();
  const { client } = useSdkStore();

  const assetRef: AssetRef = {
    kind: "native",
    assetId: "sango",
    networkId,
  };

  return { session, account, assetRef, client, isSango };
}

function assertSession(
  session: ReturnType<typeof useWalletSession>,
  isSango: boolean,
): asserts session is NonNullable<typeof session> {
  if (!session) {
    throw new Error("WalletSession indisponible (wallet verrouillé ?)");
  }
  if (!isSango) {
    throw new Error(
      "Staking SANGO uniquement — le wallet actif est un wallet EVM (BIP-39)",
    );
  }
}

// --- Mutations --------------------------------------------------------------

/** Bond (self-stake). */
export function useBond(): UseMutationResult<StakingResult, Error, { amountBaseUnits: bigint }> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { amountBaseUnits: bigint }>({
    mutationFn: ({ amountBaseUnits }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send(
              { kind: "bond", assetRef, amount: amountBaseUnits },
              account,
            )
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Bond",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec Bond", { description: e.message }),
  });
}

/** Unbond (retrait self-stake). */
export function useUnbond(): UseMutationResult<StakingResult, Error, { amountBaseUnits: bigint }> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { amountBaseUnits: bigint }>({
    mutationFn: ({ amountBaseUnits }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send(
              { kind: "unbond", assetRef, amount: amountBaseUnits },
              account,
            )
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Unbond",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec Unbond", { description: e.message }),
  });
}

/** Delegate. */
export function useDelegate(): UseMutationResult<
  StakingResult,
  Error,
  { validator: AddressHex; amountBaseUnits: bigint }
> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { validator: AddressHex; amountBaseUnits: bigint }>({
    mutationFn: ({ validator, amountBaseUnits }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send(
              { kind: "delegate", validator, assetRef, amount: amountBaseUnits },
              account,
            )
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Délégation",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec délégation", { description: e.message }),
  });
}

/** Undelegate. */
export function useUndelegate(): UseMutationResult<
  StakingResult,
  Error,
  { validator: AddressHex; amountBaseUnits: bigint }
> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { validator: AddressHex; amountBaseUnits: bigint }>({
    mutationFn: ({ validator, amountBaseUnits }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send(
              { kind: "undelegate", validator, assetRef, amount: amountBaseUnits },
              account,
            )
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Retrait délégation",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec retrait", { description: e.message }),
  });
}

/** ClaimRewards. */
export function useClaimRewards(): UseMutationResult<StakingResult, Error, { validator: AddressHex }> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { validator: AddressHex }>({
    mutationFn: ({ validator }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send({ kind: "claimRewards", validator, assetRef }, account)
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Réclamation",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec réclamation", { description: e.message }),
  });
}

/** RegisterValidator. */
export function useRegisterValidator(): UseMutationResult<
  StakingResult,
  Error,
  { commissionBps: number; selfStakeBaseUnits: bigint }
> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<
    StakingResult,
    Error,
    { commissionBps: number; selfStakeBaseUnits: bigint }
  >({
    mutationFn: ({ commissionBps, selfStakeBaseUnits }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send(
              {
                kind: "registerValidator",
                commissionBps,
                selfStake: selfStakeBaseUnits,
                assetRef,
              },
              account,
            )
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Enregistrement",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec enregistrement", { description: e.message }),
  });
}

/** UpdateCommission. */
export function useUpdateCommission(): UseMutationResult<
  StakingResult,
  Error,
  { newCommissionBps: number }
> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { newCommissionBps: number }>({
    mutationFn: ({ newCommissionBps }) => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send(
              { kind: "updateCommission", newCommissionBps, assetRef },
              account,
            )
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Modification commission",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec modification", { description: e.message }),
  });
}

/** Unjail. */
export function useUnjail(): UseMutationResult<StakingResult, Error, void> {
  const { session, account, assetRef, client, isSango } = useStakingContext();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, void>({
    mutationFn: () => {
      assertSession(session, isSango);
      return runStakingAction(
        () =>
          session
            .send({ kind: "unjail", assetRef }, account)
            .then((txHash) => ({ txHash: txHash as TxHashHex })),
        (h) => client.waitForInclusion(h),
        "Unjail",
      );
    },
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec Unjail", { description: e.message }),
  });
}

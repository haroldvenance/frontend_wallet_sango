import type { AddressHex, TxHashHex } from "@sango/types";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useSdkStore } from "@/stores/sdk-store";

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
  wait: (hash: TxHashHex) => Promise<{ included: boolean }>,
  label: string,
): Promise<StakingResult> {
  const { txHash } = await send();
  toast.info(`${label} envoyé`, { description: txHash });
  const { included } = await wait(txHash);
  if (included) toast.success(`${label} inclus`, { description: txHash });
  else toast.warning(`${label} en attente`, { description: "Pas encore inclus après 15 s" });
  return { txHash, included };
}

/** Bond (self-stake). */
export function useBond(): UseMutationResult<StakingResult, Error, { amountBaseUnits: bigint }> {
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { amountBaseUnits: bigint }>({
    mutationFn: ({ amountBaseUnits }) =>
      runStakingAction(
        () => client.bond(amountBaseUnits),
        (h) => client.waitForInclusion(h),
        "Bond",
      ),
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec Bond", { description: e.message }),
  });
}

/** Unbond (retrait self-stake). */
export function useUnbond(): UseMutationResult<StakingResult, Error, { amountBaseUnits: bigint }> {
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { amountBaseUnits: bigint }>({
    mutationFn: ({ amountBaseUnits }) =>
      runStakingAction(
        () => client.unbond(amountBaseUnits),
        (h) => client.waitForInclusion(h),
        "Unbond",
      ),
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
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { validator: AddressHex; amountBaseUnits: bigint }>({
    mutationFn: ({ validator, amountBaseUnits }) =>
      runStakingAction(
        () => client.delegate(validator, amountBaseUnits),
        (h) => client.waitForInclusion(h),
        "Délégation",
      ),
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
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { validator: AddressHex; amountBaseUnits: bigint }>({
    mutationFn: ({ validator, amountBaseUnits }) =>
      runStakingAction(
        () => client.undelegate(validator, amountBaseUnits),
        (h) => client.waitForInclusion(h),
        "Retrait délégation",
      ),
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec retrait", { description: e.message }),
  });
}

/** ClaimRewards. */
export function useClaimRewards(): UseMutationResult<StakingResult, Error, { validator: AddressHex }> {
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { validator: AddressHex }>({
    mutationFn: ({ validator }) =>
      runStakingAction(
        () => client.claimRewards(validator),
        (h) => client.waitForInclusion(h),
        "Réclamation",
      ),
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
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<
    StakingResult,
    Error,
    { commissionBps: number; selfStakeBaseUnits: bigint }
  >({
    mutationFn: ({ commissionBps, selfStakeBaseUnits }) =>
      runStakingAction(
        () => client.registerValidator(commissionBps, selfStakeBaseUnits),
        (h) => client.waitForInclusion(h),
        "Enregistrement",
      ),
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
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, { newCommissionBps: number }>({
    mutationFn: ({ newCommissionBps }) =>
      runStakingAction(
        () => client.updateCommission(newCommissionBps),
        (h) => client.waitForInclusion(h),
        "Modification commission",
      ),
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec modification", { description: e.message }),
  });
}

/** Unjail. */
export function useUnjail(): UseMutationResult<StakingResult, Error, void> {
  const { client } = useSdkStore();
  const invalidate = useInvalidateStaking();
  return useMutation<StakingResult, Error, void>({
    mutationFn: () =>
      runStakingAction(
        () => client.unjail(),
        (h) => client.waitForInclusion(h),
        "Unjail",
      ),
    onSuccess: invalidate,
    onError: (e) => toast.error("Échec Unjail", { description: e.message }),
  });
}

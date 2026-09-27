import type { AddressHex } from "@sango/types";
import { ArrowLeft, Coins, Undo2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StakeModal } from "@/components/staking/stake-modal";
import { ValidatorActionsPanel } from "@/components/staking/validator-actions-panel";
import { useAccount } from "@/hooks/use-account";
import { useMyDelegations } from "@/hooks/use-my-delegations";
import {
  useBond,
  useUnbond,
  useUpdateCommission,
  useClaimRewards,
  useDelegate,
  useUndelegate,
  useUnjail,
} from "@/hooks/use-staking-actions";
import { useValidatorInfo } from "@/hooks/use-validators";
import { useTranslation } from "@/i18n/use-translation";
import { formatSango } from "@/lib/format";
import { useWalletStore } from "@/stores/wallet-store";

type ModalKind = "delegate" | "undelegate" | "bond" | "unbond" | "commission" | null;

export function ValidatorDetailRoute() {
  const t = useTranslation();
  const params = useParams<{ address: string }>();
  const address = params.address as AddressHex | undefined;

  const { data: validator, isLoading, isError, error } = useValidatorInfo(address);
  const { data: account } = useAccount();
  const { data: myDelegations } = useMyDelegations();

  const delegate = useDelegate();
  const undelegate = useUndelegate();
  const claim = useClaimRewards();
  const bond = useBond();
  const unbond = useUnbond();
  const updateCommission = useUpdateCommission();
  const unjail = useUnjail();

  const [modal, setModal] = useState<ModalKind>(null);

  // Interdit l'auto-délégation (le protocole rejette SelfDelegation).
  // Sur son propre validateur → utiliser Bond (self-stake) à la place.
  const { wallet } = useWalletStore();
  const isSelfValidator =
    !!wallet &&
    !!validator &&
    wallet.identity.addressHex.toLowerCase() === validator.address.toLowerCase();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }
  if (isError || !validator) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {isError ? error.message : t.validators.notFound}
        </div>
      </div>
    );
  }

  const myDelegation = myDelegations?.find((d) => d.validator === validator.address);
  const myBondedBaseUnits = myDelegation ? BigInt(myDelegation.bonded) : 0n;
  const myRewardsBaseUnits = myDelegation ? BigInt(myDelegation.pendingRewards) : 0n;
  const walletBalance = account ? BigInt(account.balance) : 0n;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/validators"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {t.validators.backToList}
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        {t.validators.detailTitle}
      </h1>

      {/* Carte info */}
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.validators.colAddress}
          </span>
          {validator.jailed ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              {t.validators.jailed}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
              {t.validators.active}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs">{validator.address}</p>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t.validators.selfStake}</dt>
            <dd>{formatSango(validator.selfStake)} SANGO</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.validators.totalDelegated}</dt>
            <dd>{formatSango(validator.totalDelegated)} SANGO</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.validators.votingPower}</dt>
            <dd>{formatSango(validator.votingPower)} SANGO</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.validators.commission}</dt>
            <dd>{(validator.commissionBps / 100).toFixed(2)} %</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.validators.downtimeMissed}</dt>
            <dd>{validator.downtimeMissed}</dd>
          </div>
        </dl>
      </div>

      {/* Ma délégation */}
      {myDelegation && (
        <div className="mt-4 rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold">{t.validators.myPosition}</h2>
          <dl className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t.validators.bonded}</dt>
              <dd>{formatSango(myDelegation.bonded)} SANGO</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t.validators.unbonding}</dt>
              <dd>{formatSango(myDelegation.unbonding)} SANGO</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t.validators.rewards}</dt>
              <dd>{formatSango(myDelegation.pendingRewards)} SANGO</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Actions */}
            {isSelfValidator && (
        <ValidatorActionsPanel
          validator={validator}
          onBond={() => setModal("bond")}
          onUnbond={() => setModal("unbond")}
          onUpdateCommission={() => setModal("commission")}
          onUnjail={() => void unjail.mutateAsync()}
          pending={{
            bond: bond.isPending,
            unbond: unbond.isPending,
            updateCommission: updateCommission.isPending,
            unjail: unjail.isPending,
          }}
        />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModal("delegate")}
          disabled={delegate.isPending || isSelfValidator}
          title={
            isSelfValidator
              ? "Auto-délégation interdite — utilise Bond à la place"
              : undefined
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Coins className="size-4" /> {t.validators.delegate}
        </button>
        {/* Panneau proprio validateur */}


        {myBondedBaseUnits > 0n && (
          <button
            type="button"
            onClick={() => setModal("undelegate")}
            disabled={undelegate.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium disabled:opacity-50"
          >
            <Undo2 className="size-4" /> {t.validators.undelegate}
          </button>
        )}

        {myRewardsBaseUnits > 0n && (
          <button
            type="button"
            onClick={() => void claim.mutateAsync({ validator: validator.address })}
            disabled={claim.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium disabled:opacity-50"
          >
            <Coins className="size-4" /> {t.validators.claim} ({formatSango(myRewardsBaseUnits)})
          </button>
        )}

        {validator.jailed && (
          <button
            type="button"
            onClick={() => void unjail.mutateAsync()}
            disabled={unjail.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium disabled:opacity-50"
          >
            <ShieldAlert className="size-4" /> {t.validators.unjail}
          </button>
        )}
      </div>

      {/* Modales */}
      <StakeModal
        mode="amount"
        open={modal === "delegate"}
        title={t.validators.delegate}
        submitLabel={t.validators.delegate}
        pending={delegate.isPending}
        max={walletBalance}
        onSubmit={async (amount) => {
          await delegate.mutateAsync({ validator: validator.address, amountBaseUnits: amount });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />

      <StakeModal
        mode="amount"
        open={modal === "undelegate"}
        title={t.validators.undelegate}
        submitLabel={t.validators.undelegate}
        pending={undelegate.isPending}
        max={myBondedBaseUnits}
        hint={t.validators.unbondingHint}
        onSubmit={async (amount) => {
          await undelegate.mutateAsync({ validator: validator.address, amountBaseUnits: amount });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <StakeModal
        mode="amount"
        open={modal === "bond"}
        title={t.staking.bondTitle}
        submitLabel={t.staking.bond}
        pending={bond.isPending}
        hint={t.staking.bondHint}
        max={account ? BigInt(account.balance) : undefined}
        onSubmit={async (amount) => {
          await bond.mutateAsync({ amountBaseUnits: amount });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />

      <StakeModal
        mode="amount"
        open={modal === "unbond"}
        title={t.staking.unbondTitle}
        submitLabel={t.staking.unbond}
        pending={unbond.isPending}
        hint={t.staking.unbondHint}
        max={BigInt(validator.selfStake)}
        onSubmit={async (amount) => {
          await unbond.mutateAsync({ amountBaseUnits: amount });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />

      <StakeModal
        mode="commission"
        open={modal === "commission"}
        title={t.staking.updateCommissionTitle}
        submitLabel={t.staking.updateCommission}
        pending={updateCommission.isPending}
        hint={t.staking.updateCommissionHint}
        initialValue={(validator.commissionBps / 100).toFixed(0)}
        maxPct={10}
        onSubmit={async (bps) => {
          await updateCommission.mutateAsync({ newCommissionBps: bps });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />

    </div>
  );
}

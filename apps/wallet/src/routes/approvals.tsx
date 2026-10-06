import type { Address, Token } from "@sango/wallet-chains";
import { MAX_UINT256 } from "@sango/wallet-chains";
import {
  ArrowLeft,
  CheckCircle2,
  Infinity as InfinityIcon,
  ShieldAlert,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { MainnetWarning } from "@/features/evm/mainnet-warning";
import { useApproveEvm } from "@/hooks/use-approve-evm";
import { useEvmAllowance } from "@/hooks/use-evm-allowance";
import { useEvmTokens } from "@/hooks/use-evm-tokens";
import { formatTokenAmount, isValidEvmAddress, parseTokenAmount } from "@/lib/eth";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Page `/approvals` — E2.2.a.3.
 *
 * **Vérification et gestion manuelle** d'une allowance ERC-20. Pas de
 * découverte automatique : l'utilisateur choisit un token parmi ceux
 * configurés pour le réseau courant, puis saisit le spender. La lecture
 * et les actions n'apparaissent qu'une fois les deux valides.
 *
 * **Scope v1** :
 *   - page vierge (pas de query params, pas de deep-link)
 *   - pas de "liste de mes approvals" (nécessiterait un indexeur)
 *   - pas de lien dans la sidebar → accessible via le footer de
 *     `AssetListEvm` (lien "Gérer les approbations →")
 *
 * Actions proposées :
 *   - **Révoquer** (approve 0n)
 *   - **Montant exact** (input + bouton)
 *   - **Illimité** (MAX_UINT256)
 *
 * ⚠️ L'adresse zéro (`0x000…000`) est **bloquée** : autoriser un
 *    spender nul n'a aucune utilité et signale une erreur utilisateur.
 *    Le warning est explicite et les boutons sont désactivés.
 */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function ApprovalsRoute() {
  const networkId = useWalletStore((s) => s.networkId);
  const { data: tokensWithBalance, isLoading: tokensLoading } = useEvmTokens();
  const approve = useApproveEvm();

  const availableTokens = (tokensWithBalance ?? []).map((t) => t.token);

  const [selectedContract, setSelectedContract] = useState("");
  const [spender, setSpender] = useState("");
  const [exactAmount, setExactAmount] = useState("");

  const selectedToken: Token | null =
    availableTokens.find((t) => t.contract === selectedContract) ?? null;
  const spenderTrimmed = spender.trim();
  const spenderValid = isValidEvmAddress(spenderTrimmed);
  const spenderIsZero = spenderTrimmed.toLowerCase() === ZERO_ADDRESS;
  const readyForRead =
    selectedToken !== null && spenderValid && !spenderIsZero;

  const { data: allowanceData, isLoading: allowanceLoading } = useEvmAllowance(
    readyForRead ? selectedToken : null,
    readyForRead ? (spenderTrimmed as Address) : null,
  );

  const allowance: bigint | null = allowanceData?.amount ?? null;
  const isZero = allowance === 0n;
  const isUnlimited = allowance === MAX_UINT256;

  function formatAllowance(a: bigint, token: Token): string {
    if (a === 0n) return "Aucune autorisation";
    if (a === MAX_UINT256) return "Illimité";
    return `${formatTokenAmount(a, token.metadata.decimals)} ${token.metadata.symbol}`;
  }

  async function onRevoke() {
    if (!selectedToken || !spenderValid || spenderIsZero) return;
    await approve.mutateAsync({
      token: selectedToken,
      spender: spenderTrimmed as Address,
      amountBaseUnits: 0n,
    });
  }

  async function onApproveExact(e: FormEvent) {
    e.preventDefault();
    if (!selectedToken || !spenderValid || spenderIsZero || !exactAmount) return;
    let amount: bigint;
    try {
      amount = parseTokenAmount(exactAmount, selectedToken.metadata.decimals);
    } catch {
      return;
    }
    await approve.mutateAsync({
      token: selectedToken,
      spender: spenderTrimmed as Address,
      amountBaseUnits: amount,
    });
    setExactAmount("");
  }

  async function onApproveUnlimited() {
    if (!selectedToken || !spenderValid || spenderIsZero) return;
    await approve.mutateAsync({
      token: selectedToken,
      spender: spenderTrimmed as Address,
      amountBaseUnits: MAX_UINT256,
    });
  }

  const buttonsDisabled = approve.isPending || spenderIsZero;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour au tableau de bord
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        Gérer une approbation
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Vérifie ou modifie l&apos;autorisation donnée à un contrat
        d&apos;utiliser tes tokens.
      </p>

      <MainnetWarning networkId={networkId} className="mt-4" />

      {tokensLoading ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : availableTokens.length === 0 ? (
        <div className="mt-6 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun token configuré sur ce réseau.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium">Token</span>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Sélectionner un token —</option>
              {availableTokens.map((t) => (
                <option key={t.contract} value={t.contract}>
                  {t.metadata.symbol} — {t.metadata.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium">Contrat (spender)</span>
            <input
              type="text"
              value={spender}
              onChange={(e) => setSpender(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {spenderTrimmed && !spenderValid && (
              <p className="mt-1 text-[11px] text-destructive">
                Adresse invalide — format attendu : 0x suivi de 40
                caractères hexadécimaux.
              </p>
            )}
          </label>

          {spenderIsZero && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-[11px] text-destructive">
              <ShieldAlert className="mt-0.5 size-3 shrink-0" />
              <span>
                L&apos;adresse zéro (<code>0x000…000</code>) ne peut pas
                dépenser tes tokens. Choisis l&apos;adresse du contrat
                avec lequel tu interagis.
              </span>
            </div>
          )}

          {readyForRead && selectedToken && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Autorisation actuelle
              </p>

              {allowanceLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">Lecture…</p>
              ) : allowance !== null ? (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    {isUnlimited && (
                      <InfinityIcon className="size-5 text-amber-500" />
                    )}
                    {isZero && (
                      <CheckCircle2 className="size-5 text-muted-foreground" />
                    )}
                    <span className="font-mono text-lg font-semibold">
                      {formatAllowance(allowance, selectedToken)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {!isZero && (
                      <button
                        type="button"
                        onClick={onRevoke}
                        disabled={buttonsDisabled}
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Révoquer ({selectedToken.metadata.symbol})
                      </button>
                    )}

                    <form onSubmit={onApproveExact} className="flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={exactAmount}
                        onChange={(e) => setExactAmount(e.target.value)}
                        placeholder={`Montant exact (${selectedToken.metadata.symbol})`}
                        className="flex h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <button
                        type="submit"
                        disabled={buttonsDisabled || !exactAmount}
                        className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        Approuver
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={onApproveUnlimited}
                      disabled={buttonsDisabled || isUnlimited}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400"
                    >
                      <InfinityIcon className="size-4" />
                      Approuver un montant illimité
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { evmNetworkById } from "@sango/wallet-chains";
import { Check, RotateCcw, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { probeEvmEndpoint } from "@/lib/probe-evm-endpoint";
import { redactUrl } from "@/lib/redact-url";
import { useEvmRpcStore } from "@/stores/evm-rpc-store";

/**
 * **Phase 12-A** — Panneau RPC custom pour un réseau EVM.
 *
 * Monté dans le `footer` d'`EvmNetworkSelector`. N'apparaît pas dans
 * le sélecteur Bitcoin (pas de custom endpoint Bitcoin en Phase 12).
 *
 * **Flow** :
 *   1. Saisie URL.
 *   2. `probeEvmEndpoint(url, network.chainId)` → POST `eth_chainId`.
 *   3. Si OK → `evmRpcStore.setCustomEndpoint` → session rebuild.
 *   4. Si KO → toast d'erreur, aucune écriture.
 *
 * **Redaction** : toute URL affichée ou loggée passe par
 * `redactUrl()` (masque `?apikey=`, `user:pass@`, …).
 */
export function EvmCustomRpcPanel({
  networkId,
}: {
  readonly networkId: string;
}) {
  const t = useTranslation();
  const network = evmNetworkById(networkId);
  const custom = useEvmRpcStore((s) => s.customEndpoints[networkId]);
  const setCustomEndpoint = useEvmRpcStore((s) => s.setCustomEndpoint);
  const clearCustomEndpoint = useEvmRpcStore((s) => s.clearCustomEndpoint);

  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(custom ?? "");
  const [busy, setBusy] = useState(false);

  if (!network) return null;

  async function onSave() {
    if (!network) return;
    const url = draft.trim();
    if (!/^https?:\/\/.+/.test(url)) {
      toast.error(t.settings.evmRpc.errors.invalidUrl);
      return;
    }
    setBusy(true);
    const result = await probeEvmEndpoint(url, network.chainId);
    setBusy(false);
    if (!result.ok) {
      toast.error(t.settings.evmRpc.errors.probeFailed, {
        description: result.message,
      });
      return;
    }
    setCustomEndpoint(networkId, url);
    toast.success(t.settings.evmRpc.saved, {
      description: redactUrl(url),
    });
  }

  function onReset() {
    clearCustomEndpoint(networkId);
    setDraft("");
    toast.success(t.settings.evmRpc.reset);
  }

  return (
    <div className="mt-2 border-t pt-2">
      <button
        type="button"
        data-testid="evm-custom-rpc-trigger"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings2 className="size-3" />
        <span className="truncate">
          {custom
            ? t.settings.evmRpc.configured.replace("{url}", redactUrl(custom))
            : t.settings.evmRpc.configure}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <input
            type="url"
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.settings.evmRpc.placeholder}
            data-testid="evm-custom-rpc-input"
            className="flex h-8 w-full rounded-lg border bg-background px-2 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">
            {t.settings.evmRpc.help.replace(
              "{chainId}",
              String(Number.parseInt(network.chainId, 16)),
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={busy || !draft.trim()}
              data-testid="evm-custom-rpc-save"
              className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-primary text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-3" />
              {busy ? t.settings.evmRpc.testing : t.settings.evmRpc.testAndSave}
            </button>
            {custom && (
              <button
                type="button"
                onClick={onReset}
                data-testid="evm-custom-rpc-reset"
                title={t.settings.evmRpc.resetLabel}
                className="inline-flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { SangoClient } from "@sango/sdk";
import type { Network } from "@sango/types";
import { Check, Globe, RotateCcw, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/i18n/use-translation";
import { NETWORK_ENDPOINTS } from "@/lib/config";
import { useSdkStore } from "@/stores/sdk-store";

type Mode = "preset-testnet" | "preset-mainnet" | "custom";

function modeOf(
  network: Network,
  customEndpoint: string | null,
): Mode {
  if (customEndpoint) return "custom";
  if (network === "mainnet") return "preset-mainnet";
  return "preset-testnet";
}

/**
 * Sélecteur de réseau + endpoint custom.
 *
 * Trois modes :
 *  - Preset Testnet (devnet local) — endpoint par défaut
 *  - Preset Mainnet — désactivé tant qu'aucune URL n'est publiée
 *  - Custom — l'utilisateur saisit n'importe quelle URL RPC
 *
 * En mode Custom, la connexion est testée (appel `sango_chainId`) avant
 * sauvegarde pour éviter de figer une URL injoignable.
 */
export function NetworkSelector() {
  const t = useTranslation();
  const {
    network,
    customEndpoint,
    setPresetNetwork,
    setCustomEndpoint,
    clearCustom,
  } = useSdkStore();

  const [mode, setMode] = useState<Mode>(modeOf(network, customEndpoint));
  const [draftUrl, setDraftUrl] = useState(customEndpoint ?? "");
  const [testing, setTesting] = useState(false);

  // Resynchronise le mode quand le store change (ex: rehydratation).
  useEffect(() => {
    setMode(modeOf(network, customEndpoint));
    if (customEndpoint) setDraftUrl(customEndpoint);
  }, [network, customEndpoint]);

  function handleModeChange(next: Mode) {
    setMode(next);
    if (next === "preset-testnet") {
      setPresetNetwork("testnet");
    } else if (next === "preset-mainnet") {
      setPresetNetwork("mainnet");
    }
    // "custom" : on attend le test & save
  }

  async function handleTestAndSave() {
    const url = draftUrl.trim();
    if (!/^https?:\/\/.+/.test(url)) {
      toast.error(t.networkSelector.invalidUrl);
      return;
    }
    setTesting(true);
    try {
      // Probe directe (CORS activé côté nœud).
      const probe = new SangoClient({ endpoint: url, network });
      const chainId = await probe.getChainId();
      setCustomEndpoint(url);
      toast.success(
        `${t.networkSelector.connectionOk} — ${chainId.slice(0, 10)}…`,
      );
    } catch (err) {
      toast.error(t.networkSelector.connectionFailed, {
        description: (err as Error).message,
      });
    } finally {
      setTesting(false);
    }
  }

  function handleClearCustom() {
    setDraftUrl("");
    setMode("preset-testnet");
    clearCustom();
  }

  const mainnetAvailable = Boolean(NETWORK_ENDPOINTS.mainnet);
  const activeEndpoint = customEndpoint ?? NETWORK_ENDPOINTS[network] ?? "—";

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Globe className="size-3" />
        {t.networkSelector.label}
      </div>

      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as Mode)}
        className="mt-2 flex h-9 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="preset-testnet">{t.networkSelector.testnet}</option>
        <option value="preset-mainnet" disabled={!mainnetAvailable}>
          {t.networkSelector.mainnet}
          {!mainnetAvailable ? ` — ${t.networkSelector.notDeployed}` : ""}
        </option>
        <option value="custom">{t.networkSelector.custom}</option>
      </select>

      {mode === "custom" && (
        <div className="mt-3 space-y-2">
          <input
            type="url"
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder={t.networkSelector.customPlaceholder}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground">
            {t.networkSelector.customHelp}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={testing || !draftUrl.trim()}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-3.5" />
              {testing ? t.networkSelector.testing : t.networkSelector.testAndSave}
            </button>
            {customEndpoint && (
              <button
                type="button"
                onClick={handleClearCustom}
                title={t.networkSelector.clearCustom}
                className="inline-flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Server className="size-3 shrink-0" />
        <code className="truncate font-mono">{activeEndpoint}</code>
      </div>
    </div>
  );
}

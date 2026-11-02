import { Keyring, Wallet } from "@sango/wallet-core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AuthShell } from "@/components/branding/auth-shell";
import { PasswordStrength } from "@/components/branding/password-strength";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";
import { useSdkStore } from "@/stores/sdk-store";

/** Convertit un hex strict (64 chars, [0-9a-fA-F]) en Uint8Array. */
function hexToSeedBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 64) {
    throw new Error("invalid-seed-length");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("invalid-seed-chars");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function ImportSangoWallet() {
  const navigate = useNavigate();
  const t = useTranslation();
  const addWallet = useWalletStore((s) => s.addWallet);
  const { network } = useSdkStore();

  const [seedHex, setSeedHex] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onImport() {
    const trimmed = seedHex.trim();
    if (!trimmed) {
      return toast.error(t.onboarding.import.legacyEmptySeed);
    }
    if (password.length < 8) {
      return toast.error(t.onboarding.import.legacyPasswordTooShort);
    }

    setBusy(true);
    let seed: Uint8Array | null = null;
    try {
      try {
        seed = hexToSeedBytes(trimmed);
      } catch {
        // Message générique : ne pas exposer "invalid-seed-length" ni
        // "invalid-seed-chars" (l'utilisateur sait ce qu'il a saisi).
        toast.error(t.onboarding.import.legacyError);
        return;
      }

      const wallet = await Wallet.fromSeed(seed, network);

      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();
      const id = wallet.identity.addressHex.toLowerCase();
      const trimmedLabel =
        label.trim() || t.onboarding.create.fallbackLabel;
      const createdAt = Date.now();

      await keyring.put({
        id,
        label: trimmedLabel,
        format: "sango-legacy",
        networkId: "sango-devnet",
        stored,
        createdAt,
      });
      keyring.close();

      addWallet({
        id,
        wallet,
        format: "sango-legacy",
        networkId: "sango-devnet",
        label: trimmedLabel,
        createdAt,
      });

      toast.success(t.onboarding.import.legacyImported);
      navigate("/");
    } catch {
      toast.error(t.onboarding.import.legacyError);
    } finally {
      // ⚠️ Zéroïsation garantie même si Wallet.fromSeed throw.
      if (seed) seed.fill(0);
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={t.onboarding.import.legacyTitle}
      subtitle={t.onboarding.import.legacySubtitle}
      backTo="/import"
      logoSize={56}
    >
      <div className="mt-6 space-y-3">
        <textarea
          value={seedHex}
          onChange={(e) => setSeedHex(e.target.value)}
          placeholder={t.onboarding.import.legacySeedPlaceholder}
          rows={3}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.onboarding.import.legacyLabelPlaceholder}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.onboarding.import.legacyPasswordPlaceholder}
          autoComplete="new-password"
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <PasswordStrength password={password} />
        <button
          type="button"
          onClick={onImport}
          disabled={busy || !seedHex.trim()}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
        >
          {busy
            ? t.onboarding.import.legacyImporting
            : t.onboarding.import.legacySubmit}
        </button>
      </div>
    </AuthShell>
  );
}
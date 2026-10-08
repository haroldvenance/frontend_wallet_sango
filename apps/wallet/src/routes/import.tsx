import { Bip39Wallet, Keyring, validateMnemonic } from "@sango/wallet-core";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AuthShell } from "@/components/branding/auth-shell";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Import d'un portefeuille BIP-39 — Phase 5.3 (Trust Wallet model).
 *
 * Une seule mnemonic → N chaînes (SANGO + EVM + Bitcoin). Le wallet
 * importé est une identité HD universelle.
 *
 * **D-Phase5-3** :
 *   - D5.3-b·B — `networkId` initial = "ethereum-mainnet" (réseau
 *     d'affichage, pas de famille).
 *   - D5.3-e·A — label optionnel.
 *   - D5.3-i·A — un lien discret mène vers `/import-sango` pour
 *     restaurer un ancien wallet SANGO legacy (V1 Ed25519).
 */
const INITIAL_NETWORK_ID = "ethereum-mainnet";

export function ImportUnified() {
  const navigate = useNavigate();
  const t = useTranslation();
  const addWallet = useWalletStore((s) => s.addWallet);

  const [mnemonic, setMnemonic] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onImport() {
    const trimmed = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    if (!trimmed) {
      return toast.error(t.onboarding.import.emptyMnemonic);
    }
    if (!validateMnemonic(trimmed)) {
      return toast.error(t.onboarding.import.invalidMnemonic, {
        description: t.onboarding.import.invalidMnemonicDesc,
      });
    }
    if (password.length < 8) {
      return toast.error(t.onboarding.import.passwordTooShort);
    }

    setBusy(true);
    try {
      const wallet = await Bip39Wallet.fromMnemonic(trimmed);
      // Jette la référence locale à la mnemonic.
      setMnemonic("");

      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();
      const id = wallet.defaultAddress.toLowerCase();
      const trimmedLabel =
        label.trim() || t.onboarding.create.fallbackLabel;
      const createdAt = Date.now();

      await keyring.put({
        id,
        label: trimmedLabel,
        format: "bip39",
        networkId: INITIAL_NETWORK_ID,
        stored,
        createdAt,
      });
      keyring.close();

      // addWallet préserve les wallets existants.
      addWallet({
        id,
        wallet,
        format: "bip39",
        networkId: INITIAL_NETWORK_ID,
        label: trimmedLabel,
        createdAt,
      });

      toast.success(t.onboarding.import.imported);
      navigate("/");
    } catch (err) {
      toast.error(t.onboarding.import.error, {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={t.onboarding.import.title}
      subtitle={t.onboarding.import.subtitle}
      backTo="/welcome"
      logoSize={56}
    >
      <div className="mt-6 space-y-3">
        <textarea
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder={t.onboarding.import.mnemonicPlaceholder}
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
          placeholder={t.onboarding.import.labelPlaceholder}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.onboarding.import.passwordPlaceholder}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onImport}
          disabled={busy || !mnemonic.trim()}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t.onboarding.import.importing : t.onboarding.import.button}
        </button>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          {t.onboarding.import.legacyNotice}{" "}
          <Link
            to="/import-sango"
            className="font-medium text-primary hover:underline"
          >
            {t.onboarding.import.legacyLink}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

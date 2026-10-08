import { Bip39Wallet, Keyring, validateMnemonic } from "@sango/wallet-core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DEFAULT_EVM_NETWORK_ID } from "@sango/wallet-chains";

import { AuthShell } from "@/components/branding/auth-shell";
import { EvmNetworkSelector } from "@/features/evm/evm-network-selector";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Import d'un wallet BIP-39 (EVM, E1).
 *
 * L'utilisateur colle sa phrase de récupération (12/24 mots). Le wallet
 * n'est jamais construit avec la mnemonic conservée : `fromMnemonic`
 * dérive le seed et jette la référence (D-HD-1).
 *
 * **E2.3.a.2** : le réseau par défaut est choisi via
 * `EvmNetworkSelector` en mode controlled (D-E2.3-2), initialisé à
 * `ethereum-sepolia` (D-E2.3-1). La persistance de session ne
 * contamine jamais ce défaut.
 */
export function ImportEvmWallet() {
  const navigate = useNavigate();
  const { unlock } = useWalletStore();

  const [mnemonic, setMnemonic] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(
    DEFAULT_EVM_NETWORK_ID,
  );
  const [busy, setBusy] = useState(false);

  async function onImport() {
    const trimmed = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    if (!trimmed) return toast.error("Phrase de récupération vide");
    if (!validateMnemonic(trimmed)) {
      return toast.error("Phrase invalide", {
        description:
          "Vérifie les mots et l'ordre — 12 ou 24 mots du wordlist BIP-39 anglais.",
      });
    }
    if (password.length < 8) {
      return toast.error("Mot de passe : 8 caractères minimum");
    }

    setBusy(true);
    try {
      const wallet = await Bip39Wallet.fromMnemonic(trimmed);
      // Jette la référence locale à la mnemonic.
      setMnemonic("");

      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();
      const id = wallet.defaultAddress.toLowerCase();
      const trimmedLabel = label.trim() || "EVM wallet importé";
      const createdAt = Date.now();
      await keyring.put({
        id,
        label: trimmedLabel,
        format: "bip39",
        networkId: selectedNetworkId,
        stored,
        createdAt,
      });
      keyring.close();

      // Phase 3.5 — forme canonique (l'ancienne forme mono-wallet a
      // été retirée).
      unlock({
        wallets: [
          {
            id,
            wallet,
            format: "bip39",
            networkId: selectedNetworkId,
            label: trimmedLabel,
            createdAt,
          },
        ],
      });
      toast.success("Wallet EVM importé");
      navigate("/");
    } catch (err) {
      toast.error("Erreur d'import", {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Importer un wallet EVM"
      subtitle="Colle ta phrase de récupération BIP-39 (12 ou 24 mots, séparés par des espaces)."
      backTo="/welcome"
      logoSize={56}
    >
      <div className="mt-6 space-y-3">
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Réseau EVM
          </span>
          <div className="mt-1">
            <EvmNetworkSelector
              value={selectedNetworkId}
              onChange={setSelectedNetworkId}
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Le wallet sera importé avec ce réseau par défaut. Tu pourras
            en changer en session depuis les Paramètres.
          </span>
        </div>

        <textarea
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          placeholder="word1 word2 word3 …"
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
          placeholder="Nom du wallet (optionnel)"
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (min 8 caractères)"
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onImport}
          disabled={busy || !mnemonic.trim()}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Import…" : "Importer"}
        </button>
      </div>
    </AuthShell>
  );
}

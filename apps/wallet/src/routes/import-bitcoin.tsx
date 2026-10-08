import { Bip39Wallet, Keyring, validateMnemonic } from "@sango/wallet-core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AuthShell } from "@/components/branding/auth-shell";
import { BitcoinNetworkSelector } from "@/features/bitcoin/bitcoin-network-selector";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Import d'un wallet BIP-39 Bitcoin — Phase 3.4 (D28·A).
 *
 * Symétrique de `import-evm.tsx` : la mnemonic est dérivée puis jetée
 * (D-HD-1). Le réseau est choisi via `BitcoinNetworkSelector`
 * (testnet par défaut, mainnet optionnel).
 */
export function ImportBitcoinWallet() {
  const navigate = useNavigate();
  const { unlock } = useWalletStore();

  const [mnemonic, setMnemonic] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [networkId, setNetworkId] = useState("bitcoin-testnet");
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
      setMnemonic("");

      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();
      const id = wallet.defaultAddress.toLowerCase();
      const trimmedLabel = label.trim() || "Bitcoin wallet importé";
      const createdAt = Date.now();

      await keyring.put({
        id,
        label: trimmedLabel,
        format: "bip39",
        networkId,
        stored,
        createdAt,
      });
      keyring.close();

      unlock({
        wallets: [
          {
            id,
            wallet,
            format: "bip39",
            networkId,
            label: trimmedLabel,
            createdAt,
          },
        ],
      });
      toast.success("Wallet Bitcoin importé");
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
      title="Importer un wallet Bitcoin"
      subtitle="Colle ta phrase de récupération BIP-39 (12 ou 24 mots, séparés par des espaces)."
      backTo="/import"
      logoSize={56}
    >
      <div className="mt-6 space-y-3">
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Réseau Bitcoin
          </span>
          <div className="mt-1">
            <BitcoinNetworkSelector
              value={networkId}
              onChange={setNetworkId}
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Choisis testnet3 pour tester, mainnet pour de vrais fonds.
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

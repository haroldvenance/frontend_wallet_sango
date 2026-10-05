import { Bip39Wallet, Keyring } from "@sango/wallet-core";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DEFAULT_EVM_NETWORK_ID } from "@sango/wallet-chains";

import { AuthShell } from "@/components/branding/auth-shell";
import { EvmNetworkSelector } from "@/features/evm/evm-network-selector";
import { useClipboard } from "@/hooks/use-clipboard";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Création d'un wallet BIP-39 (EVM, E1.5).
 *
 * Format BIP-39 (D-HD-1) : mnemonic 12 mots, seed 64 bytes, dérivation
 * EVM via BIP-44 m/44'/60'/0'/0/0. Nouvelle famille de wallet, distincte
 * du legacy SANGO Ed25519.
 *
 * **E2.3.a.2** : le réseau par défaut est choisi via
 * `EvmNetworkSelector` en mode controlled (D-E2.3-2). La valeur est
 * passée à `keyring.put` et à `unlock` — le wallet est créé avec ce
 * `networkId`. Le sélecteur n'écrit PAS dans le store tant que la
 * session n'existe pas.
 *
 * Défaut : `ethereum-sepolia` (D-E2.3-1). Toujours, quelle que soit
 * la préférence persistée de session — create/import ne doit pas être
 * contaminé par la persistance.
 *
 * ⚠️ La mnemonic est affichée **une seule fois** puis jetée — elle
 *    n'est jamais stockée dans le wallet (D-HD-1).
 */
export function CreateEvmWallet() {
  const navigate = useNavigate();
  const { unlock } = useWalletStore();
  const copy = useClipboard();

  const [step, setStep] = useState<"form" | "reveal">("form");
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(
    DEFAULT_EVM_NETWORK_ID,
  );
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Bip39Wallet | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGenerate() {
    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setBusy(true);
    try {
      const { wallet: w, mnemonic: m } = await Bip39Wallet.generate();
      setMnemonic(m);
      setWallet(w);
      setStep("reveal");
    } catch (err) {
      toast.error("Erreur de génération", {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  async function onPersist() {
    if (!wallet) return;
    setBusy(true);
    try {
      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();
      const id = wallet.defaultAddress.toLowerCase();
      await keyring.put({
        id,
        label: label.trim() || "EVM wallet",
        format: "bip39",
        networkId: selectedNetworkId,
        stored,
        createdAt: Date.now(),
      });
      keyring.close();

      unlock({
        wallet,
        id,
        format: "bip39",
        networkId: selectedNetworkId,
      });
      // Jette la référence à la mnemonic avant navigation.
      setMnemonic(null);
      toast.success("Wallet EVM créé et sauvegardé");
      navigate("/");
    } catch (err) {
      toast.error("Impossible de sauvegarder", {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  if (step === "reveal" && mnemonic) {
    const words = mnemonic.split(" ");
    return (
      <AuthShell
        title="Sauvegarde ta phrase de récupération"
        subtitle="12 mots, dans l'ordre. Elle ne sera plus jamais affichée. Note-la dans un endroit sûr — ne la partage avec personne."
        logoSize={56}
      >
        <div className="mt-6 rounded-2xl border bg-card p-4">
          <div className="grid grid-cols-3 gap-2">
            {words.map((w, i) => (
              <div
                key={i}
                className="flex items-baseline gap-1.5 rounded-lg border bg-muted/30 px-2 py-1.5"
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="font-mono text-xs">{w}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              copy(mnemonic, "Phrase copiée (effacée dans 30 s)")
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border bg-background py-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Copy className="size-3.5" />
            Copier la phrase
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nom du wallet (optionnel)"
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={onPersist}
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-4" />
            {busy ? "Sauvegarde…" : "J'ai noté ma phrase, continuer"}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Créer un wallet EVM"
      subtitle="Un wallet BIP-39 (secp256k1) compatible Ethereum, Base et Arbitrum. Chiffré localement en AES-GCM 256."
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
            Le wallet sera créé avec ce réseau par défaut. Tu pourras en
            changer en session depuis les Paramètres.
          </span>
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe (min 8 caractères)"
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={showPassword ? "Masquer" : "Afficher"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Génération…" : "Générer la phrase de récupération"}
        </button>

        <div className="pt-2 text-center text-xs text-muted-foreground">
          Tu as déjà une phrase ?{" "}
          <Link
            to="/import-evm"
            className="font-medium text-primary hover:underline"
          >
            Importer
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

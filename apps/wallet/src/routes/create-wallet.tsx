import { Keyring, Wallet } from "@sango/wallet-core";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useClipboard } from "@/hooks/use-clipboard";
import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CreateWallet() {
  const navigate = useNavigate();
  const { unlock } = useWalletStore();
  const { network } = useSdkStore();
  const copy = useClipboard();

  const [step, setStep] = useState<"form" | "reveal">("form");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seedHex, setSeedHex] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate() {
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
      // On génère le seed nous-mêmes pour pouvoir l'afficher une seule fois.
      const seed = crypto.getRandomValues(new Uint8Array(32));
      const w = await Wallet.fromSeed(seed, network);
      const seedStr = bytesToHex(seed);
      seed.fill(0);

      setSeedHex(seedStr);
      setWallet(w);
      setStep("reveal");
    } catch (err) {
      toast.error("Erreur de création", { description: (err as Error).message });
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
      const id = wallet.identity.addressHex.toLowerCase();
      await keyring.put({
        id,
        label: label.trim() || "Mon wallet",
        network,
        stored,
        createdAt: Date.now(),
      });
      keyring.close();

      unlock(wallet, id, network);
      toast.success("Wallet créé et sauvegardé");
      navigate("/");
    } catch (err) {
      toast.error("Impossible de sauvegarder", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (step === "reveal" && seedHex) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">
          Sauvegarde ton seed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce seed de 32 bytes est le seul moyen de restaurer ton wallet.
          Note-le dans un endroit sûr. Il ne sera plus jamais affiché.
        </p>

        <div className="mt-6 flex items-start gap-2 rounded-2xl border bg-card p-4">
          <code className="break-all font-mono text-xs leading-6">{seedHex}</code>
          <button
            type="button"
            onClick={() => copy(`0x${seedHex}`, "Seed copié (effacé dans 30 s)")}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent"
            aria-label="Copier le seed"
          >
            <Copy className="size-4" />
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
            {busy ? "Sauvegarde…" : "J'ai noté mon seed, continuer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link
        to="/welcome"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour
      </Link>

      <h1 className="mt-6 text-xl font-semibold tracking-tight">
        Créer un wallet
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choisis un mot de passe pour chiffrer ton wallet localement (AES-GCM 256).
      </p>

      <div className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (min 8 caractères)"
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Génération…" : "Générer le wallet"}
        </button>
      </div>
    </div>
  );
}

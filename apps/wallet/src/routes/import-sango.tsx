import { Keyring, Wallet } from "@sango/wallet-core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useSdkStore } from "@/stores/sdk-store";
import { useWalletStore } from "@/stores/wallet-store";
import { AuthShell } from "@/components/branding/auth-shell";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 64) throw new Error("Seed must be 64 hex chars (32 bytes)");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function ImportWallet() {
  const navigate = useNavigate();
  const { unlock } = useWalletStore();
  const { network } = useSdkStore();

  const [seedHex, setSeedHex] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onImport() {
    if (password.length < 8) return toast.error("Mot de passe : 8 caractères minimum");
    setBusy(true);
    try {
      const seed = hexToBytes(seedHex.trim());
      const wallet = await Wallet.fromSeed(seed, network);
      seed.fill(0);

      const stored = await wallet.exportEncrypted(password);
      const keyring = await Keyring.open();
      const id = wallet.identity.addressHex.toLowerCase();
      await keyring.put({
        id,
        label: label.trim() || "Wallet importé",
        format: "sango-legacy",
        networkId: "sango-devnet",
        stored,
        createdAt: Date.now(),
      });
      keyring.close();

      unlock({
        wallet,
        id,
        format: "sango-legacy",
        networkId: "sango-devnet",
        network,
      });
      toast.success("Wallet importé");
      navigate("/");
    } catch (err) {
      toast.error("Erreur d'import", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Importer un wallet"
      subtitle="Colle ton seed Ed25519 (32 bytes, 64 hex chars, avec ou sans 0x)."
      backTo="/welcome"
      logoSize={56}
    >

      <div className="mt-6 space-y-3">
        <textarea
          value={seedHex}
          onChange={(e) => setSeedHex(e.target.value)}
          placeholder="0x… ou …"
          rows={3}
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
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Import…" : "Importer"}
        </button>
      </div>
    </AuthShell>
  );
}

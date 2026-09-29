import { ExternalLink } from "lucide-react";

import { explorerTxUrl } from "@/lib/explorer";

interface Props {
  /** Hash de transaction (0x…). */
  hash: string;
  /** Label affiché. Défaut : "Voir sur l'explorer". */
  label?: string;
  /** Style : `default` (avec icône) ou `plain` (texte souligné). */
  variant?: "default" | "plain";
}

/**
 * Lien inline vers l'explorer pour une transaction.
 *
 * Pensé pour être utilisé dans les toasts de confirmation (sonner).
 * Ouvre dans un nouvel onglet avec rel="noopener noreferrer".
 *
 * Usage :
 *   toast.success("Transaction envoyée", {
 *     description: <ExplorerLink hash={txHash} />,
 *   });
 */
export function ExplorerLink({
  hash,
  label = "Voir sur l'explorer",
  variant = "default",
}: Props) {
  const url = explorerTxUrl(hash);

  if (variant === "plain") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors hover:text-foreground"
      >
        {label}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 transition-colors hover:underline"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

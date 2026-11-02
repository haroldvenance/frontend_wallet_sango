import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Rangée d'actions rapides.
 *
 * Deux boutons seulement :
 *   - Envoyer  → handler du wrapper (route dispatchée par famille)
 *   - Recevoir → handler du wrapper
 *
 * "Acheter" et "Échanger" (bientôt disponibles) ont été retirés :
 * des boutons inactifs en production nuisent à la clarté et au
 * principe d'interface minimale. Ils seront réintroduits quand les
 * fonctionnalités seront effectivement livrées.
 */
export interface ActionsRowProps {
  readonly onSend: () => void;
  readonly onReceive: () => void;
  /** Slot additionnel à droite (ex. bouton faucet, gaté DEV). */
  readonly trailing?: ReactNode;
  readonly sendLabel?: string;
  readonly receiveLabel?: string;
}

export function ActionsRow({
  onSend,
  onReceive,
  trailing,
  sendLabel = "Envoyer",
  receiveLabel = "Recevoir",
}: ActionsRowProps) {
  return (
    <section>
      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          label={sendLabel}
          Icon={ArrowUpFromLine}
          onClick={onSend}
        />
        <ActionButton
          label={receiveLabel}
          Icon={ArrowDownToLine}
          onClick={onReceive}
        />
      </div>

      {trailing && <div className="mt-4 flex justify-start">{trailing}</div>}
    </section>
  );
}

interface ActionButtonProps {
  readonly label: string;
  readonly Icon: typeof ArrowUpFromLine;
  readonly onClick: () => void;
}

function ActionButton({ label, Icon, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-sm font-medium">{label}</p>
    </button>
  );
}
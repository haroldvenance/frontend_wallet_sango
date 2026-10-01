import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  ShoppingCart,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Rangée d'actions universelles — présentationnelle.
 *
 * Quatre boutons, cohérents SANGO et EVM :
 *   - Acheter  : désactivé (E1.6+)
 *   - Échanger : désactivé (E1.6+)
 *   - Envoyer  : actif (route dispatchée par le wrapper)
 *   - Recevoir : actif (ouvre le ReceiveModal du wrapper)
 *
 * Le wrapper fournit les handlers `onSend` et `onReceive`.
 */
export interface ActionsRowProps {
  readonly onSend: () => void;
  readonly onReceive: () => void;
  /** Slot additionnel rendu à droite (ex. faucet button). */
  readonly trailing?: ReactNode;
  /** Icône d'asset (pour l'effet hover). */
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionButton
          label="Acheter"
          description="Bientôt disponible"
          Icon={ShoppingCart}
          disabled
        />
        <ActionButton
          label="Échanger"
          description="Bientôt disponible"
          Icon={Repeat}
          disabled
        />
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
  readonly description?: string;
  readonly Icon: typeof ShoppingCart;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
}

function ActionButton({
  label,
  description,
  Icon,
  onClick,
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? description : undefined}
      className={[
        "group rounded-2xl border bg-card p-4 text-left transition-all",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 active:scale-[0.98]",
      ].join(" ")}
    >
      <div
        className={[
          "flex size-9 items-center justify-center rounded-xl transition-colors",
          disabled
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
        ].join(" ")}
      >
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-sm font-medium">{label}</p>
      {description && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {description}
        </p>
      )}
    </button>
  );
}

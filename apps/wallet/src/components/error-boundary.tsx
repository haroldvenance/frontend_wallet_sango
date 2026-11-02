import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /**
   * Fallback custom.
   *
   * ⚠️ Le `error.message` brut peut contenir des données sensibles
   * (URL RPC, identifiant provider, adresse wallet, requête échouée).
   * En PRODUCTION, ton fallback doit :
   *   - afficher un message neutre,
   *   - utiliser `correlationId` pour le support,
   *   - NE JAMAIS inclure `error.message` ou `error.stack` dans le DOM.
   */
  fallback?: (error: Error, reset: () => void, correlationId: string) => ReactNode;
  scope?: string;
}

interface State {
  error: Error | null;
  correlationId: string | null;
}

function generateCorrelationId(): string {
  try {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

function normalizeError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error("Unknown error");
  }
}

/**
 * Error Boundary React.
 *
 * - DEV  : message + stack + component stack en console.
 * - PROD : aucun message d'erreur dans le DOM, AUCUN `error.message`
 *          dans la console, seul un `correlationId` de 12 hex.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, correlationId: null };

  static getDerivedStateFromError(raw: unknown): Partial<State> {
    return {
      error: normalizeError(raw),
      correlationId: generateCorrelationId(),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const scope = this.props.scope ? `:${this.props.scope}` : "";
    const tag = `[ErrorBoundary${scope}]`;
    const cid = this.state.correlationId ?? "UNKNOWN";

    if (import.meta.env.DEV) {
      console.error(`${tag} correlationId=${cid}`, normalizeError(error), info);
      return;
    }

    // PROD : trace volontairement minimale (pas de message, pas de stack).
    // TODO : brancher un service de monitoring avec filtrage PII.
    console.error(`${tag} correlationId=${cid}`);
  }

  reset = (): void => {
    this.setState({ error: null, correlationId: null });
  };

  render(): ReactNode {
    const { error, correlationId } = this.state;
    if (!error) return this.props.children;

    const cid = correlationId ?? "UNKNOWN";
    if (this.props.fallback) {
      return this.props.fallback(error, this.reset, cid);
    }
    return (
      <DefaultFallback
        error={error}
        onReset={this.reset}
        scope={this.props.scope}
        correlationId={cid}
      />
    );
  }
}

function DefaultFallback({
  error,
  onReset,
  scope,
  correlationId,
}: {
  error: Error;
  onReset: () => void;
  scope?: string;
  correlationId: string;
}) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-[300px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-destructive/5 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5 shrink-0" />
          <h2 className="text-sm font-semibold">
            {isDev && scope ? `Erreur dans ${scope}` : "Une erreur est survenue"}
          </h2>
        </div>

        {isDev ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground break-all">
            {error.message || error.toString()}
          </p>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Un problème inattendu s&apos;est produit. Réessaie ou recharge la
            page. Si le problème persiste, contacte le support avec la
            référence ci-dessous.
          </p>
        )}

        <p className="mt-3 font-mono text-[11px] text-foreground/60">
          Référence : {correlationId}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <RefreshCw className="size-3.5" /> Réessayer
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center rounded-xl border bg-card px-3 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Recharger la page
          </button>
        </div>
      </div>
    </div>
  );
}
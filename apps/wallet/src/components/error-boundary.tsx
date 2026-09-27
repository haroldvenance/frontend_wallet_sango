import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Fallback custom. Si absent, on utilise le rendu par défaut. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Label affiché dans le titre (ex. "Dashboard", "Route"). */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Error Boundary React.
 *
 * Doit être un class component (React n'expose pas de hook pour ça).
 *
 * Usage :
 *   <ErrorBoundary scope="App">
 *     <App />
 *   </ErrorBoundary>
 *
 * Le bouton "Recharger" reset l'état local du boundary et retente le
 * rendu. Si le composant crash à nouveau, on retombe sur le fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`, error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} onReset={this.reset} scope={this.props.scope} />;
  }
}

function DefaultFallback({
  error,
  onReset,
  scope,
}: {
  error: Error;
  onReset: () => void;
  scope?: string;
}) {
  return (
    <div className="flex min-h-[300px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5 shrink-0" />
          <h2 className="text-sm font-semibold">
            {scope ? `Erreur dans ${scope}` : "Une erreur est survenue"}
          </h2>
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground break-all">
          {error.message || error.toString()}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="size-3.5" /> Recharger
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center rounded-xl border bg-card px-3 text-xs font-medium hover:bg-accent"
          >
            Recharger la page
          </button>
        </div>
      </div>
    </div>
  );
}

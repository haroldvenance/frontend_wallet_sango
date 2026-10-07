/**
 * Placeholder UI Bitcoin — E2.1.b.6.1.
 *
 * Affiché par les dispatchers (`send.tsx`, `history.tsx`) tant que
 * les routes Bitcoin concrètes ne sont pas livrées (E2.1.b.6.3+).
 * Sera supprimé une fois les vraies routes en place.
 */
interface BitcoinComingSoonProps {
  readonly feature: string;
}

export function BitcoinComingSoon({ feature }: BitcoinComingSoonProps) {
  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {feature} Bitcoin — bientôt disponible.
        </p>
      </div>
    </div>
  );
}

import { useTranslation } from "@/i18n/use-translation";

interface PasswordStrengthProps {
  readonly password: string;
  readonly className?: string;
}

const CRITERIA = [
  (p: string) => p.length >= 8,
  (p: string) => /[A-Z]/.test(p),
  (p: string) => /[0-9]/.test(p),
  (p: string) => /[^A-Za-z0-9]/.test(p),
] as const;

type Level = "weak" | "medium" | "good" | "strong";

const LEVEL_STYLES: Record<
  Level,
  { bar: string; text: string; active: number }
> = {
  weak: { bar: "bg-red-500", text: "text-red-500", active: 1 },
  medium: {
    bar: "bg-orange-500",
    text: "text-orange-500",
    active: 2,
  },
  good: {
    bar: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    active: 3,
  },
  strong: {
    bar: "bg-emerald-500",
    text: "text-emerald-500",
    active: 4,
  },
};

/**
 * Score 0..4 basé sur 4 critères binaires.
 *
 * ⚠️ Un score de 4 ne garantit pas un mot de passe fort
 * (`"aaaaaaaaA1!"` passe les 4 critères mais reste trivial).
 * C'est un guide, pas une mesure d'entropie.
 *
 * Mitigation appliquée : si le mot de passe contient une répétition
 * ≥ 4 caractères identiques consécutifs, le score est plafonné à 2.
 */
export function scorePassword(password: string): number {
  if (password.length === 0) return 0;
  const base = CRITERIA.reduce(
    (acc, test) => (test(password) ? acc + 1 : acc),
    0,
  );
  // Détection simple de répétition (`aaaa`, `0000`, `!!!!`).
  if (/(.)\1{3,}/.test(password)) return Math.min(base, 2);
  return base;
}

function levelFromScore(score: number): Level {
  if (score <= 1) return "weak";
  if (score === 2) return "medium";
  if (score === 3) return "good";
  return "strong";
}

export function PasswordStrength({
  password,
  className = "",
}: PasswordStrengthProps) {
  const t = useTranslation();
  if (password.length === 0) return null;

  const score = scorePassword(password);
  const level = levelFromScore(score);
  const style = LEVEL_STYLES[level];
  const label = t.passwordStrength[level];

  return (
    <div
      data-testid="password-strength"
      data-level={level}
      className={["space-y-1.5", className].join(" ").trim()}
      aria-live="polite"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className={[
              "h-1.5 flex-1 rounded-full transition-colors",
              i < style.active ? style.bar : "bg-muted",
            ].join(" ")}
          />
        ))}
      </div>
      <p className={["text-[11px] font-medium", style.text].join(" ")}>
        {label}
      </p>
    </div>
  );
}
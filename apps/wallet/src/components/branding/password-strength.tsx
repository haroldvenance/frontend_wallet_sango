/**
 * Jauge de force de mot de passe — E2.5.
 *
 * **Heuristique assumée, pas entropie scientifique.** 4 critères
 * binaires :
 *   1. longueur ≥ 8
 *   2. contient une majuscule
 *   3. contient un chiffre
 *   4. contient un symbole
 *
 * Le score (0..4) mappe vers 4 niveaux :
 *   0-1 → Faible  (rouge)
 *   2   → Moyen   (orange)
 *   3   → Bon     (jaune)
 *   4   → Fort    (vert)
 *
 * **Pas de `zxcvbn` ou équivalent** : l'estimation d'entropie réelle
 * est un problème à part (dictionnaire, patterns clavier, etc.).
 * Le composant ne prétend pas mesurer la résistance réelle, il
 * guide l'utilisateur vers de bonnes pratiques.
 */

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
  { label: string; bar: string; text: string; active: number }
> = {
  weak: {
    label: "Faible",
    bar: "bg-red-500",
    text: "text-red-500",
    active: 1,
  },
  medium: {
    label: "Moyen",
    bar: "bg-orange-500",
    text: "text-orange-500",
    active: 2,
  },
  good: {
    label: "Bon",
    bar: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    active: 3,
  },
  strong: {
    label: "Fort",
    bar: "bg-emerald-500",
    text: "text-emerald-500",
    active: 4,
  },
};

function scorePassword(password: string): number {
  if (password.length === 0) return 0;
  return CRITERIA.reduce((acc, test) => (test(password) ? acc + 1 : acc), 0);
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
  if (password.length === 0) return null;

  const score = scorePassword(password);
  const level = levelFromScore(score);
  const style = LEVEL_STYLES[level];

  return (
    <div
      data-testid="password-strength"
      data-level={level}
      className={["space-y-1.5", className].join(" ").trim()}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={[
              "h-1.5 flex-1 rounded-full transition-colors",
              i < style.active ? style.bar : "bg-muted",
            ].join(" ")}
          />
        ))}
      </div>
      <p className={["text-[11px] font-medium", style.text].join(" ")}>
        Mot de passe {style.label.toLowerCase()}
      </p>
    </div>
  );
}

import { Moon, Sun } from "lucide-react";

import { useThemeStore } from "@/stores/theme-store";

/**
 * Bouton de bascule clair / sombre.
 *
 * Icône `Sun` visible en mode sombre (pour passer en clair),
 * icône `Moon` visible en mode clair (pour passer en sombre).
 */
export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="inline-flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}

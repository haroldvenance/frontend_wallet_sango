import { useEffect } from "react";

import { useThemeStore } from "@/stores/theme-store";

/**
 * Applique la classe `dark` sur `<html>` selon le store de thème.
 * À monter une seule fois (dans AppProviders).
 */
export function useApplyTheme(): void {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);
}

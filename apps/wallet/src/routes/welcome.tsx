import { KeyRound, Plus, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { useTranslation } from "@/i18n/use-translation";

export function Welcome() {
  const t = useTranslation();

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <span className="text-lg font-bold">S</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {t.welcome.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.welcome.subtitle}
        </p>
      </div>

      <div className="space-y-3">
        <Link to="/create" className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.welcome.create}</p>
            <p className="text-xs text-muted-foreground">{t.welcome.createDesc}</p>
          </div>
        </Link>

        <Link to="/import" className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Upload className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.welcome.import}</p>
            <p className="text-xs text-muted-foreground">{t.welcome.importDesc}</p>
          </div>
        </Link>

        <Link to="/unlock" className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.welcome.restore}</p>
            <p className="text-xs text-muted-foreground">{t.welcome.restoreDesc}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

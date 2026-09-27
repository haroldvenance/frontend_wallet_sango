import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  QrCode,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

import { FaucetButton } from "./faucet-button";
import { ReceiveModal } from "./receive-modal";

export function QuickActions() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const copy = useClipboard();
  const [receiveOpen, setReceiveOpen] = useState(false);

  const actions = [
    {
      label: t.quickActions.send,
      description: t.quickActions.sendDesc,
      icon: ArrowUpFromLine,
      onClick: () => navigate("/send"),
    },
    {
      label: t.quickActions.receive,
      description: t.quickActions.receiveDesc,
      icon: ArrowDownToLine,
      onClick: () => setReceiveOpen(true),
    },
    {
      label: t.quickActions.copyAddress,
      description: t.quickActions.copyAddressDesc,
      icon: Copy,
      onClick: () =>
        copy(wallet?.identity.addressBech32 ?? "", t.quickActions.bech32Copied),
    },
    {
      label: t.quickActions.myQR,
      description: t.quickActions.myQRDesc,
      icon: QrCode,
      onClick: () => setReceiveOpen(true),
    },
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{t.quickActions.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.quickActions.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="group rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 active:scale-[0.98]"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-4" />
              </div>
              <p className="mt-4 text-sm font-medium">{action.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-start">
        <FaucetButton variant="ghost" />
      </div>

      <ReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
      />
    </section>
  );
}

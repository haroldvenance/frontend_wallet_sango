import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { UnlockOverlay } from "@/components/auth/unlock-overlay";
import { AppShell } from "@/components/layout/app-shell";
import { AssetList } from "@/components/wallet/asset-list";
import { BalanceCard } from "@/components/wallet/balance-card";
import { QuickActions } from "@/components/wallet/quick-actions";
import { RecentActivity } from "@/components/wallet/recent-activity";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { useSdkWalletSync } from "@/hooks/use-sdk-wallet-sync";
import { CreateWallet } from "@/routes/create-wallet";
import { HistoryDetailRoute } from "@/routes/history-detail";
import { HistoryRoute } from "@/routes/history";
import { ImportWallet } from "@/routes/import-wallet";
import { BecomeValidatorRoute } from "@/routes/become-validator";
import { SendRoute } from "@/routes/send";
import { Unlock } from "@/routes/unlock";
import { ValidatorDetailRoute } from "@/routes/validator-detail";
import { ValidatorsRoute } from "@/routes/validators";
import { Welcome } from "@/routes/welcome";
import { useTranslation } from "@/i18n/use-translation";
import { useWalletStore } from "@/stores/wallet-store";

function Dashboard() {
  const t = useTranslation();
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{t.dashboard.overview}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
      </div>
      <div className="space-y-8">
        <BalanceCard />
        <QuickActions />
        <AssetList />
        <RecentActivity />
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { status, lock } = useWalletStore();
  useAutoLock(status === "unlocked", lock);

  if (status === "no-wallet") return <Navigate to="/welcome" replace />;
  if (status === "locked") return <Navigate to="/unlock" replace />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LockGate() {
  const { status } = useWalletStore();
  if (status === "unlocked") return null;
  if (status === "locked") return <UnlockOverlay />;
  return null;
}

export default function App() {
  useSdkWalletSync();

  return (
    <BrowserRouter>
      <LockGate />
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/create" element={<CreateWallet />} />
        <Route path="/import" element={<ImportWallet />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/send" element={<SendRoute />} />
          <Route path="/validators" element={<ValidatorsRoute />} />
          <Route path="/validators/:address" element={<ValidatorDetailRoute />} />
          <Route path="/become-validator" element={<BecomeValidatorRoute />} />
          <Route path="/history" element={<HistoryRoute />} />
          <Route path="/history/:hash" element={<HistoryDetailRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

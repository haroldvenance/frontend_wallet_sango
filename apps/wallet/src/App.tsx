import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { UnlockOverlay } from "@/components/auth/unlock-overlay";
import { AppShell } from "@/components/layout/app-shell";
import { AssetList } from "@/components/wallet/asset-list";
import { BalanceCard } from "@/components/wallet/balance-card";
import { MyStakingCard } from "@/components/wallet/my-staking-card";
import { NetworkOverviewCard } from "@/components/wallet/network-overview-card";
import { QuickActions } from "@/components/wallet/quick-actions";
import { RecentActivity } from "@/components/wallet/recent-activity";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { useSdkWalletSync } from "@/hooks/use-sdk-wallet-sync";
import { CreateWallet } from "@/routes/create-wallet";
const HistoryDetailRoute = lazy(() => import("@/routes/history-detail").then(m => ({ default: m.HistoryDetailRoute })));
const HistoryRoute = lazy(() => import("@/routes/history").then(m => ({ default: m.HistoryRoute })));
import { ImportWallet } from "@/routes/import-wallet";
const BecomeValidatorRoute = lazy(() => import("@/routes/become-validator").then(m => ({ default: m.BecomeValidatorRoute })));
const SendRoute = lazy(() => import("@/routes/send").then(m => ({ default: m.SendRoute })));
import { Unlock } from "@/routes/unlock";
const ValidatorDetailRoute = lazy(() => import("@/routes/validator-detail").then(m => ({ default: m.ValidatorDetailRoute })));
const ValidatorsRoute = lazy(() => import("@/routes/validators").then(m => ({ default: m.ValidatorsRoute })));
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
        <MyStakingCard />
        <NetworkOverviewCard />
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
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-[300px] items-center justify-center p-6 text-sm text-muted-foreground">
      Chargement…
    </div>
  );
}

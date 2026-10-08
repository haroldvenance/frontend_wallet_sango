import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { UnlockOverlay } from "@/components/auth/unlock-overlay";
import { AppShell } from "@/components/layout/app-shell";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { useSdkWalletSync } from "@/hooks/use-sdk-wallet-sync";
import { UnifiedDashboard } from "@/features/dashboard/unified-dashboard";
const CreateUnifiedRoute = lazy(() =>
  import("@/routes/create-unified").then((m) => ({ default: m.CreateUnified })),
);
const CreateEvmWalletRoute = lazy(() =>
  import("@/routes/create-evm").then((m) => ({ default: m.CreateEvmWallet })),
);
const HistoryDetailRoute = lazy(() => import("@/routes/history-detail").then(m => ({ default: m.HistoryDetailRoute })));
const HistoryRoute = lazy(() => import("@/routes/history").then(m => ({ default: m.HistoryRoute })));
const ApprovalsRoute = lazy(() => import("@/routes/approvals").then(m => ({ default: m.ApprovalsRoute })));
const SettingsRoute = lazy(() => import("@/routes/settings").then(m => ({ default: m.SettingsRoute })));
const SettingsRecoveryPhraseRoute = lazy(() => import("@/routes/settings-recovery-phrase").then(m => ({ default: m.SettingsRecoveryPhraseRoute })));
import { ImportWallet } from "@/routes/import-wallet";
const ImportEvmWalletRoute = lazy(() =>
  import("@/routes/import-evm").then((m) => ({ default: m.ImportEvmWallet })),
);
const BecomeValidatorRoute = lazy(() => import("@/routes/become-validator").then(m => ({ default: m.BecomeValidatorRoute })));
const SendRoute = lazy(() => import("@/routes/send").then(m => ({ default: m.SendRoute })));
import { Unlock } from "@/routes/unlock";
const ValidatorDetailRoute = lazy(() => import("@/routes/validator-detail").then(m => ({ default: m.ValidatorDetailRoute })));
const ValidatorsRoute = lazy(() => import("@/routes/validators").then(m => ({ default: m.ValidatorsRoute })));
import { Welcome } from "@/routes/welcome";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useWalletStore } from "@/stores/wallet-store";

function ProtectedLayout() {
  const { status, lock } = useWalletStore();
  const autoLockMs = usePreferencesStore((s) => s.autoLockMs);
  useAutoLock(status === "unlocked", lock, autoLockMs);

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
        <Route path="/create" element={<CreateUnifiedRoute />} />
        <Route path="/create-wallet" element={<CreateUnifiedRoute />} />
        <Route path="/import" element={<ImportWallet />} />
        <Route path="/create-evm" element={<CreateEvmWalletRoute />} />
        <Route path="/import-evm" element={<ImportEvmWalletRoute />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<UnifiedDashboard />} />
            <Route path="/send" element={<SendRoute />} />
            <Route path="/send-evm" element={<Navigate to="/send" replace />} />
            <Route path="/validators" element={<ValidatorsRoute />} />
            <Route path="/validators/:address" element={<ValidatorDetailRoute />} />
            <Route path="/become-validator" element={<BecomeValidatorRoute />} />
            <Route path="/history" element={<HistoryRoute />} />
            <Route path="/history-evm" element={<Navigate to="/history" replace />} />
            <Route path="/approvals" element={<ApprovalsRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/settings/recovery-phrase" element={<SettingsRecoveryPhraseRoute />} />
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

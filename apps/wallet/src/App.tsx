import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { UnlockOverlay } from "@/components/auth/unlock-overlay";
import { AppShell } from "@/components/layout/app-shell";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { useSdkWalletSync } from "@/hooks/use-sdk-wallet-sync";
import { NotificationNavigationBridge } from "@/lib/notification-navigation-bridge";
import { IncomingTxProvider } from "@/providers/incoming-tx-provider";
import { UnifiedDashboard } from "@/features/dashboard/unified-dashboard";
const CreateUnifiedRoute = lazy(() =>
  import("@/routes/create-unified").then((m) => ({ default: m.CreateUnified })),
);
const HistoryDetailRoute = lazy(() => import("@/routes/history-detail").then(m => ({ default: m.HistoryDetailRoute })));
const UnifiedHistoryRoute = lazy(() => import("@/routes/history").then(m => ({ default: m.UnifiedHistoryRoute })));
const SangoHistoryRoute = lazy(() => import("@/routes/history-sango").then(m => ({ default: m.SangoHistoryRoute })));
const HistoryEvmRoute = lazy(() => import("@/routes/history-evm").then(m => ({ default: m.HistoryEvmRoute })));
const HistoryBitcoinRoute = lazy(() => import("@/routes/history-bitcoin").then(m => ({ default: m.HistoryBitcoinRoute })));
const ReceiveRoute = lazy(() =>
  import("@/routes/receive").then((m) => ({ default: m.ReceiveRoute })),
);
const LegalRoute = lazy(() =>
  import("@/routes/legal").then((m) => ({ default: m.LegalRoute })),
);
const AssetDetailLegacyRedirect = lazy(() =>
  import("@/routes/asset-detail-legacy-redirect").then((m) => ({
    default: m.AssetDetailLegacyRedirect,
  })),
);
const AssetDetailRoute = lazy(() =>
  import("@/routes/asset-detail").then((m) => ({ default: m.AssetDetailRoute })),
);
const ApprovalsRoute = lazy(() => import("@/routes/approvals").then(m => ({ default: m.ApprovalsRoute })));
const SettingsRoute = lazy(() => import("@/routes/settings").then(m => ({ default: m.SettingsRoute })));
const SettingsChangePasswordRoute = lazy(() =>
  import("@/routes/settings-change-password").then((m) => ({ default: m.SettingsChangePasswordRoute })),
);
const SettingsRecoveryPhraseRoute = lazy(() => import("@/routes/settings-recovery-phrase").then(m => ({ default: m.SettingsRecoveryPhraseRoute })));
const SettingsVerifyKeyfileRoute = lazy(() => import("@/routes/settings-verify-keyfile").then(m => ({ default: m.SettingsVerifyKeyfileRoute })));
const ImportUnifiedRoute = lazy(() =>
  import("@/routes/import").then((m) => ({ default: m.ImportUnified })),
);
const ImportSangoWalletRoute = lazy(() =>
  import("@/routes/import-sango").then((m) => ({ default: m.ImportSangoWallet })),
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
      <NotificationNavigationBridge />
      <LockGate />
      <IncomingTxProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
        <Route path="/create" element={<CreateUnifiedRoute />} />
        <Route path="/import" element={<ImportUnifiedRoute />} />
        <Route path="/import-sango" element={<ImportSangoWalletRoute />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<UnifiedDashboard />} />
            <Route path="/send" element={<SendRoute />} />
            <Route path="/send-evm" element={<Navigate to="/send" replace />} />
            <Route path="/validators" element={<ValidatorsRoute />} />
            <Route path="/validators/:address" element={<ValidatorDetailRoute />} />
            <Route path="/become-validator" element={<BecomeValidatorRoute />} />
            <Route path="/history" element={<UnifiedHistoryRoute />} />
            <Route path="/history/sango" element={<SangoHistoryRoute />} />
            <Route path="/history/evm" element={<HistoryEvmRoute />} />
            <Route path="/history/bitcoin" element={<HistoryBitcoinRoute />} />
            <Route
              path="/asset/:networkId/:assetId"
              element={<AssetDetailRoute />}
            />
            <Route
              path="/asset/:assetId"
              element={<AssetDetailLegacyRedirect />}
            />
            <Route path="/receive" element={<ReceiveRoute />} />
            <Route path="/history-evm" element={<Navigate to="/history" replace />} />
            <Route path="/approvals" element={<ApprovalsRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/legal/:doc" element={<LegalRoute />} />
            <Route path="/settings/recovery-phrase" element={<SettingsRecoveryPhraseRoute />} />
            <Route path="/settings/recovery-phrase/verify-keyfile" element={<SettingsVerifyKeyfileRoute />} />
            <Route path="/settings/change-password" element={<SettingsChangePasswordRoute />} />
            <Route path="/history/:hash" element={<HistoryDetailRoute />} />
        </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </IncomingTxProvider>
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

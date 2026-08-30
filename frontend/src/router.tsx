import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InsightsPage } from "./pages/InsightsPage";
import { InsightDetailPage } from "./pages/InsightDetailPage";
import { PersonasPage } from "./pages/PersonasPage";
import { ActionsPage } from "./pages/ActionsPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { TelemetryPage } from "./pages/TelemetryPage";
import { SecurityPage } from "./pages/admin/SecurityPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { PrototypePage } from "./pages/PrototypePage";

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/prototype" element={<PrototypePage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/insights/:id" element={<InsightDetailPage />} />
        <Route path="/personas" element={<PersonasPage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/telemetry" element={<TelemetryPage />} />
        <Route path="/admin/security" element={<SecurityPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import UsersPage from "./pages/UsersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import OperatorsPage from "./pages/OperatorsPage";
import ArquivoPage from "./pages/ArquivoPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <ReportsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <PrivateRoute>
                <ReportDetailPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <AnalyticsPage />
              </PrivateRoute>
            }
          />

          {/* Rotas exclusivas de admin */}
          <Route
            path="/users"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <UsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/operators"
            element={
              <PrivateRoute>
                <OperatorsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/arquivo"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <ArquivoPage />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

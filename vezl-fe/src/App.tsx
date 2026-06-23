import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import LinksPage from "@/pages/LinksPage";
import LinkDetailPage from "@/pages/LinkDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminWatchlistPage from "@/pages/AdminWatchlistPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/links" replace />} />
              <Route path="/links" element={<LinksPage />} />
              <Route path="/links/:id" element={<LinkDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/watchlist" element={<AdminWatchlistPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

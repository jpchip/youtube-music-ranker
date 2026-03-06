import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import ImportPage from "./pages/ImportPage";
import BattlePage from "./pages/BattlePage";
import RankingsPage from "./pages/RankingsPage";
import SharedPage from "./pages/SharedPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import AdminUserPage from "./pages/AdminUserPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRoute() {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  return token ? <HomePage /> : <LandingPage />;
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/shared/:id" element={<SharedPage />} />
          <Route path="/" element={<RootRoute />} />
          <Route
            path="/import"
            element={
              <ProtectedRoute>
                <ImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle"
            element={
              <ProtectedRoute>
                <BattlePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rankings"
            element={
              <ProtectedRoute>
                <RankingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/user/:id"
            element={
              <AdminRoute>
                <AdminUserPage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      <footer className="py-3 text-center text-sm text-zinc-500">
        <a
          href="https://github.com/jpchip/youtube-music-ranker"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-300 transition-colors"
        >
          Feedback &amp; Source
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

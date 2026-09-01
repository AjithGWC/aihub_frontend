import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { SessionProvider } from './auth/SessionContext';
import { RequireSession } from './auth/RouteGuards';
import { TransitionProvider } from './components/TransitionContext';
import Layout from './components/Layout';
import LayoutHome from './components/LayoutHome';
import Login from './pages/Login';
import Home from './pages/Home';
import HomeNew from './pages/HomeNew';
import Chatbot from './pages/Chatbot';
import DashboardPage from './pages/DashboardPage';
import ChangePassword from './pages/ChangePassword';
import UsersAdmin from './pages/UsersAdmin';
import UserDetail from './pages/UserDetail';
import Profile from './pages/Profile';

/**
 * NOTE: dashboards do NOT get their own <Route> entries here.
 * DashboardPage handles every /dashboards/:id URL and lazy-loads the
 * component named in backend/data/dashboards.json via the registry loader.
 * Registering a dashboard = component file + registry entry. Nothing else.
 */
export default function App() {
  return (
    <SessionProvider>
      <AuthProvider>
        <BrowserRouter>
          <TransitionProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Home "/" — full-bleed, no sidebar, admin-only (see LayoutHome) */}
              <Route element={<LayoutHome />}>
                <Route path="/" element={<Home />} />
              </Route>

              {/* Chatbot — shown to any authenticated non-admin user */}
              <Route
                path="/chat"
                element={
                  <RequireSession>
                    <Chatbot />
                  </RequireSession>
                }
              />

              {/* All other authenticated routes — with sidebar */}
              <Route element={<Layout />}>
                <Route path="/homenew" element={<HomeNew />} />
                <Route path="/dashboards/:id" element={<DashboardPage />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/users" element={<UsersAdmin />} />
                {/* Per-user admin page: dashboard access levels + RLS data scopes */}
                <Route path="/admin/users/:id" element={<UserDetail />} />
              </Route>
            </Routes>
          </TransitionProvider>
        </BrowserRouter>
      </AuthProvider>
    </SessionProvider>
  );
}

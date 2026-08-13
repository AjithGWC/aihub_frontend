import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AppSidebar from './Sidebar';
import AppNavbar from './AppNavbar';
import { DashboardMeta, getDashboards } from '@/api';
import { useAuth } from '../auth/AuthContext';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * Authenticated app shell: shadcn sidebar + top navbar + routed page.
 * The dashboard list is fetched once here and shared with the sidebar, the
 * navbar (title + search) and every page via the router outlet context.
 */
export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [dashboards, setDashboards] = useState<DashboardMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDashboards()
      .then(setDashboards)
      .catch(() => setDashboards([]))
      .finally(() => setLoading(false));
  }, [user, location.pathname]);

  if (!user) return <Navigate to="/login" replace />;

  // First login with a default password: force the change before anything else
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar dashboards={dashboards} loading={loading} />
      <SidebarInset className="min-w-0">
        <AppNavbar dashboards={dashboards} loading={loading} />
        <div className="min-w-0 flex-1">
          <Outlet context={{ dashboards }} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

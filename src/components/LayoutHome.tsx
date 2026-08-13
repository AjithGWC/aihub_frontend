import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardMeta, getDashboards } from '@/api';
import { RequireAdmin } from '../auth/RouteGuards';

/**
 * Sidebar-free layout for the Home page only.
 * Full-bleed: no sidebar, no top navbar — just the outlet content.
 * Admin-only: RequireAdmin sends any non-admin session to /chat.
 */
export default function LayoutHome() {
  const [dashboards, setDashboards] = useState<DashboardMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboards()
      .then(setDashboards)
      .catch(() => setDashboards([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RequireAdmin>
      <div className="w-full h-screen overflow-y-auto">
        <Outlet context={{ dashboards, loading }} />
      </div>
    </RequireAdmin>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import { DashboardMeta } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import DashboardSearch from './DashboardSearch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'ads_theme';

/**
 * Dark-first theme toggle. The app is dark on `:root` and switches to light via
 * `:root[data-theme='light']`, so we only ever write `data-theme` on <html> and
 * mirror it into localStorage under `ads_theme` (unchanged from the old sidebar).
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggle];
}

/**
 * Human-readable title for the current route. Returns `null` on a dashboard
 * route whose name is not known yet, so the navbar can show a skeleton.
 */
function usePageTitle(dashboards: DashboardMeta[]): string | null {
  const { pathname } = useLocation();

  return useMemo(() => {
    if (pathname === '/') return 'Home';
    if (pathname === '/homenew') return 'Categories Studio';

    if (pathname.startsWith('/dashboards/')) {
      const id = decodeURIComponent(pathname.slice('/dashboards/'.length).split('/')[0]);
      return dashboards.find((d) => d.id === id)?.name ?? null;
    }

    if (pathname === '/change-password') return 'Change password';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/admin/users') return 'User management';
    if (pathname.startsWith('/admin/users/')) return 'User details';

    return 'AI Dashboard Studio';
  }, [pathname, dashboards]);
}

export interface AppNavbarProps {
  /** Dashboards the signed-in user has access to. */
  dashboards: DashboardMeta[];
  /** True while the dashboard list is still being fetched. */
  loading?: boolean;
}

/**
 * Sticky top bar: sidebar toggle, current page title, dashboard search,
 * theme toggle and the profile menu.
 */
export default function AppNavbar({ dashboards, loading = false }: AppNavbarProps) {
  const { user, logout } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const navigate = useNavigate();
  const title = usePageTitle(dashboards);

  const initial = user?.username?.charAt(0).toUpperCase() || '?';
  const nextThemeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-3">
      <SidebarTrigger className="size-8" />
      <Separator orientation="vertical" className="mr-1 h-5!" />

      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight sm:text-[15px]">
        {title ??
          (loading ? (
            <span
              className="inline-block h-4 w-40 animate-pulse rounded-md bg-accent align-middle"
              aria-hidden="true"
            />
          ) : (
            'Dashboard'
          ))}
      </h1>

      <div className="flex items-center gap-1 sm:gap-2">
        <DashboardSearch dashboards={dashboards} loading={loading} />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={nextThemeLabel}
          aria-label={nextThemeLabel}
        >
          {theme === 'dark' ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-7 px-3 rounded-full text-xs uppercase font-semibold border border-border tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-1 cursor-pointer"
              aria-label={`Account menu for ${user?.username ?? 'current user'}`}
            >
              {user?.role || 'user'}
              <ChevronsUpDownIcon className="size-3 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleSignOut}
              onClick={handleSignOut}
              className="cursor-pointer"
            >
              <LogOutIcon className="size-4 mr-2" aria-hidden="true" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

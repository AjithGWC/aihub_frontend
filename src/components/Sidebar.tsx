import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ActivityIcon,
  ChartColumnIcon,
  HouseIcon,
  LayoutGridIcon,
  KeyRoundIcon,
  LogOutIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import { DashboardMeta } from '@/api';
import { useAuth } from '../auth/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

export interface AppSidebarProps {
  /** Dashboards the signed-in user has access to. */
  dashboards: DashboardMeta[];
  /** True while the dashboard list is still being fetched. */
  loading?: boolean;
}

/**
 * App navigation rail, built on the shadcn `sidebar` primitive.
 *
 * Behaviour preserved from the previous hand-rolled sidebar:
 *  - lists every dashboard the user can access, linking to /dashboards/:id
 *  - admin-only "User management" link
 *  - account link to /change-password
 * The theme toggle and the user chip now live in the top navbar (AppNavbar).
 */
export default function AppSidebar({ dashboards, loading = false }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  // On mobile the sidebar is a sheet — close it after navigating.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = () => {
    closeOnMobile();
    logout();
    // replace:true so Back doesn't return to an authenticated screen.
    navigate('/login', { replace: true });
  };

  // Belt and braces: also close the mobile drawer on any route change.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const isDashboardActive = (id: string) => pathname === `/dashboards/${id}`;

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Dashboard Studio">
              <Link to="/" onClick={closeOnMobile}>
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <ActivityIcon className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">Dashboard Studio</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Fashion analytics
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Home">
                  <Link to="/" onClick={closeOnMobile}>
                    <HouseIcon />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Dashboards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading &&
                [0, 1, 2, 3, 4].map((i) => (
                  <SidebarMenuItem key={`dash-skeleton-${i}`}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}

              {!loading && dashboards.length === 0 && (
                <li className="px-2 py-1.5 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                  No dashboards yet
                </li>
              )}

              {!loading &&
                dashboards.map((d) => (
                  <SidebarMenuItem key={d.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isDashboardActive(d.id)}
                      tooltip={d.description || d.name}
                    >
                      <Link
                        to={`/dashboards/${d.id}`}
                        onClick={closeOnMobile}
                        title={d.description || d.name}
                      >
                        <ChartColumnIcon />
                        <span>{d.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin/users')}
                    tooltip="User management"
                  >
                    <Link to="/admin/users" onClick={closeOnMobile}>
                      <UsersIcon />
                      <span>User management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/profile'}
                  tooltip="Profile"
                >
                  <Link to="/profile" onClick={closeOnMobile}>
                    <UserIcon />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/change-password'}
                  tooltip="Change password"
                >
                  <Link to="/change-password" onClick={closeOnMobile}>
                    <KeyRoundIcon />
                    <span>Change password</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/*
                Sign out is ALSO in the navbar profile dropdown, but it lived in
                the sidebar before the shadcn rebuild — keep it visible here so
                it stays where users already look for it.
              */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sign out"
                  onClick={handleSignOut}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive active:text-destructive"
                >
                  <LogOutIcon />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

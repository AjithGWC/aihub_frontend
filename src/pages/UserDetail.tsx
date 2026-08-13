import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AccessLevel,
  DashboardMeta,
  ManagedUser,
  UserAccessGrant,
  deleteUser,
  getDashboards,
  getUserAccess,
  grantAccess,
  revokeAccess,
  updateUser,
} from '../api/client';
import {
  ScopeDimension,
  UserScopeResponse,
  getScopeOptions,
  getUserDetail,
  getUserScope,
  saveUserScope,
} from '../api/requests';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Admin → Users → one user.
 *
 * Everything that is per-user lives here: identity/role actions, the dashboard
 * access grants that used to sit on the list page, and the row-level data scope
 * (RLS) configuration.
 *
 * IMPORTANT: the scope API reports `enforced: false`. Scopes are STORED AND
 * CONFIGURABLE ONLY — tile queries do not filter by them yet. The UI says so
 * explicitly; do not reword that notice into something that implies filtering.
 */

const LEVELS: AccessLevel[] = ['view', 'share', 'developer', 'admin'];
const NO_ACCESS = 'none';

type ScopeMap = Record<string, string[]>;

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sameValues(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();

  const userId = Number(id);
  const isSelf = me?.id === userId;
  const validId = Number.isInteger(userId) && userId > 0;

  // ---- user ----
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  // ---- access ----
  const [dashboards, setDashboards] = useState<DashboardMeta[]>([]);
  const [grants, setGrants] = useState<UserAccessGrant[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [pendingDashboard, setPendingDashboard] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  // ---- scope (RLS) ----
  const [dimensions, setDimensions] = useState<ScopeDimension[]>([]);
  const [scopes, setScopes] = useState<ScopeMap>({});
  const [savedScopes, setSavedScopes] = useState<ScopeMap>({});
  const [scopeEnforced, setScopeEnforced] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [scopeError, setScopeError] = useState('');
  const [scopeSaving, setScopeSaving] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // ---- dialogs ----
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('Welcome@123');
  const [resetBusy, setResetBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const loadUser = useCallback(() => {
    if (!validId) {
      setUserError('Invalid user id.');
      setUserLoading(false);
      return;
    }
    setUserLoading(true);
    getUserDetail(userId)
      .then((u) => {
        setUser(u);
        setUserError('');
      })
      .catch((e: unknown) =>
        setUserError(e instanceof Error ? e.message : 'Failed to load user')
      )
      .finally(() => setUserLoading(false));
  }, [userId, validId]);

  const loadAccess = useCallback(() => {
    if (!validId) return;
    setAccessLoading(true);
    Promise.all([getDashboards(), getUserAccess(userId)])
      .then(([dash, gr]) => {
        setDashboards(dash);
        setGrants(gr);
        setAccessError('');
      })
      .catch((e: unknown) =>
        setAccessError(e instanceof Error ? e.message : 'Failed to load dashboard access')
      )
      .finally(() => setAccessLoading(false));
  }, [userId, validId]);

  const loadScope = useCallback(() => {
    if (!validId) return;
    setScopeLoading(true);
    Promise.all([getScopeOptions(), getUserScope(userId)])
      .then(([opts, current]) => {
        // Labels come straight from the data schema and can be null — never
        // call string methods on them without normalising first.
        const safeOpts: ScopeDimension[] = (opts ?? []).map((d) => ({
          dimension: d.dimension,
          label: String(d.label ?? d.dimension),
          values: (d.values ?? []).map((v) => ({
            value: String(v.value),
            label: String(v.label ?? v.value),
          })),
        }));
        setDimensions(safeOpts);
        const normalised: ScopeMap = {};
        for (const dim of safeOpts) {
          normalised[dim.dimension] = (current.scopes?.[dim.dimension] ?? []).map((v) =>
            String(v)
          );
        }
        setScopes(normalised);
        setSavedScopes(normalised);
        setScopeEnforced(Boolean(current.enforced));
        setScopeError('');
      })
      .catch((e: unknown) =>
        setScopeError(e instanceof Error ? e.message : 'Failed to load data scope')
      )
      .finally(() => setScopeLoading(false));
  }, [userId, validId]);

  useEffect(loadUser, [loadUser]);
  useEffect(loadAccess, [loadAccess]);
  useEffect(loadScope, [loadScope]);

  // ---- derived ----
  const grantByDashboard = useMemo(() => {
    const map = new Map<string, UserAccessGrant>();
    for (const g of grants) map.set(g.dashboardId, g);
    return map;
  }, [grants]);

  const grantedCount = grants.length;

  const scopeDirty = useMemo(
    () =>
      dimensions.some((d) =>
        !sameValues(scopes[d.dimension] ?? [], savedScopes[d.dimension] ?? [])
      ),
    [dimensions, scopes, savedScopes]
  );

  // ---- user actions ----
  const onRoleChange = async (role: 'admin' | 'user') => {
    setActionError('');
    try {
      await updateUser(userId, { role });
      flash(`Role changed to ${role}.`);
      loadUser();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Role change failed');
    }
  };

  const onResetPassword = async () => {
    setResetBusy(true);
    setActionError('');
    try {
      await updateUser(userId, { password: resetPassword });
      setResetOpen(false);
      setResetPassword('Welcome@123');
      flash('Password reset — the user must change it on next login.');
      loadUser();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setResetBusy(false);
    }
  };

  const onDeleteUser = async () => {
    setDeleteBusy(true);
    setActionError('');
    try {
      await deleteUser(userId);
      navigate('/admin/users', { replace: true });
    } catch (err) {
      // e.g. "You cannot delete your own account" — surface it, stay on the page.
      setActionError(err instanceof Error ? err.message : 'Delete failed');
      setDeleteOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  };

  // ---- access actions ----
  const onLevelChange = async (dashboard: DashboardMeta, next: string) => {
    if (!user) return;
    if (next === NO_ACCESS) {
      setRevokeTarget({ id: dashboard.id, name: dashboard.name });
      return;
    }
    setPendingDashboard(dashboard.id);
    setAccessError('');
    try {
      await grantAccess(dashboard.id, user.username, next as AccessLevel);
      setGrants((prev) => {
        const rest = prev.filter((g) => g.dashboardId !== dashboard.id);
        return [
          ...rest,
          {
            dashboardId: dashboard.id,
            dashboardName: dashboard.name,
            level: next as AccessLevel,
            grantedBy: me?.username,
          },
        ];
      });
      flash(`${user.username} now has "${next}" on ${dashboard.name}.`);
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Grant failed');
      loadAccess();
    } finally {
      setPendingDashboard(null);
    }
  };

  const onConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setPendingDashboard(revokeTarget.id);
    setAccessError('');
    try {
      await revokeAccess(revokeTarget.id, userId);
      setGrants((prev) => prev.filter((g) => g.dashboardId !== revokeTarget.id));
      flash(`Access to ${revokeTarget.name} revoked.`);
      setRevokeTarget(null);
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Revoke failed');
      loadAccess();
    } finally {
      setPendingDashboard(null);
    }
  };

  // ---- scope actions ----
  const toggleScopeValue = (dimension: string, value: string, checked: boolean) => {
    setScopes((prev) => {
      const current = prev[dimension] ?? [];
      const next = checked
        ? current.includes(value)
          ? current
          : [...current, value]
        : current.filter((v) => v !== value);
      return { ...prev, [dimension]: next };
    });
  };

  const setDimensionValues = (dimension: string, values: string[]) => {
    setScopes((prev) => ({ ...prev, [dimension]: values }));
  };

  const onSaveScope = async () => {
    setScopeSaving(true);
    setScopeError('');
    try {
      const payload: ScopeMap = {};
      for (const d of dimensions) payload[d.dimension] = scopes[d.dimension] ?? [];
      const res = await saveUserScope(userId, payload);
      setSavedScopes(payload);
      if (typeof res.enforced === 'boolean') setScopeEnforced(res.enforced);
      flash('Data scope saved (configuration only — not applied to queries yet).');
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'Saving data scope failed');
    } finally {
      setScopeSaving(false);
    }
  };

  // ---- render ----
  if (!validId) {
    return (
      <div className="page">
        <ErrorBox>Invalid user id in the URL.</ErrorBox>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/admin/users">
              <ArrowLeft className="size-4" />
              Back to users
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/users">
            <ArrowLeft className="size-4" />
            All users
          </Link>
        </Button>
      </div>

      {userError && <div className="mb-4">
        <ErrorBox>{userError}</ErrorBox>
      </div>}
      {actionError && <div className="mb-4">
        <ErrorBox>{actionError}</ErrorBox>
      </div>}
      {notice && (
        <div className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          {notice}
        </div>
      )}

      {/* ---------- Header ---------- */}
      <Card className="mb-6">
        <CardHeader>
          {userLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : user ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{user.username}</CardTitle>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' && <ShieldCheck className="size-3" />}
                  {user.role}
                </Badge>
                {user.mustChangePassword && (
                  <Badge variant="outline" className="gap-1 text-amber-500">
                    <KeyRound className="size-3" />
                    must change password
                  </Badge>
                )}
                {isSelf && <Badge variant="ghost">this is you</Badge>}
              </div>
              <CardDescription>
                User #{user.id} · created {formatDate(user.createdAt)}
              </CardDescription>
            </>
          ) : null}
        </CardHeader>

        {user && (
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="detail-role" className="text-xs text-muted-foreground">
                  Role
                </Label>
                <Select
                  value={user.role}
                  disabled={isSelf}
                  onValueChange={(v) => onRoleChange(v as 'admin' | 'user')}
                >
                  <SelectTrigger id="detail-role" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <KeyRound className="size-4" />
                Reset password
              </Button>

              <Button
                variant="destructive"
                disabled={isSelf}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete user
              </Button>

              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role or delete your own account.
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ---------- Access + data scope ---------- */}
      <Tabs defaultValue="access">
        <TabsList>
          <TabsTrigger value="access">
            <LayoutDashboard className="size-4" />
            Dashboard access
          </TabsTrigger>
          <TabsTrigger value="scope">
            <Database className="size-4" />
            Data scope
          </TabsTrigger>
        </TabsList>

        {/* ===== Dashboard access ===== */}
        <TabsContent value="access" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard access</CardTitle>
              <CardDescription>
                {accessLoading
                  ? 'Loading…'
                  : `${grantedCount} of ${dashboards.length} dashboard${
                      dashboards.length === 1 ? '' : 's'
                    } granted.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.role === 'admin' && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Platform admins can open every dashboard regardless of the grants below.
                    Explicit grants only matter if this account is later changed to a standard
                    user.
                  </span>
                </div>
              )}

              {accessError && <ErrorBox>{accessError}</ErrorBox>}

              {accessLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-5 w-56" />
                      <Skeleton className="ml-auto h-9 w-36" />
                    </div>
                  ))}
                </div>
              ) : dashboards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dashboards are registered yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dashboard</TableHead>
                      <TableHead>Granted by</TableHead>
                      <TableHead className="w-56">Access level</TableHead>
                      <TableHead className="w-28 text-right">Revoke</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboards.map((d) => {
                      const grant = grantByDashboard.get(d.id);
                      const busy = pendingDashboard === d.id;
                      return (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{d.name}</div>
                            <div className="text-xs text-muted-foreground">{d.id}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {grant?.grantedBy || '—'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={grant?.level ?? NO_ACCESS}
                              disabled={busy}
                              onValueChange={(v) => onLevelChange(d, v)}
                            >
                              <SelectTrigger className="w-full" aria-label={`Access level for ${d.name}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_ACCESS}>No access</SelectItem>
                                {LEVELS.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            {grant ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => setRevokeTarget({ id: d.id, name: d.name })}
                              >
                                <Trash2 className="size-4" />
                                Revoke
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Data scope (RLS) ===== */}
        <TabsContent value="scope" className="mt-4 space-y-4">
          {/* Honesty notice: stored, not enforced. */}
          {!scopeEnforced && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <strong className="text-foreground">Saved, but not enforced yet</strong>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                    configuration only
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Row-level scoping is stored and editable here, but dashboard queries do not
                  filter by it yet. Until enforcement ships, this user still sees all rows in any
                  dashboard they can open. Treat these settings as preparation, not as an access
                  control.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>This user may see…</CardTitle>
              <CardDescription>
                Pick the values this user should be limited to on each dimension. Selecting nothing
                means unrestricted on that dimension.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {scopeError && <ErrorBox>{scopeError}</ErrorBox>}

              {scopeLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                </div>
              ) : dimensions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scope dimensions are available. The client data schema may not be loaded yet.
                </p>
              ) : (
                dimensions.map((dim, index) => {
                  const selected = scopes[dim.dimension] ?? [];
                  const filter = (filters[dim.dimension] ?? '').trim().toLowerCase();
                  const visible = filter
                    ? dim.values.filter(
                        (v) =>
                          v.label.toLowerCase().includes(filter) ||
                          v.value.toLowerCase().includes(filter)
                      )
                    : dim.values;
                  const unrestricted = selected.length === 0;

                  return (
                    <div key={dim.dimension} className="space-y-3">
                      {index > 0 && <Separator className="mb-6" />}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{dim.label}</h3>
                          {unrestricted ? (
                            <Badge variant="secondary">All (unrestricted)</Badge>
                          ) : (
                            <Badge variant="outline">
                              {selected.length} of {dim.values.length} selected
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={dim.values.length === 0}
                            onClick={() =>
                              setDimensionValues(
                                dim.dimension,
                                dim.values.map((v) => v.value)
                              )
                            }
                          >
                            Select all
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={unrestricted}
                            onClick={() => setDimensionValues(dim.dimension, [])}
                          >
                            Clear (unrestricted)
                          </Button>
                        </div>
                      </div>

                      {dim.values.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No selectable values for this dimension yet.
                        </p>
                      ) : (
                        <>
                          {dim.values.length > 12 && (
                            <div className="relative w-full max-w-xs">
                              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={filters[dim.dimension] ?? ''}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    [dim.dimension]: e.target.value,
                                  }))
                                }
                                placeholder={`Filter ${dim.label.toLowerCase()}…`}
                                className="pl-8"
                                aria-label={`Filter ${dim.label} values`}
                              />
                            </div>
                          )}

                          <div className="max-h-64 overflow-y-auto rounded-md border border-border p-3">
                            {visible.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No matching values.</p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {visible.map((v) => {
                                  const inputId = `scope-${dim.dimension}-${v.value}`;
                                  return (
                                    <div
                                      key={v.value}
                                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                                    >
                                      <Checkbox
                                        id={inputId}
                                        checked={selected.includes(v.value)}
                                        onCheckedChange={(checked) =>
                                          toggleScopeValue(
                                            dim.dimension,
                                            v.value,
                                            checked === true
                                          )
                                        }
                                      />
                                      <Label
                                        htmlFor={inputId}
                                        className="cursor-pointer truncate text-sm font-normal text-foreground"
                                      >
                                        {v.label || v.value}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {unrestricted
                              ? `No restriction on ${dim.label.toLowerCase()} — every value is visible.`
                              : `Limited to: ${selected
                                  .map(
                                    (v) =>
                                      dim.values.find((o) => o.value === v)?.label ?? v
                                  )
                                  .join(', ')}`}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })
              )}

              {!scopeLoading && dimensions.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <Button onClick={onSaveScope} disabled={scopeSaving || !scopeDirty}>
                    {scopeSaving ? 'Saving…' : 'Save data scope'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={scopeSaving || !scopeDirty}
                    onClick={() => setScopes(savedScopes)}
                  >
                    Discard changes
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {scopeDirty ? 'Unsaved changes.' : 'Everything is saved.'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset password */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new default password for <strong>{user?.username}</strong>. They will be forced
              to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="detail-reset-password">New default password</Label>
            <Input
              id="detail-reset-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onResetPassword} disabled={resetBusy || resetPassword.length < 8}>
              {resetBusy ? 'Resetting…' : 'Reset password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              <strong>{user?.username}</strong> will be removed permanently, along with their
              dashboard grants and data scope. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteUser} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke access */}
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke access?</DialogTitle>
            <DialogDescription>
              <strong>{user?.username}</strong> will lose access to{' '}
              <strong>{revokeTarget?.name}</strong>. You can grant it again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmRevoke}
              disabled={pendingDashboard !== null}
            >
              Revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

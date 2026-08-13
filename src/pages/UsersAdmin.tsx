import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  KeyRound,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { ManagedUser, deleteUser, getUsers, updateUser } from '@/api';
import { useAuth } from '../auth/AuthContext';
import OnboardUserDialog from '@/components/OnboardUserDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Admin → Users (list page).
 *
 * Dashboard access management used to live in a panel underneath this table.
 * It now lives on the per-user page at /admin/users/:id (see UserDetail.tsx),
 * together with the new row-level data scope (RLS) configuration.
 */

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UsersAdmin() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState('Welcome@123');
  const [resetBusy, setResetBusy] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    getUsers()
      .then((rows) => {
        setUsers(rows);
        setError('');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, query]);

  const onRoleChange = async (u: ManagedUser, role: 'admin' | 'user') => {
    setError('');
    try {
      await updateUser(u.id, { role });
      flash(`${u.username} is now ${role === 'admin' ? 'a platform admin' : 'a standard user'}.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    setResetBusy(true);
    setError('');
    try {
      await updateUser(resetTarget.id, { password: resetPassword });
      flash(`Password reset for "${resetTarget.username}" — they must change it on next login.`);
      setResetTarget(null);
      setResetPassword('Welcome@123');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError('');
    try {
      await deleteUser(deleteTarget.id);
      flash(`User "${deleteTarget.username}" deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      // The backend refuses to delete your own account — surface that verbatim.
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight text-foreground">
            User management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onboard users and manage roles. Open a user to manage their dashboard access and data
            scope.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          Add user
        </Button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          {notice}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : `${users.length} user${users.length === 1 ? '' : 's'}${
                  query.trim() ? ` · ${filtered.length} matching` : ''
                }`}
          </CardDescription>
          <div className="relative mt-2 w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter usernames…"
              className="pl-8"
              aria-label="Filter users by username"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="ml-auto h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {users.length === 0
                ? 'No users yet. Use “Add user” to onboard the first one.'
                : `No user matches “${query.trim()}”.`}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Password status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {u.username}
                      </Link>
                      {u.id === me?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' && <ShieldCheck className="size-3" />}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.mustChangePassword ? (
                        <Badge variant="outline" className="gap-1 text-amber-500">
                          <KeyRound className="size-3" />
                          must change password
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">active</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/users/${u.id}`}>
                            Manage
                            <ChevronRight className="size-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${u.username}`}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{u.username}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/users/${u.id}`}>Open user page</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={u.id === me?.id}
                              onSelect={() =>
                                onRoleChange(u, u.role === 'admin' ? 'user' : 'admin')
                              }
                            >
                              {u.role === 'admin' ? 'Change role to user' : 'Change role to admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setResetPassword('Welcome@123');
                                setResetTarget(u);
                              }}
                            >
                              Reset password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={u.id === me?.id}
                              onSelect={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="size-4" />
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OnboardUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(username) => {
          flash(`User "${username}" created — they must change the default password on first login.`);
          refresh();
        }}
      />

      {/* Reset password */}
      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new default password for <strong>{resetTarget?.username}</strong>. They will be
              forced to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reset-password">New default password</Label>
            <Input
              id="reset-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReset} disabled={resetBusy || resetPassword.length < 8}>
              {resetBusy ? 'Resetting…' : 'Reset password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.username}</strong> will be removed permanently, along with
              their dashboard grants and data scope. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

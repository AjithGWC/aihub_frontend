import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleCheck,
  Globe,
  KeyRound,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { changePassword, getStoredUser, storeUser } from '@/api/client';
import { MyProfile, getMyProfile } from '@/api/requests';
import { useAuth } from '@/auth/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const SCOPE_LABELS: Record<string, string> = {
  site: 'Sites / stores',
  division: 'Divisions',
  department: 'Departments',
};

function initialsOf(username: string): string {
  const parts = username.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase() || '?';
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** A field the user is not allowed to edit here — visibly locked. */
function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-muted-foreground">
          {label}
        </Label>
        <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(read-only)</span>
      </div>
      {/* readOnly (not disabled) so it stays keyboard-reachable and is announced
          as read-only by screen readers. */}
      <Input
        id={id}
        value={value}
        readOnly
        aria-readonly="true"
        className="cursor-default bg-muted/60 text-muted-foreground"
      />
    </div>
  );
}

export default function Profile() {
  const { user: sessionUser, refreshUser } = useAuth();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ---- Inline password change ----
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwNotice, setPwNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    getMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load your profile');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);

  const username = profile?.username ?? sessionUser?.username ?? '';
  const role = profile?.role ?? sessionUser?.role ?? 'user';
  const mustChange = profile?.mustChangePassword ?? Boolean(sessionUser?.mustChangePassword);

  const scopeEntries = useMemo(() => {
    const scopes = profile?.scopes ?? {};
    return Object.entries(scopes)
      .map(([dimension, values]) => [dimension, values ?? []] as const)
      .filter(([, values]) => values.length > 0);
  }, [profile]);

  const validation = useMemo(() => {
    if (!current) return 'Enter your current password.';
    if (next.length < 8) return 'New password must be at least 8 characters.';
    if (next === current) return 'New password must be different from your current one.';
    if (next !== confirm) return 'New password and confirmation do not match.';
    return '';
  }, [current, next, confirm]);

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setPwNotice('');
    if (validation) {
      setPwError(validation);
      return;
    }
    setPwError('');
    setSaving(true);
    try {
      await changePassword(current, next);
      const stored = getStoredUser();
      if (stored) {
        storeUser({ ...stored, mustChangePassword: false });
        refreshUser();
      }
      setProfile((p) => (p ? { ...p, mustChangePassword: false } : p));
      setCurrent('');
      setNext('');
      setConfirm('');
      setPwNotice('Password updated.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account details, what you are allowed to see, and your password.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-2">
            <p>{loadError}</p>
            <Button size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {mustChange && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>
            You are still using a default password. Please set your own in{' '}
            <span className="font-medium">Change password</span> below.
          </p>
        </div>
      )}

      {/* ---- Identity ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Usernames and roles are managed by an administrator — you cannot change them here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary/15 text-base font-semibold text-foreground">
                {loading && !username ? '' : initialsOf(username || '?')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              {loading && !username ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <p className="truncate text-lg font-semibold text-foreground">{username}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                  <ShieldCheck aria-hidden="true" />
                  {role}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Member since {loading && !profile ? '…' : formatDate(profile?.createdAt ?? null)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField id="profile-username" label="Username" value={username || '—'} />
            <ReadOnlyField id="profile-role" label="Role" value={role} />
          </div>
          <p className="text-xs text-muted-foreground">
            Need a different role or username? Ask an administrator to update it in User management.
          </p>
        </CardContent>
      </Card>

      {/* ---- What I can access ---- */}
      <Card>
        <CardHeader>
          <CardTitle>What I can access</CardTitle>
          <CardDescription>Dashboards granted to you and the data slices you may see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
                <LayoutDashboard className="size-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-2xl leading-none font-semibold text-foreground">
                    {profile?.dashboardCount ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.dashboardCount === 1 ? 'dashboard' : 'dashboards'} available to you
                    {role === 'admin' ? ' (admins see every dashboard)' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Data scopes</p>
                {scopeEntries.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                    <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">No scopes configured</span> — your
                      access is <span className="font-medium text-foreground">unrestricted</span>. Every
                      dashboard you can open shows all sites and divisions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You only see rows matching every scope below.
                    </p>
                    {scopeEntries.map(([dimension, values]) => (
                      <div key={dimension} className="space-y-1.5">
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">
                          {SCOPE_LABELS[dimension] ?? dimension}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {values.map((v) => (
                            <Badge key={`${dimension}:${v}`} variant="outline">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---- Password ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            Change password
          </CardTitle>
          <CardDescription>
            At least 8 characters, and different from your current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-md gap-4" onSubmit={onChangePassword} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="profile-current-password">Current password</Label>
              <Input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-new-password">New password</Label>
              <Input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                aria-describedby="profile-new-password-hint"
              />
              <p id="profile-new-password-hint" className="text-xs text-muted-foreground">
                Minimum 8 characters.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-confirm-password">Confirm new password</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {pwError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
              >
                {pwError}
              </p>
            )}
            {pwNotice && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
              >
                <CircleCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                {pwNotice}
              </p>
            )}

            <div>
              {/* Enabled unless already saving, so clicking surfaces the exact
                  validation problem instead of leaving a dead button. */}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

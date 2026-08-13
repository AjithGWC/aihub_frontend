import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Share2, TriangleAlert } from 'lucide-react';
import {
  getDashboardAccess,
  getUserOptions,
  grantAccess,
  revokeAccess,
  type AccessGrant,
  type AccessLevel,
  type UserOption,
} from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const ALL_LEVELS: AccessLevel[] = ['view', 'share', 'developer', 'admin'];

const LEVEL_HINTS: Record<AccessLevel, string> = {
  view: 'view — open the dashboard only',
  share: 'share — open it and share view access',
  developer: 'developer — open it and iterate on it',
  admin: 'admin — full control, including sharing any level',
};

export interface ShareDashboardDialogProps {
  /** Dashboard being shared. */
  dashboardId: string;
  dashboardName: string;
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The current user's own access level on this dashboard. Anything below
   * `admin` may only grant `view` — the backend enforces this too (403).
   * Omit if unknown; the backend stays the source of truth.
   */
  myLevel?: AccessLevel;
  /** Fired after a successful grant or revoke so the parent can refresh. */
  onShared?: () => void;
}

/** Only dashboard admins may hand out anything stronger than `view`. */
function allowedLevels(myLevel?: AccessLevel): AccessLevel[] {
  if (!myLevel) return ALL_LEVELS; // unknown — let the backend decide
  return myLevel === 'admin' ? ALL_LEVELS : ['view'];
}

export default function ShareDashboardDialog({
  dashboardId,
  dashboardName,
  open,
  onOpenChange,
  myLevel,
  onShared,
}: ShareDashboardDialogProps) {
  const levels = useMemo(() => allowedLevels(myLevel), [myLevel]);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(false);
  /** Set when the grant list is not visible to us (share-level users get 403). */
  const [grantsBlocked, setGrantsBlocked] = useState('');

  const [username, setUsername] = useState('');
  const [level, setLevel] = useState<AccessLevel>('view');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const loadGrants = useCallback(async () => {
    try {
      setGrants(await getDashboardAccess(dashboardId));
      setGrantsBlocked('');
    } catch (err) {
      setGrants([]);
      const message = err instanceof Error ? err.message : '';
      // Only dashboard admins may read the grant list — that is expected for
      // share/developer users, so explain it rather than shouting an error.
      setGrantsBlocked(
        /admin access required/i.test(message)
          ? 'Only a dashboard admin can see the full list of people this dashboard is shared with.'
          : message || 'Current grants are not visible to you.'
      );
    }
  }, [dashboardId]);

  // Load users + current grants each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    setNotice('');
    setUsername('');
    setLevel(levels[0]);
    setLoading(true);
    (async () => {
      const [opts] = await Promise.all([
        getUserOptions().catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load the user list.');
          }
          return [] as UserOption[];
        }),
        loadGrants(),
      ]);
      if (!cancelled) {
        setUsers(opts);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, levels, loadGrants]);

  const existingLevelFor = useCallback(
    (name: string) => grants.find((g) => g.username === name)?.level,
    [grants]
  );

  const selectedExisting = username ? existingLevelFor(username) : undefined;

  const onGrant = async (e: FormEvent) => {
    e.preventDefault();
    if (granting) return;
    if (!username) {
      setError('Pick a user to share with.');
      return;
    }
    setError('');
    setNotice('');
    setGranting(true);
    try {
      await grantAccess(dashboardId, username, level);
      await loadGrants();
      setNotice(`${username} now has ${level} access.`);
      setUsername('');
      onShared?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share the dashboard.');
    } finally {
      setGranting(false);
    }
  };

  const onRevoke = async (grant: AccessGrant) => {
    if (revokingId !== null) return;
    setError('');
    setNotice('');
    setRevokingId(grant.userId);
    try {
      await revokeAccess(dashboardId, grant.userId);
      await loadGrants();
      setNotice(`Removed ${grant.username}'s access.`);
      onShared?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke access.');
    } finally {
      setRevokingId(null);
    }
  };

  const busy = granting || revokingId !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4 text-muted-foreground" aria-hidden="true" />
            Share “{dashboardName}”
          </DialogTitle>
          <DialogDescription>
            Give someone access to this dashboard, or remove access they already have.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onGrant} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="share-user">User</Label>
              {loading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={username} onValueChange={setUsername} disabled={users.length === 0}>
                  <SelectTrigger id="share-user" className="w-full">
                    <SelectValue placeholder={users.length ? 'Select a user…' : 'No users available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => {
                      const has = existingLevelFor(u.username);
                      return (
                        <SelectItem key={u.id} value={u.username}>
                          {u.username}
                          {has ? ` (has ${has})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-level">Access level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as AccessLevel)}>
                <SelectTrigger id="share-level" className="w-full">
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LEVEL_HINTS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {myLevel && myLevel !== 'admin' && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Your access level on this dashboard is{' '}
                <span className="font-medium text-foreground">{myLevel}</span>, so you can grant{' '}
                <span className="font-medium text-foreground">view</span> access only.
              </span>
            </p>
          )}

          {selectedExisting && (
            <p className="text-xs text-muted-foreground">
              {username} already has <span className="font-medium text-foreground">{selectedExisting}</span>{' '}
              access — sharing again updates their level.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
            >
              {notice}
            </p>
          )}

          <div className="flex justify-start">
            <Button type="submit" disabled={granting || !username || loading}>
              {granting ? 'Sharing…' : 'Share'}
            </Button>
          </div>
        </form>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Who has access</p>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : grantsBlocked ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{grantsBlocked}</span>
            </p>
          ) : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not shared with anyone yet. Admins can always see every dashboard.
            </p>
          ) : (
            <ScrollArea className="max-h-56 w-full">
              <ul className="divide-y divide-border">
                {grants.map((g) => (
                  <li key={g.userId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{g.username}</p>
                      {g.grantedBy && (
                        <p className="truncate text-xs text-muted-foreground">
                          granted by {g.grantedBy}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">{g.level}</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={revokingId !== null}
                        onClick={() => onRevoke(g)}
                      >
                        {revokingId === g.userId ? 'Removing…' : 'Revoke'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={busy}>
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { TriangleAlert, UserPlus } from 'lucide-react';
import { createUser } from '@/api';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const USERNAME_RE = /^[a-zA-Z0-9._-]{2,50}$/;
const DEFAULT_PASSWORD = 'Welcome@123';

export interface OnboardUserDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Called with the next open state (also fired by the overlay / Esc / Cancel). */
  onOpenChange: (open: boolean) => void;
  /**
   * Fired after a successful create so the parent can refresh its user list.
   * Signature matches the placeholder dialog in UsersAdmin.tsx — a handler that
   * only takes `(username)` is fine.
   */
  onCreated?: (username: string, role: 'admin' | 'user') => void;
}

/**
 * Admin action: onboard a brand-new user. The created user signs in with the
 * password set here and is forced to change it on first login.
 */
export default function OnboardUserDialog({
  open,
  onOpenChange,
  onCreated,
}: OnboardUserDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [confirm, setConfirm] = useState(DEFAULT_PASSWORD);
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset to a clean form every time the dialog is opened.
  useEffect(() => {
    if (open) {
      setUsername('');
      setPassword(DEFAULT_PASSWORD);
      setConfirm(DEFAULT_PASSWORD);
      setRole('user');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const validation = useMemo(() => {
    const name = username.trim();
    if (!name) return 'Username is required.';
    if (!USERNAME_RE.test(name)) {
      return 'Username must be 2–50 characters, using letters, numbers, dot, underscore or hyphen only.';
    }
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Password and confirmation do not match.';
    return '';
  }, [username, password, confirm]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (validation) {
      setError(validation);
      return;
    }
    const name = username.trim();
    setError('');
    setSubmitting(true);
    try {
      await createUser(name, password, role);
      onCreated?.(name, role);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" aria-hidden="true" />
            Onboard a new user
          </DialogTitle>
          <DialogDescription>
            They sign in with the password you set here and must change it on first login.
          </DialogDescription>
        </DialogHeader>

        <form id="onboard-user-form" className="grid gap-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="onboard-username">Username</Label>
            <Input
              id="onboard-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. priya.sharma"
              autoComplete="off"
              autoFocus
              aria-describedby="onboard-username-hint"
            />
            <p id="onboard-username-hint" className="text-xs text-muted-foreground">
              2–50 characters: letters, numbers, and <code>. _ -</code>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="onboard-password">Password</Label>
              <Input
                id="onboard-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboard-confirm">Confirm password</Label>
              <Input
                id="onboard-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="onboard-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'user')}>
              <SelectTrigger id="onboard-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user — sees only the dashboards granted to them</SelectItem>
                <SelectItem value="admin">admin — full access to everything</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="onboard-user-form"
            disabled={submitting || !username.trim()}
          >
            {submitting ? 'Creating…' : 'Create user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

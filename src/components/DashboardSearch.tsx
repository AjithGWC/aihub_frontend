import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartColumnIcon, SearchIcon } from 'lucide-react';
import { DashboardMeta } from '@/api';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** True on Apple platforms, so we can show ⌘K instead of Ctrl K. */
const IS_APPLE =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

export interface DashboardSearchProps {
  /** Dashboards the signed-in user has access to. */
  dashboards: DashboardMeta[];
  /** True while the dashboard list is still being fetched. */
  loading?: boolean;
  className?: string;
}

/**
 * Dashboard search: a navbar search box plus a Cmd/Ctrl+K command palette.
 * Filters on dashboard name + description and navigates to /dashboards/:id.
 */
export default function DashboardSearch({
  dashboards,
  loading = false,
  className,
}: DashboardSearchProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openDashboard = useCallback(
    (id: string) => {
      setOpen(false);
      navigate(`/dashboards/${id}`);
    },
    [navigate]
  );

  const shortcutLabel = IS_APPLE ? '⌘K' : 'Ctrl K';

  return (
    <>
      {/* Desktop: a search box that looks like an input but opens the palette */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search dashboards"
        aria-keyshortcuts={IS_APPLE ? 'Meta+K' : 'Control+K'}
        className={cn(
          'hidden h-8 w-44 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm md:w-60 lg:w-72 text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:flex',
          className
        )}
      >
        <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search dashboards…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground md:inline-block">
          {shortcutLabel}
        </kbd>
      </button>

      {/* Mobile: icon-only trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search dashboards"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:hidden"
      >
        <SearchIcon className="size-4" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
          {/* Visually hidden, but gives the dialog its accessible name. */}
          <DialogHeader className="sr-only">
            <DialogTitle>Search dashboards</DialogTitle>
            <DialogDescription>
              Find a dashboard by name or description and open it.
            </DialogDescription>
          </DialogHeader>

          <Command className="[&_[cmdk-input-wrapper]]:h-11">
            <CommandInput placeholder="Search dashboards…" />
            <CommandList>
              {loading ? (
                <div className="space-y-2 p-3" aria-busy="true" aria-live="polite">
                  <span className="sr-only">Loading dashboards…</span>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={`search-skeleton-${i}`} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <CommandEmpty>No dashboards found.</CommandEmpty>
                  <CommandGroup heading="Dashboards">
                    {dashboards.map((d) => (
                      <CommandItem
                        key={d.id}
                        // cmdk filters on `value`, so include the description too.
                        value={`${d.name} ${d.description ?? ''} ${d.id}`}
                        onSelect={() => openDashboard(d.id)}
                      >
                        <ChartColumnIcon aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{d.name}</span>
                          {d.description && (
                            <span className="truncate text-xs text-muted-foreground">
                              {d.description}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

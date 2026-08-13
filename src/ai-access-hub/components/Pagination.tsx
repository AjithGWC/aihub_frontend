import { Button } from '@/components/ui/button'

export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number
  limit: number
  total: number
  onChange: (offset: number) => void
}) {
  if (total === 0) return null

  const from = Math.min(offset + 1, total)
  const to = Math.min(offset + limit, total)
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex items-center justify-between px-1 py-2 text-xs text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(Math.max(0, offset - limit))} disabled={offset === 0}>
          Prev
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onChange(offset + limit)} disabled={offset + limit >= total}>
          Next
        </Button>
      </div>
    </div>
  )
}

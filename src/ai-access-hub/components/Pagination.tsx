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
    <div className="flex items-center justify-between px-2 py-3 text-xs font-bold text-slate-600 border-t border-slate-200/80">
      <span className="font-medium text-slate-500">
        Showing <span className="font-extrabold text-slate-900">{from}–{to}</span> of <span className="font-extrabold text-slate-900">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="text-xs font-bold border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs cursor-pointer disabled:opacity-40"
        >
          Prev
        </Button>
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-[11px]">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(offset + limit)}
          disabled={offset + limit >= total}
          className="text-xs font-bold border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs cursor-pointer disabled:opacity-40"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

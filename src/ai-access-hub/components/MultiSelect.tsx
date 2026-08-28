import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface MultiSelectOption {
  value: string
  label: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  className,
}: {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ')
        : `${selected.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer',
            selected.length === 0 ? 'text-muted-foreground' : 'text-foreground',
            className
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[240px] p-2" align="start">
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No options available.</p>
        ) : (
          <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
            {options.map((o) => {
              const checked = selected.includes(o.value)
              return (
                <label
                  key={o.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold text-foreground hover:bg-accent cursor-pointer"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(o.value)} />
                  <span className="truncate">{o.label}</span>
                </label>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

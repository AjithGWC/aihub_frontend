import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export interface MultiSelectOption {
  value: string
  label: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No options found.',
  className,
}: {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 px-3 py-2 text-xs shadow-xs outline-none transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer',
            className
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="py-0.5 font-semibold text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((o) => (
              <span
                key={o.value}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary shadow-2xs"
              >
                <span className="truncate max-w-[140px]">{o.label}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${o.label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(o.value)
                  }}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                >
                  <XIcon className="size-2.5" />
                </span>
              </span>
            ))
          )}
          <ChevronsUpDownIcon className="ml-auto size-3.5 shrink-0 opacity-60 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0 rounded-xl border border-border bg-card shadow-xl z-[999999]" align="start">
        <Command className="rounded-xl bg-card text-foreground">
          <CommandInput placeholder={searchPlaceholder} className="h-10 text-xs border-b border-border" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = selected.includes(o.value)
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => toggle(o.value)}
                    className="text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                      )}
                    >
                      {checked && <CheckIcon className="size-3" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

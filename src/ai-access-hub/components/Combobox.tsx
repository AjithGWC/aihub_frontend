import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
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

export interface ComboboxOption {
  value: string
  label: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  className,
}: {
  options: ComboboxOption[]
  value: string
  onChange: (next: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 px-3.5 text-xs shadow-xs outline-none transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer',
            selected ? 'text-foreground font-semibold' : 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0 rounded-xl border border-border bg-card shadow-xl z-[999999]" align="start">
        <Command className="rounded-xl bg-card text-foreground">
          <CommandInput placeholder={searchPlaceholder} className="h-10 text-xs border-b border-border" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className="text-xs font-semibold gap-2 cursor-pointer"
                >
                  <CheckIcon className={cn('size-3.5 text-primary', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

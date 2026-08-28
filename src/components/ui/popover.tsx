"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  // Same escape hatch as SelectContent/DialogPortal (see select.tsx, dialog.tsx):
  // Radix's default Portal target (document.body) sits below a Dialog's own
  // portal in z-index, so a Popover opened inside a Dialog would render
  // behind it. Sharing #global-modal-portal — and out-ranking the dialog's
  // z-[999999] — keeps it visible and above any open dialog.
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null)
  React.useEffect(() => {
    let portalEl = document.getElementById('global-modal-portal')
    if (!portalEl) {
      portalEl = document.createElement('div')
      portalEl.id = 'global-modal-portal'
      document.body.appendChild(portalEl)
    }
    setPortalTarget(portalEl)
  }, [])

  return (
    <PopoverPrimitive.Portal container={portalTarget ?? undefined}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "relative z-[1000000] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        style={{ zIndex: 1000000 }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }

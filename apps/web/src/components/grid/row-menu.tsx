'use client'

import { Ellipsis } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export type RowMenuItem = { readonly name: string; readonly action: () => void }

// The other things to do with a row, behind a button in the row: a menu anyone can reach by keyboard or by touch,
// where a right-click menu reached only a mouse. Drawn only when there is something to offer.
export function RowMenu({ label, items }: { label: string; items: readonly RowMenuItem[] }) {
  if (items.length === 0) return null
  return (
    <span className="flex h-full items-center">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={label} className="grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Ellipsis aria-hidden="true" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {items.map((item) => (
            <DropdownMenuItem key={item.name} className="min-h-11" onSelect={item.action}>
              {item.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}

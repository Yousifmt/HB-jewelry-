// HB/src/components/dashboard/product-actions.tsx
"use client"

import { CheckCircle, MoreHorizontal, Trash2 } from "lucide-react"
import type { Product } from "@/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProductActions({ product }: { product: Product }) {
  const openSold = () => document.dispatchEvent(new CustomEvent("hb:open-sold", { detail: product }))
  const openDelete = () => document.dispatchEvent(new CustomEvent("hb:open-delete", { detail: product }))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); queueMicrotask(openSold) }}
          disabled={product.sold}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          <span>Mark as Sold</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-destructive"
          onSelect={(e) => { e.preventDefault(); queueMicrotask(openDelete) }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// HB/src/components/dashboard/products-section.tsx
"use client";

import Image from "next/image";
import { format } from "date-fns";

import type { Product } from "@/types";
import { formatMoney, exportToCsv } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AddProductDialog } from "./add-product-dialog";
import { ProductActions } from "./product-actions";
import { Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductsSectionProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Compact mode mainly for small screens */
  compact?: boolean;
}

export function ProductsSection({
  products,
  searchQuery,
  setSearchQuery,
  compact = true,
}: ProductsSectionProps) {
  const handleExport = () => {
    const dataToExport = products.map((p) => ({
      name: p.name,
      status: p.sold ? "Sold" : "Available",
      buy_price_bhd: p.buyPriceBHD ?? 0,
      sold_price_bhd: p.soldPriceBHD ?? "",
      created_at: p.createdAt ? p.createdAt.toDate().toISOString() : "",
      sold_at: p.soldAt ? p.soldAt.toDate().toISOString() : "",
      image_url: p.imageUrl,
    }));
    exportToCsv("products.csv", dataToExport);
  };

  const headCell = cn(
    "font-medium text-muted-foreground",
    compact ? "py-2 text-xs" : "py-3 text-sm"
  );
  const cell = cn(compact ? "py-3 text-xs" : "py-4 text-sm"); // ↑ a bit taller rows
  const imageSize = compact ? 56 : 72; // slightly larger thumbnails

  return (
    <Card className={cn(compact ? "border-muted/70" : "")}>
      <CardHeader className={cn(compact ? "py-3" : "py-4")}>
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <CardTitle className={cn(compact ? "text-base" : "text-lg")}>Products</CardTitle>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search
                className={cn(
                  "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
                  compact ? "h-3.5 w-3.5" : "h-4 w-4"
                )}
              />
              <Input
                type="search"
                placeholder="Search by name..."
                className={cn(
                  "pl-8 sm:w-[260px]",
                  compact ? "h-9 text-xs" : "h-10 text-sm"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <AddProductDialog
                triggerSize="sm"
                triggerClassName={cn(compact ? "h-9 px-3 text-xs" : "h-9 px-3 text-sm")}
                triggerLabel="Add"
              />
              
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? "pt-0" : "pt-2")}>
        {/* ===== Mobile: card list with spacious, professional UI ===== */}
        {/* ===== Mobile: compact cards ===== */}
<div className="space-y-2 sm:hidden">
  {products.length > 0 ? (
    products.map((p) => (
      <div
        key={p.id}
        className="rounded-lg border bg-card p-2"
      >
        <div className="flex items-center gap-2">
          {/* Thumbnail smaller */}
          <Image
            src={p.imageUrl}
            alt={p.name || "Product image"}
            width={40}
            height={40}
            className="h-10 w-10 rounded-md object-cover"
          />

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Top row: name + status + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold leading-4">
                  {p.name || "Untitled"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  <span>Buy: {Number(p.buyPriceBHD ?? 0).toFixed(3)} BHD</span>
                  {p.sold && (
                    <span>• Sold: {Number(p.soldPriceBHD ?? 0).toFixed(3)} BHD</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={p.sold ? "outline" : "secondary"}
                  className="px-1.5 py-0.5 text-[10px]"
                >
                  {p.sold ? "Sold" : "Available"}
                </Badge>
                {/* Actions icon (no extra wrapper, tighter spacing) */}
                <div className="-mr-1">
                  <ProductActions product={p} />
                </div>
              </div>
            </div>

            {/* Meta line */}
            <div className="mt-1 text-[10px] leading-3 text-muted-foreground">
              {p.createdAt ? format(p.createdAt.toDate(), "LLL dd, yyyy") : "N/A"}
            </div>
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
      No products found.
    </div>
  )}
</div>


        {/* ===== Desktop/Tablet: table with clearer separation & roomy actions ===== */}
        <div className="hidden w-full overflow-x-auto sm:block">
          <Table
            className={cn(
              compact ? "[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap" : "",
              "rounded-xl border"
            )}
          >
            <TableHeader className="bg-muted/40">
              <TableRow className={cn(compact ? "h-10" : "h-12")}>
                <TableHead className={cn(headCell, "w-[64px]")}>Image</TableHead>
                <TableHead className={headCell}>Name</TableHead>
                <TableHead className={headCell}>Status</TableHead>
                <TableHead className={headCell}>Buy Price</TableHead>
                <TableHead className={headCell}>Sold Price</TableHead>
                <TableHead className={headCell}>Created At</TableHead>
                <TableHead className={cn(headCell, "text-right pr-4")}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="[&>tr]:border-b [&>tr:last-child]:border-0">
              {products.length > 0 ? (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className={cn(
                      compact ? "h-14" : "h-16",
                      "transition hover:bg-muted/20"
                    )}
                  >
                    <TableCell className={cell}>
                      <Image
                        alt={product.name || "Product image"}
                        className="aspect-square rounded-md object-cover ring-1 ring-border"
                        height={imageSize}
                        width={imageSize}
                        src={product.imageUrl}
                      />
                    </TableCell>

                    <TableCell className={cn(cell, "font-medium")}>
                      <span
                        className={cn(
                          "block truncate",
                          compact ? "max-w-[220px]" : "max-w-[320px]"
                        )}
                      >
                        {product.name}
                      </span>
                    </TableCell>

                    <TableCell className={cell}>
                      <Badge
                        variant={product.sold ? "outline" : "secondary"}
                        className={cn(compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs")}
                      >
                        {product.sold ? "Sold" : "Available"}
                      </Badge>
                    </TableCell>

                    <TableCell className={cell}>
                      {formatMoney(product.buyPriceBHD ?? 0)}
                    </TableCell>

                    <TableCell className={cell}>
                      {product.soldPriceBHD != null ? formatMoney(product.soldPriceBHD) : "—"}
                    </TableCell>

                    <TableCell className={cell}>
                      {product.createdAt ? format(product.createdAt.toDate(), "LLL dd, yyyy") : "N/A"}
                    </TableCell>

                    <TableCell className={cn(cell, "text-right")}>
                      {/* Extra spacing to separate actions from content */}
                      <div className={cn("inline-flex justify-end gap-1 pr-0.5", compact ? "" : "pr-1")}>
                        <ProductActions product={product} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className={cn("text-center", compact ? "h-16 text-xs" : "h-24 text-sm")}
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

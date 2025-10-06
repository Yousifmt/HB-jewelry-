// HB/src/components/dashboard/products-section.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { EditProductDialog } from "./edit-product-dialog";

import type { Product } from "@/types";
import { formatMoney, exportToCsv, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddProductDialog } from "./add-product-dialog";
import { ProductActions } from "./product-actions";
import { Download, Search, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductsSectionProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  compact?: boolean;
}

export function ProductsSection({
  products,
  searchQuery,
  setSearchQuery,
  compact = true,
}: ProductsSectionProps) {
  const { toast } = useToast();

  // === Controlled Edit dialog state (same style as MarkSoldDialog) ===
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const openEditFor = (p: Product) => {
    setEditProduct(p);
    setEditOpen(true);
  };

  const handleExport = () => {
    const dataToExport = products.map((p) => ({
      name: p.name,
      status: p.sold ? "Sold" : "Available",
      buy_price_bhd: p.buyPriceBHD ?? 0,
      sold_price_bhd: p.soldPriceBHD ?? "",
      created_at: p.createdAt ? p.createdAt.toDate().toISOString() : "",
      sold_at: p.soldAt ? p.soldAt.toDate().toISOString() : "",
      image_url: p.imageUrl,
      product_link: (p as any).productLink ?? "",
      description: (p as any).description ?? "",
    }));
    exportToCsv("products.csv", dataToExport);
  };

  const copyText = async (text?: string | null) => {
    try {
      await navigator.clipboard.writeText(text ?? "");
      toast({ title: "Copied", description: "Description copied to clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Could not copy to clipboard." });
    }
  };

  const headCell = cn("font-medium text-muted-foreground", compact ? "py-2 text-xs" : "py-3 text-sm");
  const cell = cn(compact ? "py-3 text-xs" : "py-4 text-sm");
  const imageSize = compact ? 64 : 72;

  return (
    <Card className={cn(compact ? "border-muted/70" : "", "overflow-hidden max-w-full")}>
      <CardHeader className={cn(compact ? "py-3" : "py-4")}>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-3">
          <CardTitle className={cn(compact ? "text-base" : "text-lg")}>Products</CardTitle>

          {/* Wrap-friendly controls that never overflow horizontally */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative w-full min-w-0 sm:w-[260px]">
              <Search
                className={cn(
                  "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
                  compact ? "h-3.5 w-3.5" : "h-4 w-4"
                )}
              />
              <Input
                type="search"
                placeholder="Search by name..."
                className={cn("w-full pl-8 min-w-0", compact ? "h-9 text-xs" : "h-10 text-sm")}
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
              <Button
                variant="outline"
                size="sm"
                className={cn(compact ? "h-9 px-3 text-xs" : "h-9 px-3 text-sm")}
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* clamp horizontal flow to the card width */}
      <CardContent className={cn(compact ? "pt-0 px-0 sm:px-6" : "pt-2 px-0 sm:px-6", "overflow-x-hidden")}>
        {/* ===== Phones & iPad: LIST VIEW (up to lg) ===== */}
        <div className="lg:hidden">
          {products.length > 0 ? (
            <div className="flex w-full max-w-full flex-col gap-3 px-3">
              {products.map((p) => {
                const productLink = (p as any).productLink as string | undefined;
                const description = (p as any).description as string | undefined;

                const Main = ({ children }: { children: React.ReactNode }) =>
                  productLink ? (
                    <Link
                      href={productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      {children}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-3">{children}</div>
                  );

                return (
                  <div key={p.id} className="w-full max-w-full rounded-xl border bg-card p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Main>
                        {/* Square image box */}
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
                          <Image
                            src={p.imageUrl}
                            alt={p.name || "Product image"}
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                            priority
                          />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold leading-5">
                                {p.name || "Untitled"}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
  <span className="flex items-baseline gap-1">
    <span>Buy:</span>
    <span className="tabular-nums whitespace-nowrap">
      {formatMoney(p.buyPriceBHD ?? 0)}
    </span>
  </span>

  {p.sold && p.soldPriceBHD != null && (
    <span className="flex items-baseline gap-1">
      <span>• Sold:</span>
      <span className="tabular-nums whitespace-nowrap">
        {formatMoney(p.soldPriceBHD)}
      </span>
    </span>
  )}
</div>

                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <Badge
                                variant={p.sold ? "outline" : "secondary"}
                                className="px-2.5 py-0.5 text-[11px]"
                              >
                                {p.sold ? "Sold" : "Available"}
                              </Badge>
                            </div>
                          </div>

                          {/* Multi-line description + copy */}
                          {description && description.trim().length > 0 && (
                            <div className="mt-1.5 flex items-start gap-1.5">
                              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-muted-foreground">
                                {description}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  copyText(description);
                                }}
                                aria-label="Copy description"
                                title="Copy description"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </Main>

                      {/* Actions (outside link) */}
                      <div className="ml-1 shrink-0">
                        <ProductActions product={p} onEdit={() => openEditFor(p)} />
                      </div>
                    </div>

                    <div className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                      {p.createdAt ? format(p.createdAt.toDate(), "LLL dd, yyyy") : "N/A"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
              No products found.
            </div>
          )}
        </div>

        {/* ===== Desktop (lg+): TABLE ===== */}
        <div className="hidden w-full lg:block">
          {/* Table scrolls inside if needed, never the page */}
          <div className="w-full overflow-x-auto">
            <Table
              className={cn(
                compact ? "[&_th]:whitespace-nowrap" : "",
                "rounded-xl border min-w-full"
              )}
            >
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className={cn(headCell, "w-[64px]")}>Image</TableHead>
                  <TableHead className={headCell}>Name</TableHead>
                  <TableHead className={headCell}>Status</TableHead>
                  <TableHead className={headCell}>Buy Price</TableHead>
                  <TableHead className={headCell}>Sold Price</TableHead>
                  <TableHead className={headCell}>Description</TableHead>
                  <TableHead className={headCell}>Created At</TableHead>
                  <TableHead className={cn(headCell, "text-right pr-4")}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="[&>tr]:border-b [&>tr:last-child]:border-0">
                {products.length > 0 ? (
                  products.map((product) => {
                    const productLink = (product as any).productLink as string | undefined;
                    const description = (product as any).description as string | undefined;

                    return (
                      <TableRow key={product.id} className="transition hover:bg-muted/20">
                        <TableCell className={cell}>
                          <Image
                            alt={product.name || "Product image"}
                            className="aspect-square rounded-md object-cover ring-1 ring-border"
                            height={imageSize}
                            width={imageSize}
                            src={product.imageUrl}
                          />
                        </TableCell>

                        <TableCell className={cn(cell, "font-medium align-top")}>
                          {productLink ? (
                            <a
                              href={productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block break-words underline-offset-2 hover:underline"
                            >
                              {product.name}
                            </a>
                          ) : (
                            <span className="block break-words">{product.name}</span>
                          )}
                        </TableCell>

                        <TableCell className={cn(cell, "align-top")}>
                          <Badge
                            variant={product.sold ? "outline" : "secondary"}
                            className={cn(compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs")}
                          >
                            {product.sold ? "Sold" : "Available"}
                          </Badge>
                        </TableCell>

                        <TableCell className={cn(cell, "align-top")}>
                          {formatMoney(product.buyPriceBHD ?? 0)}
                        </TableCell>

                        <TableCell className={cn(cell, "align-top")}>
                          {product.soldPriceBHD != null ? formatMoney(product.soldPriceBHD) : "—"}
                        </TableCell>

                        {/* Multi-line description */}
                        <TableCell className={cn(cell, "align-top whitespace-pre-wrap break-words")}>
                          <div className="flex items-start gap-1.5">
                            <span className="min-w-0 flex-1">
                              {description && description.trim().length > 0 ? description : "—"}
                            </span>
                            {description && description.trim().length > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => copyText(description)}
                                aria-label="Copy description"
                                title="Copy description"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className={cn(cell, "align-top")}>
                          {product.createdAt ? format(product.createdAt.toDate(), "LLL dd, yyyy") : "N/A"}
                        </TableCell>

                        <TableCell className={cn(cell, "text-right align-top")}>
                          <div className={cn("inline-flex justify-end gap-1 pr-0.5", compact ? "" : "pr-1")}>
                            <ProductActions product={product} onEdit={() => openEditFor(product)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className={cn("text-center", compact ? "h-16 text-xs" : "h-24 text-sm")}>
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Mount the controlled edit dialog (same pattern as MarkSoldDialog) */}
      <EditProductDialog product={editProduct} open={editOpen} onOpenChange={setEditOpen} />
    </Card>
  );
}

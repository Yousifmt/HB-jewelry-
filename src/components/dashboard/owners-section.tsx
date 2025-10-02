// src/components/dashboard/owners-section.tsx
"use client";

import { useMemo, useState } from "react";
import type { Owner, Sale, Product } from "@/types";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddContributionDialog } from "./add-contribution-dialog";
import { Users } from "lucide-react";

interface OwnersSectionProps {
  owners: Owner[];
  sales: Sale[];
  products: Product[]; // ← NEW: to filter out deleted/non-existing products
}

export function OwnersSection({ owners, sales, products }: OwnersSectionProps) {
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddContributionClick = (owner: Owner) => {
    setSelectedOwner(owner);
    setIsDialogOpen(true);
  };

  // Set of existing product IDs (available, not deleted)
  const existingProductIds = useMemo(
    () => new Set(products.map((p) => p.id)),
    [products]
  );

  // Consider ONLY sales whose product still exists
  const filteredSales = useMemo(
    () =>
      sales.filter(
        (s) => s.productId && existingProductIds.has(s.productId)
      ),
    [sales, existingProductIds]
  );

  // Latest sale among filtered (valid) sales
  const latestSale = useMemo(() => {
    if (!filteredSales.length) return null;
    const sorted = [...filteredSales].sort((a, b) => {
      const aMs = a?.soldAt?.toDate?.()?.getTime?.() ?? 0;
      const bMs = b?.soldAt?.toDate?.()?.getTime?.() ?? 0;
      return bMs - aMs;
    });
    return sorted[0] || null;
  }, [filteredSales]);

  // Sum of contributions (unchanged)
  const totalContribution = useMemo(
    () =>
      owners.reduce(
        (sum, o) => sum + (typeof o.contributionBHD === "number" ? o.contributionBHD : 0),
        0
      ),
    [owners]
  );

  // Profit of the latest valid sale only
  const latestProfit = latestSale?.profitBHD ?? 0;

  // Distribute latest profit only if its product exists (already ensured by latestSale from filteredSales)
  const shares: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    if (!owners.length || !latestSale) return result;

    if (totalContribution > 0) {
      // Proportional to contributions
      for (const o of owners) {
        const c = Math.max(0, Number(o.contributionBHD || 0));
        result[o.id] = latestProfit * (c / totalContribution);
      }
    } else {
      // No contributions → equal split
      const eq = owners.length ? latestProfit / owners.length : 0;
      for (const o of owners) result[o.id] = eq;
    }
    return result;
  }, [owners, latestSale, latestProfit, totalContribution]);

  const latestSoldAtStr = useMemo(() => {
    const d = latestSale?.soldAt?.toDate?.();
    if (!d) return "—";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [latestSale]);

  return (
    <>
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users /> Owners & Contributions
        </h2>
      </div>

      {/* Latest valid sale distribution */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Latest Profit Share</CardTitle>
          <CardDescription>
            {latestSale ? `Last sale on ${latestSoldAtStr}` : "No valid sales yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Sold Price</div>
              <div className="text-lg font-semibold">
                {formatMoney(latestSale?.soldPriceBHD || 0)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Buy Cost</div>
              <div className="text-lg font-semibold">
                {formatMoney(latestSale?.buyPriceBHD || 0)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Profit</div>
              <div className="text-lg font-semibold">
                {formatMoney(latestProfit)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Distribution Basis</div>
              <div className="text-lg font-semibold">
                {totalContribution > 0 ? "Proportional to Contributions" : "Equal Split"}
              </div>
            </div>
          </div>

          {/* Owners shares for latest valid sale */}
          {latestSale && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-2">Owners’ Share of Last Sale</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {owners.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{o.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Contribution: {formatMoney(o.contributionBHD || 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Latest Share</div>
                      <div className="font-semibold">
                        {formatMoney(shares[o.id] || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owners cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {owners.map((owner) => (
          <Card key={owner.id}>
            <CardHeader>
              <CardTitle>{owner.name}</CardTitle>
              <CardDescription>Total Contribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold">
                {formatMoney(owner.contributionBHD)}
              </p>

              {/* Latest valid sale share */}
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-xs text-muted-foreground">Latest Profit Share</div>
                <div className="font-medium">
                  {formatMoney(shares[owner.id] || 0)}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAddContributionClick(owner)}>
                Add Contribution
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedOwner && (
        <AddContributionDialog
          owner={selectedOwner}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  );
}

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddContributionDialog } from "./add-contribution-dialog";
import { Plus, Users } from "lucide-react";

interface OwnersSectionProps {
  owners: Owner[];
  sales: Sale[];
  products: Product[];
  onCreateOwner?: (payload: { name: string; contributionBHD: number }) => Promise<void> | void;
}

export function OwnersSection({ owners, sales, products, onCreateOwner }: OwnersSectionProps) {
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Add Owner dialog
  const [isAddOwnerOpen, setIsAddOwnerOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerContribution, setNewOwnerContribution] = useState<string>("");

  const handleAddContributionClick = (owner: Owner) => {
    setSelectedOwner(owner);
    setIsDialogOpen(true);
  };

  const openAddOwner = () => {
    setNewOwnerName("");
    setNewOwnerContribution("");
    setIsAddOwnerOpen(true);
  };

  const handleCreateOwner = async () => {
    const name = newOwnerName.trim();
    const contribution = Number(newOwnerContribution);
    if (!name) return;
    if (Number.isNaN(contribution) || contribution < 0) return;
    try {
      await onCreateOwner?.({ name, contributionBHD: contribution });
    } finally {
      setIsAddOwnerOpen(false);
    }
  };

  // Helpers
  const toJsDate = (tsLike: any | undefined): Date | undefined => {
    const d = tsLike?.toDate?.();
    return d instanceof Date ? d : undefined;
  };

  // Existing product IDs
  const existingProductIds = useMemo(
    () => new Set(products.map((p) => p.id)),
    [products]
  );

  // Prefer sales for products that still exist; if none (sync delay / deletion), fall back to all sales with productId
  const filteredSales = useMemo(() => {
    const withPid = sales.filter((s) => !!s.productId);
    const withExisting = withPid.filter((s) => existingProductIds.has(s.productId!));
    return withExisting.length ? withExisting : withPid;
  }, [sales, existingProductIds]);

  // Latest sale by soldAt || createdAt
  const latestSale = useMemo(() => {
    if (!filteredSales.length) return null;
    const sorted = [...filteredSales].sort((a, b) => {
      const aDate = toJsDate(a.soldAt) ?? toJsDate((a as any).createdAt);
      const bDate = toJsDate(b.soldAt) ?? toJsDate((b as any).createdAt);
      const aMs = aDate?.getTime() ?? 0;
      const bMs = bDate?.getTime() ?? 0;
      return bMs - aMs;
    });
    return sorted[0] ?? null;
  }, [filteredSales]);

  // Totals & weights
  const totalContribution = useMemo(
    () =>
      owners.reduce(
        (sum, o) => sum + (typeof o.contributionBHD === "number" ? o.contributionBHD : 0),
        0
      ),
    [owners]
  );

  const latestRevenue = latestSale?.soldPriceBHD ?? 0;
  const latestProfit = latestSale?.profitBHD ?? 0;

  // Weights per owner (by contribution or equal)
  const weights: Record<string, number> = useMemo(() => {
    const w: Record<string, number> = {};
    if (!owners.length || !latestSale) return w;

    if (totalContribution > 0) {
      const total = totalContribution || 1;
      for (const o of owners) {
        const c = Math.max(0, Number(o.contributionBHD || 0));
        w[o.id] = c / total;
      }
    } else {
      const eq = owners.length ? 1 / owners.length : 0;
      for (const o of owners) w[o.id] = eq;
    }
    return w;
  }, [owners, latestSale, totalContribution]);

  // Latest sold product share (profit only)
  const latestShares: Record<string, number> = useMemo(() => {
    const res: Record<string, number> = {};
    if (!latestSale) return res;
    for (const o of owners) res[o.id] = latestProfit * (weights[o.id] ?? 0);
    return res;
  }, [owners, latestSale, latestProfit, weights]);

  const latestSoldAtStr = useMemo(() => {
    const d = toJsDate(latestSale?.soldAt) ?? toJsDate((latestSale as any)?.createdAt);
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users /> Owners & Contributions
        </h2>
        <Button onClick={openAddOwner} className="gap-2">
          <Plus size={16} />
          Add Owner
        </Button>
      </div>

      {/* Latest valid sale summary */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Latest Distribution</CardTitle>
          <CardDescription>
            {latestSale ? `Last sale on ${latestSoldAtStr}` : "No valid sales yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Sold Price</div>
              <div className="text-lg font-semibold">{formatMoney(latestRevenue)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Buy Cost</div>
              <div className="text-lg font-semibold">
                {formatMoney(latestSale?.buyPriceBHD || 0)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Profit (to distribute)</div>
              <div className="text-lg font-semibold">{formatMoney(latestProfit)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Distribution Basis</div>
              <div className="text-lg font-semibold">
                {totalContribution > 0 ? "Proportional to Contributions" : "Equal Split"}
              </div>
            </div>
          </div>

          {/* Per-owner split: ONLY the latest sold product share (profit) */}
          {latestSale && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-2">Owners’ Share of Last Sale</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {owners.map((o) => (
                  <div key={o.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{o.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Contribution: {formatMoney(o.contributionBHD || 0)}
                        </span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        Weight: {(weights[o.id] ?? 0).toLocaleString(undefined, {
                          style: "percent",
                          minimumFractionDigits: 0,
                        })}
                      </div>
                    </div>

                    <div className="mt-2 rounded-md bg-muted/40 px-2 py-1.5">
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Latest Share (Profit)
                      </div>
                      <div className="font-semibold">
                        {formatMoney(latestShares[o.id] || 0)}
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

              {/* Only latest sold product share (profit) */}
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <div className="text-xs text-muted-foreground">Latest Share</div>
                <div className="font-medium">
                  {formatMoney(latestShares[owner.id] || 0)}
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

      {/* Add Owner Dialog */}
      <Dialog open={isAddOwnerOpen} onOpenChange={setIsAddOwnerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Owner</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="owner-name">Owner Name</Label>
              <Input
                id="owner-name"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                placeholder="e.g., Hawra"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="owner-contribution">Contribution (BHD)</Label>
              <Input
                id="owner-contribution"
                type="number"
                inputMode="decimal"
                step="0.001"
                value={newOwnerContribution}
                onChange={(e) => setNewOwnerContribution(e.target.value)}
                placeholder="e.g., 250"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOwnerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOwner}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

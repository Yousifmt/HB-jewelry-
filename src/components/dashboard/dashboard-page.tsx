// src/components/dashboard/dashboard-page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  writeBatch,
  addDoc,
} from "firebase/firestore";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CircleDollarSign, TrendingUp, Package } from "lucide-react";
import { ref, deleteObject } from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import type { Owner, Product, Sale } from "@/types";
import { formatMoney } from "@/lib/utils";
import { KpiCard } from "./kpi-card";
import { ProductsSection } from "./products-section";
import { OwnersSection } from "./owners-section";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "./confirm-dialog";
import { MarkSoldDialog } from "./mark-sold-dialog";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Use named export (no dynamic) to avoid lazy invalid element errors
import { AnalyticsCharts } from "./analytics-charts";

// DateRangePicker can stay dynamic
const DateRangePicker = dynamic(
  () => import("./date-range-picker").then((m) => m.DateRangePicker),
  { ssr: false }
);

export function DashboardPage() {
  // ======= State =======
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();

  // ======= Subscriptions: Products =======
  useEffect(() => {
    const qRef = query(collection(db, "products"));
    const unsubscribe = onSnapshot(qRef, (snap) => {
      const list: Product[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => {
        const aMs = a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.createdAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
      setProducts(list);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ======= Subscriptions: Sales =======
  useEffect(() => {
    const qRef = query(collection(db, "sales"));
    const unsubscribe = onSnapshot(qRef, (snap) => {
      const list: Sale[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setSales(list);
    });
    return unsubscribe;
  }, []);

  // ======= Seed + Subscribe Owners =======
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const ownersRef = collection(db, "owners");
        const snapshot = await getDocs(ownersRef);
        if (snapshot.empty) {
          const batch = writeBatch(db);
          (["Yousif", "Hawra", "Bayan"] as const).forEach((name) => {
            const refDoc = doc(ownersRef);
            batch.set(refDoc, {
              name,
              contributionBHD: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
        }
        const qRef = query(ownersRef);
        unsub = onSnapshot(qRef, (snap) => {
          const list: Owner[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
          setOwners(list);
        });
      } catch (e) {
        console.error("Owner seeding/subscription error:", e);
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // ======= Derived: Filtered Sales (by date + product exists) =======
  const filteredSales = useMemo(() => {
    if (!dateRange?.from) return [];

    const existingProductIds = new Set(products.map((p) => p.id));
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());

    const fromMs = from.getTime() - 60_000;
    const toMs = to.getTime() + 60_000;

    return sales.filter((sale) => {
      if (!sale.productId || !existingProductIds.has(sale.productId)) return false;
      const soldAtDate = sale?.soldAt?.toDate?.();
      if (!soldAtDate) return false;
      const t = soldAtDate.getTime();
      return t >= fromMs && t <= toMs;
    });
  }, [sales, dateRange, products]);

  // ======= KPIs (cost = unsold inventory; revenue/profit = sold & existing products) =======
  const kpis = useMemo(() => {
    // Unsold inventory cost (existing products)
    const availableProducts = products.filter((p) => !p.sold);
    const totalCost = availableProducts.reduce(
      (sum, p) => sum + (p.buyPriceBHD ?? 0),
      0
    );

    // Revenue & Profit from filteredSales (already ensures product still exists + date range)
    const totalRevenue = filteredSales.reduce(
      (sum, s) => sum + (s.soldPriceBHD ?? 0),
      0
    );
    const totalProfit = filteredSales.reduce(
      (sum, s) => sum + (s.profitBHD ?? 0),
      0
    );

    const itemsSoldCount = filteredSales.length;

    return { totalRevenue, totalCost, totalProfit, itemsSoldCount };
  }, [products, filteredSales]);

  // ======= Daily series for chart (sold & existing products only) =======
  const dailyData = useMemo(() => {
    const byDay: Record<string, { revenue: number; profit: number }> = {};
    for (const s of filteredSales) {
      const d = s?.soldAt?.toDate?.();
      if (!d) continue;
      const day = format(d, "yyyy-MM-dd");
      byDay[day] ||= { revenue: 0, profit: 0 };
      byDay[day].revenue += s.soldPriceBHD || 0;
      byDay[day].profit += s.profitBHD || 0;
    }
    return Object.entries(byDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredSales]);

  // ======= Products search (UI list only) =======
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [products, searchQuery]);

  // ======= Page-level dialogs =======
  const [toSell, setToSell] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  useEffect(() => {
    const onOpenSold = (e: Event) => setToSell((e as CustomEvent<Product>).detail);
    const onOpenDelete = (e: Event) => setToDelete((e as CustomEvent<Product>).detail);

    document.addEventListener("hb:open-sold", onOpenSold as EventListener);
    document.addEventListener("hb:open-delete", onOpenDelete as EventListener);
    return () => {
      document.removeEventListener("hb:open-sold", onOpenSold as EventListener);
      document.removeEventListener("hb:open-delete", onOpenDelete as EventListener);
    };
  }, []);

  // ======= Delete product handler =======
  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteDoc(doc(db, "products", toDelete.id));
      if (toDelete.imageUrl) {
        const imgRef = ref(storage, toDelete.imageUrl);
        await deleteObject(imgRef).catch(() => {});
      }
      toast({ title: "Success", description: "Product deleted successfully." });
    } catch (err) {
      console.error("Error deleting product:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete product. Please try again.",
      });
    }
  };

  // ======= CREATE OWNER handler =======
  const handleCreateOwner = async ({
    name,
    contributionBHD,
  }: {
    name: string;
    contributionBHD: number;
  }) => {
    try {
      const ownersRef = collection(db, "owners");
      await addDoc(ownersRef, {
        name: name.trim(),
        contributionBHD: Number(contributionBHD) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Owner added", description: `${name} was created successfully.` });
    } catch (err) {
      console.error("add owner error:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add owner. Please try again.",
      });
    }
  };

  // ======= Render =======
  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-background">
      {/* Sticky header */}
      <Header />

      {/* page-hosted dialogs */}
      {toSell && (
        <MarkSoldDialog
          product={toSell}
          open={true}
          onOpenChange={(o) => {
            if (!o) setToSell(null);
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setToDelete(null);
          }}
          title="Are you sure?"
          description={`This will permanently delete "${toDelete.name}" and its image.`}
          confirmText="Delete"
          onConfirm={async () => {
            await handleConfirmDelete();
            setToDelete(null);
          }}
        />
      )}

      <main
        className={[
          "flex flex-1 flex-col gap-6 px-3 pb-[env(safe-area-inset-bottom)] pt-3",
          "md:gap-8 md:px-6 md:py-6",
        ].join(" ")}
      >
        {/* Toolbar */}
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between md:p-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                Track revenue, profit, sales activity, and ownership contributions.
              </p>
            </div>
            <div className="flex w-full max-w-full items-center gap-2 md:w-auto">
              <DateRangePicker date={dateRange} setDate={setDateRange} />
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <KpiCard title="Total Revenue" value={formatMoney(kpis.totalRevenue)} icon={CircleDollarSign} />
                <KpiCard title="Total Cost (Unsold Inventory)" value={formatMoney(kpis.totalCost)} icon={CircleDollarSign} />
                <KpiCard title="Total Profit" value={formatMoney(kpis.totalProfit)} icon={TrendingUp} />
                <KpiCard title="Items Sold" value={String(kpis.itemsSoldCount)} icon={Package} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <section className="w-full overflow-x-auto">
              <div className="min-w-[320px] max-w-full md:min-w-0">
                <AnalyticsCharts dailyData={dailyData} />
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <ProductsSection
                products={filteredProducts}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Owners & Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <OwnersSection
                owners={owners}
                sales={sales}
                products={products}
                onCreateOwner={handleCreateOwner}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

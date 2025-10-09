// src/components/dashboard/analytics-charts.tsx
"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { useMemo } from "react";

type DailyPoint = {
  /** "yyyy-MM-dd" */
  date: string;
  /** aggregated revenue for that day */
  revenue: number;
  /** aggregated profit for that day */
  profit: number;
};

interface AnalyticsChartsProps {
  dailyData: DailyPoint[];
  /** chart height (px) */
  height?: number;
  /** show profit line only when there's profit data */
  showProfitIfAny?: boolean;
}

function safeParseYMD(dateStr: string): Date | null {
  // Accepts "yyyy-MM-dd"; returns UTC midnight date or null
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function AnalyticsCharts({
  dailyData,
  height = 200,
  showProfitIfAny = true,
}: AnalyticsChartsProps) {
  // Normalize & format labels once
  const normalized = useMemo(() => {
    return (dailyData ?? [])
      .filter((p) => p && typeof p.date === "string")
      .map((p) => {
        const dt = safeParseYMD(p.date);
        const shortDate = dt
          ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : p.date;
        return {
          shortDate,
          revenue: Number.isFinite(p.revenue) ? p.revenue : 0,
          profit: Number.isFinite(p.profit) ? p.profit : 0,
        };
      });
  }, [dailyData]);

  const hasData = normalized.length > 0;
  const showProfit = useMemo(
    () => showProfitIfAny && normalized.some((d) => (d.profit ?? 0) > 0),
    [normalized, showProfitIfAny]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground">Date</span>
            <span className="font-semibold">{label}</span>
          </div>
          {payload.map((pld: any, i: number) => {
            const value = Number.isFinite(pld?.value) ? pld.value : 0;
            return (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {pld?.name ?? ""}
                </span>
                <span className="font-semibold" style={{ color: pld?.color }}>
                  {formatMoney(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Sales (Revenue & Profit)</CardTitle>
        </CardHeader>
        <CardContent className="pl-1 pr-2 pb-3">
          {!hasData ? (
            <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
              No sales in the selected range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={normalized} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortDate"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  height={24}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => formatMoney(Number(v) || 0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.75}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
                {showProfit && (
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.25}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

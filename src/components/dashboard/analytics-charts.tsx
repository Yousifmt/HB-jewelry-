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

interface AnalyticsChartsProps {
  dailyData: { date: string; revenue: number; profit: number }[];
  /** ارتفاع الرسم (افتراضي 200) */
  height?: number;
  /** إظهار خط الربح إن وُجدت بيانات ربح */
  showProfitIfAny?: boolean;
}

function parseYMD(dateStr: string): Date {
  // يدعم "yyyy-MM-dd" بشكل ثابت بدون انزياح منطقة زمنية
  // مثال: "2025-09-04" → UTC منتصف اليوم
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function AnalyticsCharts({
  dailyData,
  height = 200,
  showProfitIfAny = true,
}: AnalyticsChartsProps) {
  const hasProfit = useMemo(
    () => showProfitIfAny && dailyData.some((d) => (d.profit ?? 0) > 0),
    [dailyData, showProfitIfAny]
  );

  const formattedDailyData = useMemo(
    () =>
      dailyData.map((d) => {
        const dt = parseYMD(d.date);
        const shortDate = dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return { ...d, shortDate };
      }),
    [dailyData]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground">Date</span>
            <span className="font-semibold">{label}</span>
          </div>
          {payload.map((pld: any, i: number) => (
            <div key={i} className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">{pld.name}</span>
              <span className="font-semibold" style={{ color: pld.color }}>
                {formatMoney(pld.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasData = formattedDailyData.length > 0;

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Revenue per Day</CardTitle>
        </CardHeader>
        <CardContent className="pl-1 pr-2 pb-3">
          {!hasData ? (
            <div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">
              No data in the selected range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart
                data={formattedDailyData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
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
                  tickFormatter={(value) => formatMoney(value)}
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
                {hasProfit && (
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

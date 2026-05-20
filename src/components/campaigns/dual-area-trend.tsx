"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";

/**
 * Dual area trend chart — Retornado (verde) vs Invertido (rojo) por día.
 * Cliente porque Recharts usa clases que rompen el SSR si se importa
 * desde un Server Component al evaluar el módulo durante build.
 */
export function DualAreaTrend({
  data,
}: {
  data: { date: string; cost: number; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-rev-detail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-cost-detail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={60} />
        <RechartsTooltip
          formatter={(v: number, name: string) => [
            new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
              maximumFractionDigits: 0,
            }).format(v),
            name === "revenue" ? "Retornado" : "Invertido",
          ]}
        />
        <Legend formatter={(val) => (val === "revenue" ? "Retornado" : "Invertido")} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#grad-rev-detail)"
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#grad-cost-detail)"
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

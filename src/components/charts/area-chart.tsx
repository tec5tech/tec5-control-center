"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function AreaTrend({
  data,
  dataKey,
  color = "#00f0ff",
  height = 260,
}: {
  data: { date: string; [k: string]: number | string }[];
  dataKey: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={60} />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.25 }}
          formatter={(v: number) => new Intl.NumberFormat("es-AR").format(v)}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
          activeDot={{ r: 5, strokeWidth: 2, stroke: color, fill: "hsl(var(--background))" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

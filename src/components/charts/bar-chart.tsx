"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type BarRow = {
  name: string;
  value: number;
  color?: string;
  // Permite payload extendido para que el onClick pueda identificar la entidad
  // (ej: campaignId) sin perder la fila seleccionada.
  [key: string]: unknown;
};

export function BarBreakdown({
  data,
  dataKey = "value",
  color = "#d62828",
  height = 260,
  onBarClick,
  highlightKey,
  highlightValue,
}: {
  data: BarRow[];
  dataKey?: string;
  color?: string;
  height?: number;
  onBarClick?: (row: BarRow) => void;
  // Cuando hay selección, atenuamos los demás
  highlightKey?: string;
  highlightValue?: string | null;
}) {
  const isInteractive = !!onBarClick;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={data.length > 5 ? -15 : 0} textAnchor={data.length > 5 ? "end" : "middle"} height={data.length > 5 ? 50 : 30} />
        <YAxis tickLine={false} axisLine={false} width={60} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
          formatter={(v: number) => new Intl.NumberFormat("es-AR").format(v)}
        />
        <Bar
          dataKey={dataKey}
          radius={[8, 8, 0, 0]}
          onClick={
            isInteractive
              ? (d: { payload?: BarRow }) => d.payload && onBarClick(d.payload)
              : undefined
          }
          cursor={isInteractive ? "pointer" : undefined}
        >
          {data.map((d, i) => {
            const baseColor = d.color ?? color;
            const dimmed =
              highlightKey && highlightValue && d[highlightKey] !== highlightValue;
            return (
              <Cell
                key={i}
                fill={baseColor}
                fillOpacity={dimmed ? 0.25 : 1}
                stroke={
                  highlightKey && highlightValue && d[highlightKey] === highlightValue
                    ? baseColor
                    : "transparent"
                }
                strokeWidth={2}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

type Slice = {
  name: string;
  value: number;
  color: string;
  [key: string]: unknown;
};

export function DonutShare({
  data,
  height = 260,
  onSliceClick,
}: {
  data: Slice[];
  height?: number;
  onSliceClick?: (slice: Slice) => void;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip formatter={(v: number) => new Intl.NumberFormat("es-AR").format(v)} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            cornerRadius={6}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            onClick={
              onSliceClick
                ? (d: { payload?: Slice }) => d.payload && onSliceClick(d.payload)
                : undefined
            }
            cursor={onSliceClick ? "pointer" : undefined}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
          <p className="text-xl font-semibold tabular-nums">
            {new Intl.NumberFormat("es-AR").format(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricInfo } from "@/components/ui/metric-info";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";

const ROI_GREEN = "#16a34a";
const ROI_RED = "#dc2626";
const ROI_GRAY = "#6b7280";

function barColor(roi: number, invested: number): string {
  if (invested === 0) return ROI_GRAY;
  if (roi >= 1) return ROI_GREEN;
  if (roi < 1) return ROI_RED;
  return ROI_GRAY;
}

type ChartRow = {
  name: string;
  roi: number;
  invested: number;
  color: string;
};

type TooltipPayloadEntry = {
  value: number;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const roi = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        ${roi.toFixed(2)} por cada $1 invertido
      </p>
    </div>
  );
}

export function RoiComparisonChart({
  perChannel,
}: {
  perChannel: ChannelMetrics[];
}) {
  const sorted: ChartRow[] = [...perChannel]
    .sort((a, b) => b.roi - a.roi)
    .map((c) => ({
      name: c.label,
      roi: Number(c.roi.toFixed(2)),
      invested: c.invested,
      color: barColor(c.roi, c.invested),
    }));

  const hasData = sorted.some((r) => r.invested > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Comparativa: Retorno por cada $1 invertido</CardTitle>
          <MetricInfo content="Cuanto más alta la barra, mejor rinde tu inversión. Por debajo de $1 estás perdiendo plata." />
        </div>
        <p className="text-xs text-muted-foreground">
          Cuanto más alta, mejor rinde tu inversión. Si está por debajo de $1, estás perdiendo dinero.
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <BarChart2 className="h-10 w-10 opacity-30" />
            <p className="text-sm">Sin datos de inversión todavía</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={sorted}
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                <Bar dataKey="roi" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {sorted.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-green-600 shrink-0" />
                Ganando dinero (mayor a $1)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-red-600 shrink-0" />
                Perdiendo dinero (menor a $1)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

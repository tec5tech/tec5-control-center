import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { MetricInfo } from "@/components/ui/metric-info";
import { formatCurrency } from "@/lib/utils";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

function TrendBadge({ trend }: { trend: ChannelMetrics["trend"] }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        Subiendo
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600">
        <TrendingDown className="h-3 w-3" />
        Bajando
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      Estable
    </span>
  );
}

export function ChannelCard({ metrics }: { metrics: ChannelMetrics }) {
  const profitPositive = metrics.profit >= 0;
  const hasData = metrics.invested > 0 || metrics.returned > 0;
  const roiPositive = metrics.roi >= 1;

  const roiBlock = hasData ? (
    <div
      className={cn(
        "rounded-lg px-4 py-3 border",
        roiPositive
          ? "bg-emerald-50 border-emerald-200"
          : "bg-rose-50 border-rose-200",
      )}
    >
      <p
        className={cn(
          "text-3xl font-bold tabular-nums",
          roiPositive ? "text-emerald-600" : "text-rose-600",
        )}
      >
        ${metrics.roi.toFixed(2)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        por cada $1 invertido
      </p>
    </div>
  ) : (
    <div className="rounded-lg px-4 py-3 border border-border bg-muted/20">
      <p className="text-sm text-muted-foreground">Sin datos en el período</p>
    </div>
  );

  return (
    <Card className="flex flex-col rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="grid place-items-center h-10 w-10 rounded-lg shrink-0"
              style={{ backgroundColor: `${metrics.hex}20` }}
            >
              <ChannelIcon channel={metrics.channel} size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{metrics.label}</p>
              <p className="text-xs text-muted-foreground truncate">{metrics.tagline}</p>
            </div>
          </div>
          <TrendBadge trend={metrics.trend} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invertido</p>
              <MetricInfo content="Total gastado en este canal en el período." />
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {metrics.invested > 0 ? formatCurrency(metrics.invested) : "—"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Retornado</p>
              <MetricInfo content="Ingresos generados por este canal en el período." />
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {metrics.returned > 0 ? formatCurrency(metrics.returned) : "—"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ganancia</p>
              <MetricInfo content="Retornado menos Invertido. Verde = ganás, rojo = perdés." />
            </div>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                metrics.invested > 0
                  ? profitPositive
                    ? "text-emerald-600"
                    : "text-rose-600"
                  : "text-muted-foreground",
              )}
            >
              {metrics.invested > 0
                ? `${profitPositive ? "+" : ""}${formatCurrency(metrics.profit)}`
                : "—"}
            </p>
          </div>
        </div>

        {/* ROI block */}
        {roiBlock}

        {/* CTA */}
        <Link
          href={`/dashboard/${metrics.slug}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:border-primary/40"
        >
          Ver campañas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

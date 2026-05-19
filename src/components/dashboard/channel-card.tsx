import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { formatCurrency } from "@/lib/utils";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

function TrendBadge({ trend }: { trend: ChannelMetrics["trend"] }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
        <TrendingUp className="h-3 w-3" />
        Subiendo
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">
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

  return (
    <Card className="flex flex-col">
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
        {!hasData ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            Sin datos en el período
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Invertido
              </p>
              <p className="text-base font-semibold tabular-nums">
                {metrics.invested > 0 ? formatCurrency(metrics.invested) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Retornado
              </p>
              <p className="text-base font-semibold tabular-nums">
                {metrics.returned > 0 ? formatCurrency(metrics.returned) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Ganancia
              </p>
              <p
                className={cn(
                  "text-base font-semibold tabular-nums",
                  metrics.invested > 0
                    ? profitPositive
                      ? "text-emerald-500"
                      : "text-rose-500"
                    : "text-muted-foreground",
                )}
              >
                {metrics.invested > 0
                  ? `${profitPositive ? "+" : ""}${formatCurrency(metrics.profit)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Retorno por $1
              </p>
              <p className="text-base font-semibold tabular-nums">
                {metrics.invested > 0 ? `$${metrics.roi.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>
        )}

        <Link
          href={`/dashboard/${metrics.slug}`}
          className="mt-auto inline-flex items-center justify-center rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:border-primary/40"
        >
          Ver campañas
        </Link>
      </CardContent>
    </Card>
  );
}

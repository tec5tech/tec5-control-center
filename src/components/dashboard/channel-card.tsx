import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { MetricInfo } from "@/components/ui/metric-info";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
  const roiPositive = metrics.roi >= 1;

  // Tres modos según la data disponible:
  //   1) hasInvestment → cards de inversión + bloque ROI grande
  //   2) hasEngagement (sin inversión) → cards de engagement + bloque "engagement"
  //   3) sin nada → "Sin datos en el período"
  const mode: "investment" | "engagement" | "empty" = metrics.hasInvestment
    ? "investment"
    : metrics.hasEngagement
      ? "engagement"
      : "empty";

  const engagementPrimary =
    metrics.leads > 0 ? "leads" : metrics.clicks > 0 ? "clicks" : "impressions";

  const engagementLabel =
    engagementPrimary === "leads"
      ? "Leads"
      : engagementPrimary === "clicks"
        ? "Clicks / Aperturas"
        : "Impresiones";

  const engagementValue =
    engagementPrimary === "leads"
      ? metrics.leads
      : engagementPrimary === "clicks"
        ? metrics.clicks
        : metrics.impressions;

  const roiBlock =
    mode === "investment" ? (
      <div
        className={cn(
          "rounded-lg px-4 py-3 border",
          roiPositive
            ? "bg-success/10 border-success/20"
            : "bg-destructive/10 border-destructive/20",
        )}
      >
        <p
          className={cn(
            "text-3xl font-bold tabular-nums",
            roiPositive ? "text-success" : "text-destructive",
          )}
        >
          ${metrics.roi.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">por cada $1 invertido</p>
      </div>
    ) : mode === "engagement" ? (
      <div
        className="rounded-lg px-4 py-3 border"
        style={{ backgroundColor: `${metrics.hex}10`, borderColor: `${metrics.hex}30` }}
      >
        <p className="text-3xl font-bold tabular-nums" style={{ color: metrics.hex }}>
          {formatNumber(engagementValue)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {engagementLabel.toLowerCase()} · canal orgánico
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
        {/* Stats grid — adaptativa */}
        {mode === "investment" ? (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invertido</p>
                <MetricInfo content="Total gastado en este canal en el período." />
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatCurrency(metrics.invested)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Retornado</p>
                <MetricInfo content="Ingresos generados por este canal en el período." />
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatCurrency(metrics.returned)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ganancia</p>
                <MetricInfo content="Retornado menos Invertido. Verde = ganás, rojo = perdés." />
              </div>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  profitPositive ? "text-success" : "text-destructive",
                )}
              >
                {profitPositive ? "+" : ""}
                {formatCurrency(metrics.profit)}
              </p>
            </div>
          </div>
        ) : mode === "engagement" ? (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leads</p>
                <MetricInfo content="Personas que respondieron / convirtieron en este canal." />
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatNumber(metrics.leads)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Clicks</p>
                <MetricInfo content="Para email: aperturas. Para LinkedIn: visitas al perfil/mensaje." />
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatNumber(metrics.clicks)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Impresiones</p>
                <MetricInfo content="Para email: enviados. Para otros: views totales." />
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatNumber(metrics.impressions)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 opacity-40">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Invertido</p>
              <p className="text-sm font-semibold tabular-nums">—</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Retornado</p>
              <p className="text-sm font-semibold tabular-nums">—</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Ganancia</p>
              <p className="text-sm font-semibold tabular-nums">—</p>
            </div>
          </div>
        )}

        {/* Block destacado */}
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

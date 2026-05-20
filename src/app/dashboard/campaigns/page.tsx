import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseDateRange } from "@/lib/date-range";
import { CHANNELS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { MetricInfo } from "@/components/ui/metric-info";
import { PeriodSelect } from "@/components/dashboard/period-select";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type { Channel } from "@/types/db";

export const dynamic = "force-dynamic";

function statusBadge(roi: number, invested: number, hasEngagement: boolean) {
  if (invested === 0 && !hasEngagement) {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
        Pendiente
      </span>
    );
  }
  // Sin inversión pero con engagement = canal orgánico activo
  if (invested === 0 && hasEngagement) {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
        Orgánico
      </span>
    );
  }
  if (roi >= 3) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Excelente
      </span>
    );
  }
  if (roi >= 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        Bueno
      </span>
    );
  }
  if (roi >= 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Regular
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
      Perdiendo
    </span>
  );
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params);

  // Load all campaigns with metrics and status (cost/revenue + engagement)
  const campaigns = await prisma.campaign.findMany({
    include: {
      metrics: {
        where: { date: { gte: from, lte: to } },
        select: { cost: true, revenue: true, leads: true, clicks: true, impressions: true },
      },
    },
  });

  // Build per-channel aggregates
  type ChannelRow = {
    key: Channel;
    slug: string;
    label: string;
    tagline: string;
    hex: string;
    invested: number;
    returned: number;
    profit: number;
    roi: number;
    leads: number;
    clicks: number;
    impressions: number;
    hasEngagement: boolean;
    total: number;
    active: number;
    paused: number;
  };

  const rows: ChannelRow[] = CHANNELS.map((ch) => {
    const chCampaigns = campaigns.filter((c) => c.channel === ch.key);
    let invested = 0;
    let returned = 0;
    let leads = 0;
    let clicks = 0;
    let impressions = 0;

    for (const c of chCampaigns) {
      for (const m of c.metrics) {
        invested += Number(m.cost);
        returned += Number(m.revenue);
        leads += m.leads;
        clicks += m.clicks;
        impressions += m.impressions;
      }
    }

    const profit = returned - invested;
    const roi = invested > 0 ? returned / invested : 0;
    const hasEngagement = leads > 0 || clicks > 0 || impressions > 0;
    const active = chCampaigns.filter((c) => c.status === "ACTIVE").length;
    const paused = chCampaigns.filter((c) => c.status === "PAUSED").length;

    return {
      key: ch.key,
      slug: ch.slug,
      label: ch.label,
      tagline: ch.tagline,
      hex: ch.hex,
      invested,
      returned,
      profit,
      roi,
      leads,
      clicks,
      impressions,
      hasEngagement,
      total: chCampaigns.length,
      active,
      paused,
    };
  });

  // Sort: invertido > 0 primero (por ROI), después engagement (por leads),
  // después pendientes alfabéticamente
  const sorted = [...rows].sort((a, b) => {
    const aHasInv = a.invested > 0;
    const bHasInv = b.invested > 0;
    if (aHasInv && bHasInv) return b.roi - a.roi;
    if (aHasInv) return -1;
    if (bHasInv) return 1;
    // Sin inversión: ordenar por engagement, después por nombre
    if (a.hasEngagement && b.hasEngagement) return b.leads - a.leads || b.clicks - a.clicks;
    if (a.hasEngagement) return -1;
    if (b.hasEngagement) return 1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campañas por Canal</h1>
          <p className="text-muted-foreground mt-1">
            Seleccioná un canal para ver el detalle de cada campaña
          </p>
        </div>
        <PeriodSelect />
      </div>

      {/* Channel rows */}
      <div className="flex flex-col gap-2">
        {sorted.map((row, idx) => {
          const profitPositive = row.profit >= 0;

          return (
            <Link
              key={row.key}
              href={`/dashboard/${row.slug}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/30"
              style={{ borderLeftWidth: 4, borderLeftColor: row.hex }}
            >
              {/* Rank */}
              <span className="text-sm font-bold text-muted-foreground w-5 shrink-0 tabular-nums">
                #{idx + 1}
              </span>

              {/* Icon */}
              <div
                className="grid place-items-center h-10 w-10 rounded-lg shrink-0"
                style={{ backgroundColor: `${row.hex}20` }}
              >
                <ChannelIcon channel={row.key} size={20} />
              </div>

              {/* Name + badge + tagline */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{row.label}</p>
                  {statusBadge(row.roi, row.invested, row.hasEngagement)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{row.tagline}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.active > 0 && `▶ ${row.active} activa${row.active > 1 ? "s" : ""}`}
                  {row.active > 0 && row.paused > 0 && " · "}
                  {row.paused > 0 && `${row.paused} pausada${row.paused > 1 ? "s" : ""}`}
                  {row.total > 0 && ` · ${row.total} total`}
                  {row.total === 0 && "Sin campañas"}
                </p>
              </div>

              {/* Stats — adaptativo: inversión si la hay, engagement si no */}
              <div className="hidden md:flex items-center gap-8 shrink-0">
                {row.invested > 0 ? (
                  <>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invertido</p>
                        <MetricInfo content="Total invertido en este canal en el período." />
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(row.invested)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ganancia</p>
                        <MetricInfo content="Retornado menos Invertido en el período." />
                      </div>
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          profitPositive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {profitPositive ? "+" : ""}
                        {formatCurrency(row.profit)}
                      </p>
                    </div>
                    <div className="text-right w-24">
                      <div className="flex items-center justify-end gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Por cada $1</p>
                        <MetricInfo content="ROI: cuánto recibís por cada $1 que invertís en este canal." />
                      </div>
                      <p className="text-sm font-bold tabular-nums">${row.roi.toFixed(2)}</p>
                    </div>
                  </>
                ) : row.hasEngagement ? (
                  <>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leads</p>
                        <MetricInfo content="Personas que respondieron o convirtieron en este canal." />
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatNumber(row.leads)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Clicks</p>
                        <MetricInfo content="Para email: aperturas. Para otros: clicks." />
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatNumber(row.clicks)}</p>
                    </div>
                    <div className="text-right w-24">
                      <div className="flex items-center justify-end gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Impresiones</p>
                        <MetricInfo content="Para email: enviados. Para otros: views totales." />
                      </div>
                      <p className="text-sm font-bold tabular-nums">{formatNumber(row.impressions)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-right w-16">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invertido</p>
                      <p className="text-sm font-semibold tabular-nums text-muted-foreground">—</p>
                    </div>
                    <div className="text-right w-16">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ganancia</p>
                      <p className="text-sm font-semibold tabular-nums text-muted-foreground">—</p>
                    </div>
                    <div className="text-right w-24">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Por cada $1</p>
                      <p className="text-sm font-bold tabular-nums text-muted-foreground">—</p>
                    </div>
                  </>
                )}
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center text-muted-foreground">
                {row.roi >= 1 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : row.invested > 0 ? (
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                ) : row.hasEngagement ? (
                  <Activity className="h-4 w-4 text-indigo-500" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

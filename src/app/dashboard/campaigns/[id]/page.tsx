import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  Megaphone,
} from "lucide-react";

import { prisma } from "@/lib/db";
import { parseDateRange } from "@/lib/date-range";
import { CHANNELS } from "@/lib/constants";
import { formatCurrency, formatNumber, statusLabel, channelLabel } from "@/lib/utils";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { KpiCard } from "@/components/charts/kpi-card";
import { AreaTrend } from "@/components/charts/area-chart";
import { PeriodSelect } from "@/components/dashboard/period-select";
import { RelativeTime } from "@/components/ui/relative-time";
import { DualAreaTrend } from "@/components/campaigns/dual-area-trend";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CampaignStatus, Channel } from "@/types/db";

export const dynamic = "force-dynamic";

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: CampaignStatus }) {
  const map: Record<CampaignStatus, { label: string; className: string }> = {
    ACTIVE: { label: "Activa", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PAUSED: { label: "Pausada", className: "bg-amber-100 text-amber-700 border-amber-200" },
    DRAFT:  { label: "Borrador", className: "bg-slate-100 text-slate-600 border-slate-200" },
    ENDED:  { label: "Finalizada", className: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const { label, className } = map[status] ?? map.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Alert severity icon ──────────────────────────────────────────────────────
function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "CRITICAL": return <XCircle className="h-4 w-4 shrink-0 text-rose-500" />;
    case "WARN":     return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />;
    case "OK":       return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />;
    default:         return <Info className="h-4 w-4 shrink-0 text-blue-500" />;
  }
}

// ─── Budget progress bar ──────────────────────────────────────────────────────
function BudgetBar({ spend, budget }: { spend: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, (spend / budget) * 100) : 0;
  const color =
    pct >= 90 ? "bg-rose-500" :
    pct >= 70 ? "bg-amber-400" :
    "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Gastado</span>
        <span className="tabular-nums font-medium">
          {formatCurrency(spend)} / {budget > 0 ? formatCurrency(budget) : "sin presupuesto"}
        </span>
      </div>
      {budget > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {budget > 0 && (
        <p className="text-xs text-muted-foreground text-right">{pct.toFixed(1)}% utilizado</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { from, to } = parseDateRange(sp);

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      metrics: {
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      },
      alerts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      owner: { select: { name: true, email: true } },
    },
  });

  if (!campaign) notFound();

  const meta = CHANNELS.find((c) => c.key === campaign.channel);
  const channelHex = meta?.hex ?? "#6b7280";

  // ─── Aggregate metrics ───────────────────────────────────────────────────
  let totalCost = 0;
  let totalRevenue = 0;
  let totalLeads = 0;
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalConversions = 0;

  const dailyMap = new Map<string, { cost: number; revenue: number; leads: number; clicks: number; impressions: number }>();

  for (const m of campaign.metrics) {
    const cost = Number(m.cost);
    const revenue = Number(m.revenue);
    totalCost += cost;
    totalRevenue += revenue;
    totalLeads += m.leads;
    totalClicks += m.clicks;
    totalImpressions += m.impressions;
    totalConversions += m.conversions;

    const day = m.date.toISOString().slice(0, 10);
    const prev = dailyMap.get(day) ?? { cost: 0, revenue: 0, leads: 0, clicks: 0, impressions: 0 };
    prev.cost += cost;
    prev.revenue += revenue;
    prev.leads += m.leads;
    prev.clicks += m.clicks;
    prev.impressions += m.impressions;
    dailyMap.set(day, prev);
  }

  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const profit = totalRevenue - totalCost;
  const roi = totalCost > 0 ? totalRevenue / totalCost : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // ─── Display modes ───────────────────────────────────────────────────────
  const hasInvestment = totalCost > 0 || totalRevenue > 0;
  const hasEngagement = totalLeads > 0 || totalClicks > 0 || totalImpressions > 0;

  const engagementKey: "leads" | "clicks" | "impressions" | null =
    totalLeads > 0 ? "leads" :
    totalClicks > 0 ? "clicks" :
    totalImpressions > 0 ? "impressions" : null;

  // ─── searchParams string for preserving period across links ─────────────
  const periodQuery = sp.from && sp.to ? `?from=${sp.from}&to=${sp.to}` : "";
  const channelSlug = meta?.slug ?? "";
  const backHref = `/dashboard/campaigns${periodQuery}`;
  const channelHref = `/dashboard/${channelSlug}${periodQuery}`;

  // Format dates
  function fmtDate(d: Date | null) {
    if (!d) return "—";
    return format(d, "dd/MM/yyyy");
  }

  const status = campaign.status as CampaignStatus;

  return (
    <div className="space-y-8">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={backHref}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Campañas
            </Link>
            <span>/</span>
            <Link
              href={channelHref}
              className="hover:text-foreground transition-colors"
            >
              {channelLabel(campaign.channel)}
            </Link>
          </div>

          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: `${channelHex}20` }}
            >
              <ChannelIcon channel={campaign.channel as Channel} size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{campaign.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">{channelLabel(campaign.channel)}</span>
                <span className="text-muted-foreground">·</span>
                <StatusPill status={status} />
              </div>
            </div>
          </div>

          {/* Owner */}
          {campaign.owner && (
            <p className="text-xs text-muted-foreground">
              Creada por{" "}
              <span className="font-medium text-foreground">
                {campaign.owner.name ?? campaign.owner.email}
              </span>
            </p>
          )}
        </div>

        {/* Period selector */}
        <div className="shrink-0">
          <PeriodSelect />
        </div>
      </div>

      {/* ─── Info card ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información de campaña</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {/* Status + budget */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-20 shrink-0">Estado</span>
              <StatusPill status={status} />
            </div>
            <BudgetBar spend={Number(campaign.spend)} budget={Number(campaign.budget)} />
          </div>

          {/* Dates + objective + audience */}
          <div className="space-y-3">
            {(campaign.startDate || campaign.endDate) && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Período: </span>
                  <span className="font-medium">
                    {fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}
                  </span>
                </div>
              </div>
            )}
            {campaign.objective && (
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Objetivo: </span>
                  <span className="font-medium">{campaign.objective}</span>
                </div>
              </div>
            )}
            {campaign.audience && (
              <div className="flex items-start gap-2">
                <Megaphone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Audiencia: </span>
                  <span className="font-medium">{campaign.audience}</span>
                </div>
              </div>
            )}
            {campaign.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {campaign.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── KPI grid (investment) ────────────────────────────────────────── */}
      {hasInvestment && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Invertido"
            value={formatCurrency(totalCost)}
            hint="Costo total en el período"
            icon={<DollarSign className="h-4 w-4" />}
            tooltip="Suma del campo cost de cada MetricSnapshot en el período seleccionado."
          />
          <KpiCard
            label="Retornado"
            value={formatCurrency(totalRevenue)}
            hint="Revenue generado"
            icon={<TrendingUp className="h-4 w-4" />}
            tooltip="Suma del campo revenue de cada MetricSnapshot en el período seleccionado."
          />
          <KpiCard
            label="Ganancia"
            value={`${profit >= 0 ? "+" : ""}${formatCurrency(profit)}`}
            hint={profit >= 0 ? "Resultado positivo" : "Pérdida neta"}
            icon={
              profit >= 0
                ? <TrendingUp className="h-4 w-4 text-emerald-500" />
                : <TrendingDown className="h-4 w-4 text-rose-500" />
            }
            valueClassName={profit >= 0 ? "text-emerald-600" : "text-rose-600"}
            tooltip="Revenue menos Costo en el período."
          />
          <KpiCard
            label="Retorno por $1"
            value={totalCost > 0 ? `$${roi.toFixed(2)}` : "—"}
            hint="Revenue / Costo"
            icon={<DollarSign className="h-4 w-4" />}
            tooltip="Cuánto retornás por cada $1 invertido. Resultado > $1 significa ganancia."
          />
        </div>
      )}

      {/* ─── KPI grid (engagement) ───────────────────────────────────────── */}
      {hasEngagement && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Leads"
            value={formatNumber(totalLeads)}
            icon={<Users className="h-4 w-4" />}
            tooltip="Cantidad de leads generados por esta campaña en el período."
          />
          <KpiCard
            label="Clicks"
            value={formatNumber(totalClicks)}
            icon={<MousePointerClick className="h-4 w-4" />}
            tooltip="Clicks totales recibidos por los anuncios de esta campaña."
          />
          <KpiCard
            label="Impresiones"
            value={formatNumber(totalImpressions)}
            icon={<Eye className="h-4 w-4" />}
            tooltip="Veces que el anuncio fue mostrado en pantalla."
          />
          <KpiCard
            label="CTR"
            value={totalImpressions > 0 ? `${ctr.toFixed(2)}%` : "—"}
            hint="Clicks / Impresiones"
            tooltip="Click-through rate: porcentaje de impresiones que terminaron en un click."
          />
        </div>
      )}

      {/* ─── Trend chart ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasInvestment ? "Retornado vs Invertido por día" :
             engagementKey ? `${engagementKey === "leads" ? "Leads" : engagementKey === "clicks" ? "Clicks" : "Impresiones"} por día` :
             "Tendencia"}
          </CardTitle>
          <CardDescription>
            {hasInvestment
              ? "Línea verde = retornado · roja = invertido"
              : "Evolución diaria en el período seleccionado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sin datos en el período seleccionado.
            </p>
          ) : hasInvestment ? (
            <DualAreaTrend data={dailyTrend} />
          ) : engagementKey ? (
            <AreaTrend
              data={dailyTrend}
              dataKey={engagementKey}
              color={channelHex}
              height={260}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sin métricas de engagement en este período.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Alerts ──────────────────────────────────────────────────────── */}
      {campaign.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas relacionadas</CardTitle>
            <CardDescription>
              Últimas {Math.min(10, campaign.alerts.length)} alertas de esta campaña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {campaign.alerts.slice(0, 10).map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 py-3">
                  <SeverityIcon severity={alert.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                  <RelativeTime
                    iso={alert.createdAt.toISOString()}
                    dateStyle="short"
                    className="shrink-0 text-xs text-muted-foreground"
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

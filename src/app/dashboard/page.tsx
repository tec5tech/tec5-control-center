import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/constants";
import { evaluateAlerts } from "@/lib/alerts";
import { getChannelHealth } from "@/lib/health";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/brand/channel-icon";
import type { Channel } from "@/types/db";
import { KpiCard } from "@/components/charts/kpi-card";
import { AreaTrend } from "@/components/charts/area-chart";
import { ChannelShareDonut } from "@/components/charts/channel-share";
import { AlertsStrip } from "@/components/alerts/alerts-strip";
import { ChannelHealthGrid, type ChannelHealthRow } from "@/components/health/channel-health-grid";
import { LiveLeadsFeed } from "@/components/leads/live-leads-feed";
import { SemaphoreBadge } from "@/components/health/semaphore-badge";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Zap,
  Activity as ActivityIcon,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  // Reevaluamos alertas en cada carga del overview. La idempotencia del motor
  // hace que esto sea barato — sólo crea eventos nuevos.
  await evaluateAlerts().catch((e) => console.error("[overview] evaluateAlerts failed", e));

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [campaigns, snapshots, kpis, recentCampaigns, alerts] = await Promise.all([
    prisma.campaign.findMany({}),
    prisma.metricSnapshot.findMany({
      where: { date: { gte: since } },
      include: { campaign: { select: { id: true, channel: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.kpi.findMany({ orderBy: { createdAt: "asc" }, take: 4 }),
    prisma.campaign.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.alertEvent.findMany({
      orderBy: [
        // Severidad: CRITICAL → WARN → INFO → OK
        { createdAt: "desc" },
      ],
      take: 30,
    }),
  ]);

  // Totales
  const totals = snapshots.reduce(
    (acc, s) => {
      acc.cost += s.cost;
      acc.revenue += s.revenue;
      acc.leads += s.leads;
      acc.clicks += s.clicks;
      acc.impressions += s.impressions;
      return acc;
    },
    { cost: 0, revenue: 0, leads: 0, clicks: 0, impressions: 0 },
  );

  const overallRoi = totals.cost > 0 ? totals.revenue / totals.cost : null;
  const overallCpl = totals.leads > 0 && totals.cost > 0 ? totals.cost / totals.leads : null;

  // Salud por canal — uso ChannelDashboard's serialized types implícitamente
  const healthRows: ChannelHealthRow[] = CHANNELS.map((c) => {
    const cs = campaigns.filter((x) => x.channel === c.key);
    const ss = snapshots
      .filter((s) => s.campaign.channel === c.key)
      .map((s) => ({
        campaignId: s.campaignId,
        date: s.date.toISOString(),
        impressions: s.impressions,
        clicks: s.clicks,
        leads: s.leads,
        cost: s.cost,
        revenue: s.revenue,
        conversions: s.conversions,
      }));
    const cmp = cs.map((x) => ({
      id: x.id,
      name: x.name,
      status: x.status as "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED",
      budget: x.budget,
      spend: x.spend,
    }));
    const h = getChannelHealth(c.key as Channel, cmp, ss);
    return {
      channel: c.key as Channel,
      color: h.color,
      score: h.score,
      spent: h.spent,
      revenue: h.revenue,
      leads: h.leads,
      roi: h.roi,
      budget: h.budget,
      budgetUsedPct: h.budgetUsedPct,
      primaryReason: h.reasons[0] ?? "Sin datos",
    };
  });

  // Salud global = promedio ponderado por gasto
  const totalSpent = healthRows.reduce((a, r) => a + r.spent, 0) || 1;
  const overallScore = Math.round(
    healthRows.reduce((a, r) => a + (r.color === "neutral" ? 0 : r.score) * (r.spent || 0), 0) / totalSpent,
  ) || 0;
  const overallColor =
    overallScore === 0 ? "neutral" : overallScore >= 75 ? "green" : overallScore >= 50 ? "amber" : "red";

  // Serie de leads por día
  const byDay = new Map<string, { leads: number; cost: number; revenue: number }>();
  snapshots.forEach((s) => {
    const k = s.date.toISOString().slice(5, 10);
    const prev = byDay.get(k) ?? { leads: 0, cost: 0, revenue: 0 };
    prev.leads += s.leads;
    prev.cost += s.cost;
    prev.revenue += s.revenue;
    byDay.set(k, prev);
  });
  const trend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Donut "de dónde vienen los leads"
  const byChannelLeads = new Map<string, number>();
  snapshots.forEach((s) => {
    byChannelLeads.set(s.campaign.channel, (byChannelLeads.get(s.campaign.channel) ?? 0) + s.leads);
  });
  const share = CHANNELS.map((c) => ({
    name: c.label,
    value: byChannelLeads.get(c.key) ?? 0,
    color: c.hex,
    slug: c.slug,
  })).filter((x) => x.value > 0);

  // Ordenamos las alertas por severidad antes de mostrarlas
  const sevWeight: Record<string, number> = { CRITICAL: 0, WARN: 1, INFO: 2, OK: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => {
    const aw = sevWeight[a.severity] ?? 5;
    const bw = sevWeight[b.severity] ?? 5;
    if (aw !== bw) return aw - bw;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const stripAlerts = sortedAlerts.slice(0, 4).map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    channel: a.channel,
    campaignId: a.campaignId,
    title: a.title,
    message: a.message,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      {/* === HERO: salud del negocio === */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Últimos 30 días</p>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Resumen general
            <SemaphoreBadge color={overallColor} score={overallScore} size="lg" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Cómo están rindiendo tus canales · ROI {overallRoi !== null ? `${overallRoi.toFixed(2)}x` : "—"}
            {overallCpl ? ` · Costo por lead ${formatCurrency(overallCpl)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ActivityIcon className="h-3 w-3" /> en vivo
          </Badge>
          <Badge variant="outline">30 días</Badge>
        </div>
      </div>

      {/* === Alertas relevantes (top) === */}
      <AlertsStrip initial={stripAlerts} limit={4} />

      {/* === Live leads feed + KPIs ejecutivos === */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Inversión"
              value={formatCurrency(totals.cost)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              label="Ingreso"
              value={formatCurrency(totals.revenue)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              label="Leads"
              value={formatNumber(totals.leads)}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              label="ROI"
              value={overallRoi !== null ? `${overallRoi.toFixed(2)}x` : "—"}
              icon={<Target className="h-4 w-4" />}
            />
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Leads por día</CardTitle>
              <CardDescription>Cantidad de leads generados cada día en todos los canales</CardDescription>
            </CardHeader>
            <CardContent>
              <AreaTrend data={trend} dataKey="leads" color="#d62828" />
            </CardContent>
          </Card>
        </div>

        {/* Feed en vivo */}
        <LiveLeadsFeed />
      </div>

      {/* === Dónde se invierte bien o mal — salud por canal === */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Por canal</p>
            <h2 className="text-xl font-bold tracking-tight">Dónde se invierte bien o mal</h2>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Click en una tarjeta para ver el detalle
          </p>
        </div>
        <ChannelHealthGrid rows={healthRows} />
      </div>

      {/* === Donut + KPIs + últimas campañas === */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>De dónde vienen los leads</CardTitle>
            <CardDescription>Participación por canal</CardDescription>
          </CardHeader>
          <CardContent>
            {share.length ? (
              <ChannelShareDonut data={share} />
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos en este período.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos (KPIs)</CardTitle>
            <CardDescription>Progreso hacia las metas del trimestre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kpis.length ? kpis.map((k) => {
              const target = Number(k.target);
              const current = Number(k.current);
              const progress =
                k.direction === "HIGHER_IS_BETTER"
                  ? (current / target) * 100
                  : (target / Math.max(current, 0.01)) * 100;
              const clamped = Math.max(0, Math.min(100, progress));
              const good = clamped >= 85;
              const warn = clamped >= 60 && clamped < 85;
              return (
                <div key={k.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{k.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {current} / {target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${good ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${clamped}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-muted-foreground">Aún no definiste objetivos.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas campañas actualizadas</CardTitle>
            <CardDescription>Movimientos recientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid place-items-center h-9 w-9 rounded-md bg-muted shrink-0">
                    <ChannelIcon channel={c.channel as Channel} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CHANNELS.find((ch) => ch.key === c.channel)?.label ?? c.channel}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    c.status === "ACTIVE" ? "active"
                      : c.status === "PAUSED" ? "paused"
                        : c.status === "DRAFT" ? "draft" : "ended"
                  }
                >
                  {c.status === "ACTIVE" ? "Activa"
                    : c.status === "PAUSED" ? "Pausada"
                      : c.status === "DRAFT" ? "Borrador" : "Finalizada"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <Zap className="h-3 w-3 text-emerald-500" />
        Las alertas y los leads se actualizan automáticamente.
      </p>
    </div>
  );
}

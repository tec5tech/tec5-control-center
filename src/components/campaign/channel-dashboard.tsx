"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Eye,
  Filter,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import type { Channel, CampaignStatus } from "@/types/db";
import { CHANNELS } from "@/lib/constants";
import { formatCurrency, formatNumber, channelLabel } from "@/lib/utils";
import { getChannelLabels } from "@/lib/channel-labels";

import { KpiCard } from "@/components/charts/kpi-card";
import { AreaTrend } from "@/components/charts/area-chart";
import { BarBreakdown } from "@/components/charts/bar-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { CampaignTable } from "@/components/campaign/campaign-table";
import { NewCampaignButton } from "@/components/campaign/new-campaign-button";
import { SyncButton } from "@/components/campaign/sync-button";
import { SemaphoreBadge } from "@/components/health/semaphore-badge";
import type { SemaphoreColor } from "@/lib/health";
import { PeriodChips } from "@/components/dashboard/period-chips";

export type ChannelHealthLite = {
  score: number;
  color: SemaphoreColor;
  label: string;
  roi: number | null;
  budgetUsedPct: number;
  budget: number;
  spent: number;
  reasons: string[];
};

export type SerializedSnapshot = {
  campaignId: string;
  date: string; // ISO
  impressions: number;
  clicks: number;
  leads: number;
  cost: number;
  revenue: number;
  conversions?: number;
};

export type SerializedCampaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  budget: number;
  spend: number;
};

export type IntegrationInfo = {
  status: string;
  lastSyncAt: string | null;
} | null;

type Props = {
  channel: Channel;
  campaigns: SerializedCampaign[];
  snapshots: SerializedSnapshot[];
  integration: IntegrationInfo;
  health?: ChannelHealthLite;
  from: string; // YYYY-MM-DD
  to: string;
};

function fmtDate(iso: string, withYear: boolean) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
  });
}

export function ChannelDashboard({
  channel,
  campaigns,
  snapshots,
  integration,
  health,
  from,
  to,
}: Props) {
  const meta = CHANNELS.find((c) => c.key === channel)!;
  const labels = getChannelLabels(channel);
  const isLive = integration?.status === "CONNECTED";
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedCampaign = useMemo(
    () =>
      selectedId ? campaigns.find((c) => c.id === selectedId) ?? null : null,
    [selectedId, campaigns],
  );

  // Snapshots filtrados por selección de campaña
  const visibleSnapshots = useMemo(
    () =>
      selectedId
        ? snapshots.filter((s) => s.campaignId === selectedId)
        : snapshots,
    [snapshots, selectedId],
  );

  // Totales del filtro visible
  const totals = useMemo(
    () =>
      visibleSnapshots.reduce(
        (acc, s) => {
          acc.impressions += s.impressions;
          acc.clicks += s.clicks;
          acc.leads += s.leads;
          acc.cost += s.cost;
          acc.revenue += s.revenue;
          acc.conversions += s.conversions ?? 0;
          return acc;
        },
        { impressions: 0, clicks: 0, leads: 0, cost: 0, revenue: 0, conversions: 0 },
      ),
    [visibleSnapshots],
  );

  // Totales del canal entero (sin filtro) — para decidir qué cards mostrar
  const allTotals = useMemo(
    () =>
      snapshots.reduce(
        (acc, s) => {
          acc.impressions += s.impressions;
          acc.clicks += s.clicks;
          acc.leads += s.leads;
          acc.cost += s.cost;
          acc.revenue += s.revenue;
          acc.conversions += s.conversions ?? 0;
          return acc;
        },
        { impressions: 0, clicks: 0, leads: 0, cost: 0, revenue: 0, conversions: 0 },
      ),
    [snapshots],
  );

  // Qué KPIs secundarios mostrar
  const showImpressions = allTotals.impressions > 0;
  const showClicks = allTotals.clicks > 0;
  const showLeads = allTotals.leads > 0;

  const useLeads = allTotals.leads > 0;
  const primaryKey = useLeads ? "leads" : "clicks";

  const clickRate = totals.impressions
    ? (totals.clicks / totals.impressions) * 100
    : 0;

  const rangeLabel = `${fmtDate(from, true)} → ${fmtDate(to, true)}`;

  // Trend diario de costo y revenue (para el AreaTrend dual)
  const dailyTrend = useMemo(() => {
    const byDay = new Map<
      string,
      { cost: number; revenue: number; leads: number; clicks: number; impressions: number }
    >();
    visibleSnapshots.forEach((s) => {
      const k = s.date.slice(0, 10);
      const prev = byDay.get(k) ?? {
        cost: 0,
        revenue: 0,
        leads: 0,
        clicks: 0,
        impressions: 0,
      };
      prev.cost += s.cost;
      prev.revenue += s.revenue;
      prev.leads += s.leads;
      prev.clicks += s.clicks;
      prev.impressions += s.impressions;
      byDay.set(k, prev);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [visibleSnapshots]);

  // Campañas por ROI para BarBreakdown
  const perCampaignRoi = useMemo(() => {
    return campaigns
      .map((c) => {
        const cs = snapshots.filter((s) => s.campaignId === c.id);
        const cost = cs.reduce((a, b) => a + b.cost, 0);
        const revenue = cs.reduce((a, b) => a + b.revenue, 0);
        const roi = cost > 0 ? revenue / cost : 0;
        return {
          campaignId: c.id,
          name: c.name.length > 28 ? c.name.slice(0, 26) + "…" : c.name,
          fullName: c.name,
          value: roi,
          color: roi >= 1 ? "#10b981" : "#ef4444",
        };
      })
      .filter((x) => x.value > 0 || snapshots.some((s) => s.campaignId === x.campaignId))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [campaigns, snapshots]);

  const tableRows = useMemo(() => {
    return campaigns
      .filter((c) => (selectedId ? c.id === selectedId : true))
      .map((c) => {
        const cs = snapshots.filter((s) => s.campaignId === c.id);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          channel,
          budget: c.budget,
          spend: c.spend,
          leads: cs.reduce((a, b) => a + b.leads, 0),
          clicks: cs.reduce((a, b) => a + b.clicks, 0),
        };
      });
  }, [campaigns, snapshots, selectedId, channel]);

  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;

  const handleBarClick = (row: Record<string, unknown>) => {
    const id = typeof row.campaignId === "string" ? row.campaignId : null;
    if (!id) return;
    setSelectedId((prev) => (prev === id ? null : id));
  };

  // Investment KPI values (always from visibleSnapshots)
  const profit = totals.revenue - totals.cost;
  const roi = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  return (
    <div className="space-y-8">
      {/* Header — estilo home */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="grid place-items-center h-14 w-14 rounded-xl shrink-0"
            style={{ backgroundColor: `${meta.hex}20` }}
          >
            <ChannelIcon channel={channel} size={30} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {channelLabel(channel)}
            </p>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
              {meta.label}
              {health && (
                <SemaphoreBadge
                  color={health.color}
                  label={health.label}
                  score={health.score}
                  size="md"
                />
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {meta.tagline} · {campaigns.length} campañas · {activeCount} activas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <Badge variant="active" className="gap-1">
              <Zap className="h-3 w-3" /> Datos en vivo
              {integration?.lastSyncAt && (
                <span className="opacity-60 ml-1">
                  ·{" "}
                  <RelativeTime
                    iso={integration.lastSyncAt}
                    dateStyle="short"
                    timeStyle="short"
                  />
                </span>
              )}
            </Badge>
          )}
          {isLive && <SyncButton channel={channel} label="Actualizar" />}
          <NewCampaignButton channel={channel} />
        </div>
      </div>

      {/* Period chips */}
      <PeriodChips />

      {/* Filter chip de campaña seleccionada */}
      <AnimatePresence>
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Filtrando por campaña:</span>
              <span className="font-medium truncate">{selectedCampaign.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-4 w-4" />
                Quitar filtro
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 KPI cards de inversión — protagonistas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Invertido"
          value={totals.cost > 0 ? formatCurrency(totals.cost) : "—"}
          hint={rangeLabel}
          icon={<DollarSign className="h-4 w-4" />}
          tooltip="Suma del costo de todas las campañas en el período."
        />
        <KpiCard
          label="Retornado"
          value={totals.revenue > 0 ? formatCurrency(totals.revenue) : "—"}
          hint="Ingresos generados"
          icon={<TrendingUp className="h-4 w-4" />}
          tooltip="Suma del revenue de todas las campañas en el período."
        />
        <KpiCard
          label="Ganancia"
          value={
            totals.cost > 0
              ? `${profit >= 0 ? "+" : ""}${formatCurrency(profit)}`
              : "—"
          }
          hint={profit >= 0 ? "Resultado positivo" : "Perdiendo dinero"}
          icon={
            profit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )
          }
          tooltip="Revenue menos Costo."
        />
        <KpiCard
          label="Retorno por $1"
          value={totals.cost > 0 ? `$${roi.toFixed(2)}` : "—"}
          hint="Revenue / Costo"
          icon={<DollarSign className="h-4 w-4" />}
          tooltip="Cuánto ingreso generás por cada peso invertido. > $1 = ganancia."
        />
      </div>

      {/* KPI secundarios — solo si el canal tiene esas métricas */}
      {(showImpressions || showClicks || showLeads) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showImpressions && (
            <KpiCard
              label={labels.impressions}
              value={formatNumber(totals.impressions)}
              icon={<Eye className="h-4 w-4" />}
              tooltip={labels.impressionsTooltip}
            />
          )}
          {showClicks && (
            <KpiCard
              label={labels.clicks}
              value={formatNumber(totals.clicks)}
              icon={<MousePointerClick className="h-4 w-4" />}
              tooltip={labels.clicksTooltip}
            />
          )}
          {showLeads && (
            <KpiCard
              label={labels.leads}
              value={formatNumber(totals.leads)}
              icon={<Users className="h-4 w-4" />}
              tooltip={labels.leadsTooltip}
            />
          )}
          {showClicks && showImpressions && (
            <KpiCard
              label={
                channel === "EMAIL_OUTREACH"
                  ? "Tasa de apertura"
                  : channel === "LINKEDIN_OUTREACH"
                    ? "Tasa de visita"
                    : "CTR"
              }
              value={`${clickRate.toFixed(2)}%`}
              hint="Clicks / Impresiones"
            />
          )}
        </div>
      )}

      {/* Gráficos principales */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* AreaTrend dual: Retornado vs Invertido */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Retornado vs Invertido por día</CardTitle>
            <CardDescription>
              {selectedCampaign
                ? `Campaña: ${selectedCampaign.name}`
                : `Período ${rangeLabel}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyTrend.length > 0 ? (
              <MultiAreaTrend data={dailyTrend} />
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Sin datos en este período.
              </p>
            )}
          </CardContent>
        </Card>

        {/* BarBreakdown por ROI de campaña */}
        {perCampaignRoi.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Campañas por ROI</CardTitle>
              <CardDescription>
                Verde ≥ $1 · rojo &lt; $1 · click para filtrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarBreakdown
                data={perCampaignRoi}
                color={meta.hex}
                onBarClick={handleBarClick}
                highlightKey="campaignId"
                highlightValue={selectedId}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trend secundario de la métrica principal del canal (leads / clicks) */}
      {(useLeads ? allTotals.leads : allTotals.clicks) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {useLeads ? labels.trendTitleLeads : labels.trendTitleClicks}
            </CardTitle>
            <CardDescription>
              {selectedCampaign
                ? `Campaña: ${selectedCampaign.name}`
                : `Evolución diaria · ${rangeLabel}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AreaTrend
              data={dailyTrend}
              dataKey={primaryKey}
              color={meta.hex}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabla de campañas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {selectedCampaign ? "Campaña filtrada" : "Campañas"}
              </CardTitle>
              <CardDescription>
                {selectedCampaign
                  ? "Limpiá el filtro arriba para ver todas"
                  : "Activá, pausá o editá cada campaña"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CampaignTable campaigns={tableRows} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inline dual-area chart (revenue vs cost) ────────────────────────────────
// Wrapper liviano para no crear un archivo extra — reutiliza recharts directamente.

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";

function MultiAreaTrend({
  data,
}: {
  data: { date: string; cost: number; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-cost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={60} />
        <RechartsTooltip
          formatter={(v: number, name: string) => [
            new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(v),
            name === "revenue" ? "Retornado" : "Invertido",
          ]}
        />
        <Legend
          formatter={(val) => (val === "revenue" ? "Retornado" : "Invertido")}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#grad-revenue)"
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#grad-cost)"
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Eye,
  Filter,
  MousePointerClick,
  Target,
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
import { semaphoreClasses } from "@/lib/health";
import { AlertsStrip } from "@/components/alerts/alerts-strip";
import type { AlertEventLite } from "@/components/alerts/alert-item";
import { LiveLeadsFeed } from "@/components/leads/live-leads-feed";

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
  alerts?: AlertEventLite[];
  from: string; // YYYY-MM-DD — rango seleccionado por el usuario
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

export function ChannelDashboard({ channel, campaigns, snapshots, integration, health, alerts, from, to }: Props) {
  const meta = CHANNELS.find((c) => c.key === channel)!;
  const labels = getChannelLabels(channel);
  const isLive = integration?.status === "CONNECTED";
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedCampaign = useMemo(
    () => (selectedId ? campaigns.find((c) => c.id === selectedId) ?? null : null),
    [selectedId, campaigns],
  );

  // Snapshots filtrados por selección
  const visibleSnapshots = useMemo(
    () => (selectedId ? snapshots.filter((s) => s.campaignId === selectedId) : snapshots),
    [snapshots, selectedId],
  );

  // Totales del filtro
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

  // Totales del canal entero (sin filtro). Decide qué cards/charts mostrar
  // de manera estable: si Email no tiene cost en NINGÚN snapshot, ocultamos
  // la card "Inversión" siempre, no solo cuando filtrás.
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

  // Qué KPIs mostrar — basado en allTotals (sino la grilla cambia al filtrar)
  const showImpressions = allTotals.impressions > 0;
  const showClicks = allTotals.clicks > 0;
  const showLeads = allTotals.leads > 0;
  const showCost = allTotals.cost > 0;
  const showCostPerLead = allTotals.cost > 0 && allTotals.leads > 0;

  const useLeads = allTotals.leads > 0;
  const primaryKey = useLeads ? "leads" : "clicks";
  const primaryLabel = useLeads ? labels.trendTitleLeads : labels.trendTitleClicks;

  const clickRate = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  const costPerLead = totals.leads ? totals.cost / totals.leads : 0;

  // Rango de fechas visible
  const dateRange = useMemo(() => {
    if (!visibleSnapshots.length) return null;
    const ts = visibleSnapshots.map((s) => new Date(s.date).getTime());
    return {
      min: new Date(Math.min(...ts)).toISOString(),
      max: new Date(Math.max(...ts)).toISOString(),
    };
  }, [visibleSnapshots]);
  const rangeLabel = `${fmtDate(from, true)} → ${fmtDate(to, true)}`;

  // Trend diario
  const trend = useMemo(() => {
    const byDay = new Map<
      string,
      { leads: number; clicks: number; cost: number; impressions: number }
    >();
    visibleSnapshots.forEach((s) => {
      const k = isLive ? s.date.slice(0, 10) : s.date.slice(5, 10);
      const prev = byDay.get(k) ?? { leads: 0, clicks: 0, cost: 0, impressions: 0 };
      prev.leads += s.leads;
      prev.clicks += s.clicks;
      prev.cost += s.cost;
      prev.impressions += s.impressions;
      byDay.set(k, prev);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [visibleSnapshots, isLive]);

  // Mejores campañas — siempre las del canal
  const perCampaign = useMemo(() => {
    return campaigns
      .map((c) => {
        const cs = snapshots.filter((s) => s.campaignId === c.id);
        const leads = cs.reduce((a, b) => a + b.leads, 0);
        const clicks = cs.reduce((a, b) => a + b.clicks, 0);
        const value = useLeads ? leads : clicks;
        return {
          campaignId: c.id,
          name: c.name.length > 28 ? c.name.slice(0, 26) + "…" : c.name,
          fullName: c.name,
          value,
          color: meta.hex,
        };
      })
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [campaigns, snapshots, useLeads, meta.hex]);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center h-14 w-14 rounded-xl bg-muted shrink-0">
            <ChannelIcon channel={channel} size={30} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {meta.tagline}
            </p>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
              {channelLabel(channel)}
              {health && (
                <SemaphoreBadge color={health.color} label={health.label} score={health.score} size="md" />
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              {campaigns.length} campañas · {activeCount} activas
              {health?.roi !== undefined && health.roi !== null && (
                <> · ROI <span className={semaphoreClasses(health.color).text + " font-semibold"}>{health.roi.toFixed(2)}x</span></>
              )}
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
          <Badge variant="outline">{rangeLabel}</Badge>
          {isLive && <SyncButton channel={channel} label="Actualizar" />}
          <NewCampaignButton channel={channel} />
        </div>
      </div>

      {/* Health reasons (chips de razones del semáforo) */}
      {health && health.reasons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {health.reasons.map((r, i) => (
            <span
              key={i}
              className={`text-xs rounded-full border px-3 py-1 ${semaphoreClasses(health.color).bg} ${semaphoreClasses(health.color).text} ${semaphoreClasses(health.color).ring}`}
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Strip de alertas relevantes + feed de leads en vivo del canal */}
      {(alerts && alerts.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertsStrip channel={channel} initial={alerts} limit={4} />
          </div>
          <LiveLeadsFeed channel={channel} />
        </div>
      )}
      {(!alerts || alerts.length === 0) && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertsStrip channel={channel} initial={[]} limit={4} />
          </div>
          <LiveLeadsFeed channel={channel} />
        </div>
      )}

      {/* Filter chip */}
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

      {/* KPI cards — solo se renderizan las que tienen datos en este canal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        {showCost && (
          <KpiCard
            label={labels.cost}
            value={totals.cost ? formatCurrency(totals.cost) : "—"}
            icon={<DollarSign className="h-4 w-4" />}
            tooltip={labels.costTooltip}
          />
        )}
        {showCostPerLead && (
          <KpiCard
            label={labels.costPerLead}
            value={costPerLead ? formatCurrency(costPerLead) : "—"}
            icon={<Target className="h-4 w-4" />}
            tooltip={labels.costPerLeadTooltip}
          />
        )}
      </div>

      {/* Main charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{primaryLabel}</CardTitle>
            <CardDescription>
              {selectedCampaign
                ? `Campaña: ${selectedCampaign.name}`
                : `Período ${rangeLabel} en ${channelLabel(channel)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length && (useLeads ? allTotals.leads : allTotals.clicks) > 0 ? (
              <AreaTrend data={trend} dataKey={primaryKey} color={meta.hex} />
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Sin datos en este período.
              </p>
            )}
          </CardContent>
        </Card>

        {perCampaign.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mejores campañas</CardTitle>
              <CardDescription>
                Las que más {useLeads ? labels.primaryPlural : "clicks"} trajeron · click para filtrar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarBreakdown
                data={perCampaign}
                color={meta.hex}
                onBarClick={handleBarClick}
                highlightKey="campaignId"
                highlightValue={selectedId}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Inversión por día — solo si hay costo en el canal */}
      {showCost && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.costChartTitle}</CardTitle>
            <CardDescription>
              {selectedCampaign
                ? `Costo diario de ${selectedCampaign.name}`
                : `Costo diario en ${channelLabel(channel)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length && totals.cost > 0 ? (
              <AreaTrend data={trend} dataKey="cost" color="#374151" />
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Sin costo registrado en este período.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{selectedCampaign ? "Campaña filtrada" : "Campañas"}</CardTitle>
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

      {totals.impressions > 0 && totals.clicks > 0 && (
        <p className="text-xs text-muted-foreground">
          {channel === "EMAIL_OUTREACH"
            ? "Tasa de apertura"
            : channel === "LINKEDIN_OUTREACH"
              ? "Tasa de visita"
              : "Tasa de clicks"}{" "}
          {selectedCampaign ? "de la campaña" : "del período"}:{" "}
          <span className="font-medium">{clickRate.toFixed(2)}%</span>
        </p>
      )}
    </div>
  );
}

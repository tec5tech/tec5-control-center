import { Users, MousePointerClick, Eye, Activity } from "lucide-react";
import { KpiCard } from "@/components/charts/kpi-card";
import { formatNumber } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/dashboard-metrics";

/**
 * KPI cards de engagement — se muestran cuando los canales orgánicos
 * (email outreach, LinkedIn outreach, podcast, etc.) trajeron datos
 * pero no hay datos de inversión publicitaria.
 *
 * Idea: el usuario debe ver actividad real aunque no haya $ trackeable.
 */
export function EngagementKpis({ summary }: { summary: DashboardSummary }) {
  const { totalLeads, totalClicks, totalImpressions, perChannel } = summary;

  // Canales activos = los que tienen al menos una métrica > 0
  const activeChannels = perChannel.filter(
    (c) => c.hasEngagement || c.hasInvestment,
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Leads"
        value={formatNumber(totalLeads)}
        hint="Respuestas / conversiones"
        icon={<Users className="h-4 w-4" />}
        tooltip="Suma de la columna 'leads' de los snapshots en el período. Incluye respuestas a outreach, leads de paid, etc."
      />
      <KpiCard
        label="Total Clicks"
        value={formatNumber(totalClicks)}
        hint="Clicks / aperturas"
        icon={<MousePointerClick className="h-4 w-4" />}
        tooltip="Suma de clicks (o aperturas de email para canales de outreach) en el período."
      />
      <KpiCard
        label="Impresiones / Envíos"
        value={formatNumber(totalImpressions)}
        hint="Alcance total"
        icon={<Eye className="h-4 w-4" />}
        tooltip="Para paid: impresiones del anuncio. Para outreach: emails enviados."
      />
      <KpiCard
        label="Canales activos"
        value={String(activeChannels)}
        hint={`de ${perChannel.length} totales`}
        icon={<Activity className="h-4 w-4" />}
        tooltip="Canales que tienen alguna métrica > 0 en el período seleccionado."
      />
    </div>
  );
}

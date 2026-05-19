import { DollarSign, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { KpiCard } from "@/components/charts/kpi-card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/dashboard-metrics";

export function InvestmentKpis({ summary }: { summary: DashboardSummary }) {
  const { totalInvested, totalReturned, totalProfit, avgRoi } = summary;

  const profitLabel =
    totalProfit >= 0
      ? `+${formatCurrency(totalProfit)}`
      : formatCurrency(totalProfit);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Invertido"
        value={formatCurrency(totalInvested)}
        hint="En todos los canales"
        icon={<DollarSign className="h-4 w-4" />}
        tooltip="Suma de cost de todos los snapshots en el período. Proviene de la columna cost de MetricSnapshot."
      />
      <KpiCard
        label="Total Retornado"
        value={formatCurrency(totalReturned)}
        hint="Ingresos generados"
        icon={<TrendingUp className="h-4 w-4" />}
        tooltip="Suma de revenue de todos los snapshots en el período."
      />
      <KpiCard
        label="Ganancia Neta"
        value={profitLabel}
        hint="Lo que ganaste después de invertir"
        valueClassName={totalProfit >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}
        icon={
          totalProfit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )
        }
        tooltip="Total Retornado − Total Invertido."
      />
      <KpiCard
        label="Retorno Promedio"
        value={`$${avgRoi.toFixed(2)}`}
        hint="Por cada $1 invertido"
        icon={<BarChart2 className="h-4 w-4" />}
        tooltip="Total Retornado / Total Invertido. Indica cuánto recibís por cada $1 que invertís."
      />
    </div>
  );
}

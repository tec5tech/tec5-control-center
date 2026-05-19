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
      />
      <KpiCard
        label="Total Retornado"
        value={formatCurrency(totalReturned)}
        hint="Ingresos generados"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <KpiCard
        label="Ganancia Neta"
        value={profitLabel}
        hint="Después de invertir"
        icon={
          totalProfit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )
        }
      />
      <KpiCard
        label="Retorno Promedio"
        value={`$${avgRoi.toFixed(2)}`}
        hint="Por cada $1 invertido"
        icon={<BarChart2 className="h-4 w-4" />}
      />
    </div>
  );
}

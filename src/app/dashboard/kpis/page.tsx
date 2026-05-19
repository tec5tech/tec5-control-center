import { prisma } from "@/lib/db";
import { KpiManager } from "@/components/kpi/kpi-manager";
import { NewKpiButton } from "@/components/kpi/new-kpi-button";
import { Target, CheckCircle2 } from "lucide-react";
import type { KpiUnit, KpiDirection, Channel } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const kpis = await prisma.kpi.findMany({ orderBy: { createdAt: "asc" } });

  const onTrack = kpis.filter((k) => {
    const t = Number(k.target);
    const c = Number(k.current);
    const progress =
      k.direction === "HIGHER_IS_BETTER"
        ? (c / Math.max(t, 0.0001)) * 100
        : (t / Math.max(c, 0.0001)) * 100;
    return Math.min(100, progress) >= 85;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Objetivos
          </p>
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-1">
            {kpis.length} objetivos definidos · {onTrack} en buen camino
          </p>
        </div>
        <NewKpiButton />
      </div>

      {/* KPI grid or empty state */}
      {kpis.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/10 py-20 text-center">
          <div className="grid place-items-center h-14 w-14 rounded-full bg-primary/10 text-primary">
            <Target className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold text-lg">Sin objetivos todavía</p>
            <p className="text-sm text-muted-foreground mt-1">
              Definí tu primer KPI para empezar a trackear progreso.
            </p>
          </div>
          <NewKpiButton />
        </div>
      ) : (
        <KpiManager
          kpis={kpis.map((k) => ({
            id: k.id,
            name: k.name,
            unit: k.unit as KpiUnit,
            direction: k.direction as KpiDirection,
            target: Number(k.target),
            current: Number(k.current),
            channel: k.channel as Channel | null,
            description: k.description,
          }))}
        />
      )}
    </div>
  );
}

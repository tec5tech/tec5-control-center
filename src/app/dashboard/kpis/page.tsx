import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiManager } from "@/components/kpi/kpi-manager";
import { NewKpiButton } from "@/components/kpi/new-kpi-button";
import type { KpiUnit, KpiDirection, Channel } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const kpis = await prisma.kpi.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Objetivos y seguimiento</p>
          <h1 className="text-3xl font-bold tracking-tight">Definición de KPIs</h1>
          <p className="text-muted-foreground mt-1">
            Definí objetivos por canal y trackéa progreso con semáforo automático.
          </p>
        </div>
        <NewKpiButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KPIs activos</CardTitle>
          <CardDescription>Editá el objetivo o valor actual con un click</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

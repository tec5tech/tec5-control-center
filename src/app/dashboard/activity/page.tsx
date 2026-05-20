import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { formatCurrency } from "@/lib/utils";
import { parseDateRange } from "@/lib/date-range";
import { PeriodSelect } from "@/components/dashboard/period-select";

export const dynamic = "force-dynamic";

function severityGroup(severity: string): "critical" | "warn" | "ok" {
  if (severity === "CRITICAL") return "critical";
  if (severity === "WARN") return "warn";
  return "ok";
}

function payloadLoss(payloadJson: string | null): number | null {
  if (!payloadJson) return null;
  try {
    const p = JSON.parse(payloadJson) as Record<string, unknown>;
    const v = p.loss ?? p.profit ?? p.lostAmount;
    if (typeof v === "number") return v;
    return null;
  } catch {
    return null;
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const { severity: severityParam } = params;
  const activeFilter = (severityParam ?? "all") as "all" | "critical" | "warn" | "ok";
  const { from, to } = parseDateRange(params);

  // Helper: build /dashboard/activity href preserving date params
  function activityHref(severity: string | null): string {
    const base = "/dashboard/activity";
    const qs = new URLSearchParams();
    if (severity) qs.set("severity", severity);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const q = qs.toString();
    return q ? `${base}?${q}` : base;
  }

  const alerts = await prisma.alertEvent.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Conteos totales (siempre los 3 grupos, independiente del filtro activo) para los summary cards
  const critical = alerts.filter((a) => severityGroup(a.severity) === "critical");
  const warn = alerts.filter((a) => severityGroup(a.severity) === "warn");
  const ok = alerts.filter((a) => severityGroup(a.severity) === "ok");

  // Las listas visibles respetan el filtro
  const showCritical = activeFilter === "all" || activeFilter === "critical";
  const showWarn = activeFilter === "all" || activeFilter === "warn";
  const showOk = activeFilter === "all" || activeFilter === "ok";

  const visibleCount =
    (showCritical ? critical.length : 0) +
    (showWarn ? warn.length : 0) +
    (showOk ? ok.length : 0);
  const isEmpty = visibleCount === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas y Recomendaciones</h1>
          <p className="text-muted-foreground mt-1">
            Acciones importantes para optimizar tu inversión
          </p>
        </div>
        <PeriodSelect />
      </div>

      {/* Summary cards — clickeables actúan como filtros */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href={activeFilter === "critical" ? activityHref(null) : activityHref("critical")}
          className={`flex items-center gap-3 rounded-xl border bg-destructive/5 px-4 py-4 transition hover:shadow-sm ${
            activeFilter === "critical" ? "border-destructive ring-2 ring-destructive/20" : "border-destructive/20"
          }`}
        >
          <div className="grid place-items-center h-10 w-10 rounded-full bg-destructive/20 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive tabular-nums">{critical.length}</p>
            <p className="text-sm text-muted-foreground">Requieren acción urgente</p>
          </div>
        </Link>
        <Link
          href={activeFilter === "warn" ? activityHref(null) : activityHref("warn")}
          className={`flex items-center gap-3 rounded-xl border bg-warning/5 px-4 py-4 transition hover:shadow-sm ${
            activeFilter === "warn" ? "border-warning ring-2 ring-warning/20" : "border-warning/20"
          }`}
        >
          <div className="grid place-items-center h-10 w-10 rounded-full bg-warning/20 shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warning tabular-nums">{warn.length}</p>
            <p className="text-sm text-muted-foreground">Para revisar</p>
          </div>
        </Link>
        <Link
          href={activeFilter === "ok" ? activityHref(null) : activityHref("ok")}
          className={`flex items-center gap-3 rounded-xl border bg-success/5 px-4 py-4 transition hover:shadow-sm ${
            activeFilter === "ok" ? "border-success ring-2 ring-success/20" : "border-success/20"
          }`}
        >
          <div className="grid place-items-center h-10 w-10 rounded-full bg-success/20 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-success tabular-nums">{ok.length}</p>
            <p className="text-sm text-muted-foreground">Funcionando bien</p>
          </div>
        </Link>
      </div>

      {/* Filtros explícitos por tipo de recomendación */}
      <ActivityFilters active={activeFilter} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 py-20 text-center">
          <div className="grid place-items-center h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-lg font-semibold">Sin alertas — todo en orden ✓</p>
          <p className="text-sm text-muted-foreground">No hay alertas registradas todavía.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Critical */}
          {showCritical && critical.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Acción Urgente Requerida
              </h2>
              {critical.map((a) => {
                const loss = payloadLoss(a.payloadJson);
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-destructive/20 bg-destructive/5 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid place-items-center h-12 w-12 rounded-full bg-destructive/20 shrink-0">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {a.channel && (
                          <span className="inline-flex items-center rounded-full bg-destructive/20 text-destructive px-2 py-0.5 text-xs font-medium mb-2">
                            {a.channel}
                          </span>
                        )}
                        <p className="text-lg font-semibold text-foreground">{a.title}</p>
                        <p className="text-muted-foreground mt-2">{a.message}</p>
                        <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                          <div className="flex items-start gap-3">
                            <div className="text-primary shrink-0 mt-0.5">ℹ</div>
                            <div>
                              <p className="font-medium text-foreground">Recomendación:</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Revisá el presupuesto, pausá campañas que no generan retorno y ajustá las pujas.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            {loss !== null && (
                              <p className="text-sm font-medium text-destructive">
                                Pérdida actual: {formatCurrency(Math.abs(loss))}
                              </p>
                            )}
                            {loss !== null && <MetricInfo content="Diferencia negativa entre lo retornado y lo invertido en este canal o campaña." />}
                          </div>
                          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
                            Tomar acción
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Warn */}
          {showWarn && warn.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-warning flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Para Revisar
              </h2>
              {warn.map((a) => {
                const loss = payloadLoss(a.payloadJson);
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-warning/20 bg-warning/5 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid place-items-center h-12 w-12 rounded-full bg-warning/20 shrink-0">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {a.channel && (
                          <span className="inline-flex items-center rounded-full bg-warning/20 text-warning px-2 py-0.5 text-xs font-medium mb-2">
                            {a.channel}
                          </span>
                        )}
                        <p className="text-lg font-semibold text-foreground">{a.title}</p>
                        <p className="text-muted-foreground mt-2">{a.message}</p>
                        <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                          <div className="flex items-start gap-3">
                            <div className="text-primary shrink-0 mt-0.5">ℹ</div>
                            <div>
                              <p className="font-medium text-foreground">Recomendación:</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Analizá las métricas del canal y optimizá el targeting o el creativo.
                              </p>
                            </div>
                          </div>
                        </div>
                        {loss !== null && (
                          <div className="mt-4 flex items-center gap-1">
                            <p className="text-sm font-medium text-warning">
                              Pérdida actual: {formatCurrency(Math.abs(loss))}
                            </p>
                            <MetricInfo content="Diferencia negativa entre lo retornado y lo invertido." />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* OK */}
          {showOk && ok.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-success flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Funcionando Bien
              </h2>
              {ok.map((a) => {
                let roiText: string | null = null;
                try {
                  if (a.payloadJson) {
                    const p = JSON.parse(a.payloadJson) as Record<string, unknown>;
                    if (typeof p.roi === "number" && typeof p.invested === "number") {
                      roiText = `Cada $1 invertido genera $${(p.roi as number).toFixed(2)}`;
                    }
                  }
                } catch {}

                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-success/20 bg-success/5 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid place-items-center h-12 w-12 rounded-full bg-success/20 shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {a.channel && (
                          <span className="inline-flex items-center rounded-full bg-success/20 text-success px-2 py-0.5 text-xs font-medium mb-2">
                            {a.channel}
                          </span>
                        )}
                        <p className="text-lg font-semibold text-foreground">{a.title}</p>
                        <p className="text-muted-foreground mt-2">{a.message}</p>
                        {roiText && (
                          <p className="text-sm font-medium text-success mt-2">{roiText}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

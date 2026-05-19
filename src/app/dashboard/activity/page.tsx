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
          <h1 className="text-3xl font-bold tracking-tight">Alertas y Recomendaciones</h1>
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
          className={`flex items-center gap-4 rounded-xl border bg-rose-50 px-5 py-4 transition hover:shadow-sm ${
            activeFilter === "critical" ? "border-rose-400 ring-2 ring-rose-200" : "border-rose-200"
          }`}
        >
          <div className="grid place-items-center h-10 w-10 rounded-lg bg-rose-100 shrink-0">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tabular-nums">{critical.length}</p>
            <p className="text-xs text-muted-foreground">Requieren acción urgente</p>
          </div>
        </Link>
        <Link
          href={activeFilter === "warn" ? activityHref(null) : activityHref("warn")}
          className={`flex items-center gap-4 rounded-xl border bg-amber-50 px-5 py-4 transition hover:shadow-sm ${
            activeFilter === "warn" ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-200"
          }`}
        >
          <div className="grid place-items-center h-10 w-10 rounded-lg bg-amber-100 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tabular-nums">{warn.length}</p>
            <p className="text-xs text-muted-foreground">Para revisar</p>
          </div>
        </Link>
        <Link
          href={activeFilter === "ok" ? activityHref(null) : activityHref("ok")}
          className={`flex items-center gap-4 rounded-xl border bg-emerald-50 px-5 py-4 transition hover:shadow-sm ${
            activeFilter === "ok" ? "border-emerald-400 ring-2 ring-emerald-200" : "border-emerald-200"
          }`}
        >
          <div className="grid place-items-center h-10 w-10 rounded-lg bg-emerald-100 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tabular-nums">{ok.length}</p>
            <p className="text-xs text-muted-foreground">Funcionando bien</p>
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
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <h2 className="font-bold text-rose-700">Acción Urgente Requerida</h2>
              </div>
              {critical.map((a) => {
                const loss = payloadLoss(a.payloadJson);
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-rose-200 bg-white"
                    style={{ borderLeftWidth: 4, borderLeftColor: "#f43f5e" }}
                  >
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {a.channel && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs font-medium mb-1">
                              {a.channel}
                            </span>
                          )}
                          <p className="font-bold text-sm">{a.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                        </div>
                      </div>
                      <div className="rounded-md bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                        <strong>Recomendación:</strong>{" "}
                        Revisá el presupuesto, pausá campañas que no generan retorno y ajustá las pujas.
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-1">
                          {loss !== null && (
                            <p className="text-xs text-rose-600 font-medium">
                              Pérdida actual: {formatCurrency(Math.abs(loss))}
                            </p>
                          )}
                          <MetricInfo content="Diferencia negativa entre lo retornado y lo invertido en este canal o campaña." />
                        </div>
                        <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                          Tomar acción
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Warn */}
          {showWarn && warn.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="font-bold text-amber-700">Para Revisar</h2>
              </div>
              {warn.map((a) => {
                const loss = payloadLoss(a.payloadJson);
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-amber-200 bg-white"
                    style={{ borderLeftWidth: 4, borderLeftColor: "#f59e0b" }}
                  >
                    <div className="p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {a.channel && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium mb-1">
                              {a.channel}
                            </span>
                          )}
                          <p className="font-bold text-sm">{a.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                        </div>
                      </div>
                      <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                        <strong>Recomendación:</strong>{" "}
                        Analizá las métricas del canal y optimizá el targeting o el creativo.
                      </div>
                      {loss !== null && (
                        <div className="flex items-center gap-1 pt-1">
                          <p className="text-xs text-amber-600 font-medium">
                            Pérdida actual: {formatCurrency(Math.abs(loss))}
                          </p>
                          <MetricInfo content="Diferencia negativa entre lo retornado y lo invertido." />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* OK */}
          {showOk && ok.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h2 className="font-bold text-emerald-700">Funcionando Bien</h2>
              </div>
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
                    className="rounded-xl border border-emerald-200 bg-white"
                    style={{ borderLeftWidth: 4, borderLeftColor: "#10b981" }}
                  >
                    <div className="p-4">
                      {a.channel && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium mb-1">
                          {a.channel}
                        </span>
                      )}
                      <p className="font-bold text-sm">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                      {roiText && (
                        <p className="text-xs text-emerald-600 font-medium mt-2">{roiText}</p>
                      )}
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

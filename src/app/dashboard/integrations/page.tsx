import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CHANNELS } from "@/lib/constants";
import { INTEGRATIONS } from "@/lib/integrations";
import type { Channel } from "@/types/db";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { ConnectedCard, DisconnectedCard } from "@/components/integrations/connection-card";
import { MetricInfo } from "@/components/ui/metric-info";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER") redirect("/dashboard");

  const existing = await prisma.integration.findMany();
  const byChannel = new Map(existing.map((i) => [i.channel, i]));

  type IntRow = {
    key: Channel;
    spec: (typeof INTEGRATIONS)[Channel];
    status: "NOT_CONFIGURED" | "CONNECTED" | "ERROR" | "DISCONNECTED";
    credentials: Record<string, string>;
    lastSyncAt: string | null;
    syncIntervalMinutes: number;
  };

  const rows: IntRow[] = CHANNELS.map((c) => {
    const rec = byChannel.get(c.key);
    const credentials: Record<string, string> = rec
      ? (() => {
          try {
            return JSON.parse(rec.credentialsJson) as Record<string, string>;
          } catch {
            return {};
          }
        })()
      : {};
    return {
      key: c.key,
      spec: INTEGRATIONS[c.key],
      status:
        ((rec?.status as "NOT_CONFIGURED" | "CONNECTED" | "ERROR" | "DISCONNECTED") ??
          "NOT_CONFIGURED"),
      credentials,
      lastSyncAt: rec?.lastSyncAt?.toISOString() ?? null,
      syncIntervalMinutes: rec?.syncIntervalMinutes ?? 60,
    };
  });

  const connected = rows.filter((r) => r.status === "CONNECTED");
  const notConnected = rows.filter((r) => r.status !== "CONNECTED");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexiones</h1>
        <p className="text-muted-foreground mt-1">
          Plataformas conectadas para obtener tus datos de marketing
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5">
          <div className="grid place-items-center h-12 w-12 rounded-xl bg-emerald-100 shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-4xl font-bold text-emerald-600 tabular-nums">
                {connected.length}
              </p>
              <MetricInfo content="Plataformas que están enviando datos automáticamente al panel." />
            </div>
            <p className="text-sm text-muted-foreground">Conectadas</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-6 py-5">
          <div className="grid place-items-center h-12 w-12 rounded-xl bg-muted shrink-0">
            <XCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-4xl font-bold tabular-nums">{notConnected.length}</p>
              <MetricInfo content="Plataformas que todavía no enviaron credenciales. Sin conexión, los datos hay que cargarlos a mano." />
            </div>
            <p className="text-sm text-muted-foreground">Sin conectar</p>
          </div>
        </div>
      </div>

      {/* Connected section */}
      {connected.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Plataformas Conectadas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {connected.map((r) => (
              <ConnectedCard
                key={r.key}
                spec={r.spec}
                credentials={r.credentials}
                lastSyncAt={r.lastSyncAt}
                syncIntervalMinutes={r.syncIntervalMinutes}
              />
            ))}
          </div>
        </section>
      )}

      {/* Disconnected section */}
      {notConnected.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Disponibles para Conectar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {notConnected.map((r) => (
              <DisconnectedCard
                key={r.key}
                spec={r.spec}
                credentials={r.credentials}
                status={r.status}
              />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-5 space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-600 shrink-0" />
          <h3 className="font-bold text-indigo-900">¿Necesitás ayuda?</h3>
        </div>
        <p className="text-sm text-indigo-800">
          Si tenés problemas para conectar alguna plataforma, nuestro equipo puede ayudarte a
          configurar las integraciones.
        </p>
        <a
          href="mailto:soporte@tec5.tech"
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          Contactar soporte
        </a>
      </div>
    </div>
  );
}

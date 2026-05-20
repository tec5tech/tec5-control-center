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
        <h1 className="text-2xl font-bold text-foreground">Conexiones</h1>
        <p className="text-muted-foreground mt-1">
          Plataformas conectadas para obtener tus datos de marketing
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-5 py-5">
          <div className="grid place-items-center h-10 w-10 rounded-full bg-success/20 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold text-success tabular-nums">
                {connected.length}
              </p>
              <MetricInfo content="Plataformas que están enviando datos automáticamente al panel." />
            </div>
            <p className="text-sm text-muted-foreground">Conectadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-muted bg-muted/50 px-5 py-5">
          <div className="grid place-items-center h-10 w-10 rounded-full bg-muted shrink-0">
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold tabular-nums">{notConnected.length}</p>
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
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-5 space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground">¿Necesitás ayuda?</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Si tenés problemas para conectar alguna plataforma, nuestro equipo puede ayudarte a
          configurar las integraciones.
        </p>
        <a
          href="mailto:soporte@tec5.tech"
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Contactar soporte
        </a>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CHANNELS } from "@/lib/constants";
import { INTEGRATIONS } from "@/lib/integrations";
import type { Channel } from "@/types/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { TelegramCard } from "@/components/integrations/telegram-card";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER") redirect("/dashboard");

  const existing = await prisma.integration.findMany();
  const byChannel = new Map(existing.map((i) => [i.channel, i]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Conexiones</p>
        <h1 className="text-3xl font-bold tracking-tight">Integraciones de APIs</h1>
        <p className="text-muted-foreground mt-1">
          Conectá las APIs de cada fuente para que los datos se carguen solos en el panel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado por canal</CardTitle>
          <CardDescription>Un cuadrado rojo = no conectado · verde = conectado · amarillo = con error</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CHANNELS.map((c) => {
              const spec = INTEGRATIONS[c.key as Channel];
              const rec = byChannel.get(c.key);
              const credentials: Record<string, string> = rec
                ? (() => { try { return JSON.parse(rec.credentialsJson); } catch { return {}; } })()
                : {};
              return (
                <IntegrationCard
                  key={c.key}
                  spec={spec}
                  status={(rec?.status as "NOT_CONFIGURED" | "CONNECTED" | "ERROR" | "DISCONNECTED") ?? "NOT_CONFIGURED"}
                  lastSyncAt={rec?.lastSyncAt?.toISOString() ?? null}
                  lastError={rec?.lastError ?? null}
                  credentials={credentials}
                  syncIntervalMinutes={rec?.syncIntervalMinutes ?? 60}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>
            Avisos en Telegram sobre saldos, leads nuevos, mejor campaña y acciones a realizar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TelegramCard canConfigureBot={session.user.role === "ADMIN"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Para cada canal le pedimos las credenciales de su API. Una vez guardadas,
            un job periódico (diario por defecto) trae las métricas y las guarda en el panel.
          </p>
          <p>
            Los secretos se guardan en la base. En producción se cifran con KMS;
            en este dev quedan en texto plano — no usar datos productivos reales todavía.
          </p>
          <p>
            ¿No tenés alguna credencial? Pedile al área técnica: suele tardar entre 10 minutos
            y 1 día dependiendo del canal (Meta y Google Ads son los más burocráticos).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

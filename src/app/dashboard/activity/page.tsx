import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))];
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Auditoría</p>
        <h1 className="text-3xl font-bold tracking-tight">Actividad reciente</h1>
        <p className="text-muted-foreground mt-1">Últimos 50 eventos del sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log de eventos</CardTitle>
          <CardDescription>Creaciones, updates, pausas y eliminaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length ? (
            logs.map((l) => {
              const u = l.actorId ? userMap.get(l.actorId) : null;
              return (
                <div
                  key={l.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/15 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{u?.name ?? u?.email ?? "Sistema"}</span>{" "}
                      <span className="text-muted-foreground">· {l.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString("es-AR")}
                      {l.target ? ` · target: ${l.target}` : ""}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin actividad aún.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

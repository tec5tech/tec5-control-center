import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckCircle2, Activity } from "lucide-react";
import { RelativeTime } from "@/components/ui/relative-time";
import { ActivityFilters } from "@/components/activity/activity-filters";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER") redirect("/dashboard");

  const params = await searchParams;
  const filter = params.filter ?? "all";

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const actorIds = [
    ...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x)),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const unreadCount = 0; // AuditLog doesn't have read/unread — show total

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Actividad
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Alertas y eventos</h1>
        <p className="text-muted-foreground mt-1">
          {logs.length} eventos del sistema · últimos registros
        </p>
      </div>

      {/* Filter chips — client component */}
      <ActivityFilters active={filter} />

      {/* Events list */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 py-16 text-center">
            <div className="grid place-items-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-medium">Sin alertas — todo en orden</p>
            <p className="text-sm text-muted-foreground">
              No hay actividad registrada todavía.
            </p>
          </div>
        ) : (
          logs.map((l) => {
            const u = l.actorId ? userMap.get(l.actorId) : null;
            const actor = u?.name ?? u?.email ?? "Sistema";

            // Map action to severity-like color for the icon
            const isError =
              l.action.toLowerCase().includes("delete") ||
              l.action.toLowerCase().includes("error");

            return (
              <div
                key={l.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div
                  className={`grid place-items-center h-9 w-9 rounded-lg shrink-0 ${
                    isError
                      ? "bg-rose-500/10 text-rose-500"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{actor}</span>{" "}
                    <span className="text-muted-foreground">· {l.action}</span>
                  </p>
                  {l.target && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {l.target}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  <RelativeTime iso={l.createdAt.toISOString()} />
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

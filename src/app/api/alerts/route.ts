import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { evaluateAlerts } from "@/lib/alerts";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const channel = url.searchParams.get("channel");
  const unreadOnly = url.searchParams.get("unread") === "1";
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;

  const events = await prisma.alertEvent.findMany({
    where: {
      ...(channel ? { channel } : {}),
      ...(unreadOnly ? { read: false } : {}),
      ...(since && !isNaN(since.getTime()) ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await prisma.alertEvent.count({ where: { read: false } });

  return NextResponse.json({ events, unreadCount });
}

export async function POST() {
  // Trigger manual de evaluación. Útil después de un sync grande o como botón "Refrescar alertas".
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await evaluateAlerts();
  const count = await prisma.alertEvent.count({ where: { read: false } });
  return NextResponse.json({ ok: true, unreadCount: count });
}

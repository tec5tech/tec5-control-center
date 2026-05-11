import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Devuelve los últimos eventos NEW_LEAD para el feed en vivo del overview.
// Los AlertEvent ya guardan canal, campaña y mensaje listo.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? 10)));
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;

  const events = await prisma.alertEvent.findMany({
    where: {
      type: "NEW_LEAD",
      ...(channel ? { channel } : {}),
      ...(since && !isNaN(since.getTime()) ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { campaign: { select: { id: true, name: true, channel: true } } },
  });

  return NextResponse.json({ events });
}

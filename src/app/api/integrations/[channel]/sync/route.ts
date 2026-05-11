import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncDispatcher } from "@/lib/sync-dispatcher";
import type { Channel } from "@/types/db";

export async function POST(_req: Request, ctx: { params: Promise<{ channel: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channel } = await ctx.params;

  try {
    const dispatched = await syncDispatcher(channel as Channel, session.user.id);
    if (!dispatched.ok) {
      return NextResponse.json(
        { error: `Sync no implementado todavía para ${channel}. Próximamente.` },
        { status: 501 },
      );
    }
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "integration.sync",
        target: channel,
        metaJson: JSON.stringify(dispatched.result ?? {}),
      },
    });
    return NextResponse.json({ ok: true, ...((dispatched.result ?? {}) as object) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "integration.sync.error",
        target: channel,
        metaJson: JSON.stringify({ error: message }),
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

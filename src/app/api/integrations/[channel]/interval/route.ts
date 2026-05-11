import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Channel } from "@/types/db";

const ALLOWED_MINUTES = new Set([0, 15, 30, 60, 180, 360, 720, 1440]);

export async function PATCH(req: Request, ctx: { params: Promise<{ channel: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channel } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const minutes = Number(body.minutes);

  if (!ALLOWED_MINUTES.has(minutes))
    return NextResponse.json({ error: "Intervalo inválido" }, { status: 400 });

  const existing = await prisma.integration.findUnique({ where: { channel } });
  const oldMinutes = existing?.syncIntervalMinutes ?? 60;

  await prisma.integration.upsert({
    where: { channel },
    create: { channel: channel as Channel, syncIntervalMinutes: minutes },
    update: { syncIntervalMinutes: minutes },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "integration.interval_updated",
      target: channel,
      metaJson: JSON.stringify({ oldMinutes, newMinutes: minutes }),
    },
  });

  return NextResponse.json({ ok: true });
}

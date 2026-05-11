import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Configuración global del bot — solo Admin.
const putSchema = z.object({
  botToken: z.string().min(20).max(200),
  enabled: z.boolean().optional().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    config: cfg
      ? {
          enabled: cfg.enabled,
          botUsername: cfg.botUsername,
          configured: true,
          tokenMask: cfg.botToken.slice(0, 8) + "…" + cfg.botToken.slice(-4),
        }
      : null,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Solo el admin puede configurar el bot" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  // Validar el token contra Telegram (getMe). Si pasa, guardamos botUsername.
  let botUsername: string | null = null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${parsed.data.botToken}/getMe`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { error: `Token rechazado por Telegram: ${data.description ?? "verificá el token"}` },
        { status: 400 },
      );
    }
    botUsername = data.result?.username ?? null;
  } catch {
    return NextResponse.json({ error: "No se pudo contactar a Telegram" }, { status: 502 });
  }

  await prisma.telegramConfig.upsert({
    where: { id: "default" },
    update: {
      botToken: parsed.data.botToken,
      enabled: parsed.data.enabled,
      botUsername,
    },
    create: {
      id: "default",
      botToken: parsed.data.botToken,
      enabled: parsed.data.enabled,
      botUsername,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "telegram.config",
      target: "default",
      metaJson: JSON.stringify({ botUsername }),
    },
  });

  return NextResponse.json({ ok: true, botUsername });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.telegramConfig.deleteMany({ where: { id: "default" } });
  return NextResponse.json({ ok: true });
}

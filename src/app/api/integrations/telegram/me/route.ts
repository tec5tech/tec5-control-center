import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendTelegramTest } from "@/lib/alerts";

// Suscripción del usuario al bot.
// GET  → estado del usuario actual
// PUT  → actualizar filtros (canales, tipos de alerta, enabled)
// POST → enviar mensaje de prueba al chat vinculado
// DELETE → desvincular

const putSchema = z.object({
  enabled: z.boolean().optional(),
  channels: z.array(z.string()).optional(),
  alerts: z.array(z.string()).optional(),
});

async function ensureSubscriber(userId: string) {
  let sub = await prisma.telegramSubscriber.findUnique({ where: { userId } });
  if (!sub) {
    const linkCode = randomBytes(6).toString("hex");
    sub = await prisma.telegramSubscriber.create({
      data: { userId, linkCode },
    });
  }
  return sub;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await ensureSubscriber(session.user.id);
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });

  let channels: string[] = [];
  let alerts: string[] = [];
  try { channels = JSON.parse(sub.channelsJson); } catch {}
  try { alerts = JSON.parse(sub.alertsJson); } catch {}

  const startUrl =
    cfg?.botUsername
      ? `https://t.me/${cfg.botUsername}?start=${sub.linkCode}`
      : null;

  return NextResponse.json({
    subscriber: {
      linked: !!sub.chatId,
      enabled: sub.enabled,
      channels,
      alerts,
      linkCode: sub.linkCode,
      startUrl,
      botUsername: cfg?.botUsername ?? null,
      botConfigured: !!cfg && cfg.enabled,
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const sub = await ensureSubscriber(session.user.id);
  await prisma.telegramSubscriber.update({
    where: { id: sub.id },
    data: {
      enabled: parsed.data.enabled ?? sub.enabled,
      channelsJson: parsed.data.channels !== undefined ? JSON.stringify(parsed.data.channels) : sub.channelsJson,
      alertsJson: parsed.data.alerts !== undefined ? JSON.stringify(parsed.data.alerts) : sub.alertsJson,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await ensureSubscriber(session.user.id);
  if (!sub.chatId) return NextResponse.json({ error: "Vinculá tu Telegram primero" }, { status: 400 });

  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg) return NextResponse.json({ error: "El bot no está configurado" }, { status: 400 });

  try {
    await sendTelegramTest(sub.chatId, cfg.botToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.telegramSubscriber.findUnique({ where: { userId: session.user.id } });
  if (sub) {
    await prisma.telegramSubscriber.update({
      where: { id: sub.id },
      data: { chatId: null, enabled: false },
    });
  }
  return NextResponse.json({ ok: true });
}

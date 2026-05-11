import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Webhook público para Telegram. Acepta updates del bot.
// Único comando soportado: /start <linkCode> — vincula el chatId al user que generó ese código.
// El secret token se valida con un header opcional para evitar abuso.
//
// Para producción: registrar el webhook con
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>/api/integrations/telegram/webhook&secret_token=<SECRET>

export async function POST(req: Request) {
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg || !cfg.enabled) {
    return NextResponse.json({ ok: true }); // ignorar silenciosamente
  }

  // Si el admin definió un secret en env, lo validamos
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expectedSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  const message = update.message;
  if (!message || !message.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text: string = message.text.trim();

  // /start <linkCode>
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    if (!code) {
      await reply(cfg.botToken, chatId, "Hola 👋. Para vincular este chat con el Control Center, abrí el portal en Integraciones → Telegram y usá el botón 'Vincular este chat'.");
      return NextResponse.json({ ok: true });
    }

    const sub = await prisma.telegramSubscriber.findUnique({ where: { linkCode: code } });
    if (!sub) {
      await reply(cfg.botToken, chatId, "Código inválido o vencido. Volvé al portal y generá uno nuevo.");
      return NextResponse.json({ ok: true });
    }

    await prisma.telegramSubscriber.update({
      where: { id: sub.id },
      data: { chatId, enabled: true },
    });

    await reply(
      cfg.botToken,
      chatId,
      "✅ <b>Listo</b>. Tu Telegram quedó vinculado al Control Center.\n\nTe vamos a avisar de:\n• Saldos vencidos o sobrantes\n• Leads nuevos por canal\n• Mejor campaña de la semana\n• Acciones a realizar\n\nDesde Integraciones podés filtrar canales o pausar avisos.",
    );
    return NextResponse.json({ ok: true });
  }

  // /pause y /resume rápidos
  if (text === "/pause") {
    await prisma.telegramSubscriber.updateMany({
      where: { chatId },
      data: { enabled: false },
    });
    await reply(cfg.botToken, chatId, "🔕 Avisos pausados. Mandá /resume para reactivar.");
    return NextResponse.json({ ok: true });
  }
  if (text === "/resume") {
    await prisma.telegramSubscriber.updateMany({
      where: { chatId },
      data: { enabled: true },
    });
    await reply(cfg.botToken, chatId, "🔔 Avisos reactivados.");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function reply(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

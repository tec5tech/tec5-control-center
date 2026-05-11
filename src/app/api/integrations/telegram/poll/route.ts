import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Fallback dev: pull updates via getUpdates y procesa /start <code> y enlaces.
// En producción se reemplaza por webhook (mismo handler en /webhook).
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg) return NextResponse.json({ error: "Bot no configurado" }, { status: 400 });

  let updates: { message?: { chat: { id: number }; text?: string } }[] = [];
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/getUpdates?timeout=0&limit=50`);
    const data = await res.json();
    if (!data.ok) return NextResponse.json({ error: data.description ?? "getUpdates falló" }, { status: 502 });
    updates = data.result ?? [];
  } catch {
    return NextResponse.json({ error: "No se pudo contactar a Telegram" }, { status: 502 });
  }

  let linked = 0;
  for (const u of updates) {
    const message = u.message;
    if (!message?.text) continue;
    const text = message.text.trim();
    const chatId = String(message.chat.id);

    if (text.startsWith("/start")) {
      const code = text.split(/\s+/)[1];
      if (!code) continue;
      const sub = await prisma.telegramSubscriber.findUnique({ where: { linkCode: code } });
      if (!sub) continue;
      await prisma.telegramSubscriber.update({
        where: { id: sub.id },
        data: { chatId, enabled: true },
      });
      linked++;

      // Confirmar
      await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ <b>Listo</b>. Tu Telegram quedó vinculado al Control Center.",
          parse_mode: "HTML",
        }),
      });
    }
  }

  return NextResponse.json({ ok: true, linked, processed: updates.length });
}

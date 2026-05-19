import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const schema = z.object({
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  telegramNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
});

type UserWithPrefs = {
  preferencesJson: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await (prisma.user as unknown as { findUnique: (args: unknown) => Promise<UserWithPrefs | null> }).findUnique({
    where: { id: session.user.id },
    select: { preferencesJson: true },
  });

  let prefs = {};
  try {
    prefs = JSON.parse(user?.preferencesJson ?? "{}") as Record<string, unknown>;
  } catch {}

  return NextResponse.json({ preferences: prefs });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const user = await (
      prisma.user as unknown as {
        update: (args: unknown) => Promise<{ id: string }>;
      }
    ).update({
      where: { id: session.user.id },
      data: { preferencesJson: JSON.stringify(parsed.data) },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // La columna preferencesJson todavía no existe en DB — falta correr db:push
    if (msg.includes("preferencesJson") || msg.includes("column") || msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error: "schema_pending",
          message: "El schema todavía no fue migrado. Corré `npm run db:push` para habilitar las preferencias.",
        },
        { status: 503 },
      );
    }
    throw e;
  }
}

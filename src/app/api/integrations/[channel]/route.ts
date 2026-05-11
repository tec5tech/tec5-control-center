import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { INTEGRATIONS } from "@/lib/integrations";
import type { Channel } from "@/types/db";

const channelSchema = z.enum([
  "GOOGLE_ADS", "META_ADS", "YT_ADS", "SEO", "GEO",
  "EMAIL_OUTREACH", "LINKEDIN_OUTREACH", "PODCAST", "WEBINAR",
]);

const putSchema = z.object({
  credentials: z.record(z.string().optional().default("")),
});

export async function GET(_req: Request, ctx: { params: Promise<{ channel: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channel } = await ctx.params;
  const parsed = channelSchema.safeParse(channel);
  if (!parsed.success) return NextResponse.json({ error: "Canal inválido" }, { status: 400 });

  const rec = await prisma.integration.findUnique({ where: { channel: parsed.data } });
  if (!rec) return NextResponse.json({ integration: null });

  let credentials: Record<string, string> = {};
  try { credentials = JSON.parse(rec.credentialsJson); } catch {}
  return NextResponse.json({
    integration: {
      channel: rec.channel,
      status: rec.status,
      lastSyncAt: rec.lastSyncAt,
      lastError: rec.lastError,
      credentials,
    },
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ channel: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channel } = await ctx.params;
  const parsed = channelSchema.safeParse(channel);
  if (!parsed.success) return NextResponse.json({ error: "Canal inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const data = putSchema.safeParse(body);
  if (!data.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  // Validar que estén los campos requeridos
  const spec = INTEGRATIONS[parsed.data as Channel];
  const missing = spec.fields
    .filter((f) => !f.optional)
    .filter((f) => !data.data.credentials[f.key]);
  if (missing.length) {
    return NextResponse.json(
      { error: `Faltan campos: ${missing.map((m) => m.label).join(", ")}` },
      { status: 400 },
    );
  }

  const cleaned = Object.fromEntries(
    Object.entries(data.data.credentials).filter(([, v]) => typeof v === "string" && v.length > 0),
  );

  const rec = await prisma.integration.upsert({
    where: { channel: parsed.data },
    update: {
      credentialsJson: JSON.stringify(cleaned),
      status: "CONNECTED",
      lastError: null,
      updatedById: session.user.id,
    },
    create: {
      channel: parsed.data,
      credentialsJson: JSON.stringify(cleaned),
      status: "CONNECTED",
      updatedById: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "integration.upsert",
      target: parsed.data,
      metaJson: JSON.stringify({ fields: Object.keys(cleaned) }),
    },
  });

  return NextResponse.json({
    integration: {
      channel: rec.channel,
      status: rec.status,
      updatedAt: rec.updatedAt,
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ channel: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channel } = await ctx.params;
  const parsed = channelSchema.safeParse(channel);
  if (!parsed.success) return NextResponse.json({ error: "Canal inválido" }, { status: 400 });

  await prisma.integration.deleteMany({ where: { channel: parsed.data } });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "integration.disconnect",
      target: parsed.data,
    },
  });

  return NextResponse.json({ ok: true });
}

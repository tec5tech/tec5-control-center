import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).optional(),
  objective: z.string().optional(),
  audience: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Convierte `tags: string[]` a `tagsJson: string` (SQLite no tiene arrays).
function normalize(input: z.infer<typeof patchSchema>) {
  const { tags, startDate, endDate, ...rest } = input;
  const out: Record<string, unknown> = { ...rest };
  if (tags) out.tagsJson = JSON.stringify(tags);
  if (startDate) out.startDate = new Date(startDate);
  if (endDate) out.endDate = new Date(endDate);
  return out;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { metrics: { orderBy: { date: "asc" } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const data = normalize(parsed.data);
  const campaign = await prisma.campaign.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "campaign.update",
      target: id,
      metaJson: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json({ campaign });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

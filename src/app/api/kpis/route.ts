import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  unit: z.enum(["NUMBER", "PERCENT", "CURRENCY", "RATIO", "DURATION"]).default("NUMBER"),
  direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]).default("HIGHER_IS_BETTER"),
  target: z.number(),
  current: z.number().default(0),
  channel: z
    .enum([
      "GOOGLE_ADS", "META_ADS", "YT_ADS", "SEO", "GEO",
      "EMAIL_OUTREACH", "LINKEDIN_OUTREACH", "PODCAST", "WEBINAR",
    ])
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kpis = await prisma.kpi.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ kpis });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const kpi = await prisma.kpi.create({ data: { ...parsed.data, ownerId: session.user.id } });
  return NextResponse.json({ kpi });
}

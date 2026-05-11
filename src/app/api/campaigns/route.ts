import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2),
  channel: z.enum([
    "GOOGLE_ADS",
    "META_ADS",
    "YT_ADS",
    "SEO",
    "GEO",
    "EMAIL_OUTREACH",
    "LINKEDIN_OUTREACH",
    "PODCAST",
    "WEBINAR",
  ]),
  objective: z.string().optional(),
  budget: z.number().nonnegative().default(0),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).default("DRAFT"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") as
    | "GOOGLE_ADS" | "META_ADS" | "YT_ADS" | "SEO" | "GEO" | "EMAIL_OUTREACH"
    | "LINKEDIN_OUTREACH" | "PODCAST" | "WEBINAR" | null;

  const campaigns = await prisma.campaign.findMany({
    where: channel ? { channel } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: { ...parsed.data, ownerId: session.user.id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "campaign.create",
      target: campaign.id,
      metaJson: JSON.stringify({ name: campaign.name, channel: campaign.channel }),
    },
  });

  return NextResponse.json({ campaign });
}

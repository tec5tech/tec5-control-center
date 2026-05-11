import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const channelSchema = z.enum([
  "GOOGLE_ADS", "META_ADS", "YT_ADS", "SEO", "GEO",
  "EMAIL_OUTREACH", "LINKEDIN_OUTREACH", "PODCAST", "WEBINAR",
]);

// Prueba stub: sólo confirma que hay credenciales guardadas.
// Reemplazar por llamadas reales a cada API cuando conectemos:
//   - Google Ads: customers.listAccessibleCustomers
//   - Meta: GET /me?access_token=...
//   - Search Console: sites.list
//   - OpenAI: GET /v1/models
//   - etc.
export async function POST(_req: Request, ctx: { params: Promise<{ channel: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channel } = await ctx.params;
  const parsed = channelSchema.safeParse(channel);
  if (!parsed.success) return NextResponse.json({ error: "Canal inválido" }, { status: 400 });

  const rec = await prisma.integration.findUnique({ where: { channel: parsed.data } });
  if (!rec) return NextResponse.json({ error: "Integración no configurada" }, { status: 404 });

  const updated = await prisma.integration.update({
    where: { channel: parsed.data },
    data: { status: "CONNECTED", lastSyncAt: new Date(), lastError: null },
  });

  return NextResponse.json({
    ok: true,
    status: updated.status,
    lastSyncAt: updated.lastSyncAt,
  });
}

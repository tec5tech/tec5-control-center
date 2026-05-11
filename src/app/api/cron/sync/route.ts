import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncDispatcher } from "@/lib/sync-dispatcher";
import type { Channel } from "@/types/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron-sync] CRON_SECRET no está definido en las variables de entorno");
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  console.log(`[cron-sync] ${now.toISOString()} — iniciando`);

  const integrations = await prisma.integration.findMany({
    where: { status: "CONNECTED" },
  });

  const due = integrations.filter((integ) => {
    // syncIntervalMinutes === 0 significa "sólo manual" — el cron nunca la toca
    if (integ.syncIntervalMinutes === 0) return false;
    const intervalMs = integ.syncIntervalMinutes * 60_000;
    if (!integ.lastSyncAt) return true;
    return now.getTime() - integ.lastSyncAt.getTime() >= intervalMs;
  });

  console.log(`[cron-sync] ${integrations.length} conectadas, ${due.length} vencidas`);

  const settled = await Promise.allSettled(
    due.map(async (integ) => {
      const channel = integ.channel as Channel;
      const start = Date.now();
      try {
        const result = await syncDispatcher(channel);
        const durationMs = Date.now() - start;
        if (!result.ok) {
          console.log(`[cron-sync] ${channel} — skipped (not_implemented) [${durationMs}ms]`);
          return { channel, status: "skipped" as const, durationMs };
        }
        console.log(`[cron-sync] ${channel} — ok [${durationMs}ms]`);
        return { channel, status: "ok" as const, durationMs };
      } catch (e) {
        const durationMs = Date.now() - start;
        const error = e instanceof Error ? e.message : String(e);
        console.error(`[cron-sync] ${channel} — error [${durationMs}ms]: ${error}`);
        return { channel, status: "error" as const, error, durationMs };
      }
    }),
  );

  const results = settled.map((s) =>
    s.status === "fulfilled" ? s.value : { channel: "unknown", status: "error" as const, error: String(s.reason), durationMs: 0 },
  );

  console.log(`[cron-sync] ${now.toISOString()} — completado`);

  return NextResponse.json({
    checked: integrations.length,
    due: due.length,
    results,
  });
}

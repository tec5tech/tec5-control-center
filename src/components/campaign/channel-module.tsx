import { prisma } from "@/lib/db";
import type { Channel, CampaignStatus } from "@/types/db";
import {
  ChannelDashboard,
  type SerializedCampaign,
  type SerializedSnapshot,
} from "@/components/campaign/channel-dashboard";
import { evaluateAlerts } from "@/lib/alerts";
import { getChannelHealth } from "@/lib/health";
import { DateRangePicker } from "@/components/campaign/date-range-picker";
import { format } from "date-fns";

type Props = {
  channel: Channel;
  from: Date;
  to: Date;
};

export async function ChannelModule({ channel, from, to }: Props) {
  // Reevaluamos alertas. Idempotente — sólo crea eventos nuevos.
  await evaluateAlerts().catch((e) => console.error("[channel] evaluateAlerts failed", e));

  const integration = await prisma.integration.findUnique({ where: { channel } });

  const [campaigns, alerts] = await Promise.all([
    prisma.campaign.findMany({
      where: { channel },
      include: {
        metrics: {
          where: { date: { gte: from, lte: to } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.alertEvent.findMany({
      where: { channel },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const serializedCampaigns: SerializedCampaign[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as CampaignStatus,
    budget: Number(c.budget),
    spend: Number(c.spend),
  }));

  const serializedSnapshots: SerializedSnapshot[] = campaigns.flatMap((c) =>
    c.metrics.map((m) => ({
      campaignId: c.id,
      date: m.date.toISOString(),
      impressions: m.impressions,
      clicks: m.clicks,
      leads: m.leads,
      cost: Number(m.cost),
      revenue: Number(m.revenue),
      conversions: m.conversions,
    })),
  );

  const health = getChannelHealth(channel, serializedCampaigns, serializedSnapshots);

  // Ordenar alertas por severidad y limitar a top 3 para el strip
  const sevWeight: Record<string, number> = { CRITICAL: 0, WARN: 1, INFO: 2, OK: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => {
    const aw = sevWeight[a.severity] ?? 5;
    const bw = sevWeight[b.severity] ?? 5;
    if (aw !== bw) return aw - bw;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const stripAlerts = sortedAlerts.slice(0, 4).map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    channel: a.channel,
    campaignId: a.campaignId,
    title: a.title,
    message: a.message,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <>
      <div className="flex justify-end mb-4">
        <DateRangePicker
          from={format(from, "yyyy-MM-dd")}
          to={format(to, "yyyy-MM-dd")}
        />
      </div>
      <ChannelDashboard
        channel={channel}
        campaigns={serializedCampaigns}
        snapshots={serializedSnapshots}
        from={format(from, "yyyy-MM-dd")}
        to={format(to, "yyyy-MM-dd")}
        integration={
          integration
            ? {
                status: integration.status,
                lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
              }
            : null
        }
        health={{
          score: health.score,
          color: health.color,
          label: health.label,
          roi: health.roi,
          budgetUsedPct: health.budgetUsedPct,
          budget: health.budget,
          spent: health.spent,
          reasons: health.reasons,
        }}
        alerts={stripAlerts}
      />
    </>
  );
}

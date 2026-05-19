import { prisma } from "@/lib/db";
import type { Channel, CampaignStatus } from "@/types/db";
import {
  ChannelDashboard,
  type SerializedCampaign,
  type SerializedSnapshot,
} from "@/components/campaign/channel-dashboard";
import { evaluateAlerts } from "@/lib/alerts";
import { getChannelHealth } from "@/lib/health";
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

  const campaigns = await prisma.campaign.findMany({
    where: { channel },
    include: {
      metrics: {
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

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

  return (
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
    />
  );
}

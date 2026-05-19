import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/constants";
import type { Channel } from "@/types/db";

export type ChannelMetrics = {
  channel: Channel;
  slug: string;
  label: string;
  tagline: string;
  hex: string;
  invested: number;
  returned: number;
  profit: number;
  roi: number;
  trend: "up" | "down" | "stable";
};

export type DashboardSummary = {
  totalInvested: number;
  totalReturned: number;
  totalProfit: number;
  avgRoi: number;
  perChannel: ChannelMetrics[];
  bestChannel: ChannelMetrics | null;
  worstChannel: ChannelMetrics | null;
  hasLosingChannels: boolean;
};

type AggRow = {
  channel: string;
  invested: number;
  returned: number;
};

async function aggregateByChannel(from: Date, to: Date): Promise<AggRow[]> {
  const rows = await prisma.metricSnapshot.findMany({
    where: { date: { gte: from, lte: to } },
    select: {
      cost: true,
      revenue: true,
      campaign: { select: { channel: true } },
    },
  });

  const map = new Map<string, AggRow>();
  for (const r of rows) {
    const ch = r.campaign.channel;
    const prev = map.get(ch) ?? { channel: ch, invested: 0, returned: 0 };
    prev.invested += r.cost;
    prev.returned += r.revenue;
    map.set(ch, prev);
  }
  return Array.from(map.values());
}

function computeTrend(
  currentRoi: number,
  prevRoi: number,
  hasData: boolean,
): "up" | "down" | "stable" {
  if (!hasData || prevRoi === 0) return "stable";
  if (currentRoi > prevRoi * 1.05) return "up";
  if (currentRoi < prevRoi * 0.95) return "down";
  return "stable";
}

export async function getDashboardSummary(
  from: Date,
  to: Date,
): Promise<DashboardSummary> {
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);

  const [current, previous] = await Promise.all([
    aggregateByChannel(from, to),
    aggregateByChannel(prevFrom, prevTo),
  ]);

  const prevMap = new Map<string, AggRow>(previous.map((r) => [r.channel, r]));
  const currentMap = new Map<string, AggRow>(current.map((r) => [r.channel, r]));

  const perChannel: ChannelMetrics[] = CHANNELS.map((meta) => {
    const cur = currentMap.get(meta.key);
    const prev = prevMap.get(meta.key);

    const invested = cur?.invested ?? 0;
    const returned = cur?.returned ?? 0;
    const profit = returned - invested;
    const roi = invested > 0 ? returned / invested : 0;

    const prevRoi =
      (prev?.invested ?? 0) > 0
        ? (prev?.returned ?? 0) / (prev?.invested ?? 1)
        : 0;

    const trend = computeTrend(roi, prevRoi, invested > 0);

    return {
      channel: meta.key,
      slug: meta.slug,
      label: meta.label,
      tagline: meta.tagline,
      hex: meta.hex,
      invested,
      returned,
      profit,
      roi,
      trend,
    };
  });

  const totalInvested = perChannel.reduce((a, c) => a + c.invested, 0);
  const totalReturned = perChannel.reduce((a, c) => a + c.returned, 0);
  const totalProfit = totalReturned - totalInvested;
  const avgRoi = totalInvested > 0 ? totalReturned / totalInvested : 0;

  const channelsWithData = perChannel.filter((c) => c.invested > 0);
  const sorted = [...channelsWithData].sort((a, b) => b.roi - a.roi);

  const bestChannel = sorted[0] ?? null;
  const worstChannel = sorted[sorted.length - 1] ?? null;
  const hasLosingChannels = channelsWithData.some((c) => c.roi < 1);

  return {
    totalInvested,
    totalReturned,
    totalProfit,
    avgRoi,
    perChannel,
    bestChannel,
    worstChannel,
    hasLosingChannels,
  };
}

import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/constants";
import type { Channel } from "@/types/db";

// ─── Channel-detail types ────────────────────────────────────────────────────

export type ChannelDetailKpis = {
  invested: number;
  returned: number;
  profit: number;
  roi: number; // returned / invested (0 if no investment)
};

export type ChannelDailySeries = {
  date: string; // YYYY-MM-DD
  cost: number;
  revenue: number;
};

export type CampaignRoiRow = {
  campaignId: string;
  name: string;
  cost: number;
  revenue: number;
  roi: number; // 0 if cost === 0
  color: string; // green if roi >= 1, red otherwise
};

export type ChannelDetailMetrics = {
  kpis: ChannelDetailKpis;
  daily: ChannelDailySeries[];
  campaigns: CampaignRoiRow[];
};

export async function getChannelDetailMetrics(
  channel: Channel,
  from: Date,
  to: Date,
): Promise<ChannelDetailMetrics> {
  const meta = CHANNELS.find((c) => c.key === channel);

  const campaigns = await prisma.campaign.findMany({
    where: { channel },
    select: {
      id: true,
      name: true,
      metrics: {
        where: { date: { gte: from, lte: to } },
        select: { date: true, cost: true, revenue: true },
      },
    },
  });

  // Aggregate totals
  let invested = 0;
  let returned = 0;

  // Daily series — keyed by YYYY-MM-DD
  const dailyMap = new Map<string, { cost: number; revenue: number }>();

  // Per-campaign rows
  const campaignRows: CampaignRoiRow[] = [];

  for (const c of campaigns) {
    let cCost = 0;
    let cRevenue = 0;

    for (const m of c.metrics) {
      const cost = Number(m.cost);
      const revenue = Number(m.revenue);
      const day = m.date.toISOString().slice(0, 10);

      cCost += cost;
      cRevenue += revenue;
      invested += cost;
      returned += revenue;

      const prev = dailyMap.get(day) ?? { cost: 0, revenue: 0 };
      prev.cost += cost;
      prev.revenue += revenue;
      dailyMap.set(day, prev);
    }

    const roi = cCost > 0 ? cRevenue / cCost : 0;
    campaignRows.push({
      campaignId: c.id,
      name: c.name.length > 28 ? c.name.slice(0, 26) + "…" : c.name,
      cost: cCost,
      revenue: cRevenue,
      roi,
      color: roi >= 1 ? "#10b981" : "#ef4444",
    });
  }

  const profit = returned - invested;
  const roi = invested > 0 ? returned / invested : 0;

  const daily: ChannelDailySeries[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const sortedCampaigns = [...campaignRows]
    .filter((r) => r.cost > 0 || r.revenue > 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);

  return {
    kpis: { invested, returned, profit, roi },
    daily,
    campaigns: sortedCampaigns,
  };
}

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
  // Engagement (canales orgánicos: email outreach, LinkedIn, etc.)
  leads: number;
  clicks: number;
  impressions: number;
  hasInvestment: boolean;
  hasEngagement: boolean;
};

export type DashboardSummary = {
  totalInvested: number;
  totalReturned: number;
  totalProfit: number;
  avgRoi: number;
  totalLeads: number;
  totalClicks: number;
  totalImpressions: number;
  perChannel: ChannelMetrics[];
  bestChannel: ChannelMetrics | null;
  worstChannel: ChannelMetrics | null;
  hasLosingChannels: boolean;
  hasAnyInvestment: boolean;
  hasAnyEngagement: boolean;
};

type AggRow = {
  channel: string;
  invested: number;
  returned: number;
  leads: number;
  clicks: number;
  impressions: number;
};

async function aggregateByChannel(from: Date, to: Date): Promise<AggRow[]> {
  const rows = await prisma.metricSnapshot.findMany({
    where: { date: { gte: from, lte: to } },
    select: {
      cost: true,
      revenue: true,
      leads: true,
      clicks: true,
      impressions: true,
      campaign: { select: { channel: true } },
    },
  });

  const map = new Map<string, AggRow>();
  for (const r of rows) {
    const ch = r.campaign.channel;
    const prev =
      map.get(ch) ??
      { channel: ch, invested: 0, returned: 0, leads: 0, clicks: 0, impressions: 0 };
    prev.invested += r.cost;
    prev.returned += r.revenue;
    prev.leads += r.leads;
    prev.clicks += r.clicks;
    prev.impressions += r.impressions;
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
    const leads = cur?.leads ?? 0;
    const clicks = cur?.clicks ?? 0;
    const impressions = cur?.impressions ?? 0;
    const profit = returned - invested;
    const roi = invested > 0 ? returned / invested : 0;
    const hasInvestment = invested > 0 || returned > 0;
    const hasEngagement = leads > 0 || clicks > 0 || impressions > 0;

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
      leads,
      clicks,
      impressions,
      hasInvestment,
      hasEngagement,
    };
  });

  const totalInvested = perChannel.reduce((a, c) => a + c.invested, 0);
  const totalReturned = perChannel.reduce((a, c) => a + c.returned, 0);
  const totalProfit = totalReturned - totalInvested;
  const avgRoi = totalInvested > 0 ? totalReturned / totalInvested : 0;
  const totalLeads = perChannel.reduce((a, c) => a + c.leads, 0);
  const totalClicks = perChannel.reduce((a, c) => a + c.clicks, 0);
  const totalImpressions = perChannel.reduce((a, c) => a + c.impressions, 0);

  const channelsWithData = perChannel.filter((c) => c.invested > 0);
  const sorted = [...channelsWithData].sort((a, b) => b.roi - a.roi);

  const bestChannel = sorted[0] ?? null;
  const worstChannel = sorted[sorted.length - 1] ?? null;
  const hasLosingChannels = channelsWithData.some((c) => c.roi < 1);
  const hasAnyInvestment = totalInvested > 0 || totalReturned > 0;
  const hasAnyEngagement = totalLeads > 0 || totalClicks > 0 || totalImpressions > 0;

  return {
    totalInvested,
    totalReturned,
    totalProfit,
    avgRoi,
    totalLeads,
    totalClicks,
    totalImpressions,
    perChannel,
    bestChannel,
    worstChannel,
    hasLosingChannels,
    hasAnyInvestment,
    hasAnyEngagement,
  };
}

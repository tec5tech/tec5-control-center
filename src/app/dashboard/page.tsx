import { prisma } from "@/lib/db";
import { evaluateAlerts } from "@/lib/alerts";
import { getDashboardSummary } from "@/lib/dashboard-metrics";
import { parseDateRange } from "@/lib/date-range";
import { RelativeTime } from "@/components/ui/relative-time";
import { PeriodChips } from "@/components/dashboard/period-chips";
import { LosingMoneyBanner } from "@/components/dashboard/losing-money-banner";
import { InvestmentKpis } from "@/components/dashboard/investment-kpis";
import { RoiComparisonChart } from "@/components/dashboard/roi-comparison-chart";
import { ChannelCardsGrid } from "@/components/dashboard/channel-cards-grid";
import { HighlightCards } from "@/components/dashboard/highlight-cards";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await evaluateAlerts().catch((e) =>
    console.error("[overview] evaluateAlerts failed", e),
  );

  const params = await searchParams;
  const { from, to } = parseDateRange(params);

  const [summary, lastIntegration] = await Promise.all([
    getDashboardSummary(from, to),
    prisma.integration.findFirst({
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
  ]);

  const lastSyncIso = lastIntegration?.lastSyncAt?.toISOString() ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Mi Inversión
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Resumen general</h1>
        {lastSyncIso && (
          <p className="text-sm text-muted-foreground">
            Última actualización{" "}
            <RelativeTime iso={lastSyncIso} dateStyle="short" timeStyle="short" />
          </p>
        )}
      </div>

      {/* Period chips */}
      <PeriodChips />

      {/* Alert banner */}
      <LosingMoneyBanner hasLosingChannels={summary.hasLosingChannels} />

      {/* 4 KPI cards */}
      <InvestmentKpis summary={summary} />

      {/* ROI horizontal bar chart */}
      <RoiComparisonChart perChannel={summary.perChannel} />

      {/* Channel cards grid */}
      <ChannelCardsGrid perChannel={summary.perChannel} />

      {/* Highlight cards */}
      <HighlightCards
        best={summary.bestChannel}
        worst={summary.worstChannel}
      />
    </div>
  );
}

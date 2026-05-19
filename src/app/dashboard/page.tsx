import { evaluateAlerts } from "@/lib/alerts";
import { getDashboardSummary } from "@/lib/dashboard-metrics";
import { parseDateRange } from "@/lib/date-range";
import { PeriodSelect } from "@/components/dashboard/period-select";
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

  const summary = await getDashboardSummary(from, to);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Resumen de tu Inversión
          </h1>
          <p className="text-muted-foreground mt-1">
            Vista general de cómo está rindiendo tu dinero en marketing
          </p>
        </div>
        <PeriodSelect />
      </div>

      {/* Alert banner */}
      <LosingMoneyBanner hasLosingChannels={summary.hasLosingChannels} />

      {/* 4 KPI cards */}
      <InvestmentKpis summary={summary} />

      {/* Highlight cards */}
      <HighlightCards best={summary.bestChannel} worst={summary.worstChannel} />

      {/* ROI horizontal bar chart */}
      <RoiComparisonChart perChannel={summary.perChannel} />

      {/* Channel cards grid */}
      <ChannelCardsGrid perChannel={summary.perChannel} />
    </div>
  );
}

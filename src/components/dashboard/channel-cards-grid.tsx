import { ChannelCard } from "@/components/dashboard/channel-card";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";

export function ChannelCardsGrid({ perChannel }: { perChannel: ChannelMetrics[] }) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Por canal</p>
        <h2 className="text-xl font-bold tracking-tight">Detalle por canal</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perChannel.map((metrics) => (
          <ChannelCard key={metrics.channel} metrics={metrics} />
        ))}
      </div>
    </section>
  );
}

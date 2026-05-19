import { ChannelCard } from "@/components/dashboard/channel-card";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";

export function ChannelCardsGrid({ perChannel }: { perChannel: ChannelMetrics[] }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">Detalle por Canal</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mirá cómo está rindiendo cada canal individualmente
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perChannel.map((metrics) => (
          <ChannelCard key={metrics.channel} metrics={metrics} />
        ))}
      </div>
    </section>
  );
}

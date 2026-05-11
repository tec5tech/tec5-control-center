import { ChannelModule } from "@/components/campaign/channel-module";
import { parseDateRange } from "@/lib/date-range";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = parseDateRange(await searchParams);
  return <ChannelModule channel="META_ADS" from={from} to={to} />;
}

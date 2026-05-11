"use client";

import { useRouter } from "next/navigation";
import { DonutShare } from "@/components/charts/donut-chart";
import { BarBreakdown } from "@/components/charts/bar-chart";

type ChannelSlice = { name: string; value: number; color: string; slug: string };

export function ChannelShareDonut({ data }: { data: ChannelSlice[] }) {
  const router = useRouter();
  return (
    <DonutShare
      data={data}
      onSliceClick={(s) => {
        const slug = (s as ChannelSlice).slug;
        if (slug) router.push(`/dashboard/${slug}`);
      }}
    />
  );
}

export function ChannelInvestmentBar({ data }: { data: ChannelSlice[] }) {
  const router = useRouter();
  return (
    <BarBreakdown
      data={data}
      color="#d62828"
      onBarClick={(row) => {
        const slug = (row as ChannelSlice).slug;
        if (slug) router.push(`/dashboard/${slug}`);
      }}
    />
  );
}

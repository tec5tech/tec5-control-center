"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  format,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Preset = {
  value: string;
  label: string;
  from: () => Date;
  to: () => Date;
};

function buildPresets(): Preset[] {
  const now = new Date();
  const today = endOfDay(now);
  const todayStart = startOfDay(now);

  return [
    {
      value: "all",
      label: "Todo el tiempo",
      from: () => subYears(todayStart, 5),
      to: () => today,
    },
    {
      value: "7d",
      label: "Últimos 7 días",
      from: () => startOfDay(subDays(now, 7)),
      to: () => today,
    },
    {
      value: "30d",
      label: "Últimos 30 días",
      from: () => startOfDay(subDays(now, 30)),
      to: () => today,
    },
    {
      value: "90d",
      label: "Últimos 90 días",
      from: () => startOfDay(subDays(now, 90)),
      to: () => today,
    },
    {
      value: "month",
      label: "Este mes",
      from: () => startOfMonth(now),
      to: () => endOfMonth(now),
    },
    {
      value: "prev-month",
      label: "Mes anterior",
      from: () => startOfMonth(subMonths(now, 1)),
      to: () => endOfMonth(subMonths(now, 1)),
    },
    {
      value: "year",
      label: "Este año",
      from: () => startOfYear(now),
      to: () => endOfYear(now),
    },
  ];
}

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function detectActive(fromParam?: string, toParam?: string): string {
  if (!fromParam || !toParam) return "all";
  const presets = buildPresets();
  const match = presets.find(
    (p) => fmt(p.from()) === fromParam && fmt(p.to()) === toParam,
  );
  return match?.value ?? "all";
}

export function PeriodSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const active = detectActive(fromParam, toParam);

  const presets = buildPresets();

  const handleChange = (value: string) => {
    const preset = presets.find((p) => p.value === value);
    if (!preset) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", fmt(preset.from()));
    params.set("to", fmt(preset.to()));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={active} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-[180px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

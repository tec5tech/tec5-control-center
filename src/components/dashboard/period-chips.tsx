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
import { Button } from "@/components/ui/button";

type Chip = {
  label: string;
  from: Date;
  to: Date;
};

function buildChips(now: Date): Chip[] {
  const today = endOfDay(now);
  const todayStart = startOfDay(now);

  return [
    {
      label: "Todo el tiempo",
      from: subYears(todayStart, 5),
      to: today,
    },
    {
      label: "Últimos 7 días",
      from: startOfDay(subDays(now, 7)),
      to: today,
    },
    {
      label: "Últimos 30 días",
      from: startOfDay(subDays(now, 30)),
      to: today,
    },
    {
      label: "Últimos 90 días",
      from: startOfDay(subDays(now, 90)),
      to: today,
    },
    {
      label: "Este mes",
      from: startOfMonth(now),
      to: endOfMonth(now),
    },
    {
      label: "Mes anterior",
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1)),
    },
    {
      label: "Este año",
      from: startOfYear(now),
      to: endOfYear(now),
    },
  ];
}

function formatForUrl(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function isActive(chip: Chip, fromParam?: string, toParam?: string): boolean {
  if (!fromParam || !toParam) return false;
  return (
    formatForUrl(chip.from) === fromParam &&
    formatForUrl(chip.to) === toParam
  );
}

export function PeriodChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;

  const now = new Date();
  const chips = buildChips(now);

  const handleClick = (chip: Chip) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", formatForUrl(chip.from));
    params.set("to", formatForUrl(chip.to));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Button
          key={chip.label}
          variant={isActive(chip, fromParam, toParam) ? "default" : "outline"}
          size="sm"
          onClick={() => handleClick(chip)}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  );
}

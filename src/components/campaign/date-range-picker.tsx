"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subDays, startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay } from "date-fns";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRangeForUrl } from "@/lib/date-range";

type Props = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

type Preset = {
  label: string;
  range: () => { from: Date; to: Date };
};

const PRESETS: Preset[] = [
  { label: "Últimos 7 días",  range: () => ({ from: startOfDay(subDays(new Date(), 6)),  to: endOfDay(new Date()) }) },
  { label: "Últimos 30 días", range: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Últimos 90 días", range: () => ({ from: startOfDay(subDays(new Date(), 89)), to: endOfDay(new Date()) }) },
  { label: "Este mes",        range: () => ({ from: startOfMonth(new Date()),             to: endOfDay(new Date()) }) },
  { label: "Mes pasado",      range: () => {
    const prev = subDays(startOfMonth(new Date()), 1);
    return { from: startOfMonth(prev), to: endOfDay(prev) };
  }},
  { label: "Personalizado",   range: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
];

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<DayPickerRange | undefined>({
    from: parseISO(from),
    to: parseISO(to),
  });

  function applyRange(range: { from: Date; to: Date }) {
    const { from: f, to: t } = formatDateRangeForUrl(range);
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", f);
    params.set("to", t);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function handlePreset(preset: Preset) {
    if (preset.label === "Personalizado") {
      setActivePreset("Personalizado");
      return;
    }
    setActivePreset(preset.label);
    const range = preset.range();
    setSelected({ from: range.from, to: range.to });
    applyRange(range);
  }

  function handleCalendarSelect(range: DayPickerRange | undefined) {
    setSelected(range);
    if (range?.from && range?.to) {
      applyRange({ from: range.from, to: range.to });
    }
  }

  const label = `${format(parseISO(from), "dd MMM yyyy")} – ${format(parseISO(to), "dd MMM yyyy")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("gap-2 font-normal text-sm", !from && "text-muted-foreground")}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col gap-1 border-r border-border p-3 min-w-[160px]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={cn(
                  "text-sm text-left px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                  activePreset === p.label && "bg-accent text-accent-foreground font-medium",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Calendar — siempre visible para que el usuario pueda explorar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              defaultMonth={selected?.from}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

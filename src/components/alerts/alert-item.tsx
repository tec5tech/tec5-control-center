"use client";

import { CHANNELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types/db";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Trophy,
  Wallet,
  PiggyBank,
  Users,
  AlertCircle,
} from "lucide-react";

export type AlertEventLite = {
  id: string;
  type: string;
  severity: string;
  channel: string | null;
  campaignId: string | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const TYPE_META: Record<string, { Icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  BUDGET_OVERRUN:  { Icon: Wallet,        tint: "text-rose-600 dark:text-rose-400" },
  BUDGET_LEFTOVER: { Icon: PiggyBank,     tint: "text-amber-600 dark:text-amber-400" },
  BUDGET_PACE:     { Icon: Wallet,        tint: "text-amber-600 dark:text-amber-400" },
  NEW_LEAD:        { Icon: Users,         tint: "text-emerald-600 dark:text-emerald-400" },
  TOP_CAMPAIGN:    { Icon: Trophy,        tint: "text-emerald-600 dark:text-emerald-400" },
  ACTION_NEEDED:   { Icon: AlertCircle,   tint: "text-rose-600 dark:text-rose-400" },
};

const SEVERITY_META: Record<string, { Icon: React.ComponentType<{ className?: string }>; bar: string }> = {
  INFO:     { Icon: Info,          bar: "bg-sky-500/60" },
  OK:       { Icon: CheckCircle2,  bar: "bg-emerald-500/70" },
  WARN:     { Icon: AlertTriangle, bar: "bg-amber-500/70" },
  CRITICAL: { Icon: AlertOctagon,  bar: "bg-rose-500/80" },
};

export function AlertItem({ event, compact = false }: { event: AlertEventLite; compact?: boolean }) {
  const typeMeta = TYPE_META[event.type] ?? { Icon: Info, tint: "text-muted-foreground" };
  const sevMeta = SEVERITY_META[event.severity] ?? SEVERITY_META.INFO;
  const TypeIcon = typeMeta.Icon;
  const channelMeta = event.channel ? CHANNELS.find((c) => c.key === event.channel) : null;

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-lg border border-border bg-background/40 pl-3 pr-3 py-2.5 hover:bg-muted/40 transition-colors",
        !event.read && "border-l-4",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
          sevMeta.bar,
          event.read && "opacity-30",
        )}
      />
      <div className={cn("grid place-items-center h-9 w-9 rounded-md bg-muted shrink-0", typeMeta.tint)}>
        <TypeIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium truncate", !event.read && "text-foreground")}>{event.title}</p>
          {channelMeta && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              <ChannelIcon channel={channelMeta.key as Channel} size={10} />
              {channelMeta.label}
            </span>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.message}</p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground self-start shrink-0">
        <RelativeTime iso={event.createdAt} />
      </span>
    </div>
  );
}

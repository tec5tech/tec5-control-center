"use client";

import Link from "next/link";
import { CHANNELS } from "@/lib/constants";
import { semaphoreClasses, type SemaphoreColor } from "@/lib/health";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowRight, ArrowUpRight, MinusCircle, TrendingUp } from "lucide-react";
import type { Channel } from "@/types/db";

export type ChannelHealthRow = {
  channel: Channel;
  color: SemaphoreColor;
  score: number;
  spent: number;
  revenue: number;
  leads: number;
  roi: number | null;
  budget: number;
  budgetUsedPct: number;
  primaryReason: string;
};

const fmtMoney = (n: number) =>
  n >= 1000
    ? "$ " + (n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "k"
    : "$ " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

// Grilla "Dónde se invierte bien o mal" — para el overview.
export function ChannelHealthGrid({ rows }: { rows: ChannelHealthRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const meta = CHANNELS.find((c) => c.key === r.channel);
        if (!meta) return null;
        const cls = semaphoreClasses(r.color);
        const RoiIcon =
          r.roi === null ? MinusCircle : r.roi >= 1.5 ? ArrowUpRight : r.roi >= 1 ? ArrowRight : ArrowDownRight;

        return (
          <Link
            key={r.channel}
            href={`/dashboard/${meta.slug}`}
            className={cn(
              "group rounded-xl border bg-card p-4 transition-all hover:shadow-lg hover:-translate-y-0.5",
              "border-border",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-md bg-muted shrink-0">
                <ChannelIcon channel={r.channel} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{meta.label}</p>
                  <span className={cn("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold", cls.text)}>
                    <span className={cn("h-2 w-2 rounded-full", cls.dot)} />
                    {r.color === "neutral" ? "Sin datos" : r.score}
                  </span>
                </div>
                <p className={cn("text-xs mt-0.5", cls.text)}>{r.primaryReason}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gasto</p>
                <p className="font-semibold tabular-nums">{fmtMoney(r.spent)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ingreso</p>
                <p className="font-semibold tabular-nums">{fmtMoney(r.revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leads</p>
                <p className="font-semibold tabular-nums">{r.leads.toLocaleString("es-AR")}</p>
              </div>
            </div>

            {/* Bar saldo */}
            {r.budget > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Presupuesto</span>
                  <span className="tabular-nums">{r.budgetUsedPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.budgetUsedPct >= 100
                        ? "bg-rose-500"
                        : r.budgetUsedPct >= 90
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(100, r.budgetUsedPct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* ROI footer */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> ROI
              </span>
              <span className={cn("font-semibold tabular-nums inline-flex items-center gap-1", cls.text)}>
                <RoiIcon className="h-3 w-3" />
                {r.roi === null ? "—" : `${r.roi.toFixed(2)}x`}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

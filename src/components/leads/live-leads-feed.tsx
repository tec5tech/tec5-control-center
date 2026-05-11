"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Zap, ChevronRight } from "lucide-react";
import { CHANNELS } from "@/lib/constants";
import type { Channel } from "@/types/db";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { RelativeTime } from "@/components/ui/relative-time";

type LeadEvent = {
  id: string;
  channel: string | null;
  campaignId: string | null;
  title: string;
  message: string;
  createdAt: string;
  campaign: { id: string; name: string; channel: string } | null;
};

const POLL_MS = 15_000;

// Feed en vivo de nuevos leads. Polling 15s + animación de entrada.
// Pensado para vivir en el overview, encima de los KPIs.
export function LiveLeadsFeed({ channel }: { channel?: Channel }) {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [pulse, setPulse] = useState(false);
  const sinceRef = useRef<string>(new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const url = new URL("/api/leads/live", window.location.origin);
      url.searchParams.set("limit", "8");
      if (channel) url.searchParams.set("channel", channel);
      try {
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const incoming: LeadEvent[] = data.events ?? [];
        // Ordenamos por createdAt descendente y deduplicamos
        setEvents((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const merged = [...incoming.filter((e) => !ids.has(e.id)), ...prev];
          merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return merged.slice(0, 8);
        });
        if (incoming.length > 0 && incoming[0].id !== events[0]?.id) {
          setPulse(true);
          setTimeout(() => setPulse(false), 1500);
        }
      } catch {
        /* silent */
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-md bg-emerald-500/15 grid place-items-center text-emerald-500">
            <Users className="h-4 w-4" />
            <span
              className={`absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 ${
                pulse ? "animate-ping" : ""
              }`}
            />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              Leads en vivo
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <Zap className="h-3 w-3" />
                en línea
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {channel ? "De este canal" : "Todos los canales"} · últimas 24h
            </p>
          </div>
        </div>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            Sin leads nuevos en las últimas 24 horas.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {events.map((e) => {
                const ch = e.channel ? CHANNELS.find((c) => c.key === e.channel) : null;
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, x: -16, backgroundColor: "rgba(16,185,129,0.18)" }}
                    animate={{ opacity: 1, x: 0, backgroundColor: "rgba(16,185,129,0)" }}
                    transition={{ duration: 0.6 }}
                    className="px-4 py-2.5 flex items-center gap-3 text-sm"
                  >
                    {ch ? (
                      <span className="grid place-items-center h-7 w-7 rounded-md bg-muted shrink-0">
                        <ChannelIcon channel={ch.key as Channel} size={14} />
                      </span>
                    ) : (
                      <span className="grid place-items-center h-7 w-7 rounded-md bg-muted shrink-0 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{e.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {e.campaign?.name ?? ch?.label ?? "—"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      <RelativeTime iso={e.createdAt} timeStyle="short" />
                    </span>
                    {ch && (
                      <Link
                        href={`/dashboard/${ch.slug}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

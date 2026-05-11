"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertItem, type AlertEventLite } from "@/components/alerts/alert-item";

const POLL_MS = 30_000;

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AlertEventLite[]>([]);
  const [unread, setUnread] = useState(0);
  const [pending, start] = useTransition();
  const lastPoll = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/alerts?limit=15", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setEvents(data.events ?? []);
        setUnread(data.unreadCount ?? 0);
        lastPoll.current = new Date().toISOString();
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
  }, []);

  const markAll = () => {
    start(async () => {
      const res = await fetch("/api/alerts/read-all", { method: "POST" });
      if (!res.ok) return;
      setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
      setUnread(0);
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-[10px] text-white grid place-items-center font-medium">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Notificaciones</p>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} sin leer` : "Sin pendientes"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={markAll} disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Marcar leídas
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
          {events.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              Sin notificaciones todavía.
            </p>
          ) : (
            events.map((e) => <AlertItem key={e.id} event={e} compact />)
          )}
        </div>
        <div className="px-3 py-2 border-t border-border text-right">
          <Link href="/dashboard/activity" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
            Ver toda la actividad →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

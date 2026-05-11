"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertItem, type AlertEventLite } from "@/components/alerts/alert-item";
import { toast } from "sonner";

// Tira de alertas más relevantes (top N). Se muestra arriba del overview o de cada canal.
export function AlertsStrip({
  channel,
  initial,
  limit = 4,
}: {
  channel?: string;
  initial: AlertEventLite[];
  limit?: number;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initial);
  const [pending, start] = useTransition();

  useEffect(() => setEvents(initial), [initial]);

  const refresh = () => {
    start(async () => {
      const res = await fetch("/api/alerts", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo refrescar");
        return;
      }
      toast.success("Alertas actualizadas");
      router.refresh();
    });
  };

  const top = events.slice(0, limit);

  if (top.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-emerald-500/10 grid place-items-center text-emerald-500">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Sin alertas relevantes</p>
          <p className="text-xs text-muted-foreground">
            Todas las campañas están dentro de los rangos esperados.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refrescar
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Alertas relevantes</p>
          <p className="text-xs text-muted-foreground">
            {channel ? "De este canal" : "Top de todos los canales"} · ordenadas por urgencia
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refrescar
        </Button>
      </div>
      <div className="space-y-2">
        {top.map((e) => (
          <AlertItem key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

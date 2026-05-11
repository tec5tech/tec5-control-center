"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Save, Loader2 } from "lucide-react";
import type { KpiUnit, KpiDirection, Channel } from "@/types/db";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { channelLabel } from "@/lib/utils";

type KpiRow = {
  id: string;
  name: string;
  unit: KpiUnit;
  direction: KpiDirection;
  target: number;
  current: number;
  channel: Channel | null;
  description: string | null;
};

export function KpiManager({ kpis }: { kpis: KpiRow[] }) {
  if (!kpis.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Creá tu primer KPI.</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {kpis.map((k) => (
        <KpiItem key={k.id} kpi={k} />
      ))}
    </div>
  );
}

function KpiItem({ kpi }: { kpi: KpiRow }) {
  const router = useRouter();
  const [current, setCurrent] = useState(String(kpi.current));
  const [target, setTarget] = useState(String(kpi.target));
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await fetch(`/api/kpis/${kpi.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: Number(current), target: Number(target) }),
      });
      if (!res.ok) {
        toast.error("No se pudo guardar");
        return;
      }
      toast.success("KPI actualizado");
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm(`¿Eliminar KPI "${kpi.name}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/kpis/${kpi.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo eliminar");
        return;
      }
      toast.success("KPI eliminado");
      router.refresh();
    });
  };

  const t = Number(target);
  const c = Number(current);
  const progress =
    kpi.direction === "HIGHER_IS_BETTER" ? (c / Math.max(t, 0.0001)) * 100 : (t / Math.max(c, 0.0001)) * 100;
  const clamped = Math.max(0, Math.min(100, progress));
  const good = clamped >= 85;
  const warn = clamped >= 60 && clamped < 85;

  const fmt = (n: number) => {
    if (kpi.unit === "CURRENCY") return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    if (kpi.unit === "PERCENT") return `${n.toFixed(1)}%`;
    if (kpi.unit === "RATIO") return `${n.toFixed(2)}x`;
    return new Intl.NumberFormat("es-AR").format(n);
  };

  return (
    <div className="rounded-xl border border-border p-4 bg-card/40 backdrop-blur space-y-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{kpi.name}</p>
          <p className="text-xs text-muted-foreground">
            {kpi.channel ? channelLabel(kpi.channel) : "Global"} · {kpi.direction === "HIGHER_IS_BETTER" ? "↑ mejor" : "↓ mejor"}
          </p>
        </div>
        <Badge variant="outline">{kpi.unit}</Badge>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Actual / Objetivo</span>
          <span className="tabular-nums">{fmt(c)} / {fmt(t)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${good ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${clamped}%`, boxShadow: "0 0 12px currentColor" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Actual" />
        <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Objetivo" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={remove} disabled={pending} aria-label="Eliminar KPI">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="neon" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}

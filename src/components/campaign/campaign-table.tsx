"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber, statusLabel, channelLabel } from "@/lib/utils";
import type { Channel, CampaignStatus } from "@/types/db";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { EditCampaignDialog } from "./edit-campaign-dialog";
import { BudgetSemaphore } from "./budget-semaphore";

type Row = {
  id: string;
  name: string;
  status: CampaignStatus;
  channel: Channel;
  budget: number;
  spend: number;
  leads: number;
  clicks: number;
};

export function CampaignTable({ campaigns }: { campaigns: Row[] }) {
  const [editing, setEditing] = useState<Row | null>(null);

  if (!campaigns.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No hay campañas en este canal todavía.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="py-2 pr-4">Campaña</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4 text-right">Presupuesto</th>
              <th className="py-2 pr-4 text-right">Gastado</th>
              <th className="py-2 pr-4 min-w-[180px]">Saldo</th>
              <th className="py-2 pr-4 text-right">Clicks</th>
              <th className="py-2 pr-4 text-right">Leads</th>
              <th className="py-2 pr-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <RowUi key={c.id} row={c} onEdit={() => setEditing(c)} />
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditCampaignDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          campaign={editing}
        />
      )}
    </>
  );
}

function RowUi({ row, onEdit }: { row: Row; onEdit: () => void }) {
  const [status, setStatus] = useState<CampaignStatus>(row.status);
  const [pending, startTransition] = useTransition();

  const toggle = (on: boolean) => {
    const next: CampaignStatus = on ? "ACTIVE" : "PAUSED";
    startTransition(async () => {
      const res = await fetch(`/api/campaigns/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar el estado");
        return;
      }
      setStatus(next);
      toast.success(next === "ACTIVE" ? "Campaña activada" : "Campaña pausada");
    });
  };

  const remove = () => {
    if (!confirm(`¿Eliminar "${row.name}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/campaigns/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo eliminar");
        return;
      }
      toast.success("Campaña eliminada");
      location.reload();
    });
  };

  const badgeVariant =
    status === "ACTIVE" ? "active" : status === "PAUSED" ? "paused" : status === "DRAFT" ? "draft" : "ended";

  return (
    <tr className="border-b border-border/60 hover:bg-muted/40 transition-colors">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-muted shrink-0">
            <ChannelIcon channel={row.channel} size={16} />
          </span>
          <div>
            <p className="font-medium leading-tight">{row.name}</p>
            <p className="text-xs text-muted-foreground">{channelLabel(row.channel)}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <Badge variant={badgeVariant}>{statusLabel(status)}</Badge>
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">{formatCurrency(row.budget)}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{formatCurrency(row.spend)}</td>
      <td className="py-3 pr-4">
        <BudgetSemaphore spend={row.spend} budget={row.budget} />
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">{formatNumber(row.clicks)}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{formatNumber(row.leads)}</td>
      <td className="py-3 pr-2">
        <div className="flex items-center gap-2 justify-end">
          <Switch
            checked={status === "ACTIVE"}
            onCheckedChange={toggle}
            disabled={pending || status === "ENDED" || status === "DRAFT"}
            aria-label="Activar/Pausar"
          />
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Eliminar">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </td>
    </tr>
  );
}


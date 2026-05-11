"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Channel } from "@/types/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESETS = [
  { value: 15,   label: "15 min" },
  { value: 30,   label: "30 min" },
  { value: 60,   label: "1 hora" },
  { value: 180,  label: "3 horas" },
  { value: 360,  label: "6 horas" },
  { value: 720,  label: "12 horas" },
  { value: 1440, label: "24 horas" },
  { value: 0,    label: "Sólo manual" },
] as const;

export function IntegrationIntervalSelect({
  channel,
  currentMinutes,
}: {
  channel: Channel;
  currentMinutes: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentMinutes));
  const [pending, start] = useTransition();

  const change = (next: string) => {
    setValue(next);
    start(async () => {
      const res = await fetch(`/api/integrations/${channel}/interval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: Number(next) }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar el intervalo");
        // Revert optimistic update on error
        setValue(String(currentMinutes));
        return;
      }
      toast.success("Intervalo de sincronización actualizado");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <Select value={value} onValueChange={change} disabled={pending}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={String(p.value)} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

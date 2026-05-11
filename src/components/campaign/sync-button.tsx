"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import type { Channel } from "@/types/db";
import { Button } from "@/components/ui/button";

export function SyncButton({ channel, label = "Sincronizar ahora" }: { channel: Channel; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const sync = () => {
    start(async () => {
      const t = toast.loading("Trayendo datos reales…");
      const res = await fetch(`/api/integrations/${channel}/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(t);
      if (!res.ok) {
        toast.error(data.error ?? "Falló la sincronización");
        return;
      }
      const detail =
        typeof data.campaigns === "number"
          ? `${data.campaigns} campañas · ${data.snapshots} días`
          : "Datos actualizados";
      toast.success(detail);
      router.refresh();
    });
  };

  return (
    <Button variant="outline" onClick={sync} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {label}
    </Button>
  );
}

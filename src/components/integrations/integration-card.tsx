"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CirclePause,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";

import type { IntegrationSpec } from "@/lib/integrations";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IntegrationIntervalSelect } from "@/components/integrations/integration-interval-select";

type Status = "NOT_CONFIGURED" | "CONNECTED" | "ERROR" | "DISCONNECTED";

const statusMeta: Record<Status, { label: string; dot: string; text: string }> = {
  NOT_CONFIGURED: { label: "No conectado", dot: "bg-rose-500",    text: "text-rose-500" },
  CONNECTED:      { label: "Conectado",    dot: "bg-emerald-500", text: "text-emerald-500" },
  ERROR:          { label: "Con error",    dot: "bg-amber-500",   text: "text-amber-500" },
  DISCONNECTED:   { label: "Pausado",      dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

const statusIcon: Record<Status, React.ReactNode> = {
  NOT_CONFIGURED: <CircleDashed className="h-4 w-4" />,
  CONNECTED:      <CheckCircle2 className="h-4 w-4" />,
  ERROR:          <CircleAlert className="h-4 w-4" />,
  DISCONNECTED:   <CirclePause className="h-4 w-4" />,
};

export function IntegrationCard({
  spec,
  status,
  lastSyncAt,
  lastError,
  credentials,
  syncIntervalMinutes = 60,
}: {
  spec: IntegrationSpec;
  status: Status;
  lastSyncAt: string | null;
  lastError: string | null;
  credentials: Record<string, string>;
  syncIntervalMinutes?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(credentials ?? {});
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await fetch(`/api/integrations/${spec.channel}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: values }),
      });
      if (!res.ok) {
        toast.error("No se pudo guardar");
        return;
      }
      toast.success("Configuración guardada");
      setOpen(false);
      router.refresh();
    });
  };

  const test = () => {
    start(async () => {
      const res = await fetch(`/api/integrations/${spec.channel}/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Falló la prueba");
        return;
      }
      toast.success("Conexión probada — credenciales guardadas");
      router.refresh();
    });
  };

  const sync = () => {
    start(async () => {
      const t = toast.loading(`Sincronizando ${spec.label}…`);
      const res = await fetch(`/api/integrations/${spec.channel}/sync`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(t);
      if (!res.ok) {
        toast.error(data.error ?? "Falló la sincronización");
        return;
      }
      const detail =
        typeof data.campaigns === "number"
          ? `${data.campaigns} campañas · ${data.snapshots} días`
          : "Listo";
      toast.success(`${spec.label} sincronizado · ${detail}`);
      router.refresh();
    });
  };

  const disconnect = () => {
    if (!confirm(`¿Desconectar ${spec.label}?`)) return;
    start(async () => {
      const res = await fetch(`/api/integrations/${spec.channel}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo desconectar");
        return;
      }
      toast.success("Integración desconectada");
      router.refresh();
    });
  };

  const meta = statusMeta[status];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid place-items-center h-10 w-10 rounded-lg bg-muted shrink-0">
            <ChannelIcon channel={spec.channel} size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{spec.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{spec.description}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs shrink-0 ${meta.text}`}>
          <span className={`h-2 w-2 rounded-sm ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {lastSyncAt && (
        <p className="text-[11px] text-muted-foreground">
          Última sincronización: <RelativeTime iso={lastSyncAt} dateStyle="short" timeStyle="short" />
        </p>
      )}
      {status === "ERROR" && lastError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 line-clamp-2">{lastError}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant={status === "CONNECTED" ? "outline" : "neon"}>
              <Settings2 className="h-4 w-4" />
              {status === "NOT_CONFIGURED" ? "Configurar" : "Editar"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChannelIcon channel={spec.channel} size={22} />
                {spec.label}
                <span className={`ml-auto inline-flex items-center gap-1 text-xs ${meta.text}`}>
                  {statusIcon[status]} {meta.label}
                </span>
              </DialogTitle>
              <DialogDescription>{spec.description}</DialogDescription>
            </DialogHeader>

            <Link
              href={spec.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver documentación oficial <ExternalLink className="h-3 w-3" />
            </Link>

            <form onSubmit={save} className="space-y-3 pt-2">
              {spec.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={`${spec.channel}-${f.key}`} className="flex items-baseline justify-between">
                    <span>{f.label}{!f.optional && <span className="text-primary"> *</span>}</span>
                    {f.optional && <span className="text-[10px] text-muted-foreground">opcional</span>}
                  </Label>
                  <Input
                    id={`${spec.channel}-${f.key}`}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    required={!f.optional}
                  />
                  {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
                </div>
              ))}

              <DialogFooter className="gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="outline" type="button">Cancelar</Button>
                </DialogClose>
                <Button type="submit" variant="neon" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {status !== "NOT_CONFIGURED" && (
          <>
            <Button size="sm" variant="neon" onClick={sync} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar
            </Button>
            <Button size="sm" variant="outline" onClick={test} disabled={pending} title="Verificar credenciales sin traer datos">
              Probar
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect} disabled={pending} aria-label="Desconectar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {status !== "NOT_CONFIGURED" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
          <span>Intervalo auto-sync:</span>
          <IntegrationIntervalSelect
            channel={spec.channel}
            currentMinutes={syncIntervalMinutes}
          />
        </div>
      )}
    </div>
  );
}

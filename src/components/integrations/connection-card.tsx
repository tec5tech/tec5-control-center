"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import type { IntegrationSpec } from "@/lib/integrations";
import { ChannelIcon } from "@/components/brand/channel-icon";
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
import Link from "next/link";
import { Save, Settings2 } from "lucide-react";
import { IntegrationIntervalSelect } from "@/components/integrations/integration-interval-select";
import { MetricInfo } from "@/components/ui/metric-info";

type Status = "NOT_CONFIGURED" | "CONNECTED" | "ERROR" | "DISCONNECTED";

// Shared edit dialog — same logic as IntegrationCard, extracted for reuse
function EditDialog({
  spec,
  credentials,
  status,
  onClose,
}: {
  spec: IntegrationSpec;
  credentials: Record<string, string>;
  status: Status;
  onClose: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(credentials);
  const [pending, start] = useTransition();

  const statusMeta: Record<Status, { label: string; text: string }> = {
    NOT_CONFIGURED: { label: "No conectado", text: "text-rose-500" },
    CONNECTED: { label: "Conectado", text: "text-emerald-500" },
    ERROR: { label: "Con error", text: "text-amber-500" },
    DISCONNECTED: { label: "Pausado", text: "text-muted-foreground" },
  };
  const meta = statusMeta[status];

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
      onClose();
      router.refresh();
    });
  };

  return (
    <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ChannelIcon channel={spec.channel} size={22} />
          {spec.label}
          <span className={`ml-auto inline-flex items-center gap-1 text-xs ${meta.text}`}>
            {meta.label}
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
            <Label
              htmlFor={`conn-${spec.channel}-${f.key}`}
              className="flex items-baseline justify-between"
            >
              <span>
                {f.label}
                {!f.optional && <span className="text-primary"> *</span>}
              </span>
              {f.optional && (
                <span className="text-[10px] text-muted-foreground">opcional</span>
              )}
            </Label>
            <Input
              id={`conn-${spec.channel}-${f.key}`}
              type={f.type}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              required={!f.optional}
            />
            {f.help && (
              <p className="text-[11px] text-muted-foreground">{f.help}</p>
            )}
          </div>
        ))}

        <DialogFooter className="gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" variant="default" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </form>

      {status !== "NOT_CONFIGURED" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
          <span>Intervalo auto-sync:</span>
          <IntegrationIntervalSelect
            channel={spec.channel}
            currentMinutes={60}
          />
        </div>
      )}
    </DialogContent>
  );
}

export function ConnectedCard({
  spec,
  credentials,
  lastSyncAt,
  syncIntervalMinutes,
}: {
  spec: IntegrationSpec;
  credentials: Record<string, string>;
  lastSyncAt: string | null;
  syncIntervalMinutes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const sync = () => {
    start(async () => {
      const t = toast.loading(`Sincronizando ${spec.label}…`);
      const res = await fetch(`/api/integrations/${spec.channel}/sync`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(t);
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? "Falló la sincronización");
        return;
      }
      toast.success(`${spec.label} sincronizado`);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      {/* Avatar */}
      <div
        className="grid place-items-center h-10 w-10 rounded-lg shrink-0 text-white font-bold text-sm"
        style={{ backgroundColor: "#10b981" }}
      >
        <ChannelIcon channel={spec.channel} size={20} />
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{spec.label}</p>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Conectado
            <MetricInfo content="Esta plataforma está conectada y enviando datos automáticamente según el intervalo configurado." />
          </span>
        </div>
        {lastSyncAt && (
          <p className="text-xs text-muted-foreground">
            Última sync: {new Date(lastSyncAt).toLocaleDateString("es-AR")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={sync}
          disabled={pending}
          aria-label="Sincronizar"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              aria-label="Editar configuración"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <EditDialog
            spec={spec}
            credentials={credentials}
            status="CONNECTED"
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </div>
    </div>
  );
}

export function DisconnectedCard({
  spec,
  credentials,
  status,
}: {
  spec: IntegrationSpec;
  credentials: Record<string, string>;
  status: Status;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      {/* Avatar */}
      <div className="grid place-items-center h-10 w-10 rounded-lg shrink-0 bg-muted">
        <ChannelIcon channel={spec.channel} size={20} />
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{spec.label}</p>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Sin conectar
            <MetricInfo content="Conectá esta plataforma para que los datos se importen automáticamente." />
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{spec.description}</p>
      </div>

      {/* Connect button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="shrink-0">
            Conectar
          </Button>
        </DialogTrigger>
        <EditDialog
          spec={spec}
          credentials={credentials}
          status={status}
          onClose={() => setOpen(false)}
        />
      </Dialog>
    </div>
  );
}

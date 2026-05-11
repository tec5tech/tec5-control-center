"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Trash2,
  Unlink,
} from "lucide-react";
import { CHANNELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const ALERT_TYPES: { key: string; label: string }[] = [
  { key: "BUDGET_OVERRUN",  label: "Saldo agotado / excedido" },
  { key: "BUDGET_LEFTOVER", label: "Saldo sobrante" },
  { key: "BUDGET_PACE",     label: "Saldo cerca del límite" },
  { key: "NEW_LEAD",        label: "Nuevos leads" },
  { key: "TOP_CAMPAIGN",    label: "Mejor campaña de la semana" },
  { key: "ACTION_NEEDED",   label: "Acciones a realizar" },
];

type ConfigInfo = {
  enabled: boolean;
  botUsername: string | null;
  configured: boolean;
  tokenMask?: string;
};

type SubscriberInfo = {
  linked: boolean;
  enabled: boolean;
  channels: string[];
  alerts: string[];
  linkCode: string;
  startUrl: string | null;
  botUsername: string | null;
  botConfigured: boolean;
};

export function TelegramCard({ canConfigureBot }: { canConfigureBot: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [config, setConfig] = useState<ConfigInfo | null>(null);
  const [me, setMe] = useState<SubscriberInfo | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [draftChannels, setDraftChannels] = useState<string[]>([]);
  const [draftAlerts, setDraftAlerts] = useState<string[]>([]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [cfgRes, meRes] = await Promise.all([
      fetch("/api/integrations/telegram/config").then((r) => r.json()).catch(() => ({})),
      fetch("/api/integrations/telegram/me").then((r) => r.json()).catch(() => ({})),
    ]);
    setConfig(cfgRes.config ?? null);
    setMe(meRes.subscriber ?? null);
    setDraftChannels(meRes.subscriber?.channels ?? []);
    setDraftAlerts(meRes.subscriber?.alerts ?? []);
  }

  const saveToken = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await fetch("/api/integrations/telegram/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: tokenInput.trim(), enabled: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar el token");
        return;
      }
      toast.success(`Bot conectado · @${data.botUsername ?? "verificado"}`);
      setTokenDialogOpen(false);
      setTokenInput("");
      await refresh();
      router.refresh();
    });
  };

  const removeBot = () => {
    if (!confirm("¿Desconectar el bot? Todos los usuarios quedan desvinculados.")) return;
    start(async () => {
      const res = await fetch("/api/integrations/telegram/config", { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo desconectar");
        return;
      }
      toast.success("Bot desconectado");
      await refresh();
      router.refresh();
    });
  };

  const pollLink = () => {
    start(async () => {
      const res = await fetch("/api/integrations/telegram/poll", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo verificar");
        return;
      }
      if (data.linked > 0) {
        toast.success(`${data.linked} chat${data.linked === 1 ? "" : "s"} vinculado${data.linked === 1 ? "" : "s"}`);
      } else {
        toast.info("Todavía no recibimos /start. Mandale el mensaje al bot y volvé a apretar.");
      }
      await refresh();
    });
  };

  const sendTest = () => {
    start(async () => {
      const res = await fetch("/api/integrations/telegram/me", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo enviar");
        return;
      }
      toast.success("Mensaje de prueba enviado a tu Telegram");
    });
  };

  const unlinkMe = () => {
    if (!confirm("¿Desvincular tu Telegram? Vas a dejar de recibir alertas.")) return;
    start(async () => {
      const res = await fetch("/api/integrations/telegram/me", { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo desvincular");
        return;
      }
      toast.success("Desvinculado");
      await refresh();
    });
  };

  const toggleEnabled = (next: boolean) => {
    start(async () => {
      const res = await fetch("/api/integrations/telegram/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar");
        return;
      }
      await refresh();
    });
  };

  const saveFilters = () => {
    start(async () => {
      const res = await fetch("/api/integrations/telegram/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: draftChannels, alerts: draftAlerts }),
      });
      if (!res.ok) {
        toast.error("No se pudo guardar");
        return;
      }
      toast.success("Filtros actualizados");
      setFiltersDialogOpen(false);
      await refresh();
    });
  };

  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const botStatus = config?.configured ? "CONNECTED" : "NOT_CONFIGURED";
  const botStatusMeta =
    botStatus === "CONNECTED"
      ? { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Bot conectado" }
      : { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", label: "Sin configurar" };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid place-items-center h-10 w-10 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
            <Send className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Notificaciones por Telegram</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saldos vencidos o sobrantes, leads nuevos, mejor campaña y acciones a realizar — directo a tu chat.
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs shrink-0 ${botStatusMeta.text}`}>
          <span className={`h-2 w-2 rounded-sm ${botStatusMeta.dot}`} />
          {botStatusMeta.label}
        </span>
      </div>

      {/* === Bloque 1 — Bot global (admin) === */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Bot del workspace</p>
          {canConfigureBot ? null : (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-auto">
              Solo admin
            </span>
          )}
        </div>

        {config?.configured ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">@{config.botUsername ?? "bot"}</span>
              <span className="text-muted-foreground text-xs">{config.tokenMask}</span>
            </span>
            {canConfigureBot && (
              <div className="ml-auto flex items-center gap-2">
                <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings2 className="h-4 w-4" /> Cambiar token
                    </Button>
                  </DialogTrigger>
                  <BotTokenDialog
                    tokenInput={tokenInput}
                    setTokenInput={setTokenInput}
                    pending={pending}
                    onSave={saveToken}
                  />
                </Dialog>
                <Button size="sm" variant="ghost" onClick={removeBot} disabled={pending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-muted-foreground">
              Creá un bot con{" "}
              <Link href="https://t.me/BotFather" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                @BotFather <ExternalLink className="h-3 w-3" />
              </Link>{" "}
              y pegá el token acá.
            </p>
            {canConfigureBot && (
              <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="neon" className="ml-auto">
                    <Save className="h-4 w-4" /> Configurar bot
                  </Button>
                </DialogTrigger>
                <BotTokenDialog
                  tokenInput={tokenInput}
                  setTokenInput={setTokenInput}
                  pending={pending}
                  onSave={saveToken}
                />
              </Dialog>
            )}
          </div>
        )}
      </div>

      {/* === Bloque 2 — Mi suscripción === */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Mis avisos</p>
          {me?.linked && (
            <span className="ml-auto flex items-center gap-2 text-xs">
              <span>{me.enabled ? "Activos" : "Pausados"}</span>
              <Switch checked={me.enabled} onCheckedChange={toggleEnabled} disabled={pending} />
            </span>
          )}
        </div>

        {!config?.configured ? (
          <p className="text-sm text-muted-foreground">
            Pedile al admin que configure el bot del workspace.
          </p>
        ) : me?.linked ? (
          <div className="space-y-2">
            <p className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Tu chat está vinculado y recibiendo alertas.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => { setDraftChannels(me.channels); setDraftAlerts(me.alerts); }}>
                    <Settings2 className="h-4 w-4" />
                    Filtros{" "}
                    <span className="text-muted-foreground">
                      ({me.channels.length === 0 ? "todos los canales" : `${me.channels.length} canales`}
                      {" · "}
                      {me.alerts.length === 0 ? "todas las alertas" : `${me.alerts.length} tipos`})
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Filtros de notificaciones</DialogTitle>
                    <DialogDescription>
                      Sin selección = recibís todo. Marcá específicamente para limitar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Canales
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {CHANNELS.map((c) => (
                          <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={draftChannels.includes(c.key)}
                              onChange={() => setDraftChannels((cs) => toggleArr(cs, c.key))}
                              className="accent-primary"
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Tipos de alerta
                      </p>
                      <div className="space-y-1">
                        {ALERT_TYPES.map((t) => (
                          <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={draftAlerts.includes(t.key)}
                              onChange={() => setDraftAlerts((cs) => toggleArr(cs, t.key))}
                              className="accent-primary"
                            />
                            {t.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button variant="neon" onClick={saveFilters} disabled={pending}>
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar filtros
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={sendTest} disabled={pending}>
                <Send className="h-4 w-4" /> Enviar prueba
              </Button>
              <Button size="sm" variant="ghost" onClick={unlinkMe} disabled={pending}>
                <Unlink className="h-4 w-4" /> Desvincular
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tu Telegram todavía no está vinculado. Hacelo en 2 pasos:
            </p>
            <ol className="text-sm space-y-1.5 pl-4 list-decimal text-foreground">
              <li>
                Abrí el chat con{" "}
                {me?.startUrl ? (
                  <Link href={me.startUrl} target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                    @{me.botUsername} <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="font-mono text-xs">@{me?.botUsername ?? "tu-bot"}</span>
                )}{" "}
                y mandá el mensaje{" "}
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">/start {me?.linkCode}</span>.
              </li>
              <li>
                Volvé acá y apretá <span className="font-medium">Verificar vínculo</span>.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2">
              {me?.startUrl && (
                <Button size="sm" variant="neon" asChild>
                  <Link href={me.startUrl} target="_blank">
                    <Link2 className="h-4 w-4" /> Abrir el bot
                  </Link>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={pollLink} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Verificar vínculo
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <CircleAlert className="h-3 w-3" />
              En producción se usa webhook automático — en dev podés usar este botón.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BotTokenDialog({
  tokenInput,
  setTokenInput,
  pending,
  onSave,
}: {
  tokenInput: string;
  setTokenInput: (v: string) => void;
  pending: boolean;
  onSave: (e: React.FormEvent) => void;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Configurar bot de Telegram</DialogTitle>
        <DialogDescription>
          Pegá el token que te dio @BotFather. Lo validamos contra Telegram antes de guardarlo.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSave} className="space-y-3 pt-2">
        <div className="space-y-1">
          <Label htmlFor="botToken">Bot token</Label>
          <Input
            id="botToken"
            type="password"
            placeholder="123456789:ABCDEFG..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Lo obtenés escribiéndole a{" "}
            <Link href="https://t.me/BotFather" target="_blank" className="text-primary hover:underline">
              @BotFather
            </Link>{" "}
            con /newbot. No lo compartas — equivale a una contraseña.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">Cancelar</Button>
          </DialogClose>
          <Button variant="neon" type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar y verificar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

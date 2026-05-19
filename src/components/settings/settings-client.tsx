"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Send,
  BellRing,
  Bell,
  Target,
  User,
  Loader2,
  Pencil,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricInfo } from "@/components/ui/metric-info";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

type Prefs = {
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  telegramNotifications?: boolean;
  weeklyReport?: boolean;
};

type SystemSettings = {
  lossRoiThreshold: number;
  lowPerformanceRoiThreshold: number;
  excellentRoiThreshold: number;
  timezone: string;
  currency: string;
};

type Props = {
  email: string;
  preferences: Prefs;
  systemSettings: SystemSettings;
  schemaPending?: boolean;
};

// ─── Static data ─────────────────────────────────────────────────────────────

const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Buenos_Aires", label: "América/Buenos_Aires (GMT-3)" },
  { value: "America/Santiago", label: "América/Santiago (GMT-3/-4)" },
  { value: "America/Mexico_City", label: "América/Ciudad de México (GMT-6)" },
  { value: "America/Bogota", label: "América/Bogotá (GMT-5)" },
  { value: "America/Sao_Paulo", label: "América/São Paulo (GMT-3)" },
  { value: "UTC", label: "UTC (GMT+0)" },
];

const CURRENCIES: { value: string; label: string }[] = [
  { value: "ARS", label: "ARS (Peso argentino)" },
  { value: "USD", label: "USD (Dólar)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "CLP", label: "CLP (Peso chileno)" },
  { value: "MXN", label: "MXN (Peso mexicano)" },
  { value: "BRL", label: "BRL (Real)" },
];

type ThresholdKey = "lossRoiThreshold" | "lowPerformanceRoiThreshold" | "excellentRoiThreshold";

// ─── Sub-component: Threshold edit modal ─────────────────────────────────────

function ThresholdModal({
  open,
  onOpenChange,
  label,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  value: number;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");

  function handleSave() {
    const n = Number(draft);
    if (isNaN(n) || n <= 0) {
      setError("Ingresá un número mayor a 0");
      return;
    }
    setError("");
    onSave(n);
    onOpenChange(false);
  }

  // Reset draft when value changes or modal opens
  function handleOpenChange(v: boolean) {
    if (v) {
      setDraft(String(value));
      setError("");
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar umbral — {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="threshold-input">Valor</Label>
          <Input
            id="threshold-input"
            type="number"
            step="0.1"
            min="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-component: Select modal (timezone / currency) ───────────────────────

function SelectModal({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  options: { value: string; label: string }[];
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  function handleOpenChange(v: boolean) {
    if (v) setDraft(value);
    onOpenChange(v);
  }

  function handleSave() {
    onSave(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Select value={draft} onValueChange={setDraft}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsClient({ email, preferences, systemSettings, schemaPending = false }: Props) {
  // Notification prefs
  const [prefs, setPrefs] = useState<Prefs>({
    emailNotifications: preferences.emailNotifications ?? true,
    whatsappNotifications: preferences.whatsappNotifications ?? false,
    telegramNotifications: preferences.telegramNotifications ?? false,
    weeklyReport: preferences.weeklyReport ?? true,
  });

  // System settings
  const [settings, setSettings] = useState<SystemSettings>({
    lossRoiThreshold: systemSettings.lossRoiThreshold,
    lowPerformanceRoiThreshold: systemSettings.lowPerformanceRoiThreshold,
    excellentRoiThreshold: systemSettings.excellentRoiThreshold,
    timezone: systemSettings.timezone,
    currency: systemSettings.currency,
  });

  // Modal state
  const [thresholdModal, setThresholdModal] = useState<{
    open: boolean;
    key: ThresholdKey;
    label: string;
  }>({ open: false, key: "lossRoiThreshold", label: "" });

  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  const [pending, start] = useTransition();

  const toggle = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const openThresholdModal = (key: ThresholdKey, label: string) =>
    setThresholdModal({ open: true, key, label });

  const saveThreshold = (key: ThresholdKey, value: number) =>
    setSettings((s) => ({ ...s, [key]: value }));

  // Display helpers
  const tzLabel = TIMEZONES.find((t) => t.value === settings.timezone)?.label ?? settings.timezone;
  const currLabel = CURRENCIES.find((c) => c.value === settings.currency)?.label ?? settings.currency;

  const thresholds: { key: ThresholdKey; label: string; desc: string; color: string; prefix: string }[] = [
    {
      key: "lossRoiThreshold",
      label: "Alerta de pérdida",
      desc: "Cuando el ROI baja de este nivel",
      color: "text-rose-600",
      prefix: "Menor a $",
    },
    {
      key: "lowPerformanceRoiThreshold",
      label: "Alerta de bajo rendimiento",
      desc: "ROI que consideramos bajo pero positivo",
      color: "text-amber-600",
      prefix: "Menor a $",
    },
    {
      key: "excellentRoiThreshold",
      label: "Notificar excelente rendimiento",
      desc: "Cuando un canal supera este ROI",
      color: "text-emerald-600",
      prefix: "Mayor a $",
    },
  ];

  const thresholdMetricInfo: Record<ThresholdKey, string> = {
    lossRoiThreshold:
      "Recibís una alerta CRITICAL cuando el ROI de un canal cae por debajo de este valor.",
    lowPerformanceRoiThreshold:
      "Recibís una alerta WARN cuando el ROI está entre $1 y este valor — ganás pero podrías hacerlo mejor.",
    excellentRoiThreshold:
      "Recibís una notificación positiva cuando un canal supera este ROI — para saber dónde poner más presupuesto.",
  };

  const save = () => {
    start(async () => {
      const [prefsRes, settingsRes] = await Promise.all([
        fetch("/api/users/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        }),
        fetch("/api/system-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }),
      ]);

      const prefsOk = prefsRes.ok;
      const settingsOk = settingsRes.ok;

      if (!prefsOk) {
        const data = await prefsRes.json().catch(() => null);
        if (data?.error === "schema_pending") {
          toast.error("Falta migrar el schema. Corré `npm run db:push` y reintentá.");
        } else {
          toast.error("No se pudieron guardar las preferencias");
        }
        return;
      }

      if (!settingsOk) {
        const data = await settingsRes.json().catch(() => null);
        if (data?.error === "schema_pending") {
          toast.error("SystemSettings no migrado aún. Corré `npm run db:push` y reintentá.");
        } else if (data?.error === "Forbidden") {
          toast.error("No tenés permisos para cambiar los umbrales del sistema.");
        } else {
          toast.error("No se pudieron guardar los ajustes del sistema");
        }
        return;
      }

      toast.success("Cambios guardados");
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground mt-1">
          Configurá tus preferencias de notificaciones y alertas
        </p>
      </div>

      {schemaPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">⚠ Migración pendiente</p>
          <p>
            El schema todavía no fue migrado a la base de datos. Podés ver y tocar los controles, pero los cambios no
            se van a guardar hasta que se aplique la migración (
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run db:push</code>).
          </p>
        </div>
      )}

      {/* Notifications card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Notificaciones</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Elegí cómo querés recibir las alertas
          </p>
        </div>
        <div className="divide-y divide-border">
          {(
            [
              {
                key: "emailNotifications" as const,
                icon: Mail,
                label: "Email",
                desc: "Recibí alertas importantes en tu casilla",
              },
              {
                key: "whatsappNotifications" as const,
                icon: MessageSquare,
                label: "WhatsApp",
                desc: "Notificaciones por WhatsApp Business",
              },
              {
                key: "telegramNotifications" as const,
                icon: Send,
                label: "Telegram",
                desc: "Alertas al bot de Telegram conectado",
              },
              {
                key: "weeklyReport" as const,
                icon: BellRing,
                label: "Reporte semanal",
                desc: "Resumen del rendimiento cada lunes",
              },
            ] as const
          ).map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center gap-4 px-6 py-4">
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-muted shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={!!prefs[key]}
                onCheckedChange={() => toggle(key)}
                aria-label={`Activar ${label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Alert thresholds card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            <h2 className="font-semibold">Umbrales de Alerta</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Definí cuándo querés recibir alertas
          </p>
        </div>
        <div className="divide-y divide-border">
          {thresholds.map(({ key, label, desc, color, prefix }) => (
            <div key={key} className="flex items-center gap-3 px-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium">{label}</p>
                  <MetricInfo content={thresholdMetricInfo[key]} />
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${color}`}>
                {prefix}{settings[key].toFixed(2)}
              </span>
              <button
                onClick={() => openThresholdModal(key, label)}
                className="ml-1 text-xs text-primary hover:underline flex items-center gap-1"
                aria-label={`Editar ${label}`}
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* My account card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Mi Cuenta</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Información de la cuenta
          </p>
        </div>
        <div className="divide-y divide-border">
          {/* Email — read-only */}
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Email</p>
              <p className="text-sm font-medium mt-0.5">{email}</p>
            </div>
          </div>

          {/* Timezone — editable */}
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Zona horaria</p>
              <p className="text-sm font-medium mt-0.5">{tzLabel}</p>
            </div>
            <button
              onClick={() => setTimezoneModalOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              Cambiar
            </button>
          </div>

          {/* Currency — editable */}
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Moneda</p>
              <p className="text-sm font-medium mt-0.5">{currLabel}</p>
            </div>
            <button
              onClick={() => setCurrencyModalOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} className="min-w-[140px]">
          {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar cambios
        </Button>
      </div>

      {/* Threshold modal */}
      <ThresholdModal
        open={thresholdModal.open}
        onOpenChange={(v) => setThresholdModal((s) => ({ ...s, open: v }))}
        label={thresholdModal.label}
        value={settings[thresholdModal.key]}
        onSave={(v) => saveThreshold(thresholdModal.key, v)}
      />

      {/* Timezone modal */}
      <SelectModal
        open={timezoneModalOpen}
        onOpenChange={setTimezoneModalOpen}
        title="Cambiar zona horaria"
        options={TIMEZONES}
        value={settings.timezone}
        onSave={(v) => setSettings((s) => ({ ...s, timezone: v }))}
      />

      {/* Currency modal */}
      <SelectModal
        open={currencyModalOpen}
        onOpenChange={setCurrencyModalOpen}
        title="Cambiar moneda"
        options={CURRENCIES}
        value={settings.currency}
        onSave={(v) => setSettings((s) => ({ ...s, currency: v }))}
      />
    </div>
  );
}

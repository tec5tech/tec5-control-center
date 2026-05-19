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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MetricInfo } from "@/components/ui/metric-info";

type Prefs = {
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  telegramNotifications?: boolean;
  weeklyReport?: boolean;
};

export function SettingsClient({
  email,
  preferences,
  schemaPending = false,
}: {
  email: string;
  preferences: Prefs;
  schemaPending?: boolean;
}) {
  const [prefs, setPrefs] = useState<Prefs>({
    emailNotifications: preferences.emailNotifications ?? true,
    whatsappNotifications: preferences.whatsappNotifications ?? false,
    telegramNotifications: preferences.telegramNotifications ?? false,
    weeklyReport: preferences.weeklyReport ?? true,
  });
  const [pending, start] = useTransition();

  const toggle = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const save = () => {
    start(async () => {
      const res = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error === "schema_pending") {
          toast.error("Falta migrar el schema. Corré `npm run db:push` y reintentá.");
        } else {
          toast.error("No se pudo guardar");
        }
        return;
      }
      toast.success("Preferencias guardadas");
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
            La columna <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">preferencesJson</code> todavía no fue
            creada en la base de datos. Podés ver y tocar los switches, pero no se van a guardar hasta que se aplique
            la migración (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run db:push</code>).
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
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium">Alerta de pérdida</p>
                <MetricInfo content="Recibís una alerta CRITICAL cuando el ROI de un canal cae por debajo de este valor." />
              </div>
              <p className="text-xs text-muted-foreground">
                Cuando el ROI baja de este nivel
              </p>
            </div>
            <span className="text-sm font-semibold text-rose-600 tabular-nums">
              Menor a $1.00
            </span>
          </div>
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium">Alerta de bajo rendimiento</p>
                <MetricInfo content="Recibís una alerta WARN cuando el ROI está entre $1 y este valor — ganás pero podrías hacerlo mejor." />
              </div>
              <p className="text-xs text-muted-foreground">
                ROI que consideramos bajo pero positivo
              </p>
            </div>
            <span className="text-sm font-semibold text-amber-600 tabular-nums">
              Menor a $2.00
            </span>
          </div>
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium">Notificar excelente rendimiento</p>
                <MetricInfo content="Recibís una notificación positiva cuando un canal supera este ROI — para saber dónde poner más presupuesto." />
              </div>
              <p className="text-xs text-muted-foreground">
                Cuando un canal supera este ROI
              </p>
            </div>
            <span className="text-sm font-semibold text-emerald-600 tabular-nums">
              Mayor a $3.00
            </span>
          </div>
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
          {[
            { label: "Email", value: email },
            { label: "Zona horaria", value: "América/Buenos_Aires (GMT-3)" },
            { label: "Moneda", value: "ARS (Peso argentino)" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
              <button className="text-xs text-primary hover:underline">
                Cambiar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} className="min-w-[140px]">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

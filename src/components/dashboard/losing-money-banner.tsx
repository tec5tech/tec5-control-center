import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function LosingMoneyBanner({
  hasLosingChannels,
}: {
  hasLosingChannels: boolean;
}) {
  if (!hasLosingChannels) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5">
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-rose-100 shrink-0">
        <AlertTriangle className="h-5 w-5 text-rose-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground">
          Atención: Hay canales perdiendo dinero
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revisá las alertas para ver qué acciones tomar
        </p>
      </div>
      <Link
        href="/dashboard/activity"
        className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:text-rose-700"
      >
        Ver alertas
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

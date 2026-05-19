import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function LosingMoneyBanner({
  hasLosingChannels,
}: {
  hasLosingChannels: boolean;
}) {
  if (!hasLosingChannels) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-amber-200 flex-1">
        Hay canales perdiendo dinero. Revisá las alertas para ver qué acciones tomar.
      </p>
      <Link
        href="/dashboard/activity"
        className="shrink-0 font-medium text-amber-400 underline-offset-2 hover:underline"
      >
        Ver alertas
      </Link>
    </div>
  );
}

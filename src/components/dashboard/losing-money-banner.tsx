import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function LosingMoneyBanner({
  hasLosingChannels,
}: {
  hasLosingChannels: boolean;
}) {
  if (!hasLosingChannels) return null;

  return (
    <Link
      href="/dashboard/activity"
      className="w-full flex items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-4 hover:bg-destructive/15 transition-colors text-left"
    >
      <div className="grid place-items-center h-12 w-12 rounded-full bg-destructive/20 shrink-0">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-destructive">
          Atención: Hay canales perdiendo dinero
        </p>
        <p className="text-sm text-destructive/80 mt-0.5">
          Revisá las alertas para ver qué acciones tomar
        </p>
      </div>
      <ArrowRight className="h-5 w-5 text-destructive shrink-0" />
    </Link>
  );
}

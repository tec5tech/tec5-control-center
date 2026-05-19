import Link from "next/link";
import { TrendingDown } from "lucide-react";

export function LosingMoneyBanner({
  hasLosingChannels,
}: {
  hasLosingChannels: boolean;
}) {
  if (!hasLosingChannels) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3.5 text-sm">
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-rose-500/20 shrink-0">
        <TrendingDown className="h-5 w-5 text-rose-500" />
      </div>
      <p className="flex-1 text-rose-700 dark:text-rose-300 font-medium">
        Hay canales perdiendo dinero.{" "}
        <span className="font-normal opacity-80">
          Revisá las alertas para ver qué acciones tomar.
        </span>
      </p>
      <Link
        href="/dashboard/activity"
        className="shrink-0 font-semibold text-rose-600 dark:text-rose-400 underline-offset-2 hover:underline"
      >
        Ver actividad →
      </Link>
    </div>
  );
}

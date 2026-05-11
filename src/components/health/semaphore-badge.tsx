import { CheckCircle2, AlertTriangle, AlertOctagon, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SemaphoreColor } from "@/lib/health";
import { semaphoreClasses } from "@/lib/health";

const ICONS: Record<SemaphoreColor, React.ComponentType<{ className?: string }>> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: AlertOctagon,
  neutral: MinusCircle,
};

export function SemaphoreBadge({
  color,
  label,
  score,
  size = "md",
  className,
}: {
  color: SemaphoreColor;
  label?: string;
  score?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cls = semaphoreClasses(color);
  const Icon = ICONS[color];

  const sizeCls =
    size === "sm" ? "text-xs px-2 py-0.5 gap-1"
    : size === "lg" ? "text-sm px-3 py-1.5 gap-2"
    : "text-xs px-2.5 py-1 gap-1.5";

  const iconSize = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full ring-1 font-medium",
        cls.bg,
        cls.text,
        cls.ring,
        sizeCls,
        className,
      )}
    >
      <Icon className={iconSize} />
      <span>{label ?? colorLabel(color)}</span>
      {typeof score === "number" && (
        <span className="opacity-70 tabular-nums">{score}</span>
      )}
    </span>
  );
}

function colorLabel(c: SemaphoreColor) {
  switch (c) {
    case "green": return "Saludable";
    case "amber": return "Atención";
    case "red": return "Crítico";
    default: return "Sin datos";
  }
}

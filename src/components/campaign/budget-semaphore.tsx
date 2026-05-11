// Semáforo de saldo: muestra cuánto se gastó del presupuesto con color.
// Lógica:
//   < 70%   → verde   (saludable)
//   70-89%  → amarillo (atención)
//   90-99%  → ámbar/naranja (al límite)
//   ≥ 100%  → rojo    (excedido)
//   spend = 0 con budget > 0 → neutral (sin uso)
//   sin budget → neutral
//
// Render compacto: barra horizontal + % + dot. Pensado para celda de tabla.

import { cn } from "@/lib/utils";

export type BudgetTone = "green" | "amber" | "orange" | "red" | "neutral";

export function getBudgetTone(spend: number, budget: number): { tone: BudgetTone; pct: number } {
  if (!budget || budget <= 0) return { tone: "neutral", pct: 0 };
  const pct = (spend / budget) * 100;
  if (spend <= 0) return { tone: "neutral", pct: 0 };
  if (pct >= 100) return { tone: "red", pct };
  if (pct >= 90) return { tone: "orange", pct };
  if (pct >= 70) return { tone: "amber", pct };
  return { tone: "green", pct };
}

const TONE_CLS: Record<BudgetTone, { dot: string; bar: string; text: string }> = {
  green:   { dot: "bg-emerald-500", bar: "bg-emerald-500",  text: "text-emerald-600 dark:text-emerald-400" },
  amber:   { dot: "bg-amber-500",   bar: "bg-amber-500",    text: "text-amber-600 dark:text-amber-400" },
  orange:  { dot: "bg-orange-500",  bar: "bg-orange-500",   text: "text-orange-600 dark:text-orange-400" },
  red:     { dot: "bg-rose-500",    bar: "bg-rose-500",     text: "text-rose-600 dark:text-rose-400" },
  neutral: { dot: "bg-muted-foreground", bar: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

export function BudgetSemaphore({
  spend,
  budget,
  size = "md",
  className,
}: {
  spend: number;
  budget: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const { tone, pct } = getBudgetTone(spend, budget);
  const cls = TONE_CLS[tone];
  const widthPct = Math.max(0, Math.min(100, pct));
  const showOver = pct > 100;

  const barH = size === "sm" ? "h-1" : "h-1.5";
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  // Tooltip-like label
  const label =
    !budget || budget <= 0 ? "Sin presupuesto"
    : spend <= 0           ? "Sin uso"
    : showOver             ? `Excedido +${(pct - 100).toFixed(0)}%`
    : `${pct.toFixed(0)}% del saldo`;

  return (
    <div className={cn("flex items-center gap-2 min-w-[140px]", className)} title={label}>
      <span className={cn("rounded-full shrink-0", dotSize, cls.dot)} />
      <div className="flex-1 min-w-[80px]">
        <div className={cn("rounded-full bg-muted overflow-hidden", barH)}>
          <div
            className={cn("h-full rounded-full transition-all", cls.bar)}
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </div>
      <span className={cn("tabular-nums text-xs font-medium shrink-0", cls.text)}>
        {!budget || budget <= 0 ? "—" : showOver ? `+${(pct - 100).toFixed(0)}%` : `${pct.toFixed(0)}%`}
      </span>
    </div>
  );
}

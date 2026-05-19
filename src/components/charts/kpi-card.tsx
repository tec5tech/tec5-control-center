import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tooltip,
  valueClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="p-5 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground truncate">
              {label}
            </p>
            {tooltip && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="¿Cómo se calcula?"
                      className="inline-flex shrink-0 text-muted-foreground/60 transition-colors hover:text-primary"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-[220px] leading-snug">
                    <p className="font-medium mb-1">¿Cómo se calcula?</p>
                    <p className="text-muted-foreground leading-relaxed">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={cn("text-2xl font-semibold tabular-nums", valueClassName)}>
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div className="grid place-items-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

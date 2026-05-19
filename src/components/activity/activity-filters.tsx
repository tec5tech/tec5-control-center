"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "all", label: "Todas", icon: ListFilter },
  { key: "critical", label: "Acción urgente", icon: AlertTriangle, color: "text-rose-600" },
  { key: "warn", label: "Para revisar", icon: AlertTriangle, color: "text-amber-600" },
  { key: "ok", label: "Funcionando bien", icon: CheckCircle2, color: "text-emerald-600" },
] as const;

export function ActivityFilters({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("severity");
    } else {
      params.set("severity", key);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const Icon = f.icon;
        const isActive = active === f.key || (f.key === "all" && !active);
        return (
          <Button
            key={f.key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(f.key)}
            className="gap-2"
          >
            <Icon className={`h-3.5 w-3.5 ${!isActive && "color" in f ? f.color : ""}`} />
            {f.label}
          </Button>
        );
      })}
    </div>
  );
}

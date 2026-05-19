"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "create", label: "Creaciones" },
  { key: "update", label: "Updates" },
  { key: "delete", label: "Eliminaciones" },
];

export function ActivityFilters({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("filter");
    } else {
      params.set("filter", key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Button
          key={f.key}
          variant={active === f.key || (f.key === "all" && !active) ? "default" : "outline"}
          size="sm"
          onClick={() => handleClick(f.key)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}

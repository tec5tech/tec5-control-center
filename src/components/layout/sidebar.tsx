"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Bell,
  Plug,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { Role } from "@/types/db";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  showBadge?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Resumen",    href: "/dashboard",               icon: LayoutDashboard },
  { label: "Campañas",  href: "/dashboard/campaigns",      icon: Megaphone },
  { label: "Alertas",   href: "/dashboard/activity",       icon: Bell, showBadge: true },
  { label: "Conexiones",href: "/dashboard/integrations",   icon: Plug,   roles: ["ADMIN", "MANAGER"] },
  { label: "Ajustes",   href: "/dashboard/settings",       icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({
  role,
  unreadAlerts = 0,
  lastSyncIso,
}: {
  role: Role;
  unreadAlerts?: number;
  lastSyncIso?: string | null;
}) {
  const pathname = usePathname();

  const canSee = (item: NavItem) => !item.roles || item.roles.includes(role);

  const lastSyncLabel = (() => {
    if (!lastSyncIso) return null;
    const diff = Date.now() - new Date(lastSyncIso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Hace un momento";
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    return `Hace ${Math.floor(hrs / 24)} días`;
  })();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
        <div className="grid place-items-center h-9 w-9 rounded-lg bg-slate-900 shrink-0">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-bold text-sm tracking-tight truncate">Mi Inversión</p>
          <p className="text-[11px] text-muted-foreground truncate">Panel de Marketing</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.filter(canSee).map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.showBadge && unreadAlerts > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-slate-900 text-white font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge && (
                <span className="grid place-items-center h-5 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white tabular-nums">
                  {unreadAlerts > 99 ? "99+" : unreadAlerts}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {lastSyncLabel && (
        <div className="m-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
            Última actualización
          </p>
          <p className="text-xs text-foreground font-medium">{lastSyncLabel}</p>
        </div>
      )}
    </aside>
  );
}

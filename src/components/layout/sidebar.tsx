"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Settings,
  Activity,
  Gauge,
  Plug,
  Bell,
} from "lucide-react";
import type { Role, Channel } from "@/types/db";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/brand-mark";
import { ChannelIcon } from "@/components/brand/channel-icon";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  channel?: Channel;
  roles?: Role[];
};

const primary: NavItem[] = [
  { label: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { label: "KPIs", href: "/dashboard/kpis", icon: Gauge },
  { label: "Campañas", href: "/dashboard/campaigns", icon: Target },
  { label: "Alertas", href: "/dashboard/activity", icon: Bell },
];

const channels: NavItem[] = [
  { label: "Google Ads",  href: "/dashboard/google-ads", icon: LayoutDashboard, channel: "GOOGLE_ADS" },
  { label: "Meta Ads",    href: "/dashboard/meta-ads",   icon: LayoutDashboard, channel: "META_ADS" },
  { label: "YouTube Ads", href: "/dashboard/yt-ads",     icon: LayoutDashboard, channel: "YT_ADS" },
  { label: "SEO",         href: "/dashboard/seo",        icon: LayoutDashboard, channel: "SEO" },
  { label: "GEO",         href: "/dashboard/geo",        icon: LayoutDashboard, channel: "GEO" },
  { label: "Email frío",  href: "/dashboard/email",      icon: LayoutDashboard, channel: "EMAIL_OUTREACH" },
  { label: "LinkedIn",    href: "/dashboard/linkedin",   icon: LayoutDashboard, channel: "LINKEDIN_OUTREACH" },
  { label: "Podcast",     href: "/dashboard/podcast",    icon: LayoutDashboard, channel: "PODCAST" },
  { label: "Webinars",    href: "/dashboard/webinars",   icon: LayoutDashboard, channel: "WEBINAR" },
];

const secondary: NavItem[] = [
  { label: "Conexiones", href: "/dashboard/integrations", icon: Plug, roles: ["ADMIN", "MANAGER"] },
  { label: "Actividad", href: "/dashboard/activity", icon: Activity, roles: ["ADMIN", "MANAGER"] },
  { label: "Ajustes", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({
  role,
  unreadAlerts = 0,
}: {
  role: Role;
  unreadAlerts?: number;
}) {
  const pathname = usePathname();

  const canSee = (item: NavItem) => !item.roles || item.roles.includes(role);

  const renderLink = (item: NavItem) => {
    const active =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href);
    const Icon = item.icon;
    const showBadge = item.href === "/dashboard/activity" && unreadAlerts > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm border border-transparent transition-colors",
          active
            ? "bg-primary/10 text-primary border-primary/30 font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="grid place-items-center h-4 w-4 shrink-0">
          {item.channel ? (
            <ChannelIcon channel={item.channel} size={16} />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </span>
        <span className="flex-1">{item.label}</span>
        {showBadge && (
          <span className="ml-auto grid place-items-center h-4 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {unreadAlerts > 99 ? "99+" : unreadAlerts}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <BrandMark size={32} />
        <div className="leading-tight">
          <p className="font-semibold tracking-tight">Tec5<span className="text-primary">.Tech</span></p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Panel Campañas</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <div className="space-y-1">{primary.map(renderLink)}</div>

        <div>
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Canales
          </p>
          <div className="space-y-1">{channels.map(renderLink)}</div>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Sistema
          </p>
          <div className="space-y-1">{secondary.filter(canSee).map(renderLink)}</div>
        </div>
      </nav>

      <div className="m-3 rounded-xl border border-border p-3 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Rol actual: <span className="font-semibold text-foreground">{role}</span>
        </p>
      </div>
    </aside>
  );
}

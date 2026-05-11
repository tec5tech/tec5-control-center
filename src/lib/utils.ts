import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number | string, currency = "ARS") {
  const num = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(n: number | string) {
  const num = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("es-AR").format(num);
}

export function formatPercent(n: number | string, digits = 1) {
  const num = typeof n === "string" ? Number(n) : n;
  return `${num.toFixed(digits)}%`;
}

export function channelLabel(ch: string) {
  const m: Record<string, string> = {
    GOOGLE_ADS: "Google Ads",
    META_ADS: "Meta Ads",
    YT_ADS: "YouTube Ads",
    SEO: "SEO",
    GEO: "GEO",
    EMAIL_OUTREACH: "Email frío",
    LINKEDIN_OUTREACH: "LinkedIn",
    PODCAST: "Podcast",
    WEBINAR: "Webinars",
  };
  return m[ch] ?? ch;
}

export function statusLabel(s: string) {
  const m: Record<string, string> = {
    DRAFT: "Borrador",
    ACTIVE: "Activa",
    PAUSED: "Pausada",
    ENDED: "Finalizada",
  };
  return m[s] ?? s;
}

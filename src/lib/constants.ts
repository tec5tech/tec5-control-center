import type { Channel } from "@/types/db";

// Paleta Tec5 — rojos y grises.
// Los canales se diferencian por intensidad/tono dentro del rango rojo/gris,
// no por colores aleatorios.
export const CHANNELS: {
  key: Channel;
  slug: string;
  label: string;
  tagline: string;
  hex: string;
}[] = [
  { key: "GOOGLE_ADS",        slug: "google-ads", label: "Google Ads",   tagline: "Búsquedas · Display",            hex: "#d62828" },
  { key: "META_ADS",          slug: "meta-ads",   label: "Meta Ads",     tagline: "Facebook · Instagram",           hex: "#b91c1c" },
  { key: "YT_ADS",            slug: "yt-ads",     label: "YouTube Ads",  tagline: "Pre-roll · In-stream",           hex: "#ef4444" },
  { key: "SEO",               slug: "seo",        label: "SEO",          tagline: "Posicionamiento orgánico",       hex: "#6b7280" },
  { key: "GEO",               slug: "geo",        label: "GEO",          tagline: "Optimización para IA",           hex: "#9ca3af" },
  { key: "EMAIL_OUTREACH",    slug: "email",      label: "Email frío",   tagline: "Prospección por email",          hex: "#f97373" },
  { key: "LINKEDIN_OUTREACH", slug: "linkedin",   label: "LinkedIn",     tagline: "Prospección por mensajes",       hex: "#4b5563" },
  { key: "PODCAST",           slug: "podcast",    label: "Podcast",      tagline: "YouTube · Spotify · Instagram",  hex: "#a61e1e" },
  { key: "WEBINAR",           slug: "webinars",   label: "Webinars",     tagline: "Eventos en vivo",                hex: "#374151" },
];

export const channelBySlug = (slug: string) => CHANNELS.find((c) => c.slug === slug);

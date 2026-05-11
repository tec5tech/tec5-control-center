// SQLite no soporta enums nativos; definimos uniones reutilizables en la app.
// Si migrás a Postgres y usás enums Prisma, podés reemplazar estas uniones
// por imports desde `@prisma/client`.

export type Role = "ADMIN" | "MANAGER" | "VIEWER";

export type Channel =
  | "GOOGLE_ADS"
  | "META_ADS"
  | "YT_ADS"
  | "SEO"
  | "GEO"
  | "EMAIL_OUTREACH"
  | "LINKEDIN_OUTREACH"
  | "PODCAST"
  | "WEBINAR";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";

export type KpiUnit = "NUMBER" | "PERCENT" | "CURRENCY" | "RATIO" | "DURATION";

export type KpiDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

export const CHANNEL_VALUES: Channel[] = [
  "GOOGLE_ADS",
  "META_ADS",
  "YT_ADS",
  "SEO",
  "GEO",
  "EMAIL_OUTREACH",
  "LINKEDIN_OUTREACH",
  "PODCAST",
  "WEBINAR",
];

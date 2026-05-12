import type { Channel } from "@/types/db";

export type IntegrationField = {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "email";
  placeholder?: string;
  help?: string;
  optional?: boolean;
};

export type IntegrationSpec = {
  channel: Channel;
  label: string;
  description: string;
  docsUrl: string;
  fields: IntegrationField[];
};

export const INTEGRATIONS: Record<Channel, IntegrationSpec> = {
  GOOGLE_ADS: {
    channel: "GOOGLE_ADS",
    label: "Google Ads",
    description: "Conectá tu cuenta de Google Ads para traer impresiones, clicks y conversiones.",
    docsUrl: "https://developers.google.com/google-ads/api/docs/first-call/overview",
    fields: [
      { key: "developerToken",   label: "Developer Token",    type: "password", help: "Obtenelo en tu MCC de Google Ads → API Center." },
      { key: "clientId",         label: "OAuth Client ID",    type: "text",     placeholder: "xxxxx.apps.googleusercontent.com" },
      { key: "clientSecret",     label: "OAuth Client Secret",type: "password" },
      { key: "refreshToken",     label: "Refresh Token",      type: "password", help: "Generalo con el OAuth Playground usando scope adwords." },
      { key: "customerId",       label: "Customer ID",        type: "text",     placeholder: "123-456-7890" },
      { key: "loginCustomerId",  label: "Login Customer ID (MCC)", type: "text", placeholder: "123-456-7890", optional: true },
    ],
  },
  META_ADS: {
    channel: "META_ADS",
    label: "Meta Ads (Facebook + Instagram)",
    description: "Conectá el Business Manager para traer métricas de Facebook e Instagram Ads.",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis/overview",
    fields: [
      { key: "appId",         label: "App ID",             type: "text" },
      { key: "appSecret",     label: "App Secret",         type: "password" },
      { key: "accessToken",   label: "System User Access Token", type: "password", help: "Usá un System User con permiso ads_read." },
      { key: "adAccountId",   label: "Ad Account ID",      type: "text",     placeholder: "act_1234567890" },
    ],
  },
  YT_ADS: {
    channel: "YT_ADS",
    label: "YouTube Ads",
    description: "YouTube Ads corre sobre Google Ads. Usamos las mismas credenciales pero para la campaña de video.",
    docsUrl: "https://developers.google.com/google-ads/api/docs/campaigns/video-campaigns",
    fields: [
      { key: "developerToken", label: "Developer Token",   type: "password" },
      { key: "refreshToken",   label: "Refresh Token",     type: "password" },
      { key: "customerId",     label: "Customer ID",       type: "text", placeholder: "123-456-7890" },
      { key: "youtubeChannelId", label: "Canal de YouTube (opcional)", type: "text", placeholder: "UCxxxxxx", optional: true, help: "Para correlacionar con views orgánicas." },
    ],
  },
  SEO: {
    channel: "SEO",
    label: "SEO (Google Search Console + GA4)",
    description: "Traé queries, impresiones y clicks orgánicos desde Search Console y sesiones desde GA4.",
    docsUrl: "https://developers.google.com/webmaster-tools/v1/api_reference_index",
    fields: [
      { key: "siteUrl",          label: "URL del sitio verificada", type: "url", placeholder: "https://tec5.tech/" },
      { key: "serviceAccountJson", label: "Service Account JSON", type: "password", help: "Pegá el JSON completo de la service account con acceso al site." },
      { key: "ga4PropertyId",    label: "GA4 Property ID",          type: "text", placeholder: "properties/123456789", optional: true },
    ],
  },
  GEO: {
    channel: "GEO",
    label: "GEO (optimización para motores de IA)",
    description: "Tracking de menciones y citaciones en Claude, ChatGPT y Perplexity. Te dice cuándo la IA te recomienda y cuándo no.",
    docsUrl: "https://docs.anthropic.com/en/api/messages",
    fields: [
      { key: "anthropicApiKey",  label: "Anthropic API Key", type: "password", placeholder: "sk-ant-api03-...", help: "Obtenela en console.anthropic.com/settings/keys. Modelo usado: claude-haiku-4-5 (cheap)." },
      { key: "openaiApiKey",     label: "OpenAI API Key (opcional)",    type: "password", placeholder: "sk-...", help: "Si la tenés, sumamos ChatGPT al monitoreo.", optional: true },
      { key: "perplexityApiKey", label: "Perplexity API Key (opcional)", type: "password", optional: true },
      { key: "brandNames",       label: "Variantes del nombre de marca a detectar", type: "text", placeholder: "Tec5, Tec5.Tech, tec5tech, tec5.tech", help: "Separadas por coma. Detección case-insensitive." },
      { key: "targetQueries",    label: "Queries a monitorear", type: "text", placeholder: "Mejor proveedor IT en Argentina | Empresas de ciberseguridad Fortinet en CABA | ...", help: "Separadas por pipe (|). Cada query se le pregunta a la IA y vemos si te menciona." },
    ],
  },
  EMAIL_OUTREACH: {
    channel: "EMAIL_OUTREACH",
    label: "Email frío (Prospección)",
    description: "Conectá tu herramienta de outbound para traer entregas, aperturas y respuestas.",
    docsUrl: "https://developers.instantly.ai/",
    fields: [
      { key: "provider",   label: "Proveedor",  type: "text", placeholder: "instantly | smartlead | lemlist | mailgun" },
      { key: "apiKey",     label: "API Key",    type: "password" },
      { key: "workspaceId", label: "Workspace / Account ID", type: "text", optional: true },
      { key: "fromEmail",  label: "Email remitente", type: "email", placeholder: "ventas@tec5.tech", optional: true },
    ],
  },
  LINKEDIN_OUTREACH: {
    channel: "LINKEDIN_OUTREACH",
    label: "LinkedIn (Prospección)",
    description: "Conectá tu herramienta de automatización para traer invitaciones, respuestas y reuniones agendadas.",
    docsUrl: "https://docs.heyreach.io/",
    fields: [
      { key: "provider", label: "Proveedor",  type: "text", placeholder: "heyreach | expandi | waalaxy" },
      { key: "apiKey",   label: "API Key",    type: "password" },
      { key: "campaignIds", label: "IDs de campaña (opcional, separados por coma)", type: "text", optional: true },
    ],
  },
  PODCAST: {
    channel: "PODCAST",
    label: "Podcast (YouTube + Spotify + Instagram)",
    description: "Conectá las plataformas donde publicamos el podcast para traer reproducciones y retención.",
    docsUrl: "https://developer.spotify.com/documentation/web-api",
    fields: [
      { key: "youtubeApiKey",     label: "YouTube Data API Key",        type: "password" },
      { key: "youtubeChannelId",  label: "Channel ID de YouTube",       type: "text",     placeholder: "UCxxxxxxxx" },
      { key: "spotifyClientId",   label: "Spotify Client ID",            type: "text",     optional: true },
      { key: "spotifyClientSecret",label: "Spotify Client Secret",       type: "password", optional: true },
      { key: "spotifyShowId",     label: "Spotify Show ID",              type: "text",     optional: true },
      { key: "instagramUserId",   label: "Instagram Business User ID",   type: "text",     optional: true },
      { key: "instagramToken",    label: "Instagram Access Token",       type: "password", optional: true },
    ],
  },
  WEBINAR: {
    channel: "WEBINAR",
    label: "Webinars",
    description: "Conectá la plataforma de webinars para traer registrados, asistentes y tasa de show-up.",
    docsUrl: "https://developers.zoom.us/docs/api/",
    fields: [
      { key: "provider",   label: "Proveedor",     type: "text", placeholder: "zoom | livestorm | webinarjam | demio" },
      { key: "accountId",  label: "Account ID",    type: "text" },
      { key: "clientId",   label: "Client ID",     type: "text" },
      { key: "clientSecret", label: "Client Secret", type: "password" },
    ],
  },
};

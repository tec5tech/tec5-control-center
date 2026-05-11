import type { Channel } from "@/types/db";

// Etiquetas + tooltips por canal. Cada tooltip explica con palabras simples
// y precisas cómo se calcula esa métrica para ese canal en particular —
// pensado para un equipo de marketing junior.

export type ChannelKpiLabels = {
  // Labels visibles
  impressions: string;
  clicks: string;
  leads: string;
  cost: string;
  costPerLead: string;

  // Tooltips: explicación de la fórmula
  impressionsTooltip: string;
  clicksTooltip: string;
  leadsTooltip: string;
  costTooltip: string;
  costPerLeadTooltip: string;

  // Otras
  primarySingular: string;
  primaryPlural: string;
  trendTitleLeads: string;
  trendTitleClicks: string;
  costChartTitle: string;
};

const DEFAULT: ChannelKpiLabels = {
  impressions: "Impresiones",
  clicks: "Clicks",
  leads: "Leads",
  cost: "Inversión",
  costPerLead: "Costo por lead",

  impressionsTooltip: "Cantidad de veces que se mostró un anuncio en pantalla.",
  clicksTooltip: "Cantidad de clicks que recibieron los anuncios.",
  leadsTooltip: "Cantidad de personas que se convirtieron en lead.",
  costTooltip: "Total invertido en este canal en el período.",
  costPerLeadTooltip: "Inversión total dividida por la cantidad de leads.",

  primarySingular: "lead",
  primaryPlural: "leads",
  trendTitleLeads: "Leads por día",
  trendTitleClicks: "Clicks por día",
  costChartTitle: "Inversión por día",
};

const PER_CHANNEL: Partial<Record<Channel, Partial<ChannelKpiLabels>>> = {
  GOOGLE_ADS: {
    impressionsTooltip:
      "Suma de metrics.impressions de la Google Ads API: cuántas veces se mostró un anuncio en búsquedas, Display o YouTube. Una persona puede generar múltiples impresiones.",
    clicksTooltip:
      "Suma de metrics.clicks de la Google Ads API: clicks reales en los anuncios (filtra clicks inválidos automáticamente).",
    leadsTooltip:
      "Suma de metrics.conversions de la Google Ads API. Cuenta TODAS las conversiones configuradas en tu cuenta (formularios, llamadas, compras, descargas, etc.). Si querés solo formularios, hay que filtrar por tipo de conversión específico — pedímelo si lo necesitás.",
    costTooltip:
      "Suma de metrics.cost_micros / 1.000.000. Google Ads reporta el costo en 'micros' (millonésimas de la moneda); lo convertimos a ARS reales.",
    costPerLeadTooltip: "Inversión total / cantidad de conversiones. Si no hubo conversiones, mostramos '—'.",
  },
  META_ADS: {
    impressionsTooltip:
      "Suma de impressions de la Insights API de Meta: cuántas veces se mostró el anuncio en feeds de Facebook e Instagram, Reels, Stories, Audience Network, etc.",
    clicksTooltip:
      "Suma de clicks (general clicks) de Insights — incluye clicks en el anuncio en cualquier elemento, no solo links salientes.",
    leadsTooltip:
      "Suma de actions[type='lead'] + actions[type='complete_registration'] de Insights API. 'lead' viene de Lead Ads (formularios nativos) y 'complete_registration' del evento del Pixel. Excluimos otros tipos para no doble-contar.",
    costTooltip:
      "Suma de spend de Insights API, en la moneda de la cuenta (ARS). Meta entrega este valor ya con decimales (no en centavos).",
    costPerLeadTooltip: "Inversión total / leads. Si no hubo leads, mostramos '—'.",
  },
  YT_ADS: {
    impressionsTooltip: "Veces que el anuncio de video apareció (impressions de Google Ads filtradas a campañas de tipo VIDEO).",
    clicksTooltip: "Clicks en el anuncio de video o en los CTAs.",
    leadsTooltip: "Conversiones reportadas por Google Ads para campañas de YouTube.",
    costTooltip: "Inversión en YouTube Ads (cost_micros / 1.000.000).",
    costPerLeadTooltip: "Inversión / conversiones.",
  },
  SEO: {
    impressions: "Impresiones SERP",
    clicks: "Clicks orgánicos",
    leads: "Conversiones",
    costPerLead: "Costo por conversión",
    trendTitleClicks: "Clicks orgánicos por día",
    impressionsTooltip:
      "Cantidad de veces que el sitio apareció en resultados de Google (Search Console: impressions). NO requiere inversión publicitaria.",
    clicksTooltip:
      "Clicks reales recibidos desde Google a tu sitio (Search Console: clicks).",
    leadsTooltip: "Conversiones registradas en GA4 de tráfico orgánico. Se setea en la integración.",
    costTooltip: "El SEO no tiene inversión por canal directo; típicamente se prorratea costo de equipo/agencia (no lo trackeamos automáticamente).",
    costPerLeadTooltip: "Costo de equipo SEO / conversiones orgánicas. Hay que cargar el costo manual.",
  },
  GEO: {
    impressions: "Consultas trackeadas",
    clicks: "Menciones de marca",
    leads: "Citaciones con link",
    costPerLead: "Costo por mención",
    primarySingular: "mención",
    primaryPlural: "menciones",
    trendTitleLeads: "Menciones por día",
    trendTitleClicks: "Citaciones por día",
    impressionsTooltip:
      "Cantidad de prompts/queries que ejecutamos contra ChatGPT, Claude y Perplexity para detectar menciones (configurable en Integraciones → GEO).",
    clicksTooltip:
      "Veces que la marca Tec5.Tech apareció en la respuesta de la IA, contadas case-insensitive con detección de variantes.",
    leadsTooltip:
      "Citaciones donde la IA incluyó un link al sitio (más alto valor que solo nombrar la marca).",
    costTooltip: "Inversión en API calls a OpenAI + Anthropic + Perplexity para el monitoreo (se calcula con tu costo por token).",
    costPerLeadTooltip: "Costo de las queries / cantidad de menciones obtenidas.",
  },
  EMAIL_OUTREACH: {
    impressions: "Enviados",
    clicks: "Aperturas",
    leads: "Interesados",
    cost: "Inversión",
    costPerLead: "Costo por interesado",
    primarySingular: "interesado",
    primaryPlural: "interesados",
    trendTitleLeads: "Interesados por día",
    trendTitleClicks: "Aperturas por día",
    impressionsTooltip:
      "Eventos type='emailsSent' del feed de actividades de Lemlist en los últimos 90 días: cantidad real de emails enviados (descuenta los que rebotaron en el envío).",
    clicksTooltip:
      "Eventos type='emailsOpened' (más type='emailsClicked' si hay links). Indica que el destinatario abrió el email — la métrica de engagement más común en outbound.",
    leadsTooltip:
      "Eventos type='emailsInterested': respuestas marcadas como 'Interested' (manualmente por el SDR o automáticamente por la IA de Lemlist). Es el lead calificado.",
    costTooltip:
      "Lemlist es fee fijo mensual (no se trackea por campaña). Por eso aparece '—'. Si querés cargar el costo del plan dividido entre las campañas activas, decímelo.",
    costPerLeadTooltip: "Sin costo por campaña no se puede calcular. Lemlist es flat fee.",
  },
  LINKEDIN_OUTREACH: {
    impressions: "Toques (invites + DM)",
    clicks: "Perfiles visitados",
    leads: "Conexiones aceptadas",
    cost: "Inversión",
    costPerLead: "Costo por conexión",
    primarySingular: "conexión",
    primaryPlural: "conexiones",
    trendTitleLeads: "Conexiones aceptadas por día",
    trendTitleClicks: "Visitas a perfiles por día",
    impressionsTooltip:
      "Eventos type='linkedinInviteDone' + type='linkedinSent' (DMs) de Lemlist. Total de toques iniciados hacia prospects (invitaciones de conexión + mensajes directos a contactos ya conectados).",
    clicksTooltip:
      "Eventos type='linkedinVisitDone': cantidad de veces que automatizamos una visita al perfil del prospect (paso previo a contactar — aumenta la tasa de aceptación).",
    leadsTooltip:
      "Eventos type='linkedinInviteAccepted': prospects que aceptaron la invitación de conexión. Acá empieza el lead — sin esto no se puede mensajear directamente.",
    costTooltip:
      "Lemlist + LinkedIn Sales Navigator son flat fee — no se trackea por campaña. Aparece '—'.",
    costPerLeadTooltip: "Sin costo por campaña no se calcula. Suma del fee de Lemlist + Sales Nav, prorrateable manual.",
  },
  PODCAST: {
    impressions: "Reproducciones",
    clicks: "Engagements",
    leads: "Suscriptores nuevos",
    costPerLead: "Costo por suscriptor",
    primarySingular: "suscriptor",
    primaryPlural: "suscriptores",
    trendTitleLeads: "Suscriptores por día",
    trendTitleClicks: "Engagements por día",
    impressionsTooltip:
      "Suma de views de YouTube + plays de Spotify + Reels en Instagram (configurar API keys de cada plataforma en Integraciones).",
    clicksTooltip: "Likes, comentarios, shares y saves del contenido del podcast.",
    leadsTooltip: "Nuevos suscriptores netos del período (subs ganados - perdidos).",
    costTooltip: "Costo de producción del podcast (manual): edición, hosting, music licensing, etc.",
    costPerLeadTooltip: "Costo de producción / suscriptores nuevos.",
  },
  WEBINAR: {
    impressions: "Registrados",
    clicks: "Asistentes",
    leads: "Leads calificados",
    costPerLead: "Costo por lead calificado",
    trendTitleLeads: "Leads calificados por día",
    trendTitleClicks: "Asistentes por día",
    impressionsTooltip:
      "Cantidad de personas que se registraron al webinar (Zoom/Livestorm/etc API). Es el universo total que mostró interés.",
    clicksTooltip:
      "De los registrados, cuántos efectivamente entraron al webinar en vivo. La 'tasa de show-up' es asistentes / registrados.",
    leadsTooltip:
      "Asistentes que cumplieron criterios de calificación (ej: se quedaron >70% del tiempo, hicieron al menos 1 pregunta, descargaron el material).",
    costTooltip:
      "Costo de la plataforma + producción + tiempo del speaker. Se carga manual o se prorratea según el plan.",
    costPerLeadTooltip: "Costo total del webinar / leads calificados generados.",
  },
};

export function getChannelLabels(channel: Channel): ChannelKpiLabels {
  return { ...DEFAULT, ...(PER_CHANNEL[channel] ?? {}) };
}

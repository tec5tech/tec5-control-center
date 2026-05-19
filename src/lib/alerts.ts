// Motor de alertas. Lo más importante de este módulo:
// - Es idempotente: no dispara la misma alerta dos veces para el mismo evento.
// - Mensajes pensados para un dueño de empresa, no un marketer técnico.
// - Soporta 5 tipos de alerta: saldo (overrun/leftover), leads nuevos,
//   mejor campaña del período, y acciones a realizar (KPI rojo, gasto sin leads).

import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/constants";
import { channelLabel } from "@/lib/utils";
import type { Channel } from "@/types/db";

export type AlertSeverity = "INFO" | "OK" | "WARN" | "CRITICAL";
export type AlertType =
  | "BUDGET_OVERRUN"
  | "BUDGET_LEFTOVER"
  | "BUDGET_PACE"
  | "NEW_LEAD"
  | "TOP_CAMPAIGN"
  | "ACTION_NEEDED"
  | "CAMPAIGN_PAUSED";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

// Crea un alert event si no existe ya uno equivalente reciente.
// "Equivalente" = mismo type + channel + campaignId en las últimas N horas.
async function emit(opts: {
  type: AlertType;
  severity: AlertSeverity;
  channel?: Channel | null;
  campaignId?: string | null;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  cooldownHours?: number; // por defecto 12h — evita spam
}) {
  const cooldown = opts.cooldownHours ?? 12;
  const since = new Date(Date.now() - cooldown * 3600 * 1000);

  const recent = await prisma.alertEvent.findFirst({
    where: {
      type: opts.type,
      channel: opts.channel ?? null,
      campaignId: opts.campaignId ?? null,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return null;

  const event = await prisma.alertEvent.create({
    data: {
      type: opts.type,
      severity: opts.severity,
      channel: opts.channel ?? null,
      campaignId: opts.campaignId ?? null,
      title: opts.title,
      message: opts.message,
      payloadJson: opts.payload ? JSON.stringify(opts.payload) : null,
    },
  });

  // Best-effort: enviar a Telegram (no bloquea)
  void sendTelegramFanout(event.id).catch((e) => {
    console.error("[alerts] telegram fanout failed", e);
  });
  return event;
}

// === Reglas concretas =======================================================

// 1) Saldo: overrun (gasto > 100% budget) y pace adelantado (>110% del esperado)
async function evaluateBudgets() {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE", budget: { gt: 0 } },
  });

  for (const c of campaigns) {
    const used = c.budget > 0 ? (c.spend / c.budget) * 100 : 0;

    if (used >= 100) {
      await emit({
        type: "BUDGET_OVERRUN",
        severity: "CRITICAL",
        channel: c.channel as Channel,
        campaignId: c.id,
        title: `Saldo agotado · ${c.name}`,
        message: `La campaña "${c.name}" (${channelLabel(c.channel as Channel)}) consumió ${used.toFixed(0)}% de su presupuesto (${fmtMoney(c.spend)} de ${fmtMoney(c.budget)}). Considerá pausarla o subir el budget.`,
        payload: { spend: c.spend, budget: c.budget, used },
        cooldownHours: 24,
      });
    } else if (used >= 90) {
      await emit({
        type: "BUDGET_PACE",
        severity: "WARN",
        channel: c.channel as Channel,
        campaignId: c.id,
        title: `Saldo casi al límite · ${c.name}`,
        message: `"${c.name}" ya consumió el ${used.toFixed(0)}% del presupuesto (${fmtMoney(c.spend)} de ${fmtMoney(c.budget)}). Va a vencer pronto.`,
        cooldownHours: 24,
      });
    }
  }

  // Saldo sobrante: campañas FINALIZADAS o cuya endDate pasó con <70% gastado
  const ended = await prisma.campaign.findMany({
    where: {
      OR: [
        { status: "ENDED" },
        { AND: [{ endDate: { lt: new Date() } }, { status: { in: ["ACTIVE", "PAUSED"] } }] },
      ],
      budget: { gt: 0 },
    },
  });

  for (const c of ended) {
    const used = c.budget > 0 ? (c.spend / c.budget) * 100 : 0;
    if (used < 70) {
      const leftover = c.budget - c.spend;
      await emit({
        type: "BUDGET_LEFTOVER",
        severity: "WARN",
        channel: c.channel as Channel,
        campaignId: c.id,
        title: `Saldo sobrante · ${c.name}`,
        message: `"${c.name}" terminó con ${fmtMoney(leftover)} sin usar (${(100 - used).toFixed(0)}% del presupuesto). Reasignar a la campaña que mejor está rindiendo.`,
        payload: { leftover, used },
        cooldownHours: 72,
      });
    }
  }
}

// 2) Nuevos leads — busca snapshots con leads creados en las últimas 6h
async function evaluateNewLeads() {
  const since = new Date(Date.now() - 6 * 3600 * 1000);
  const snapshots = await prisma.metricSnapshot.findMany({
    where: { createdAt: { gte: since }, leads: { gt: 0 } },
    include: { campaign: true },
    orderBy: { createdAt: "desc" },
  });

  // Agrupar por canal/campaña
  const byCampaign = new Map<string, { leads: number; campaign: typeof snapshots[number]["campaign"] }>();
  for (const s of snapshots) {
    const k = s.campaignId;
    const prev = byCampaign.get(k) ?? { leads: 0, campaign: s.campaign };
    prev.leads += s.leads;
    byCampaign.set(k, prev);
  }

  for (const [campaignId, { leads, campaign }] of byCampaign) {
    if (leads <= 0) continue;
    const plural = leads === 1 ? "lead" : "leads";
    const verb = leads === 1 ? "Entró" : "Entraron";
    await emit({
      type: "NEW_LEAD",
      severity: "INFO",
      channel: campaign.channel as Channel,
      campaignId,
      title: `${verb} ${leads} ${plural} nuevo${leads === 1 ? "" : "s"}`,
      message: `${verb} ${leads} ${plural} desde "${campaign.name}" (${channelLabel(campaign.channel as Channel)}).`,
      payload: { leads, campaignName: campaign.name },
      cooldownHours: 1, // reagrupa cada hora
    });
  }
}

// 3) Mejor campaña del período (últimos 7 días) por canal
async function evaluateTopCampaigns() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  for (const ch of CHANNELS) {
    const snapshots = await prisma.metricSnapshot.findMany({
      where: { date: { gte: since }, campaign: { channel: ch.key } },
      include: { campaign: true },
    });
    if (snapshots.length === 0) continue;

    const tally = new Map<string, { leads: number; revenue: number; cost: number; name: string }>();
    for (const s of snapshots) {
      const k = s.campaignId;
      const prev = tally.get(k) ?? { leads: 0, revenue: 0, cost: 0, name: s.campaign.name };
      prev.leads += s.leads;
      prev.revenue += s.revenue;
      prev.cost += s.cost;
      tally.set(k, prev);
    }
    const ranked = Array.from(tally.entries())
      .map(([id, v]) => ({ id, ...v, roi: v.cost > 0 ? v.revenue / v.cost : null }))
      .filter((c) => c.leads > 0 || (c.roi !== null && c.roi > 0))
      .sort((a, b) => (b.leads !== a.leads ? b.leads - a.leads : (b.roi ?? 0) - (a.roi ?? 0)));

    const top = ranked[0];
    if (!top) continue;

    const roiTxt = top.roi !== null ? ` · ROI ${top.roi.toFixed(1)}x` : "";
    await emit({
      type: "TOP_CAMPAIGN",
      severity: "OK",
      channel: ch.key,
      campaignId: top.id,
      title: `Mejor de la semana en ${ch.label}`,
      message: `"${top.name}" trajo ${fmtNum(top.leads)} leads${roiTxt}. Considerá subirle el presupuesto.`,
      payload: { leads: top.leads, roi: top.roi, name: top.name },
      cooldownHours: 7 * 24, // una vez por semana por canal
    });
  }
}

// 4) Acciones a realizar:
//    - Campañas activas con costo > $X y 0 leads en 7 días → pausar
//    - KPIs en rojo (<60% del objetivo, dirección "más mejor")
async function evaluateActions() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // 4.a Campañas que gastan sin leads (últimos 7 días)
  const active = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
    include: {
      metrics: { where: { date: { gte: since } } },
    },
  });
  for (const c of active) {
    const cost7d = c.metrics.reduce((a, m) => a + m.cost, 0);
    const leads7d = c.metrics.reduce((a, m) => a + m.leads, 0);
    if (cost7d >= 100 && leads7d === 0) {
      await emit({
        type: "ACTION_NEEDED",
        severity: "WARN",
        channel: c.channel as Channel,
        campaignId: c.id,
        title: `Pausar "${c.name}"`,
        message: `Gastó ${fmtMoney(cost7d)} en 7 días sin generar leads. Pausala o revisá la audiencia.`,
        payload: { cost7d, leads7d },
        cooldownHours: 48,
      });
    }
  }

  // 4.b KPIs en rojo
  const kpis = await prisma.kpi.findMany();
  for (const k of kpis) {
    const target = k.target;
    const current = k.current;
    if (target <= 0) continue;
    const pct =
      k.direction === "HIGHER_IS_BETTER"
        ? (current / target) * 100
        : (target / Math.max(current, 0.0001)) * 100;
    if (pct < 60) {
      await emit({
        type: "ACTION_NEEDED",
        severity: "CRITICAL",
        channel: (k.channel as Channel | null) ?? null,
        campaignId: null,
        title: `KPI en rojo · ${k.name}`,
        message: `"${k.name}" está en ${pct.toFixed(0)}% del objetivo (${fmtNum(current)} de ${fmtNum(target)}). Revisar las campañas relacionadas.`,
        payload: { pct, current, target, kpiId: k.id },
        cooldownHours: 24,
      });
    }
  }
}

// === Punto de entrada ======================================================

export async function evaluateAlerts() {
  await evaluateBudgets();
  await evaluateNewLeads();
  await evaluateTopCampaigns();
  await evaluateActions();
}

// === Telegram fanout =======================================================

async function sendTelegramFanout(eventId: string) {
  const cfg = await prisma.telegramConfig.findUnique({ where: { id: "default" } });
  if (!cfg || !cfg.enabled || !cfg.botToken) return;

  const event = await prisma.alertEvent.findUnique({ where: { id: eventId } });
  if (!event) return;

  const subs = await prisma.telegramSubscriber.findMany({
    where: { enabled: true, chatId: { not: null } },
  });

  // Render del mensaje enriquecido
  const { text, replyMarkup } = renderTelegramMessage(event);

  for (const sub of subs) {
    if (!sub.chatId) continue;

    // Filtros del suscriptor (canal y tipo)
    let channels: string[] = [];
    let alerts: string[] = [];
    try { channels = JSON.parse(sub.channelsJson); } catch {}
    try { alerts = JSON.parse(sub.alertsJson); } catch {}
    if (channels.length > 0 && event.channel && !channels.includes(event.channel)) continue;
    if (alerts.length > 0 && !alerts.includes(event.type)) continue;

    try {
      await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: sub.chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        }),
      });
    } catch (e) {
      console.error("[alerts] sendMessage failed for", sub.chatId, e);
    }
  }

  await prisma.alertEvent.update({
    where: { id: eventId },
    data: { telegramSent: true },
  });
}

const severityEmoji: Record<AlertSeverity, string> = {
  INFO: "🔵",
  OK: "🟢",
  WARN: "🟡",
  CRITICAL: "🔴",
};

const typeEmoji: Record<AlertType, string> = {
  BUDGET_OVERRUN: "💸",
  BUDGET_LEFTOVER: "💰",
  BUDGET_PACE: "⏱️",
  NEW_LEAD: "🎯",
  TOP_CAMPAIGN: "🏆",
  ACTION_NEEDED: "⚠️",
  CAMPAIGN_PAUSED: "⏸️",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

type AlertEventPartial = {
  type: string;
  severity: string;
  title: string;
  message: string;
  channel: string | null;
  campaignId: string | null;
  payloadJson: string | null;
};

const typeRecommendation: Record<AlertType, string> = {
  BUDGET_OVERRUN: "→ Pausá la campaña o subí el presupuesto",
  BUDGET_LEFTOVER: "→ Reasigná el saldo a la campaña que mejor rinde",
  BUDGET_PACE: "→ El budget va a vencer pronto — chequeá pacing",
  NEW_LEAD: "→ Hacé seguimiento al lead",
  TOP_CAMPAIGN: "→ Considerá subirle el presupuesto",
  ACTION_NEEDED: "→ Acción requerida — revisá la campaña/KPI",
  CAMPAIGN_PAUSED: "→ Revisá por qué se pausó",
};

function buildKeyData(payload: Record<string, unknown>): string[] {
  const lines: string[] = [];

  if (typeof payload.spend === "number" && typeof payload.budget === "number") {
    const pct = payload.budget > 0 ? ((payload.spend / payload.budget) * 100).toFixed(0) : "0";
    lines.push(`💸 Gastado: ${fmtMoney(payload.spend)} / ${fmtMoney(payload.budget)} (${pct}%)`);
  }

  if (typeof payload.leads === "number") {
    lines.push(`🎯 Leads: ${fmtNum(payload.leads)}`);
  }

  if (typeof payload.roi === "number") {
    lines.push(`📈 ROI: $${payload.roi.toFixed(2)} por cada $1`);
  }

  if (typeof payload.cost7d === "number" && typeof payload.leads7d === "number") {
    lines.push(`📊 7 días: ${fmtMoney(payload.cost7d)} gastado · ${fmtNum(payload.leads7d)} leads`);
  }

  if (typeof payload.leftover === "number") {
    lines.push(`💰 Sin usar: ${fmtMoney(payload.leftover)}`);
  }

  if (
    typeof payload.pct === "number" &&
    typeof payload.current === "number" &&
    typeof payload.target === "number"
  ) {
    lines.push(
      `📉 Progreso KPI: ${payload.pct.toFixed(0)}% (${fmtNum(payload.current)} / ${fmtNum(payload.target)})`,
    );
  }

  return lines;
}

function renderTelegramMessage(e: AlertEventPartial): { text: string; replyMarkup: object } {
  const sev = (e.severity as AlertSeverity) ?? "INFO";
  const t = (e.type as AlertType) ?? "ACTION_NEEDED";

  // 1. Header
  const head = `${typeEmoji[t] ?? "📣"} ${severityEmoji[sev] ?? ""} <b>${escapeHtml(e.title)}</b>`;

  // 2. Context line: channel label + campaign hint
  const chLabel = e.channel ? channelLabel(e.channel as Channel) : null;
  const contextParts: string[] = [];
  if (chLabel) contextParts.push(escapeHtml(chLabel));
  // No campaignId label available without extra query — skip campaign name here (already in message)
  const contextLine = contextParts.length > 0 ? `<i>${contextParts.join(" · ")}</i>` : "";

  // 3. Main message
  const mainMsg = escapeHtml(e.message);

  // 4. Key data block
  let keyDataBlock = "";
  if (e.payloadJson) {
    try {
      const payload = JSON.parse(e.payloadJson) as Record<string, unknown>;
      const lines = buildKeyData(payload);
      if (lines.length > 0) {
        keyDataBlock = `\n\n📊 <b>Datos clave</b>\n${lines.join("\n")}`;
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // 5. Recommendation
  const rec = typeRecommendation[t] ?? "→ Revisá el portal para más detalles";
  const recBlock = `\n\n💡 <b>Recomendación</b>\n${rec}`;

  // 6. Dashboard URL
  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, "") ?? "https://controlcenter.tec5.ar";
  const channelSlug = e.channel
    ? (CHANNELS.find((c) => c.key === e.channel)?.slug ?? null)
    : null;
  const dashboardUrl = channelSlug
    ? `${baseUrl}/dashboard/${channelSlug}`
    : `${baseUrl}/dashboard`;

  // 7. Footer
  const footer = `<i>Tec5.Tech · Control Center</i>`;

  const parts: string[] = [head];
  if (contextLine) parts.push(contextLine);
  parts.push(""); // blank line before message
  parts.push(mainMsg);

  const text =
    parts.join("\n") +
    keyDataBlock +
    recBlock +
    "\n\n" +
    footer;

  const replyMarkup = {
    inline_keyboard: [[{ text: "🔗 Abrir en el portal", url: dashboardUrl }]],
  };

  return { text, replyMarkup };
}

// Helper público: reenviar un evento manualmente (botón "test").
export async function sendTelegramTest(chatId: string, botToken: string) {
  const text =
    "✅ <b>Bot conectado</b>\n\nEste chat ya está vinculado al Control Center de Tec5.Tech. Vas a recibir alertas de saldos, nuevos leads y campañas que requieran tu atención.";
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram error: ${res.status} ${errBody}`);
  }
}

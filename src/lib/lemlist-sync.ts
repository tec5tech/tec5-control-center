import { prisma } from "@/lib/db";

const API_BASE = "https://api.lemlist.com/api";

type LemlistCampaign = {
  _id: string;
  name: string;
  status: string; // running | paused | ended | archived
  createdAt: string;
};

type LemlistStats = {
  leadTotal?: number;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  repliedCount?: number;
  interestedCount?: number;
  bouncedCount?: number;
};

type LemlistActivity = {
  _id: string;
  type: string;
  createdAt: string;
  campaignId: string;
  leadId?: string;
};

function authHeaders(apiKey: string): HeadersInit {
  // Basic auth con usuario vacío y password = apiKey (lo confirmamos por curl).
  const b64 = Buffer.from(`:${apiKey}`).toString("base64");
  return { Authorization: `Basic ${b64}` };
}

async function lemlistFetch<T>(path: string, apiKey: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders(apiKey) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Lemlist ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Lemlist devolvió no-JSON: ${text.slice(0, 200)}`);
  }
}

function mapStatus(s: string): "ACTIVE" | "PAUSED" | "ENDED" | "DRAFT" {
  switch (s) {
    case "running":
      return "ACTIVE";
    case "paused":
      return "PAUSED";
    case "ended":
    case "archived":
      return "ENDED";
    default:
      return "DRAFT";
  }
}

export type LemlistSyncResult = {
  campaigns: number;
  snapshots: number;
  activities: number;
  totals: {
    sent: number;
    opened: number;
    replied: number;
    interested: number;
  };
  accountName: string;
};

const HISTORY_DAYS = 90;

export async function syncEmailLemlist(actorId?: string): Promise<LemlistSyncResult> {
  const integ = await prisma.integration.findUnique({
    where: { channel: "EMAIL_OUTREACH" },
  });
  if (!integ) throw new Error("Email frío no está configurado");

  const creds = (() => {
    try {
      return JSON.parse(integ.credentialsJson) as { provider?: string; apiKey?: string };
    } catch {
      throw new Error("Credenciales corruptas — reconfigurar la integración");
    }
  })();

  const provider = (creds.provider ?? "").toLowerCase();
  if (provider && provider !== "lemlist") {
    throw new Error(`Sync de Email sólo implementado para Lemlist por ahora (provider actual: ${provider})`);
  }
  const apiKey = creds.apiKey;
  if (!apiKey) throw new Error("Falta apiKey de Lemlist");

  try {
    // 0) Equipo (para el nombre)
    const team = await lemlistFetch<{ name?: string }>("/team", apiKey).catch(() => ({}));
    const accountName = `Lemlist · ${team.name ?? "Cuenta"}`;

    // 1) Campañas
    const campaigns = await lemlistFetch<LemlistCampaign[]>("/campaigns", apiKey);

    // 2) Stats lifetime por campaña — sumamos para totales globales
    const today = new Date().toISOString().slice(0, 10);
    const earliest = "2023-01-01";
    const statsByCampaign = new Map<string, LemlistStats>();
    const totals = { sent: 0, opened: 0, replied: 0, interested: 0 };
    for (const c of campaigns) {
      try {
        const s = await lemlistFetch<LemlistStats>(
          `/campaigns/${c._id}/stats?startDate=${earliest}&endDate=${today}`,
          apiKey,
        );
        statsByCampaign.set(c._id, s);
        totals.sent += s.sentCount ?? 0;
        totals.opened += s.openedCount ?? 0;
        totals.replied += s.repliedCount ?? 0;
        totals.interested += s.interestedCount ?? 0;
      } catch {
        // ignoramos fallos por campaña — seguimos con las que funcionan
      }
    }

    // 3) Activities últimos 90 días → para gráfico diario
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - HISTORY_DAYS);
    const startIso = startDate.toISOString().slice(0, 10);

    const activities: LemlistActivity[] = [];
    let offset = 0;
    const PAGE = 100;
    let safety = 500; // hasta 50.000 eventos
    while (safety-- > 0) {
      const url =
        `/activities?startDate=${startIso}&endDate=${today}` +
        `&limit=${PAGE}&offset=${offset}`;
      const page = await lemlistFetch<LemlistActivity[]>(url, apiKey);
      if (!Array.isArray(page) || page.length === 0) break;
      activities.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    // 4) Reemplazo total: borramos las campañas Email previas (cascade snapshots)
    await prisma.campaign.deleteMany({ where: { channel: "EMAIL_OUTREACH" } });

    // 5) Insert campañas reales
    const idMap = new Map<string, string>(); // lemlistId → localId
    for (const c of campaigns) {
      const localId = `lemlist-${c._id}`;
      const stats = statsByCampaign.get(c._id);
      await prisma.campaign.create({
        data: {
          id: localId,
          name: c.name,
          channel: "EMAIL_OUTREACH",
          status: mapStatus(c.status),
          objective: "Outbound prospecting",
          audience: stats?.leadTotal ? `${stats.leadTotal} leads en la base` : null,
          budget: 0,
          spend: 0,
          startDate: c.createdAt ? new Date(c.createdAt) : null,
          tagsJson: JSON.stringify(["lemlist", "real"]),
          ownerId: actorId ?? null,
        },
      });
      idMap.set(c._id, localId);
    }

    // 6) Bucket de actividades por (campaña, día, tipo)
    type DayAgg = {
      sent: number;
      opened: number;
      clicked: number;
      replied: number;
      interested: number;
      bounced: number;
    };
    const buckets = new Map<string, DayAgg>(); // key = `${campaignId}|${YYYY-MM-DD}`
    function bump(campaignId: string, day: string, key: keyof DayAgg) {
      const k = `${campaignId}|${day}`;
      const v =
        buckets.get(k) ??
        { sent: 0, opened: 0, clicked: 0, replied: 0, interested: 0, bounced: 0 };
      v[key]++;
      buckets.set(k, v);
    }

    for (const a of activities) {
      const day = a.createdAt.slice(0, 10);
      switch (a.type) {
        case "emailsSent":        bump(a.campaignId, day, "sent");       break;
        case "emailsOpened":      bump(a.campaignId, day, "opened");     break;
        case "emailsClicked":     bump(a.campaignId, day, "clicked");    break;
        case "emailsReplied":     bump(a.campaignId, day, "replied");    break;
        case "emailsInterested":  bump(a.campaignId, day, "interested"); break;
        case "emailsBounced":     bump(a.campaignId, day, "bounced");    break;
      }
    }

    // 7) Snapshots
    let snapshotCount = 0;
    for (const [key, agg] of buckets) {
      const [campaignId, day] = key.split("|");
      const localId = idMap.get(campaignId);
      if (!localId) continue;
      const date = new Date(`${day}T00:00:00.000Z`);
      // Para email outbound, "clicks" del dashboard = aperturas (señal de
      // engagement principal). Si una campaña tiene clicks en links los
      // sumamos también como engagement reforzado.
      const engagement = agg.opened + agg.clicked;
      await prisma.metricSnapshot.upsert({
        where: { campaignId_date: { campaignId: localId, date } },
        update: {
          impressions: agg.sent,
          clicks: engagement,
          leads: agg.interested,
          conversions: agg.replied,
          cost: 0,
          revenue: 0,
          extraJson: JSON.stringify({
            opened: agg.opened,
            clicked: agg.clicked,
            bounced: agg.bounced,
          }),
        },
        create: {
          campaignId: localId,
          date,
          impressions: agg.sent,
          clicks: engagement,
          leads: agg.interested,
          conversions: agg.replied,
          cost: 0,
          revenue: 0,
          extraJson: JSON.stringify({
            opened: agg.opened,
            clicked: agg.clicked,
            bounced: agg.bounced,
          }),
        },
      });
      snapshotCount++;
    }

    // 8) Marcar integración OK
    await prisma.integration.update({
      where: { channel: "EMAIL_OUTREACH" },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastError: null },
    });

    return {
      campaigns: campaigns.length,
      snapshots: snapshotCount,
      activities: activities.length,
      totals,
      accountName,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.integration.update({
      where: { channel: "EMAIL_OUTREACH" },
      data: { status: "ERROR", lastError: message },
    });
    throw e;
  }
}

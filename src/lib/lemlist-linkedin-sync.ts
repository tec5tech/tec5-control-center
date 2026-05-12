import { prisma } from "@/lib/db";

const API_BASE = "https://api.lemlist.com/api";

type LemlistCampaign = {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
};

type LemlistActivity = {
  _id: string;
  type: string;
  createdAt: string;
  campaignId: string;
};

function authHeaders(apiKey: string): HeadersInit {
  const b64 = Buffer.from(`:${apiKey}`).toString("base64");
  return { Authorization: `Basic ${b64}` };
}

async function lemlistFetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(apiKey) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Lemlist ${res.status}: ${text.slice(0, 300)}`);
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

// Busca creds de Lemlist primero en LINKEDIN_OUTREACH; si no, hace fallback
// a EMAIL_OUTREACH (porque la misma API key vale para ambos canales).
async function findLemlistCreds(): Promise<
  { apiKey: string; source: "LINKEDIN_OUTREACH" | "EMAIL_OUTREACH" } | null
> {
  for (const channel of ["LINKEDIN_OUTREACH", "EMAIL_OUTREACH"] as const) {
    const integ = await prisma.integration.findUnique({ where: { channel } });
    if (!integ) continue;
    try {
      const c = JSON.parse(integ.credentialsJson) as { provider?: string; apiKey?: string };
      if ((c.provider ?? "").toLowerCase() === "lemlist" && c.apiKey) {
        return { apiKey: c.apiKey, source: channel };
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

const HISTORY_DAYS = 90;

export type LinkedinSyncResult = {
  campaigns: number;
  snapshots: number;
  activities: number;
  totals: {
    inviteSent: number;
    dmSent: number;
    visited: number;
    accepted: number;
    replied: number;
    sendFailed: number;
  };
  source: string;
  accountName: string;
};

export async function syncLinkedinLemlist(actorId?: string): Promise<LinkedinSyncResult> {
  const found = await findLemlistCreds();
  if (!found) {
    throw new Error(
      "No hay credenciales de Lemlist disponibles. Configurá primero el canal Email frío con Lemlist y vuelvo a usar la misma key acá.",
    );
  }
  const { apiKey, source } = found;

  // Aseguramos que la integración LINKEDIN_OUTREACH exista (la creamos linkeada
  // a Lemlist si todavía no existe — sin pedirle nada nuevo al usuario).
  await prisma.integration.upsert({
    where: { channel: "LINKEDIN_OUTREACH" },
    update: { lastError: null },
    create: {
      channel: "LINKEDIN_OUTREACH",
      credentialsJson: JSON.stringify({ provider: "lemlist", apiKey, _sharedFrom: source }),
      status: "CONNECTED",
      updatedById: actorId ?? null,
    },
  });

  try {
    // 0) Equipo (para el accountName)
    const team: { name?: string } = await lemlistFetch<{ name?: string }>("/team", apiKey).catch(() => ({}));
    const accountName = `Lemlist · ${team.name ?? "Cuenta"}`;

    // 1) Lista de campañas (las mismas que email — algunas tendrán activity LinkedIn, otras no)
    const allCampaigns = await lemlistFetch<LemlistCampaign[]>("/campaigns", apiKey);

    // 2) Activities últimos 90 días
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - HISTORY_DAYS);
    const startIso = startDate.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const activities: LemlistActivity[] = [];
    let offset = 0;
    const PAGE = 100;
    let safety = 500;
    while (safety-- > 0) {
      const url = `/activities?startDate=${startIso}&endDate=${today}&limit=${PAGE}&offset=${offset}`;
      const page = await lemlistFetch<LemlistActivity[]>(url, apiKey);
      if (!Array.isArray(page) || page.length === 0) break;
      activities.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }

    // Filtramos a actividades de LinkedIn solamente
    const liActivities = activities.filter((a) => a.type?.startsWith("linkedin"));
    const liCampaignIds = new Set(liActivities.map((a) => a.campaignId));

    // 3) Solo creamos campañas que TUVIERON actividad de LinkedIn
    const liCampaigns = allCampaigns.filter((c) => liCampaignIds.has(c._id));

    // 4) Wipe + insert
    await prisma.campaign.deleteMany({ where: { channel: "LINKEDIN_OUTREACH" } });

    const idMap = new Map<string, string>();
    for (const c of liCampaigns) {
      const localId = `lemlist-li-${c._id}`;
      await prisma.campaign.create({
        data: {
          id: localId,
          name: c.name,
          channel: "LINKEDIN_OUTREACH",
          status: mapStatus(c.status),
          objective: "LinkedIn outreach",
          budget: 0,
          spend: 0,
          startDate: c.createdAt ? new Date(c.createdAt) : null,
          tagsJson: JSON.stringify(["lemlist", "linkedin", "real"]),
          ownerId: actorId ?? null,
        },
      });
      idMap.set(c._id, localId);
    }

    // 5) Bucket por (campaña, día, tipo)
    type DayAgg = {
      inviteSent: number;
      dmSent: number;
      visited: number;
      opened: number;
      accepted: number;
      replied: number;
      sendFailed: number;
    };
    const buckets = new Map<string, DayAgg>();
    function bump(campaignId: string, day: string, key: keyof DayAgg) {
      const k = `${campaignId}|${day}`;
      const v =
        buckets.get(k) ??
        { inviteSent: 0, dmSent: 0, visited: 0, opened: 0, accepted: 0, replied: 0, sendFailed: 0 };
      v[key]++;
      buckets.set(k, v);
    }

    const totals: LinkedinSyncResult["totals"] = {
      inviteSent: 0, dmSent: 0, visited: 0, accepted: 0, replied: 0, sendFailed: 0,
    };

    for (const a of liActivities) {
      const day = a.createdAt.slice(0, 10);
      switch (a.type) {
        case "linkedinInviteDone":     bump(a.campaignId, day, "inviteSent"); totals.inviteSent++; break;
        case "linkedinSent":           bump(a.campaignId, day, "dmSent");     totals.dmSent++;     break;
        case "linkedinVisitDone":      bump(a.campaignId, day, "visited");    totals.visited++;    break;
        case "linkedinOpened":         bump(a.campaignId, day, "opened");                          break;
        case "linkedinInviteAccepted": bump(a.campaignId, day, "accepted");   totals.accepted++;   break;
        case "linkedinReplied":        bump(a.campaignId, day, "replied");    totals.replied++;    break;
        case "linkedinSendFailed":
        case "linkedinInviteFailed":
        case "linkedinVisitFailed":    bump(a.campaignId, day, "sendFailed"); totals.sendFailed++; break;
      }
    }

    // 6) Insertamos snapshots
    let snapshotCount = 0;
    for (const [key, agg] of buckets) {
      const [campaignId, day] = key.split("|");
      const localId = idMap.get(campaignId);
      if (!localId) continue;
      const date = new Date(`${day}T00:00:00.000Z`);

      // Mapeo:
      // impressions = "toques" (invitaciones + DMs) — total de outreach
      // clicks = perfiles visitados (señal de engagement, paso previo)
      // leads = invitaciones aceptadas (=conexiones nuevas, lead calificado en LinkedIn)
      // conversions = respuestas reales (replies después de conectar)
      const touches = agg.inviteSent + agg.dmSent;
      const visited = agg.visited;
      const accepted = agg.accepted;
      const replied = agg.replied;

      await prisma.metricSnapshot.upsert({
        where: { campaignId_date: { campaignId: localId, date } },
        update: {
          impressions: touches,
          clicks: visited,
          leads: accepted,
          conversions: replied,
          cost: 0,
          revenue: 0,
          extraJson: JSON.stringify({
            inviteSent: agg.inviteSent,
            dmSent: agg.dmSent,
            opened: agg.opened,
            sendFailed: agg.sendFailed,
          }),
        },
        create: {
          campaignId: localId,
          date,
          impressions: touches,
          clicks: visited,
          leads: accepted,
          conversions: replied,
          cost: 0,
          revenue: 0,
          extraJson: JSON.stringify({
            inviteSent: agg.inviteSent,
            dmSent: agg.dmSent,
            opened: agg.opened,
            sendFailed: agg.sendFailed,
          }),
        },
      });
      snapshotCount++;
    }

    // 7) Marcar integración OK
    await prisma.integration.update({
      where: { channel: "LINKEDIN_OUTREACH" },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastError: null },
    });

    return {
      campaigns: liCampaigns.length,
      snapshots: snapshotCount,
      activities: liActivities.length,
      totals,
      source,
      accountName,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.integration.update({
      where: { channel: "LINKEDIN_OUTREACH" },
      data: { status: "ERROR", lastError: message },
    });
    throw e;
  }
}

import { prisma } from "@/lib/db";

const GRAPH = "https://graph.facebook.com/v21.0";

type MetaCampaign = {
  id: string;
  name: string;
  status: string; // ACTIVE | PAUSED | DELETED | ARCHIVED
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
};

type MetaAction = { action_type: string; value: string };

type MetaInsightRow = {
  campaign_id: string;
  campaign_name?: string;
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
};

type MetaCreds = {
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId: string;
};

async function fetchAllPages<T>(initialUrl: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = initialUrl;
  let safety = 50;
  while (next && safety-- > 0) {
    const res = await fetch(next);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`Meta API: ${msg}`);
    }
    if (Array.isArray(json.data)) out.push(...(json.data as T[]));
    next = json.paging?.next as string | undefined;
  }
  return out;
}

function mapStatus(s: string): "ACTIVE" | "PAUSED" | "ENDED" | "DRAFT" {
  switch (s) {
    case "ACTIVE":
      return "ACTIVE";
    case "PAUSED":
      return "PAUSED";
    case "DELETED":
    case "ARCHIVED":
      return "ENDED";
    default:
      return "DRAFT";
  }
}

// Suma acciones tipo lead. Meta tiene varios action_types que representan leads:
// "lead" (Lead Ads), "complete_registration" (form de registro).
// Excluimos "onsite_conversion.lead_grouped" para no doble-contar.
const LEAD_TYPES = new Set(["lead", "complete_registration"]);
function leadCount(actions?: MetaAction[]) {
  if (!actions) return 0;
  return actions
    .filter((a) => LEAD_TYPES.has(a.action_type))
    .reduce((s, a) => s + (Number(a.value) || 0), 0);
}

const PURCHASE_TYPES = new Set(["purchase", "omni_purchase"]);
function purchaseValue(actionValues?: MetaAction[]) {
  if (!actionValues) return 0;
  return actionValues
    .filter((a) => PURCHASE_TYPES.has(a.action_type))
    .reduce((s, a) => s + (Number(a.value) || 0), 0);
}

function purchaseCount(actions?: MetaAction[]) {
  if (!actions) return 0;
  return actions
    .filter((a) => PURCHASE_TYPES.has(a.action_type))
    .reduce((s, a) => s + (Number(a.value) || 0), 0);
}

// Meta devuelve daily_budget / lifetime_budget en unidades menores
// (centavos para ARS/USD/EUR; sin decimales para JPY/KRW).
// Para Argentina/USD asumimos /100. Si la cuenta usa otra moneda sin
// decimales, ajustar en producción según `account_currency`.
function budgetMajor(c: MetaCampaign) {
  const minor = Number(c.daily_budget) || Number(c.lifetime_budget) || 0;
  return minor / 100;
}

export type MetaSyncResult = {
  campaigns: number;
  snapshots: number;
  totalSpend: number;
  currency: string;
  accountName: string;
  range: string;
};

export type MetaSyncOptions = {
  // Meta date_preset: "last_30d" | "last_90d" | "maximum" | etc.
  range?: string;
};

export async function syncMetaAds(
  actorId?: string,
  opts: MetaSyncOptions = {},
): Promise<MetaSyncResult> {
  const integ = await prisma.integration.findUnique({
    where: { channel: "META_ADS" },
  });
  if (!integ) throw new Error("Meta Ads no está configurado todavía");

  const creds: MetaCreds = (() => {
    try {
      return JSON.parse(integ.credentialsJson);
    } catch {
      throw new Error("Credenciales corruptas — reconfigurar la integración");
    }
  })();

  const { accessToken, adAccountId } = creds;
  if (!accessToken || !adAccountId)
    throw new Error("Faltan accessToken o adAccountId");

  const tok = encodeURIComponent(accessToken);

  try {
    // 0) Info de cuenta (moneda + nombre)
    const accRes = await fetch(
      `${GRAPH}/${adAccountId}?fields=name,currency,timezone_name&access_token=${tok}`,
    );
    const accJson = await accRes.json().catch(() => ({}));
    if (!accRes.ok) {
      throw new Error(`Meta API (cuenta): ${accJson?.error?.message ?? accRes.status}`);
    }
    const currency: string = accJson.currency ?? "USD";
    const accountName: string = accJson.name ?? "Cuenta Meta";

    // 1) Campañas
    const campaignsUrl =
      `${GRAPH}/${adAccountId}/campaigns?` +
      `fields=id,name,status,objective,daily_budget,lifetime_budget` +
      `&limit=200&access_token=${tok}`;
    const campaigns = await fetchAllPages<MetaCampaign>(campaignsUrl);

    // 2) Insights diarios. Por defecto últimos 90 días — si no hay nada, hacemos
    //    fallback a histórico completo (`maximum`) para mostrar SIEMPRE datos reales.
    const buildInsightsUrl = (preset: string) =>
      `${GRAPH}/${adAccountId}/insights?` +
      `level=campaign&time_increment=1&date_preset=${preset}` +
      `&fields=campaign_id,campaign_name,date_start,spend,impressions,clicks,reach,actions,action_values` +
      `&limit=500&access_token=${tok}`;

    const requestedPreset = opts.range ?? "last_90d";
    let insights = await fetchAllPages<MetaInsightRow>(buildInsightsUrl(requestedPreset));
    let usedPreset = requestedPreset;
    if (insights.length === 0 && requestedPreset !== "maximum") {
      insights = await fetchAllPages<MetaInsightRow>(buildInsightsUrl("maximum"));
      usedPreset = "maximum";
    }

    // 3) Wipe full de las campañas META_ADS previas (cascade borra snapshots).
    //    Esto es un sync de reemplazo total — más simple y siempre correcto.
    await prisma.campaign.deleteMany({ where: { channel: "META_ADS" } });

    // 4) Insertar campañas reales
    const idMap = new Map<string, string>(); // metaId → localId
    for (const c of campaigns) {
      const localId = `meta-${c.id}`;
      await prisma.campaign.create({
        data: {
          id: localId,
          name: c.name,
          channel: "META_ADS",
          status: mapStatus(c.status),
          objective: c.objective ?? null,
          audience: null,
          budget: budgetMajor(c),
          spend: 0,
          tagsJson: JSON.stringify(["meta", "real", currency.toLowerCase()]),
          ownerId: actorId ?? null,
        },
      });
      idMap.set(c.id, localId);
    }

    // 5) Insights → MetricSnapshot
    const spendByCampaign = new Map<string, number>();
    let snapshotCount = 0;
    for (const row of insights) {
      const localId = idMap.get(row.campaign_id);
      if (!localId) continue;
      const date = new Date(row.date_start + "T00:00:00.000Z");
      const cost = Number(row.spend) || 0;
      const impressions = Number(row.impressions) || 0;
      const clicks = Number(row.clicks) || 0;
      const leads = leadCount(row.actions);
      const conversions = leads + purchaseCount(row.actions);
      const revenue = purchaseValue(row.action_values);

      await prisma.metricSnapshot.upsert({
        where: { campaignId_date: { campaignId: localId, date } },
        update: { cost, impressions, clicks, leads, conversions, revenue },
        create: {
          campaignId: localId,
          date,
          cost,
          impressions,
          clicks,
          leads,
          conversions,
          revenue,
        },
      });
      spendByCampaign.set(localId, (spendByCampaign.get(localId) ?? 0) + cost);
      snapshotCount++;
    }

    // 6) Totalizar spend por campaña
    for (const [localId, total] of spendByCampaign) {
      await prisma.campaign.update({
        where: { id: localId },
        data: { spend: total },
      });
    }

    // 7) Marcar integración como sana
    await prisma.integration.update({
      where: { channel: "META_ADS" },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastError: null },
    });

    const totalSpend = Array.from(spendByCampaign.values()).reduce(
      (a, b) => a + b,
      0,
    );

    return {
      campaigns: campaigns.length,
      snapshots: snapshotCount,
      totalSpend,
      currency,
      accountName,
      range: usedPreset,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.integration.update({
      where: { channel: "META_ADS" },
      data: { status: "ERROR", lastError: message },
    });
    throw e;
  }
}

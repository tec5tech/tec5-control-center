import { prisma } from "@/lib/db";

const API_VERSION = "v20";
const API_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type GoogleAdsCreds = {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId?: string;
};

type AdsBatch<T> = { results?: T[]; fieldMask?: string; requestId?: string };

async function getAccessToken(creds: GoogleAdsCreds): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(
      `OAuth refresh falló (${res.status}): ${json.error_description ?? json.error ?? "unknown"}`,
    );
  }
  return json.access_token as string;
}

function adsHeaders(creds: GoogleAdsCreds, accessToken: string): HeadersInit {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": creds.developerToken,
    "Content-Type": "application/json",
  };
  if (creds.loginCustomerId) h["login-customer-id"] = creds.loginCustomerId;
  return h;
}

async function searchStream<T>(
  creds: GoogleAdsCreds,
  accessToken: string,
  query: string,
): Promise<T[]> {
  const url = `${API_BASE}/customers/${creds.customerId}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: "POST",
    headers: adsHeaders(creds, accessToken),
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    // Google devuelve un array de errores con detalles. Sacamos el primer message.
    let msg = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed[0]?.error?.message) msg = parsed[0].error.message;
      else if (parsed?.error?.message) msg = parsed.error.message;
    } catch {}
    throw new Error(`Google Ads ${res.status}: ${msg}`);
  }
  // searchStream devuelve un ARRAY de batches con results dentro
  const batches: AdsBatch<T>[] = JSON.parse(text);
  return batches.flatMap((b) => b.results ?? []);
}

function mapStatus(s?: string): "ACTIVE" | "PAUSED" | "ENDED" | "DRAFT" {
  switch (s) {
    case "ENABLED":
      return "ACTIVE";
    case "PAUSED":
      return "PAUSED";
    case "REMOVED":
      return "ENDED";
    default:
      return "DRAFT";
  }
}

// Tipos parciales (camelCase, como devuelve el API REST)
type AdsCustomer = {
  customer: {
    id: string;
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
  };
};

type AdsCampaign = {
  campaign: {
    id: string;
    name: string;
    status: string;
    advertisingChannelType?: string;
  };
  campaignBudget?: {
    amountMicros?: string;
  };
};

type AdsInsight = {
  campaign: { id: string; name?: string };
  segments: { date: string };
  metrics: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
    conversionsValue?: number;
  };
};

export type GoogleAdsSyncResult = {
  campaigns: number;
  snapshots: number;
  totalSpend: number;
  currency: string;
  accountName: string;
  range: string;
};

export async function syncGoogleAds(actorId?: string): Promise<GoogleAdsSyncResult> {
  const integ = await prisma.integration.findUnique({
    where: { channel: "GOOGLE_ADS" },
  });
  if (!integ) throw new Error("Google Ads no está configurado");

  const creds = (() => {
    try {
      return JSON.parse(integ.credentialsJson) as GoogleAdsCreds;
    } catch {
      throw new Error("Credenciales corruptas — reconfigurar la integración");
    }
  })();

  const required = ["developerToken", "clientId", "clientSecret", "refreshToken", "customerId"] as const;
  for (const k of required) {
    if (!creds[k]) throw new Error(`Falta ${k}`);
  }

  try {
    const accessToken = await getAccessToken(creds);

    // 0) Account info
    const customerInfo = await searchStream<AdsCustomer>(
      creds,
      accessToken,
      "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1",
    );
    const acc = customerInfo[0]?.customer;
    const currency = acc?.currencyCode ?? "USD";
    const accountName = acc?.descriptiveName ?? "Google Ads";

    // 1) Campañas (excluyendo REMOVED, esas las marcamos ENDED igual)
    const campaigns = await searchStream<AdsCampaign>(
      creds,
      accessToken,
      `SELECT
        campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
        campaign_budget.amount_micros
       FROM campaign
       WHERE campaign.status != 'REMOVED'`,
    );

    // 2) Insights diarios — fallback en cascada (igual que Meta) hasta encontrar datos
    const insightsQuery = (whereClause: string) =>
      `SELECT
        campaign.id, segments.date,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value
       FROM campaign
       WHERE ${whereClause}`;

    // Google Ads v20 sólo acepta como literales DURING los rangos cortos
    // (LAST_7_DAYS, LAST_14_DAYS, LAST_30_DAYS). Para rangos más largos hay
    // que usar BETWEEN con fechas explícitas. Hacemos cascada de 3 niveles.
    const today = new Date();
    const dateNDaysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    };
    const todayIso = today.toISOString().slice(0, 10);

    let usedRange = "LAST_30_DAYS";
    let insights = await searchStream<AdsInsight>(
      creds,
      accessToken,
      insightsQuery("segments.date DURING LAST_30_DAYS"),
    );
    if (insights.length === 0) {
      const start = dateNDaysAgo(365);
      usedRange = `${start}..${todayIso}`;
      insights = await searchStream<AdsInsight>(
        creds,
        accessToken,
        insightsQuery(`segments.date BETWEEN '${start}' AND '${todayIso}'`),
      );
    }
    if (insights.length === 0) {
      const start = "2020-01-01";
      usedRange = `${start}..${todayIso}`;
      insights = await searchStream<AdsInsight>(
        creds,
        accessToken,
        insightsQuery(`segments.date BETWEEN '${start}' AND '${todayIso}'`),
      );
    }

    // 3) Wipe + insertar campañas reales
    await prisma.campaign.deleteMany({ where: { channel: "GOOGLE_ADS" } });

    const idMap = new Map<string, string>();
    for (const row of campaigns) {
      const c = row.campaign;
      const budget = (Number(row.campaignBudget?.amountMicros) || 0) / 1_000_000;
      const localId = `gads-${c.id}`;
      await prisma.campaign.create({
        data: {
          id: localId,
          name: c.name,
          channel: "GOOGLE_ADS",
          status: mapStatus(c.status),
          objective: c.advertisingChannelType ?? null,
          budget,
          spend: 0,
          tagsJson: JSON.stringify(["google-ads", "real", currency.toLowerCase()]),
          ownerId: actorId ?? null,
        },
      });
      idMap.set(c.id, localId);
    }

    // 4) Snapshots por día
    let snapCount = 0;
    const spendByCampaign = new Map<string, number>();
    for (const row of insights) {
      const cid = row.campaign?.id;
      const localId = idMap.get(cid);
      if (!localId) continue;
      const date = new Date(row.segments.date + "T00:00:00.000Z");
      const cost = (Number(row.metrics?.costMicros) || 0) / 1_000_000;
      const impressions = Number(row.metrics?.impressions) || 0;
      const clicks = Number(row.metrics?.clicks) || 0;
      const conversions = Math.round(Number(row.metrics?.conversions) || 0);
      const revenue = Number(row.metrics?.conversionsValue) || 0;

      await prisma.metricSnapshot.upsert({
        where: { campaignId_date: { campaignId: localId, date } },
        update: {
          cost, impressions, clicks,
          leads: conversions, conversions, revenue,
        },
        create: {
          campaignId: localId,
          date,
          cost, impressions, clicks,
          leads: conversions, conversions, revenue,
        },
      });
      spendByCampaign.set(localId, (spendByCampaign.get(localId) ?? 0) + cost);
      snapCount++;
    }

    // 5) Totalizar spend
    for (const [localId, total] of spendByCampaign) {
      await prisma.campaign.update({
        where: { id: localId },
        data: { spend: total },
      });
    }

    // 6) Marcar OK
    await prisma.integration.update({
      where: { channel: "GOOGLE_ADS" },
      data: { status: "CONNECTED", lastSyncAt: new Date(), lastError: null },
    });

    return {
      campaigns: campaigns.length,
      snapshots: snapCount,
      totalSpend: Array.from(spendByCampaign.values()).reduce((a, b) => a + b, 0),
      currency,
      accountName,
      range: usedRange,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.integration.update({
      where: { channel: "GOOGLE_ADS" },
      data: { status: "ERROR", lastError: message },
    });
    throw e;
  }
}

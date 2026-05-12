import { prisma } from "@/lib/db";

type GeoCreds = {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  perplexityApiKey?: string;
  targetQueries?: string;
  brandNames?: string;
};

type ClaudeOk = {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
};

type ClaudeErr = { error: { type: string; message: string } };

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_API = "https://api.anthropic.com/v1/messages";

// Precio claude-haiku-4-5 por token (USD)
const INPUT_PRICE = 1 / 1_000_000;
const OUTPUT_PRICE = 5 / 1_000_000;

// La query se prompts directamente como la haría un usuario real, sin
// system prompt — queremos medir cómo la IA responde "naturalmente".
async function askClaude(apiKey: string, prompt: string): Promise<{ text: string; cost: number }> {
  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const raw = await res.text();
  let data: ClaudeOk | ClaudeErr;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Anthropic devolvió no-JSON (${res.status}): ${raw.slice(0, 200)}`);
  }

  if (!res.ok || "error" in data) {
    const msg = "error" in data ? data.error.message : `HTTP ${res.status}`;
    throw new Error(`Anthropic API: ${msg}`);
  }

  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  const cost = data.usage.input_tokens * INPUT_PRICE + data.usage.output_tokens * OUTPUT_PRICE;
  return { text, cost };
}

function detectMention(
  text: string,
  brandVariants: string[],
): { mentioned: boolean; positionRatio: number | null; matched: string[] } {
  if (!text) return { mentioned: false, positionRatio: null, matched: [] };
  const lower = text.toLowerCase();
  let firstPos = Infinity;
  const matched: string[] = [];

  for (const variant of brandVariants) {
    const v = variant.toLowerCase();
    if (!v) continue;
    const idx = lower.indexOf(v);
    if (idx !== -1) {
      matched.push(variant);
      if (idx < firstPos) firstPos = idx;
    }
  }

  if (matched.length === 0) return { mentioned: false, positionRatio: null, matched: [] };
  return {
    mentioned: true,
    positionRatio: firstPos / text.length,
    matched,
  };
}

export type GeoSyncResult = {
  queries: number;
  successful: number;
  mentions: number;
  topPositionMentions: number;
  costUsd: number;
};

export async function syncGeo(actorId?: string): Promise<GeoSyncResult> {
  const integ = await prisma.integration.findUnique({ where: { channel: "GEO" } });
  if (!integ) throw new Error("Integración GEO no configurada");

  let creds: GeoCreds;
  try {
    creds = JSON.parse(integ.credentialsJson) as GeoCreds;
  } catch {
    throw new Error("Credenciales corruptas — reconfigurar la integración GEO");
  }

  if (!creds.anthropicApiKey) {
    throw new Error("Falta anthropicApiKey en la integración GEO");
  }

  const queries = (creds.targetQueries ?? "")
    .split("|")
    .map((q) => q.trim())
    .filter(Boolean);
  if (queries.length === 0) throw new Error("Sin queries configuradas en GEO (separadas por |)");

  const brandVariants = (creds.brandNames ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (brandVariants.length === 0) throw new Error("Sin brandNames configuradas en GEO");

  // Snapshot de hoy a 00:00 UTC — el unique constraint es por (campaignId, date)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let successful = 0;
  let mentions = 0;
  let topMentions = 0;
  let totalCost = 0;

  for (const query of queries) {
    let responseText = "";
    let cost = 0;
    let errorMsg: string | null = null;
    let detection = { mentioned: false, positionRatio: null as number | null, matched: [] as string[] };

    try {
      const result = await askClaude(creds.anthropicApiKey, query);
      responseText = result.text;
      cost = result.cost;
      detection = detectMention(responseText, brandVariants);

      if (detection.mentioned) mentions++;
      if (detection.positionRatio !== null && detection.positionRatio < 0.3) topMentions++;
      totalCost += cost;
      successful++;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[geo-sync] query failed: "${query.slice(0, 60)}…" — ${errorMsg}`);
    }

    // Una campaña por query (truncada para que entre en el nombre)
    const campaignName = `Claude · ${query.slice(0, 60)}${query.length > 60 ? "…" : ""}`;
    let campaign = await prisma.campaign.findFirst({
      where: { channel: "GEO", name: campaignName },
    });
    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: { name: campaignName, channel: "GEO", status: "ACTIVE" },
      });
    }

    const snapshotData = {
      impressions: 1,
      clicks: detection.mentioned ? 1 : 0,
      conversions: detection.positionRatio !== null && detection.positionRatio < 0.3 ? 1 : 0,
      leads: detection.matched.length > 1 ? 1 : 0,
      cost,
      revenue: 0,
      extraJson: JSON.stringify({
        provider: "anthropic",
        model: CLAUDE_MODEL,
        response: responseText.slice(0, 2000),
        matchedVariants: detection.matched,
        positionRatio: detection.positionRatio,
        error: errorMsg,
      }),
    };

    await prisma.metricSnapshot.upsert({
      where: { campaignId_date: { campaignId: campaign.id, date: today } },
      create: { campaignId: campaign.id, date: today, ...snapshotData },
      update: snapshotData,
    });
  }

  // Si TODAS las queries fallaron, marcamos la integración en ERROR
  if (successful === 0) {
    await prisma.integration.update({
      where: { channel: "GEO" },
      data: {
        status: "ERROR",
        lastError: "Todas las queries fallaron — verificá la API key y la conectividad.",
        updatedById: actorId ?? null,
      },
    });
    throw new Error("Todas las queries de GEO fallaron");
  }

  await prisma.integration.update({
    where: { channel: "GEO" },
    data: {
      status: "CONNECTED",
      lastSyncAt: new Date(),
      lastError: null,
      updatedById: actorId ?? null,
    },
  });

  return {
    queries: queries.length,
    successful,
    mentions,
    topPositionMentions: topMentions,
    costUsd: totalCost,
  };
}

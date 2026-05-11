// Helper de salud por canal: convierte snapshots + campañas + KPIs en un
// score 0-100 + color de semáforo + bullets accionables.
//
// La heurística es deliberadamente simple — si el dueño no la entiende a
// la primera, no sirve. Se calibra en producción con datos reales.

import type { Channel } from "@/types/db";
import type { SerializedSnapshot, SerializedCampaign } from "@/components/campaign/channel-dashboard";

export type SemaphoreColor = "green" | "amber" | "red" | "neutral";

export type ChannelHealth = {
  score: number;            // 0-100
  color: SemaphoreColor;
  label: string;            // "Saludable" | "Atención" | "Crítico" | "Sin datos"
  roi: number | null;       // ingreso / costo (1 = empata, >1 gana)
  costPerLead: number | null;
  spent: number;
  revenue: number;
  leads: number;
  budget: number;
  budgetUsedPct: number;    // 0-100
  reasons: string[];        // bullets cortos: por qué está en este color
};

const colorFromScore = (s: number): SemaphoreColor =>
  s >= 75 ? "green" : s >= 50 ? "amber" : "red";

const labelFromColor = (c: SemaphoreColor): string =>
  c === "green" ? "Saludable" : c === "amber" ? "Atención" : c === "red" ? "Crítico" : "Sin datos";

export function getChannelHealth(
  _channel: Channel,
  campaigns: SerializedCampaign[],
  snapshots: SerializedSnapshot[],
): ChannelHealth {
  // Totales
  const t = snapshots.reduce(
    (acc, s) => {
      acc.cost += s.cost;
      acc.revenue += s.revenue;
      acc.leads += s.leads;
      acc.clicks += s.clicks;
      acc.impressions += s.impressions;
      return acc;
    },
    { cost: 0, revenue: 0, leads: 0, clicks: 0, impressions: 0 },
  );

  const budget = campaigns.reduce((a, c) => a + (c.budget ?? 0), 0);
  const spent = campaigns.reduce((a, c) => a + (c.spend ?? 0), 0);
  const budgetUsedPct = budget > 0 ? Math.min(150, (spent / budget) * 100) : 0;

  const roi = t.cost > 0 ? t.revenue / t.cost : null;
  const costPerLead = t.leads > 0 && t.cost > 0 ? t.cost / t.leads : null;

  if (snapshots.length === 0) {
    return {
      score: 0,
      color: "neutral",
      label: "Sin datos",
      roi: null,
      costPerLead: null,
      spent,
      revenue: t.revenue,
      leads: t.leads,
      budget,
      budgetUsedPct,
      reasons: ["Sin actividad en el período"],
    };
  }

  // Score por componentes:
  //   ROI:     >2x = 100, 1.5x = 80, 1x = 50, <0.7x = 0
  //   Leads:   tener flujo de leads (≥1 lead/día) suma puntos
  //   Budget:  consumo razonable (40-90%) suma; 0% o >110% restan
  let roiScore = 50;
  if (roi !== null) {
    if (roi >= 2) roiScore = 100;
    else if (roi >= 1.5) roiScore = 80;
    else if (roi >= 1) roiScore = 60;
    else if (roi >= 0.7) roiScore = 40;
    else roiScore = 10;
  }

  // Cobertura: días con snapshots / días esperados (asume snapshots diarios)
  const dayKeys = new Set(snapshots.map((s) => s.date.slice(0, 10)));
  const expectedDays = 30;
  const coverageScore = Math.min(100, (dayKeys.size / expectedDays) * 100);

  let budgetScore = 50;
  if (budget > 0) {
    if (budgetUsedPct < 5) budgetScore = 30;
    else if (budgetUsedPct <= 90) budgetScore = 100;
    else if (budgetUsedPct <= 110) budgetScore = 70;
    else budgetScore = 30;
  }

  let leadScore = 50;
  if (t.leads >= dayKeys.size) leadScore = 100;
  else if (t.leads > 0) leadScore = 60;
  else leadScore = 10;

  // Promedio ponderado
  const score = Math.round(roiScore * 0.45 + leadScore * 0.30 + budgetScore * 0.20 + coverageScore * 0.05);
  const color = colorFromScore(score);

  // Razones (bullets cortos, máximo 3)
  const reasons: string[] = [];
  if (roi !== null) {
    if (roi >= 1.5) reasons.push(`ROI fuerte: por cada $1 entran $${roi.toFixed(2)}.`);
    else if (roi >= 1) reasons.push(`ROI ajustado: $1 → $${roi.toFixed(2)}.`);
    else reasons.push(`ROI por debajo del costo: $1 → $${roi.toFixed(2)}.`);
  }
  if (budget > 0) {
    if (budgetUsedPct >= 100) reasons.push(`Saldo agotado o excedido (${budgetUsedPct.toFixed(0)}% del presupuesto).`);
    else if (budgetUsedPct < 30 && spent > 0) reasons.push(`Presupuesto subutilizado (${budgetUsedPct.toFixed(0)}% gastado).`);
  }
  if (t.leads === 0 && t.cost > 0) reasons.push(`Hay gasto pero no hay leads.`);
  else if (costPerLead) reasons.push(`Costo por lead: $${Math.round(costPerLead).toLocaleString("es-AR")}.`);
  if (reasons.length === 0) reasons.push("Sin observaciones relevantes.");

  return {
    score,
    color,
    label: labelFromColor(color),
    roi,
    costPerLead,
    spent,
    revenue: t.revenue,
    leads: t.leads,
    budget,
    budgetUsedPct,
    reasons: reasons.slice(0, 3),
  };
}

// Color de Tailwind asociado al semáforo (para UI consistente)
export const semaphoreClasses = (color: SemaphoreColor) => {
  switch (color) {
    case "green":
      return {
        dot: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        ring: "ring-emerald-500/30",
      };
    case "amber":
      return {
        dot: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        ring: "ring-amber-500/30",
      };
    case "red":
      return {
        dot: "bg-rose-500",
        text: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        ring: "ring-rose-500/30",
      };
    default:
      return {
        dot: "bg-muted-foreground",
        text: "text-muted-foreground",
        bg: "bg-muted/30",
        ring: "ring-border",
      };
  }
};

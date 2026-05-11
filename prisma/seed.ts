import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CHANNELS = [
  "GOOGLE_ADS",
  "META_ADS",
  "YT_ADS",
  "SEO",
  "GEO",
  "EMAIL_OUTREACH",
  "LINKEDIN_OUTREACH",
  "PODCAST",
  "WEBINAR",
] as const;
type Channel = (typeof CHANNELS)[number];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const channelBudgets: Record<Channel, [number, number]> = {
  GOOGLE_ADS: [3000, 15000],
  META_ADS: [2500, 12000],
  YT_ADS: [2000, 9000],
  SEO: [1500, 6000],
  GEO: [1000, 4000],
  EMAIL_OUTREACH: [400, 1800],
  LINKEDIN_OUTREACH: [600, 2200],
  PODCAST: [1200, 5000],
  WEBINAR: [800, 3500],
};

const campaignNames: Record<Channel, string[]> = {
  GOOGLE_ADS: ["Search Brand", "Performance Max Q2", "Retargeting Display"],
  META_ADS: ["Lookalike ICP", "Reels Awareness", "Conversion Retargeting"],
  YT_ADS: ["Pre-roll Tec5 Demo", "In-stream Case Studies"],
  SEO: ["Clusters IA Enterprise", "Long-tail LatAm"],
  GEO: ["Generative Answer Optimization", "AI Overviews Tec5"],
  EMAIL_OUTREACH: ["Outbound CTOs SaaS", "Re-engagement MQL frío"],
  LINKEDIN_OUTREACH: ["VP Data LatAm", "Fundadores Serie A"],
  PODCAST: ["Serie: Agentes IA", "Entrevistas C-Level"],
  WEBINAR: ["Webinar: GEO 101", "Webinar: RAG en producción"],
};

async function main() {
  console.log("🌱 Seeding Tec5 portal...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@tec5.tech";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Tec5!Admin2026";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Tec5 Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@tec5.tech" },
    update: {},
    create: {
      email: "manager@tec5.tech",
      name: "Campaign Manager",
      passwordHash: await bcrypt.hash("Manager!2026", 10),
      role: "MANAGER",
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@tec5.tech" },
    update: {},
    create: {
      email: "viewer@tec5.tech",
      name: "Stakeholder",
      passwordHash: await bcrypt.hash("Viewer!2026", 10),
      role: "VIEWER",
    },
  });

  console.log(`👤 ${admin.email} · ${manager.email} · ${viewer.email}`);

  let totalCampaigns = 0;
  let totalSnapshots = 0;

  for (const channel of CHANNELS) {
    for (const name of campaignNames[channel]) {
      const [minB, maxB] = channelBudgets[channel];
      const budget = rand(minB, maxB);
      const spend = Math.floor(budget * (Math.random() * 0.75 + 0.1));
      const status = Math.random() > 0.2 ? "ACTIVE" : "PAUSED";
      const id = `${channel}-${name}`.toLowerCase().replace(/[^a-z0-9]/g, "-");

      const campaign = await prisma.campaign.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name,
          channel,
          status,
          objective: "Lead generation",
          audience: "ICP Tec5 · SaaS LatAm",
          budget,
          spend,
          startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          description: `Campaña ${name} en canal ${channel.replace("_", " ")}.`,
          tagsJson: JSON.stringify([channel.toLowerCase(), "tec5"]),
          ownerId: manager.id,
        },
      });
      totalCampaigns++;

      for (let d = 29; d >= 0; d--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - d);

        const impressions = rand(1500, 40000);
        const clicks = Math.floor(impressions * (Math.random() * 0.06 + 0.01));
        const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.02));
        const leads = Math.floor(conversions * (Math.random() * 1.2 + 0.3));
        const mqls = Math.floor(leads * (Math.random() * 0.6 + 0.2));
        const sqls = Math.floor(mqls * (Math.random() * 0.5 + 0.2));
        const deals = Math.floor(sqls * (Math.random() * 0.3 + 0.05));
        const cost = Math.floor((budget / 30) * (Math.random() * 0.6 + 0.7));
        const revenue = deals * rand(500, 4500);

        await prisma.metricSnapshot.upsert({
          where: { campaignId_date: { campaignId: campaign.id, date } },
          update: {},
          create: {
            campaignId: campaign.id,
            date,
            impressions,
            clicks,
            conversions,
            leads,
            mqls,
            sqls,
            deals,
            cost,
            revenue,
          },
        });
        totalSnapshots++;
      }
    }
  }

  const kpis: Array<{
    name: string;
    unit: string;
    direction: string;
    target: number;
    current: number;
  }> = [
    { name: "Leads mensuales",              unit: "NUMBER",   direction: "HIGHER_IS_BETTER", target: 800, current: 612 },
    { name: "Costo por lead",               unit: "CURRENCY", direction: "LOWER_IS_BETTER",  target: 35,  current: 42  },
    { name: "Tasa de clicks (CTR)",         unit: "PERCENT",  direction: "HIGHER_IS_BETTER", target: 3.5, current: 2.9 },
    { name: "Inversión del mes",            unit: "CURRENCY", direction: "LOWER_IS_BETTER",  target: 25000, current: 22400 },
    { name: "Asistentes a webinars",        unit: "PERCENT",  direction: "HIGHER_IS_BETTER", target: 45,  current: 38  },
    { name: "Respuestas email frío",        unit: "PERCENT",  direction: "HIGHER_IS_BETTER", target: 8,   current: 5.4 },
    { name: "Respuestas LinkedIn",          unit: "PERCENT",  direction: "HIGHER_IS_BETTER", target: 12,  current: 7.8 },
    { name: "Reproducciones podcast",       unit: "NUMBER",   direction: "HIGHER_IS_BETTER", target: 5000, current: 3200 },
  ];

  for (const k of kpis) {
    const id = `kpi-${k.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    await prisma.kpi.upsert({
      where: { id },
      update: { target: k.target, current: k.current },
      create: {
        id,
        name: k.name,
        unit: k.unit,
        direction: k.direction,
        target: k.target,
        current: k.current,
        ownerId: admin.id,
      },
    });
  }

  console.log(`✅ ${totalCampaigns} campañas · ${totalSnapshots} snapshots · ${kpis.length} KPIs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const OUT_DIR = join(process.cwd(), "migration-dump");

mkdirSync(OUT_DIR, { recursive: true });

type ModelEntry = {
  file: string;
  fetch: () => Promise<unknown[]>;
};

const models: ModelEntry[] = [
  { file: "users.json",               fetch: () => prisma.user.findMany() },
  { file: "accounts.json",            fetch: () => prisma.account.findMany() },
  { file: "sessions.json",            fetch: () => prisma.session.findMany() },
  { file: "verificationtokens.json",  fetch: () => prisma.verificationToken.findMany() },
  { file: "campaigns.json",           fetch: () => prisma.campaign.findMany() },
  { file: "metricsnapshots.json",     fetch: () => prisma.metricSnapshot.findMany() },
  { file: "kpis.json",                fetch: () => prisma.kpi.findMany() },
  { file: "integrations.json",        fetch: () => prisma.integration.findMany() },
  { file: "auditlogs.json",           fetch: () => prisma.auditLog.findMany() },
  { file: "alertevents.json",         fetch: () => prisma.alertEvent.findMany() },
  { file: "telegramconfigs.json",     fetch: () => prisma.telegramConfig.findMany() },
  { file: "telegramsubscribers.json", fetch: () => prisma.telegramSubscriber.findMany() },
];

async function main(): Promise<void> {
  let totalRows = 0;

  for (const { file, fetch } of models) {
    const label = file.replace(".json", "");
    try {
      const rows = await fetch();
      writeFileSync(join(OUT_DIR, file), JSON.stringify(rows, null, 2));
      console.log(`[export] ${label}: ${rows.length} rows`);
      totalRows += rows.length;
    } catch (err) {
      console.error(`[export] ERROR on ${label}:`, err);
    }
  }

  console.log(`[export] total: ${totalRows} rows`);
  console.log("[export] done");
}

main()
  .catch((err) => {
    console.error("[export] fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect())
  .then(() => process.exit(0));

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const DUMP_DIR = join(process.cwd(), "migration-dump");

function readJson<T>(file: string): T[] | null {
  const path = join(DUMP_DIR, file);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as T[];
}

// Parse ISO date strings back to Date objects for the given keys.
// expires_at on Account is Int — intentionally excluded.
function parseDates<T extends Record<string, unknown>>(rows: T[], keys: string[]): T[] {
  return rows.map((row) => {
    const patched: Record<string, unknown> = { ...row };
    for (const key of keys) {
      if (patched[key] != null) {
        patched[key] = new Date(patched[key] as string);
      }
    }
    return patched as T;
  });
}

async function importModel<T extends Record<string, unknown>>(
  label: string,
  file: string,
  dateFields: string[],
  insert: (data: T[]) => Promise<{ count: number }>,
): Promise<void> {
  const raw = readJson<T>(file);
  if (raw === null) {
    console.log(`[import] ${label}: skipped (file not found)`);
    return;
  }
  if (raw.length === 0) {
    console.log(`[import] ${label}: 0 rows`);
    return;
  }
  const data = parseDates(raw, dateFields);
  const result = await insert(data as T[]);
  console.log(`[import] ${label}: ${result.count} inserted`);
}

async function main(): Promise<void> {
  // Topological order — parents before children
  await importModel("users", "users.json", ["emailVerified", "createdAt", "updatedAt"],
    (data) => prisma.user.createMany({ data, skipDuplicates: true }));

  await importModel("verificationtokens", "verificationtokens.json", ["expires"],
    (data) => prisma.verificationToken.createMany({ data, skipDuplicates: true }));

  await importModel("telegramconfigs", "telegramconfigs.json", ["createdAt", "updatedAt"],
    (data) => prisma.telegramConfig.createMany({ data, skipDuplicates: true }));

  await importModel("accounts", "accounts.json", ["createdAt"],
    // expires_at is Int — NOT a date field; do not parse it
    (data) => prisma.account.createMany({ data, skipDuplicates: true }));

  await importModel("sessions", "sessions.json", ["expires"],
    (data) => prisma.session.createMany({ data, skipDuplicates: true }));

  await importModel("telegramsubscribers", "telegramsubscribers.json", ["createdAt", "updatedAt"],
    (data) => prisma.telegramSubscriber.createMany({ data, skipDuplicates: true }));

  await importModel("campaigns", "campaigns.json", ["startDate", "endDate", "createdAt", "updatedAt"],
    (data) => prisma.campaign.createMany({ data, skipDuplicates: true }));

  await importModel("metricsnapshots", "metricsnapshots.json", ["date", "createdAt"],
    (data) => prisma.metricSnapshot.createMany({ data, skipDuplicates: true }));

  await importModel("kpis", "kpis.json", ["createdAt", "updatedAt"],
    (data) => prisma.kpi.createMany({ data, skipDuplicates: true }));

  await importModel("alertevents", "alertevents.json", ["createdAt"],
    (data) => prisma.alertEvent.createMany({ data, skipDuplicates: true }));

  await importModel("integrations", "integrations.json", ["lastSyncAt", "createdAt", "updatedAt"],
    (data) => prisma.integration.createMany({ data, skipDuplicates: true }));

  await importModel("auditlogs", "auditlogs.json", ["createdAt"],
    (data) => prisma.auditLog.createMany({ data, skipDuplicates: true }));

  console.log("[import] done");
}

main()
  .catch((err) => {
    console.error("[import] fatal — check DATABASE_URL and that prisma db push was run:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect())
  .then(() => process.exit(0));

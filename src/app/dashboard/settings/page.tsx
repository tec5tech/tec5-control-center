import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

type UserWithPrefs = {
  email: string;
  preferencesJson: string;
};

type SystemSettingsRow = {
  lossRoiThreshold: number;
  lowPerformanceRoiThreshold: number;
  excellentRoiThreshold: number;
  timezone: string;
  currency: string;
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsRow = {
  lossRoiThreshold: 1.0,
  lowPerformanceRoiThreshold: 2.0,
  excellentRoiThreshold: 3.0,
  timezone: "America/Buenos_Aires",
  currency: "ARS",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let email = session.user.email ?? "";
  let prefs: Record<string, boolean> = {};
  let schemaPending = false;
  let systemSettings: SystemSettingsRow = { ...DEFAULT_SYSTEM_SETTINGS };

  // ─── User prefs ───────────────────────────────────────────────────────────
  try {
    const user = await (
      prisma.user as unknown as {
        findUnique: (args: unknown) => Promise<UserWithPrefs | null>;
      }
    ).findUnique({
      where: { id: session.user.id },
      select: { email: true, preferencesJson: true },
    });
    if (user?.email) email = user.email;
    try {
      prefs = JSON.parse(user?.preferencesJson ?? "{}") as Record<string, boolean>;
    } catch {}
  } catch (e) {
    console.warn("[settings] preferencesJson column not available — using defaults", e);
    schemaPending = true;
    const fallback = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    if (fallback?.email) email = fallback.email;
  }

  // ─── System settings ──────────────────────────────────────────────────────
  try {
    const db = prisma as unknown as {
      systemSettings: {
        upsert: (args: unknown) => Promise<SystemSettingsRow>;
      };
    };
    systemSettings = await db.systemSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", ...DEFAULT_SYSTEM_SETTINGS },
    });
  } catch (e) {
    console.warn("[settings] SystemSettings table not available — using defaults", e);
    // schemaPending is already set or will be set; keep defaults
  }

  return (
    <SettingsClient
      email={email}
      preferences={prefs}
      systemSettings={systemSettings}
      schemaPending={schemaPending}
    />
  );
}

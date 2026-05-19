import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

type UserWithPrefs = {
  email: string;
  preferencesJson: string;
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await (prisma.user as unknown as { findUnique: (args: unknown) => Promise<UserWithPrefs | null> }).findUnique({
    where: { id: session.user.id },
    select: { email: true, preferencesJson: true },
  });

  let prefs: Record<string, boolean> = {};
  try {
    prefs = JSON.parse(user?.preferencesJson ?? "{}") as Record<string, boolean>;
  } catch {}

  return (
    <SettingsClient
      email={user?.email ?? session.user.email ?? ""}
      preferences={prefs}
    />
  );
}

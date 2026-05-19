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

  // Intentamos leer preferencesJson; si la columna no existe todavía (db:push pendiente),
  // caemos a defaults sin romper la página.
  let email = session.user.email ?? "";
  let prefs: Record<string, boolean> = {};
  let schemaPending = false;

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

  return (
    <SettingsClient
      email={email}
      preferences={prefs}
      schemaPending={schemaPending}
    />
  );
}

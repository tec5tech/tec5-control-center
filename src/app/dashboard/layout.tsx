import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthSessionProvider } from "@/components/session-provider";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [unreadAlerts, lastIntegration] = await Promise.all([
    prisma.alertEvent.count({ where: { read: false } }),
    prisma.integration.findFirst({
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
  ]);

  const lastSyncIso = lastIntegration?.lastSyncAt?.toISOString() ?? null;

  return (
    <AuthSessionProvider>
      <div className="flex min-h-screen">
        <Sidebar
          role={session.user.role}
          unreadAlerts={unreadAlerts}
          lastSyncIso={lastSyncIso}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header user={session.user} />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}

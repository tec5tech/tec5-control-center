import { prisma } from "@/lib/db";
import { parseDateRange } from "@/lib/date-range";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CampaignTable } from "@/components/campaign/campaign-table";
import { NewCampaignButton } from "@/components/campaign/new-campaign-button";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { KpiCard } from "@/components/charts/kpi-card";
import { PeriodChips } from "@/components/dashboard/period-chips";
import { CHANNELS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { LayoutGrid, Zap, DollarSign, TrendingUp } from "lucide-react";
import type { Channel, CampaignStatus } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parseDateRange(params);

  const campaigns = await prisma.campaign.findMany({
    include: {
      metrics: {
        where: { date: { gte: from, lte: to } },
        select: { leads: true, clicks: true, cost: true, revenue: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const toRow = (c: (typeof campaigns)[number]) => ({
    id: c.id,
    name: c.name,
    status: c.status as CampaignStatus,
    channel: c.channel as Channel,
    budget: Number(c.budget),
    spend: Number(c.spend),
    leads: c.metrics.reduce((a, b) => a + b.leads, 0),
    clicks: c.metrics.reduce((a, b) => a + b.clicks, 0),
  });

  // Summary KPIs
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalInvested = campaigns.reduce(
    (a, c) => a + c.metrics.reduce((b, m) => b + Number(m.cost), 0),
    0,
  );
  const totalReturned = campaigns.reduce(
    (a, c) => a + c.metrics.reduce((b, m) => b + Number(m.revenue), 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Todas las campañas
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Campañas</h1>
          <p className="text-muted-foreground mt-1">
            {totalCampaigns} campañas en {CHANNELS.length} canales · {activeCampaigns} activas ahora
          </p>
        </div>
        <NewCampaignButton />
      </div>

      {/* Period chips */}
      <PeriodChips />

      {/* 4 KPI cards de resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total campañas"
          value={totalCampaigns}
          hint="En todos los canales"
          icon={<LayoutGrid className="h-4 w-4" />}
        />
        <KpiCard
          label="Campañas activas"
          value={activeCampaigns}
          hint={`${totalCampaigns - activeCampaigns} pausadas o detenidas`}
          icon={<Zap className="h-4 w-4" />}
        />
        <KpiCard
          label="Total invertido"
          value={totalInvested > 0 ? formatCurrency(totalInvested) : "—"}
          hint="En el período seleccionado"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Total retornado"
          value={totalReturned > 0 ? formatCurrency(totalReturned) : "—"}
          hint="Ingresos del período"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Tabs por canal */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las campañas</CardTitle>
          <CardDescription>{campaigns.length} resultados en el período</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todas</TabsTrigger>
              {CHANNELS.map((c) => (
                <TabsTrigger key={c.key} value={c.key} className="gap-1.5">
                  <ChannelIcon channel={c.key} size={14} />
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="all">
              <CampaignTable campaigns={campaigns.map(toRow)} />
            </TabsContent>
            {CHANNELS.map((c) => (
              <TabsContent key={c.key} value={c.key}>
                <CampaignTable
                  campaigns={campaigns.filter((x) => x.channel === c.key).map(toRow)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

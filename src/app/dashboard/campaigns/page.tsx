import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignTable } from "@/components/campaign/campaign-table";
import { NewCampaignButton } from "@/components/campaign/new-campaign-button";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { CHANNELS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Channel, CampaignStatus } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { metrics: true },
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Gestión unificada</p>
          <h1 className="text-3xl font-bold tracking-tight">Campañas</h1>
          <p className="text-muted-foreground mt-1">
            Activá, pausá, editá o eliminá cualquier campaña desde un solo lugar.
          </p>
        </div>
        <NewCampaignButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las campañas</CardTitle>
          <CardDescription>{campaigns.length} resultados</CardDescription>
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

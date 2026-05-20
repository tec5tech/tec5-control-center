import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { MetricInfo } from "@/components/ui/metric-info";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";

function EmptyHighlight({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          {title}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Sin datos todavía</p>
      </CardContent>
    </Card>
  );
}

export function HighlightCards({
  best,
  worst,
}: {
  best: ChannelMetrics | null;
  worst: ChannelMetrics | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Best */}
      {best ? (
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-success">Mejor Inversión</span>
              <MetricInfo content="El canal con mayor retorno por cada $1 invertido en el período seleccionado." />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-full shrink-0 bg-success/20"
              >
                <ChannelIcon channel={best.channel} size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-foreground">{best.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{best.tagline}</p>
                <div className="mt-3 p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success tabular-nums">
                    ${best.roi.toFixed(2)}
                  </p>
                  <p className="text-xs text-success mt-0.5">ganás por cada $1 invertido</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyHighlight
          title="Mejor inversión"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        />
      )}

      {/* Worst */}
      {worst && worst.roi < 1 ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Perdiendo Dinero</span>
              <MetricInfo content="El canal que menos ROI tiene. Si está por debajo de $1, estás perdiendo plata." />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <div className="grid place-items-center h-12 w-12 rounded-full shrink-0 bg-destructive/20">
                <ChannelIcon channel={worst.channel} size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-foreground">{worst.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{worst.tagline}</p>
                <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                  <p className="text-2xl font-bold text-destructive tabular-nums">
                    ${worst.roi.toFixed(2)}
                  </p>
                  <p className="text-xs text-destructive mt-0.5">recuperás por cada $1 (pérdida)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : worst ? (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-warning">Menor Rendimiento</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-full shrink-0 bg-warning/20"
              >
                <ChannelIcon channel={worst.channel} size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-foreground">{worst.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{worst.tagline}</p>
                <div className="mt-3 p-3 bg-warning/10 rounded-lg">
                  <p className="text-2xl font-bold text-warning tabular-nums">
                    ${worst.roi.toFixed(2)}
                  </p>
                  <p className="text-xs text-warning mt-0.5">ganás por cada $1 invertido</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyHighlight
          title="Perdiendo dinero"
          icon={<XCircle className="h-4 w-4 text-rose-500" />}
        />
      )}
    </div>
  );
}

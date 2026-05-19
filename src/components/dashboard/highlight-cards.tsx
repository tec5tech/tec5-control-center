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
        <Card className="border-emerald-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Mejor inversión</span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${best.hex}20`, color: best.hex }}
              >
                {best.label}
              </span>
              <MetricInfo content="El canal con mayor retorno por cada $1 invertido en el período seleccionado." />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
                style={{ backgroundColor: `${best.hex}20` }}
              >
                <ChannelIcon channel={best.channel} size={24} />
              </div>
              <div>
                <p className="text-4xl font-bold text-emerald-600 tabular-nums">
                  ${best.roi.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ganás por cada $1 invertido
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{best.tagline}</p>
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
        <Card className="border-rose-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-semibold">Perdiendo dinero</span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700"
              >
                {worst.label}
              </span>
              <MetricInfo content="El canal que menos ROI tiene. Si está por debajo de $1, estás perdiendo plata." />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-4 rounded-lg bg-rose-50 border border-rose-200 p-4">
              <div
                className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
                style={{ backgroundColor: `${worst.hex}20` }}
              >
                <ChannelIcon channel={worst.channel} size={24} />
              </div>
              <div>
                <p className="text-4xl font-bold text-rose-600 tabular-nums">
                  ${worst.roi.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  recuperás por cada $1 invertido
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{worst.tagline}</p>
          </CardContent>
        </Card>
      ) : worst ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Canal más bajo</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                {worst.label}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-4 rounded-lg bg-muted/30 border p-4">
            <div
              className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
              style={{ backgroundColor: `${worst.hex}20` }}
            >
              <ChannelIcon channel={worst.channel} size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">
                ${worst.roi.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                por cada $1 invertido
              </p>
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

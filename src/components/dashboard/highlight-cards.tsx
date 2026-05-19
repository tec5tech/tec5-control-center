import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelIcon } from "@/components/brand/channel-icon";
import { formatCurrency } from "@/lib/utils";
import type { ChannelMetrics } from "@/lib/dashboard-metrics";

function EmptyHighlight({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Sin datos suficientes.</p>
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
      {best ? (
        <Card className="border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>Mejor Inversión</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div
              className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
              style={{ backgroundColor: `${best.hex}20` }}
            >
              <ChannelIcon channel={best.channel} size={24} />
            </div>
            <div>
              <p className="font-semibold text-lg">{best.label}</p>
              <p className="text-sm text-emerald-500 font-medium">
                ${best.roi.toFixed(2)} ganás por cada $1
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(best.invested)} invertidos · {formatCurrency(best.returned)} retornados
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyHighlight title="Mejor Inversión" />
      )}

      {worst && worst.roi < 1 ? (
        <Card className="border-rose-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>Perdiendo Dinero</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div
              className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
              style={{ backgroundColor: `${worst.hex}20` }}
            >
              <ChannelIcon channel={worst.channel} size={24} />
            </div>
            <div>
              <p className="font-semibold text-lg">{worst.label}</p>
              <p className="text-sm text-rose-500 font-medium">
                ${worst.roi.toFixed(2)} recuperás por cada $1
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(worst.invested)} invertidos · {formatCurrency(worst.returned)} retornados
              </p>
            </div>
          </CardContent>
        </Card>
      ) : worst ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>Canal más bajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div
              className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
              style={{ backgroundColor: `${worst.hex}20` }}
            >
              <ChannelIcon channel={worst.channel} size={24} />
            </div>
            <div>
              <p className="font-semibold text-lg">{worst.label}</p>
              <p className="text-sm text-muted-foreground font-medium">
                ${worst.roi.toFixed(2)} por cada $1
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(worst.invested)} invertidos
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyHighlight title="Perdiendo Dinero" />
      )}
    </div>
  );
}

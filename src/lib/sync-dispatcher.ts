import { syncGoogleAds } from "@/lib/google-ads-sync";
import { syncMetaAds } from "@/lib/meta-sync";
import { syncEmailLemlist } from "@/lib/lemlist-sync";
import { syncLinkedinLemlist } from "@/lib/lemlist-linkedin-sync";
import type { Channel } from "@/types/db";

type SyncOk = { ok: true; result?: unknown };
type SyncNotImplemented = { ok: false; reason: "not_implemented" };
export type DispatchResult = SyncOk | SyncNotImplemented;

// Cada syncer actualiza lastSyncAt internamente al terminar con éxito.
// El cron no debe volver a actualizarlo — sería duplicar y podría sobreescribir
// un lastSyncAt real con uno artificial si el syncer falla.
const SYNCERS: Partial<Record<Channel, (actorId?: string) => Promise<unknown>>> = {
  GOOGLE_ADS: syncGoogleAds,
  META_ADS: syncMetaAds,
  EMAIL_OUTREACH: syncEmailLemlist,
  LINKEDIN_OUTREACH: syncLinkedinLemlist,
};

export async function syncDispatcher(
  channel: Channel,
  actorId?: string,
): Promise<DispatchResult> {
  const syncer = SYNCERS[channel];
  if (!syncer) return { ok: false, reason: "not_implemented" };
  const result = await syncer(actorId);
  return { ok: true, result };
}

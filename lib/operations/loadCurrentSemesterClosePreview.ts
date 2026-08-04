import type { SupabaseClient } from "@supabase/supabase-js";

import type { ControlCenterProfileInput } from "@/lib/operations/controlCenterProfiles";
import {
  buildCurrentSemesterClosePreview,
  type CurrentSemesterClosePreview,
} from "@/lib/operations/currentSemesterClosePreview";
import { OPERATIONAL_PROFILE_FIELDS } from "@/lib/operations/loadOperationalSnapshot";
import type { SnapshotCadence } from "@/lib/operations/snapshotArchivePolicy";

export type LoadCurrentSemesterClosePreviewResult = {
  preview: CurrentSemesterClosePreview;
  profiles: ControlCenterProfileInput[];
  error: string | null;
};

export async function loadCurrentSemesterClosePreview(
  supabase: SupabaseClient,
  input?: {
    now?: Date;
    cadence?: SnapshotCadence;
  },
): Promise<LoadCurrentSemesterClosePreviewResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(OPERATIONAL_PROFILE_FIELDS)
    .order("updated_at", { ascending: false })
    .limit(100);

  const profiles = ((data ?? []) as unknown[]) as ControlCenterProfileInput[];

  return {
    preview: buildCurrentSemesterClosePreview({
      profiles,
      now: input?.now,
      cadence: input?.cadence,
    }),
    profiles,
    error: error?.message ?? null,
  };
}

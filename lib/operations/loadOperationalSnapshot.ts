import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOperationalSnapshot,
  type OperationalSnapshot,
} from "@/lib/operations/operationalSnapshot";
import type { ControlCenterProfileInput } from "@/lib/operations/controlCenterProfiles";

export type LoadOperationalSnapshotResult = {
  snapshot: OperationalSnapshot;
  profiles: ControlCenterProfileInput[];
  error: string | null;
};

export const OPERATIONAL_PROFILE_FIELDS =
  "id,first_name,last_name,role,can_act_as_client,can_act_as_professional,active_mode,intranet_role,identity_status,identity_verified,biometric_verified,study_verification_status,study_verified,worker_registration_status,primary_service_profile";

export async function loadOperationalSnapshot(
  supabase: SupabaseClient,
): Promise<LoadOperationalSnapshotResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(OPERATIONAL_PROFILE_FIELDS)
    .order("updated_at", { ascending: false })
    .limit(100);

  const profiles = ((data ?? []) as unknown[]) as ControlCenterProfileInput[];

  return {
    snapshot: buildOperationalSnapshot({ profiles }),
    profiles,
    error: error?.message ?? null,
  };
}

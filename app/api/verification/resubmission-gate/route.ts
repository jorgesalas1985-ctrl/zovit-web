import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bloquea el acceso al vencer el plazo documental y entrega el estado al portal. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ blocked: false });
    const admin = createAdminClient();
    const { data: profile, error } = await admin.from("profiles")
      .select("identity_status,identity_rejection_reason,identity_resubmission_due_at,identity_resubmission_suspended_at")
      .eq("id", auth.user.id).maybeSingle();
    if (error || !profile) return NextResponse.json({ blocked: false });
    const dueAt = profile.identity_resubmission_due_at ? new Date(profile.identity_resubmission_due_at) : null;
    const overdue = profile.identity_status === "rejected" && dueAt && dueAt.getTime() <= Date.now();
    if (overdue && !profile.identity_resubmission_suspended_at) {
      const now = new Date().toISOString();
      await admin.from("profiles").update({ identity_resubmission_suspended_at: now, updated_at: now }).eq("id", auth.user.id);
      profile.identity_resubmission_suspended_at = now;
    }
    return NextResponse.json({
      blocked: profile.identity_status === "rejected" && Boolean(profile.identity_resubmission_suspended_at),
      dueAt: profile.identity_resubmission_due_at,
      reason: profile.identity_rejection_reason,
    });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}

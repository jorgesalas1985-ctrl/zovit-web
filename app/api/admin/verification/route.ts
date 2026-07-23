import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PendingVerificationUser } from "@/lib/verification/types";

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if ("error" in auth) return auth.error;

    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id,first_name,last_name,rut,role,identity_submitted_at")
      .eq("identity_status", "pending")
      .order("identity_submitted_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const profileIds = (profiles ?? []).map((profile) => profile.id);
    if (profileIds.length === 0) {
      return NextResponse.json({ pending: [] satisfies PendingVerificationUser[] });
    }

    const { data: documents, error: docsError } = await admin
      .from("identity_documents")
      .select("id,profile_id,document_type,storage_path,status,admin_notes,metadata,created_at,updated_at")
      .in("profile_id", profileIds);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    const docsByProfile = new Map<string, PendingVerificationUser["documents"]>();
    for (const doc of documents ?? []) {
      const current = docsByProfile.get(doc.profile_id) ?? [];
      current.push(doc);
      docsByProfile.set(doc.profile_id, current);
    }

    const pending: PendingVerificationUser[] = (profiles ?? []).map((profile) => ({
      ...profile,
      documents: docsByProfile.get(profile.id) ?? [],
    }));

    return NextResponse.json({ pending });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

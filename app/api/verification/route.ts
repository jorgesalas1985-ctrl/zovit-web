import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import type { IdentityVerificationState } from "@/lib/verification/types";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { supabase, user, profile } = auth;

    const { data: documents, error } = await supabase
      .from("identity_documents")
      .select("id,profile_id,document_type,storage_path,status,admin_notes,metadata,created_at,updated_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payload: IdentityVerificationState = {
      identity_status: profile.identity_status ?? "none",
      identity_verified: profile.identity_verified ?? false,
      biometric_verified: profile.biometric_verified ?? false,
      identity_verified_at: profile.identity_verified_at ?? null,
      identity_submitted_at: profile.identity_submitted_at ?? null,
      identity_rejection_reason: profile.identity_rejection_reason ?? null,
      documents: documents ?? [],
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { supabase } = auth;
    const { error } = await supabase.rpc("submit_identity_verification");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

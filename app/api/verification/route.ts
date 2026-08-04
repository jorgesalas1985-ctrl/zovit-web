import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { isValidStoragePathForUser, isValidUuid } from "@/lib/security/validation";
import type { IdentityVerificationState } from "@/lib/verification/types";
import { processIdentityAiReview } from "@/lib/verification/processIdentityAiReview";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { supabase, user, profile } = auth;
    if (!isValidUuid(user.id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

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
      study_verification_status: profile.study_verification_status ?? "none",
      study_verified: profile.study_verified ?? false,
      study_submitted_at: profile.study_submitted_at ?? null,
      study_rejection_reason: profile.study_rejection_reason ?? null,
      documents: (documents ?? []).filter((doc) =>
        isValidStoragePathForUser(doc.storage_path, user.id),
      ),
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

    const { supabase, user } = auth;
    const { error } = await supabase.rpc("submit_identity_verification");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // OCR automático del carnet: aprueba/rechaza o deja dudoso para humano.
    void processIdentityAiReview(user.id).catch((err) => {
      console.error("[identity-ai] post-submit failed", err);
    });

    return NextResponse.json({ ok: true, ocrQueued: true, aiQueued: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

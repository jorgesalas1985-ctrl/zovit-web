import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

type ReviewBody = {
  action?: "approve" | "reject";
  reason?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const auth = await requirePlatformAdmin();
    if ("error" in auth) return auth.error;

    const { profileId } = await context.params;
    const body = (await request.json()) as ReviewBody;

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }

    if (body.action === "reject" && !body.reason?.trim()) {
      return NextResponse.json({ error: "Indica el motivo del rechazo." }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (body.action === "approve") {
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          identity_status: "approved",
          identity_verified: true,
          identity_verified_at: now,
          identity_rejection_reason: null,
          updated_at: now,
        })
        .eq("id", profileId)
        .eq("identity_status", "pending");

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      await admin
        .from("identity_documents")
        .update({ status: "approved", reviewed_by: auth.user.id, reviewed_at: now, updated_at: now })
        .eq("profile_id", profileId);

      return NextResponse.json({ ok: true, status: "approved" });
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        identity_status: "rejected",
        identity_verified: false,
        identity_verified_at: null,
        identity_rejection_reason: body.reason?.trim() ?? "Documentos no válidos.",
        updated_at: now,
      })
      .eq("id", profileId)
      .eq("identity_status", "pending");

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    await admin
      .from("identity_documents")
      .update({
        status: "rejected",
        admin_notes: body.reason?.trim() ?? null,
        reviewed_by: auth.user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("profile_id", profileId);

    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const auth = await requirePlatformAdmin();
    if ("error" in auth) return auth.error;

    const { profileId } = await context.params;
    const admin = createAdminClient();

    const { data: documents, error } = await admin
      .from("identity_documents")
      .select("id,document_type,storage_path,status,created_at")
      .eq("profile_id", profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const signed = await Promise.all(
      (documents ?? []).map(async (doc) => {
        const { data } = await admin.storage
          .from("identity-documents")
          .createSignedUrl(doc.storage_path, 3600);
        return { ...doc, signedUrl: data?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ documents: signed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

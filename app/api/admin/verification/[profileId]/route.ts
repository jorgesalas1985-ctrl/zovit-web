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

    if (body.action === "approve") {
      const { error: profileError } = await auth.supabase.rpc("review_identity_verification", {
        target_profile_id: profileId,
        review_action: "approve",
      });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, status: "approved" });
    }

    const { error: profileError } = await auth.supabase.rpc("review_identity_verification", {
      target_profile_id: profileId,
      review_action: "reject",
      rejection_reason: body.reason?.trim() ?? "Documentos no válidos.",
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

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
      .select("id,document_type,storage_path,status,metadata,created_at")
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

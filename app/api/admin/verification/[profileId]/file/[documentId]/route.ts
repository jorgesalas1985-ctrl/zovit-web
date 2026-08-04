import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidStoragePathForUser, isValidUuid } from "@/lib/security/validation";
import { NextResponse, type NextRequest } from "next/server";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false as const, status: 401, error: "No autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,intranet_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const isAdmin =
    profile?.role === "admin" || profile?.intranet_role === "super_admin";

  if (!isAdmin) {
    return { ok: false as const, status: 403, error: "No tienes permiso." };
  }

  return { ok: true as const };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ profileId: string; documentId: string }> },
) {
  try {
    const auth = await requirePlatformAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profileId, documentId } = await context.params;
    if (!isValidUuid(profileId) || !isValidUuid(documentId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: doc, error: docError } = await admin
      .from("identity_documents")
      .select("id,profile_id,storage_path,document_type")
      .eq("id", documentId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }
    if (!doc?.storage_path || !isValidStoragePathForUser(doc.storage_path, profileId)) {
      return NextResponse.json({ error: "Documento no encontrado en la base de datos." }, { status: 404 });
    }

    const { data: signed, error: signError } = await admin.storage
      .from("identity-documents")
      .createSignedUrl(doc.storage_path, 3600);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json(
        {
          error:
            signError?.message ||
            `No se pudo abrir el archivo (ruta: ${doc.storage_path}).`,
          storagePath: doc.storage_path,
        },
        { status: 404 },
      );
    }

    if (request.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(signed.signedUrl);
    }

    return NextResponse.json({
      url: signed.signedUrl,
      documentType: doc.document_type,
      storagePath: doc.storage_path,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

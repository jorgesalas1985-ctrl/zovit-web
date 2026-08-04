import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { isValidStoragePathForUser, isValidUuid } from "@/lib/security/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

async function requireOperationalDocumentFileAccess() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  if (!role || !["hr_admin", "supervisor", "super_admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOperationalDocumentFileAccess();
    if ("error" in auth) return auth.error;

    const documentId = request.nextUrl.searchParams.get("documentId") ?? "";
    if (!isValidUuid(documentId)) {
      return NextResponse.json({ error: "Documento invalido." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: document, error: documentError } = await admin
      .from("operational_documents")
      .select("id,profile_id,document_kind,storage_bucket,storage_path,mime_type,original_name")
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) {
      return NextResponse.json({ error: documentError.message }, { status: 500 });
    }

    if (
      !document?.storage_bucket ||
      !document.storage_path ||
      !isValidStoragePathForUser(document.storage_path, document.profile_id)
    ) {
      return NextResponse.json(
        { error: "Documento no encontrado o ruta de archivo invalida." },
        { status: 404 },
      );
    }

    const { data: signed, error: signError } = await admin.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, 3600);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json(
        {
          error:
            signError?.message ??
            `No se pudo firmar el archivo documental (${document.storage_path}).`,
          storagePath: document.storage_path,
        },
        { status: 404 },
      );
    }

    if (request.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(signed.signedUrl);
    }

    return NextResponse.json(
      {
        url: signed.signedUrl,
        documentKind: document.document_kind,
        mimeType: document.mime_type,
        originalName: document.original_name,
        storagePath: document.storage_path,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

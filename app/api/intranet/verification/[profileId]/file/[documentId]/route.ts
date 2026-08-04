import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { canViewerSeePlatformAccount, hiddenAccountResponse } from "@/lib/intranet/accessVisibility";
import { getPlatformUser } from "@/lib/intranet/platformUsers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid, isValidStoragePathForUser } from "@/lib/security/validation";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Devuelve un enlace firmado al documento (JSON) o redirige si ?redirect=1.
 * Evita cargar videos/imágenes grandes en la función serverless.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ profileId: string; documentId: string }> },
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!["hr_admin", "super_admin"].includes(auth.manager.intranetRole)) {
      return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
    }

    const { profileId, documentId } = await context.params;
    if (!isValidUuid(profileId) || !isValidUuid(documentId)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const current = await getPlatformUser(profileId);
    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (!canViewerSeePlatformAccount(auth.manager.intranetRole, current)) {
      const hidden = hiddenAccountResponse();
      return NextResponse.json({ error: hidden.error }, { status: hidden.status });
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
      // Diagnóstico: ¿existe el objeto?
      const folder = doc.storage_path.includes("/")
        ? doc.storage_path.slice(0, doc.storage_path.lastIndexOf("/"))
        : "";
      const fileName = doc.storage_path.split("/").pop() ?? "";
      const { data: listed } = folder
        ? await admin.storage.from("identity-documents").list(folder, { search: fileName })
        : { data: null };
      const exists = (listed ?? []).some((item) => item.name === fileName);

      return NextResponse.json(
        {
          error: exists
            ? signError?.message || "No se pudo firmar la URL del documento."
            : `Archivo no encontrado en Storage (ruta: ${doc.storage_path}). Puede haberse borrado o no haberse subido bien.`,
          storagePath: doc.storage_path,
        },
        { status: 404 },
      );
    }

    const redirect = request.nextUrl.searchParams.get("redirect") === "1";
    if (redirect) {
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

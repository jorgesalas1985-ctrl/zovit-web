import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStoragePathForUser } from "@/lib/security/validation";

export async function GET(_request: Request, context: { params: Promise<{ profileId: string; documentId: string }> }) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const { data: actor } = await supabase.from("profiles").select("intranet_role").eq("id", auth.user.id).maybeSingle();
    if (actor?.intranet_role !== "hr_admin" && actor?.intranet_role !== "super_admin") {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    }
    const { profileId, documentId } = await context.params;
    const admin = createAdminClient();
    const { data: document, error } = await admin
      .from("identity_documents")
      .select("storage_path")
      .eq("id", documentId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error || !document || !isValidStoragePathForUser(document.storage_path, profileId)) {
      return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    }
    const { data, error: signError } = await admin.storage
      .from("identity-documents")
      .createSignedUrl(document.storage_path, 600);
    if (signError || !data?.signedUrl) throw signError ?? new Error("No se pudo abrir el documento.");
    return NextResponse.json({ url: data.signedUrl, fileName: document.storage_path.split("/").pop() ?? "documento" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir el documento." }, { status: 500 });
  }
}

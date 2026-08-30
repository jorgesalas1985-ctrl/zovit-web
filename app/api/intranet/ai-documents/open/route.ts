import { NextResponse } from "next/server";
import { hasAiVaultSession, requireRealSuperAdmin } from "@/lib/intranet/aiVault";
import { createAdminClient } from "@/lib/supabase/admin";
import { findStudentEnrollmentByRut } from "@/lib/intranet/zovitPrivateRecords";

export async function GET(request: Request) {
  const user = await requireRealSuperAdmin();
  if (!user || !(await hasAiVaultSession(user.id))) return NextResponse.json({ error: "Acceso privado no autorizado." }, { status: 403 });
  const rut = new URL(request.url).searchParams.get("rut") ?? "";
  const record = await findStudentEnrollmentByRut(rut);
  if (!record) return NextResponse.json({ error: "El documento ya no está disponible." }, { status: 404 });
  const { data, error } = await createAdminClient().storage.from(record.bucket).createSignedUrl(record.storagePath, 120);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "No se pudo abrir el documento." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}

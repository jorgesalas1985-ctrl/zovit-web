import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listOcrCheckedVerificationUsers, listPendingVerificationUsers } from "@/lib/intranet/verificationQueue";

async function canReviewIdentities() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", data.user.id)
    .maybeSingle();
  return profile?.intranet_role === "hr_admin" || profile?.intranet_role === "super_admin";
}

export async function GET() {
  try {
    if (!(await canReviewIdentities())) {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    }
    const [pending, checked] = await Promise.all([
      listPendingVerificationUsers(),
      listOcrCheckedVerificationUsers(),
    ]);
    return NextResponse.json({ pending, checked });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la cola de verificación." },
      { status: 500 },
    );
  }
}

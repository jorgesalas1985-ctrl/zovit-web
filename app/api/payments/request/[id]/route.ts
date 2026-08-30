import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/security/validation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { id: requestId } = await params;
    if (!isValidUuid(requestId)) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const admin = createAdminClient();
    const { data: payment, error } = await admin
      .from("payments")
      .select("id,public_id,status,client_id,professional_id")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!payment) return NextResponse.json({ payment: null });
    if (payment.client_id !== authData.user.id && payment.professional_id !== authData.user.id) {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
      if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    return NextResponse.json({ payment: { id: payment.id, publicId: payment.public_id, status: payment.status } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado." }, { status: 500 });
  }
}

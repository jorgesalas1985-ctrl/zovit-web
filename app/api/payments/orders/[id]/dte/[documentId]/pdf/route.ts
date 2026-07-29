import { listTaxDocumentsForPayment } from "@/lib/billing/haulmer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; documentId: string }> };

/** Descarga PDF del DTE emitido (base64 → application/pdf). */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, documentId } = await params;
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("client_id,professional_id")
      .eq("id", id)
      .maybeSingle();
    if (!payment) {
      return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });
    }

    const isOwner =
      payment.client_id === authData.user.id || payment.professional_id === authData.user.id;
    if (!isOwner) {
      const { data: profile } = await admin
        .from("profiles")
        .select("intranet_role")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profile?.intranet_role !== "super_admin") {
        return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
      }
    }

    const documents = await listTaxDocumentsForPayment(id);
    const doc = documents.find((item) => item.id === documentId);
    if (!doc || doc.status !== "issued" || !doc.pdfBase64) {
      return NextResponse.json({ error: "PDF no disponible." }, { status: 404 });
    }

    const buffer = Buffer.from(doc.pdfBase64, "base64");
    const folio = doc.folio ?? documentId.slice(0, 8);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="zovit-dte-${folio}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

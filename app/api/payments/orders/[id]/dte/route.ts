import { emitDteForPayment, listTaxDocumentsForPayment } from "@/lib/billing/haulmer";
import { HAULMER_DTE_TYPES, type HaulmerDteScope, type HaulmerDteType } from "@/lib/billing/haulmer/types";
import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function canViewPayment(userId: string, paymentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("client_id,professional_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return false;
  if (payment.client_id === userId || payment.professional_id === userId) return true;
  const { data: profile } = await admin
    .from("profiles")
    .select("intranet_role")
    .eq("id", userId)
    .maybeSingle();
  return profile?.intranet_role === "super_admin";
}

/** Lista DTE asociados al pago (cliente, pro o super admin). */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (!(await canViewPayment(authData.user.id, id))) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const documents = await listTaxDocumentsForPayment(id);
    return NextResponse.json({
      documents: documents.map((doc) => ({
        ...doc,
        // No enviar PDF/XML enormes en el listado.
        pdfBase64: doc.pdfBase64 ? "[present]" : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Emite boleta/factura Haulmer (solo super admin). */
export async function POST(request: Request, { params }: Params) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      dteType?: number;
      scope?: HaulmerDteScope;
      force?: boolean;
    };

    const dteType = (body.dteType ?? HAULMER_DTE_TYPES.boletaAfecta) as HaulmerDteType;
    if (dteType !== 33 && dteType !== 39) {
      return NextResponse.json({ error: "dteType debe ser 33 (factura) o 39 (boleta)." }, { status: 400 });
    }

    const scope: HaulmerDteScope = body.scope === "commission" ? "commission" : "service";

    const result = await emitDteForPayment({
      paymentId: id,
      actorId: auth.manager.userId,
      dteType,
      scope,
      force: Boolean(body.force),
    });

    return NextResponse.json({
      alreadyIssued: result.alreadyIssued,
      document: {
        ...result.document,
        pdfBase64: result.document.pdfBase64 ? "[present]" : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

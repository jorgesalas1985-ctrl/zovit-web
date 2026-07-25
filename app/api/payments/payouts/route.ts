import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const superAuth = await requireIntranetSuperAdmin();
    if (superAuth.ok) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ payouts: data ?? [] });
    }

    const { data, error } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ payouts: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      amount?: number;
      bankName?: string;
      bankAccountType?: string;
      bankAccountNumber?: string;
      accountHolderName?: string;
      accountHolderRut?: string;
    };

    const { data, error } = await supabase.rpc("request_payout", {
      p_amount: Number(body.amount),
      p_bank_name: body.bankName ?? "",
      p_bank_account_type: body.bankAccountType ?? "",
      p_bank_account_number: body.bankAccountNumber ?? "",
      p_account_holder_name: body.accountHolderName ?? "",
      p_account_holder_rut: body.accountHolderRut ?? "",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, payoutId: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

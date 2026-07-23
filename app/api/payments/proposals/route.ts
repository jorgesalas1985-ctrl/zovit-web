import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      requestId?: string;
      amount?: number;
      description?: string;
      estimatedHours?: number;
    };

    if (!body.requestId || !body.amount || !body.description) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_service_proposal", {
      p_request_id: body.requestId,
      p_amount: body.amount,
      p_description: body.description,
      p_estimated_hours: body.estimatedHours ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ proposalId: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { listPendingVerificationUsers } from "@/lib/intranet/verificationQueue";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!["hr_admin", "super_admin"].includes(auth.manager.intranetRole)) {
      return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
    }

    const pending = await listPendingVerificationUsers();
    return NextResponse.json({ pending }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

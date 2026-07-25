import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { listPlatformUsers } from "@/lib/intranet/platformUsers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Todas las cuentas: solo super admin (RR.HH. no lista la plataforma completa).
    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const users = await listPlatformUsers();
    return NextResponse.json({ users }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

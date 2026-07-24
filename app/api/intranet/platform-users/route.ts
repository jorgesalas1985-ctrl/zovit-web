import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { canViewerSeePlatformAccount } from "@/lib/intranet/accessVisibility";
import { listPlatformUsers } from "@/lib/intranet/platformUsers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const users = await listPlatformUsers();
    const visibleUsers = users.filter((user) =>
      canViewerSeePlatformAccount(auth.manager.intranetRole, user)
    );
    return NextResponse.json({ users: visibleUsers }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

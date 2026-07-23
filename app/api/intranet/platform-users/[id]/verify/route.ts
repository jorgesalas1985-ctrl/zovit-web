import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { getPlatformUser, reviewPlatformUserVerification } from "@/lib/intranet/platformUsers";
import { NextResponse } from "next/server";

type VerifyBody = {
  action?: "approve" | "reject";
  reason?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = (await request.json()) as VerifyBody;

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }

    if (body.action === "reject" && !body.reason?.trim()) {
      return NextResponse.json({ error: "Indica el motivo del rechazo." }, { status: 400 });
    }

    const current = await getPlatformUser(id);
    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (current.identityStatus !== "pending") {
      return NextResponse.json({ error: "Este usuario no tiene verificación pendiente." }, { status: 400 });
    }

    await reviewPlatformUserVerification(id, body.action, body.reason);
    return NextResponse.json({ ok: true, status: body.action === "approve" ? "approved" : "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

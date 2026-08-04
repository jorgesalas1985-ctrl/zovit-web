import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { canViewerSeePlatformAccount, hiddenAccountResponse } from "@/lib/intranet/accessVisibility";
import { isValidUuid } from "@/lib/security/validation";
import { getPlatformUser, reviewPlatformUserVerification } from "@/lib/intranet/platformUsers";
import { getVerificationDocuments } from "@/lib/intranet/verificationQueue";
import { NextResponse, type NextRequest } from "next/server";

type ReviewBody = {
  action?: "approve" | "reject";
  reason?: string;
  carnetBirthDateMatches?: boolean;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!["hr_admin", "super_admin"].includes(auth.manager.intranetRole)) {
      return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
    }

    const { profileId } = await context.params;
    if (!isValidUuid(profileId)) {
      return NextResponse.json({ error: "profileId inválido." }, { status: 400 });
    }

    const current = await getPlatformUser(profileId);
    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (!canViewerSeePlatformAccount(auth.manager.intranetRole, current)) {
      const hidden = hiddenAccountResponse();
      return NextResponse.json({ error: hidden.error }, { status: hidden.status });
    }

    const documents = await getVerificationDocuments(profileId);
    return NextResponse.json({ documents, user: current });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const auth = await requireIntranetManager();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!["hr_admin", "super_admin"].includes(auth.manager.intranetRole)) {
      return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
    }

    const { profileId } = await context.params;
    if (!isValidUuid(profileId)) {
      return NextResponse.json({ error: "profileId inválido." }, { status: 400 });
    }

    const body = (await request.json()) as ReviewBody;

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }

    if (body.action === "reject" && !body.reason?.trim()) {
      return NextResponse.json({ error: "Indica el motivo del rechazo." }, { status: 400 });
    }

    const current = await getPlatformUser(profileId);
    if (!current) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (!canViewerSeePlatformAccount(auth.manager.intranetRole, current)) {
      const hidden = hiddenAccountResponse();
      return NextResponse.json({ error: hidden.error }, { status: hidden.status });
    }

    if (current.intranetRole === "super_admin" && body.action === "reject") {
      return NextResponse.json(
        { error: "No se puede rechazar la verificación del super administrador." },
        { status: 403 },
      );
    }

    if (current.identityStatus !== "pending") {
      return NextResponse.json({ error: "Este usuario no tiene verificación pendiente." }, { status: 400 });
    }

    await reviewPlatformUserVerification(profileId, body.action, body.reason, {
      carnetBirthDateMatches: body.carnetBirthDateMatches === true,
      reviewerId: auth.manager.userId,
    });
    return NextResponse.json({ ok: true, status: body.action === "approve" ? "approved" : "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    const status =
      message.includes("corroborar") ||
      message.includes("carnet") ||
      message.includes("super administrador")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

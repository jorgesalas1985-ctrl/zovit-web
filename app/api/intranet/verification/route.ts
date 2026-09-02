import { NextResponse } from "next/server";
import { listOcrCheckedVerificationUsers, listPendingVerificationUsers, parseVerificationQueueCursor } from "@/lib/intranet/verificationQueue";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";

export async function GET(request: Request) {
  try {
    if (!(await getIntranetReviewer())) {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    }
    const [pending, checked] = await Promise.all([
      listPendingVerificationUsers({ cursor: parseVerificationQueueCursor(new URL(request.url).searchParams.get("cursor")) }),
      listOcrCheckedVerificationUsers(),
    ]);
    return NextResponse.json({ pending, checked });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la cola de verificación." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { listOcrCheckedVerificationUsers, listPendingVerificationUsers } from "@/lib/intranet/verificationQueue";
import { getIntranetReviewer } from "@/lib/intranet/apiAuth";

export async function GET() {
  try {
    if (!(await getIntranetReviewer())) {
      return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    }
    const [pending, checked] = await Promise.all([
      listPendingVerificationUsers(),
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

import { NextResponse } from "next/server";
import { hasAiVaultSession, requireRealSuperAdmin } from "@/lib/intranet/aiVault";
import { getTraining } from "@/lib/intranet/zovitAiTraining";
import { loadAiConversation, sendAiMessage } from "@/lib/intranet/zovitAiConversation";

async function authorize() {
  const user = await requireRealSuperAdmin();
  return user && await hasAiVaultSession(user.id) ? user : null;
}

export async function GET() {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Acceso privado no autorizado." }, { status: 403 });
  return NextResponse.json(await loadAiConversation(user.id));
}

export async function POST(request: Request) {
  try {
    const user = await authorize();
    if (!user) return NextResponse.json({ error: "Acceso privado no autorizado." }, { status: 403 });
    const body = await request.json() as { message?: string; asOrder?: boolean };
    return NextResponse.json(await sendAiMessage(user.id, String(body.message ?? ""), Boolean(body.asOrder), await getTraining(user.id)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible comunicarse con ZOVIT IA." }, { status: 500 });
  }
}

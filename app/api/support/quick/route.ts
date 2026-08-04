import { answerHelpWithOptionalAi } from "@/lib/support/quickHelp";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { question?: string };
    const question = String(body.question ?? "").slice(0, 500);
    if (!question.trim()) {
      return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
    }
    const result = await answerHelpWithOptionalAi(question);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

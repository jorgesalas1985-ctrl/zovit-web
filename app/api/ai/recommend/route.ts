import { recommendProfessionals } from "@/lib/ai/recommendProfessionals";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; commune?: string };
    const query = body.query?.trim() ?? "";

    if (query.length < 8) {
      return NextResponse.json(
        { error: "Describe tu problema con al menos 8 caracteres." },
        { status: 400 },
      );
    }

    const result = await recommendProfessionals(query, body.commune);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo analizar la consulta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { searchServiceProfessionals } from "@/lib/services/searchProfessionals";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      category?: string;
      specialty?: string;
      commune?: string;
      minRating?: number;
      limit?: number;
    };

    if (!body.category || !body.specialty) {
      return NextResponse.json({ error: "Categoría y especialidad son requeridas." }, { status: 400 });
    }

    const professionals = await searchServiceProfessionals({
      category: body.category,
      specialty: body.specialty,
      commune: body.commune,
      minRating: body.minRating ?? 0,
      limit: body.limit ?? 12,
    });

    return NextResponse.json({ professionals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar profesionales.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

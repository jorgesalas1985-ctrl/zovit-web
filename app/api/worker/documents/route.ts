import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

function safePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const folder = safePart(String(form.get("folder") ?? "document"));
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Formato no permitido." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "El archivo supera los 10 MB." }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${authData.user.id}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("worker-credentials").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: `No se pudo guardar el documento: ${error.message}` }, { status: 400 });

  return NextResponse.json({ path, mime: file.type, name: file.name });
}

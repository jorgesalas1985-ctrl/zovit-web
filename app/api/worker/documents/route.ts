import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "worker-credentials";
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "docs").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPG, PNG, WEBP o PDF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo no puede superar 10 MB." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Asegurar bucket (idempotente).
    const { data: buckets } = await admin.storage.listBuckets();
    const exists = (buckets ?? []).some((b) => b.id === BUCKET || b.name === BUCKET);
    if (!exists) {
      const { error: createError } = await admin.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: Array.from(ALLOWED),
      });
      if (createError && !/already exists|duplicate/i.test(createError.message)) {
        return NextResponse.json(
          {
            error: `No se pudo preparar el almacenamiento: ${createError.message}`,
            hint: "Ejecuta supabase/SPRINT_12_WORKER_AI_VALIDATION.sql en Supabase.",
          },
          { status: 500 }
        );
      }
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${auth.user.id}/${folder || "docs"}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json(
        {
          error: uploadError.message,
          hint: "Si persiste, ejecuta supabase/SPRINT_12_WORKER_AI_VALIDATION.sql en Supabase.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      path,
      mime: file.type,
      name: file.name,
      bucket: BUCKET,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

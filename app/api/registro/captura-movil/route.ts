import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "identity-documents";
const MAX_BYTES = 8 * 1024 * 1024;
const TOKEN_RE = /^[a-f0-9-]{36}$/i;

const ALLOWED_TYPES = new Set([
  "cedula_front",
  "cedula_back",
  "certificado_antecedentes",
  "certificado_estudios",
  "selfie",
  "liveness_proof",
]);

async function ensureBucket(admin = createAdminClient()) {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = (buckets ?? []).some((bucket) => bucket.id === BUCKET || bucket.name === BUCKET);
  if (exists) return;

  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ["image/jpeg"],
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`No se pudo preparar el almacenamiento: ${error.message}`);
  }
}

function buildPath(token: string, type: string) {
  return `mobile-registration/${token}/${type}/photo.jpg`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const type = url.searchParams.get("type") ?? "";

    if (!TOKEN_RE.test(token)) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    }

    const admin = createAdminClient();
    await ensureBucket(admin);

    const path = buildPath(token, type);
    const { data: fileData, error: downloadError } = await admin.storage.from(BUCKET).download(path);
    if (downloadError || !fileData) {
      return NextResponse.json({ ready: false });
    }

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ ready: false });
    }

    return NextResponse.json({
      ready: true,
      path,
      signedUrl: data.signedUrl,
      fileName: `${type}-celular.jpg`,
      contentType: "image/jpeg",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("token") ?? "");
    const type = String(form.get("type") ?? "");
    const file = form.get("file");

    if (!TOKEN_RE.test(token)) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta la foto." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "La foto no puede superar 8 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const admin = createAdminClient();
    await ensureBucket(admin);

    const path = buildPath(token, type);
    const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

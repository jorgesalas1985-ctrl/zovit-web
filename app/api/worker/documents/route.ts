import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { isValidUuid } from "@/lib/security/validation";
import {
  clientIpFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOperationalDocumentInsert,
  registerOperationalDocument,
  type OperationalDocumentKind,
} from "@/lib/operations/documentRenewalPersistence";

const BUCKET = "worker-credentials";
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;

function sniffMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function documentKindFromFolder(folder: string): OperationalDocumentKind {
  if (folder === "identity") return "identity";
  if (folder === "licenses") return "license";
  if (folder === "student" || folder === "training") return "student_enrollment";
  if (folder === "background") return "background";
  if (folder === "docs" || folder === "credentials") return "credential";
  return "other";
}

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;
    if (!isValidUuid(auth.user.id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`upload:worker:${auth.user.id}:${ip}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "docs").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo no puede superar 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMime(buffer);
    if (!sniffed || !ALLOWED.has(sniffed)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPG, PNG, WEBP o PDF reales." },
        { status: 400 },
      );
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

    const extension = EXT_BY_MIME[sniffed] ?? "bin";
    const path = `${auth.user.id}/${folder || "docs"}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: sniffed,
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

    const operationalDocument = buildOperationalDocumentInsert({
      profileId: auth.user.id,
      documentKind: documentKindFromFolder(folder || "docs"),
      bucket: BUCKET,
      path,
      originalName: file.name,
      mimeType: sniffed,
      fileSizeBytes: file.size,
    });
    const operationalRegistration = await registerOperationalDocument({
      supabase: admin,
      document: operationalDocument,
      actorId: auth.user.id,
      actorType: "user",
    });

    return NextResponse.json({
      ok: true,
      path,
      mime: sniffed,
      name: file.name,
      bucket: BUCKET,
      operationalDocument: {
        documentId: operationalRegistration.documentId,
        eventId: operationalRegistration.eventId,
        registered: !operationalRegistration.error,
        warning: operationalRegistration.error,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

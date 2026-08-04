import { isIntranetRole } from "@/lib/auth/intranetRoles";
import {
  buildOperationalDocumentEventInsert,
  type OperationalDocumentActorType,
  type OperationalDocumentEventType,
} from "@/lib/operations/documentRenewalPersistence";
import { loadDocumentEventInbox } from "@/lib/operations/documentEventInbox";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/security/validation";
import { NextResponse } from "next/server";

const ALLOWED_EVENTS: OperationalDocumentEventType[] = [
  "submitted",
  "replaced",
  "ocr_requested",
  "ocr_completed",
  "manual_review_requested",
  "approved",
  "rejected",
  "expired",
  "semester_renewal_reminder",
  "semester_suspension_ready",
];

async function requireDocumentEventAccess() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  if (!role || !["hr_admin", "supervisor", "super_admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { supabase, userId: authData.user.id, role };
}

export async function GET(request: Request) {
  try {
    const auth = await requireDocumentEventAccess();
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const eventType = parseEventType(url.searchParams.get("eventType"));
    const inbox = await loadDocumentEventInbox(auth.supabase, {
      limit: parseLimit(url.searchParams.get("limit")),
      eventType: eventType ?? undefined,
    });

    return NextResponse.json(
      {
        inbox,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDocumentEventAccess();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const profileId = typeof body.profileId === "string" ? body.profileId : "";
    const documentId = typeof body.documentId === "string" ? body.documentId : null;
    const eventType = parseEventType(body.eventType);

    if (!isValidUuid(profileId)) {
      return NextResponse.json({ error: "Perfil invalido." }, { status: 400 });
    }

    if (documentId && !isValidUuid(documentId)) {
      return NextResponse.json({ error: "Documento invalido." }, { status: 400 });
    }

    if (!eventType) {
      return NextResponse.json({ error: "Evento documental no valido." }, { status: 400 });
    }

    const event = buildOperationalDocumentEventInsert({
      documentId,
      profileId,
      eventType,
      actorId: auth.userId,
      actorType: actorTypeFromRole(auth.role),
      summary: typeof body.summary === "string" ? body.summary : undefined,
      metadata: isRecord(body.metadata) ? body.metadata : {},
    });

    const { data, error } = await auth.supabase
      .from("operational_document_events")
      .insert(event)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        eventId: (data as { id?: string } | null)?.id ?? null,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseEventType(value: unknown): OperationalDocumentEventType | null {
  if (typeof value !== "string") return null;
  return ALLOWED_EVENTS.includes(value as OperationalDocumentEventType)
    ? (value as OperationalDocumentEventType)
    : null;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function actorTypeFromRole(role: string): OperationalDocumentActorType {
  if (role === "super_admin") return "superadmin";
  if (role === "supervisor") return "supervisor";
  return "operations";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { isIntranetRole } from "@/lib/auth/intranetRoles";
import type { OperationalDocumentActorType } from "@/lib/operations/documentRenewalPersistence";
import { prepareDocumentRenewalReminderEvents } from "@/lib/operations/documentRenewalReminderPreparation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requirePrepareReminderAccess() {
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

  return { userId: authData.user.id, actorType: actorTypeFromRole(role) };
}

export async function POST(request: Request) {
  try {
    const auth = await requirePrepareReminderAccess();
    if ("error" in auth) return auth.error;

    const body = await readJsonBody(request);
    const result = await prepareDocumentRenewalReminderEvents({
      supabase: createAdminClient(),
      actorId: auth.userId,
      actorType: auth.actorType,
      limit: parseLimit(body.limit),
    });

    if (result.error) {
      return NextResponse.json({ ok: false, result }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        result,
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

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseLimit(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  return Number.isFinite(value) ? value : undefined;
}

function actorTypeFromRole(role: string): OperationalDocumentActorType {
  if (role === "super_admin") return "superadmin";
  if (role === "supervisor") return "supervisor";
  return "operations";
}

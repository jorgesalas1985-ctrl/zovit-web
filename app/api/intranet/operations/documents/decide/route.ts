import { isIntranetRole } from "@/lib/auth/intranetRoles";
import {
  decideOperationalDocument,
  type DocumentManualDecisionAction,
} from "@/lib/operations/documentManualDecision";
import { runDocumentDecisionEffects } from "@/lib/operations/documentDecisionEffects";
import type { OperationalDocumentActorType } from "@/lib/operations/documentRenewalPersistence";
import { isValidUuid } from "@/lib/security/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireDocumentDecisionAccess() {
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
    const auth = await requireDocumentDecisionAccess();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    const action = parseAction(body.action);

    if (!isValidUuid(documentId)) {
      return NextResponse.json({ error: "Documento invalido." }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "Decision documental no valida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await decideOperationalDocument({
      supabase: admin,
      documentId,
      action,
      actorId: auth.userId,
      actorType: auth.actorType,
      reason: typeof body.reason === "string" ? body.reason : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, result }, { status: 400 });
    }

    const effects = await runDocumentDecisionEffects({
      supabase: admin,
      profileId: result.profileId,
      documentId: result.documentId,
      actorId: auth.userId,
      actorType: auth.actorType,
    });

    return NextResponse.json(
      {
        ok: true,
        result,
        effects,
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

function parseAction(value: unknown): DocumentManualDecisionAction | null {
  return value === "approve" || value === "reject" ? value : null;
}

function actorTypeFromRole(role: string): OperationalDocumentActorType {
  if (role === "super_admin") return "superadmin";
  if (role === "supervisor") return "supervisor";
  return "operations";
}

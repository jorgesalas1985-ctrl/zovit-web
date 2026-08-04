import { isIntranetRole } from "@/lib/auth/intranetRoles";
import {
  loadAutomationRunHistory,
  type AutomationRunOperationalPriority,
} from "@/lib/automation/automationRunHistory";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAutomationRunHistoryAccess() {
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
  if (!role || !["hr_admin", "super_admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { supabase };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAutomationRunHistoryAccess();
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const history = await loadAutomationRunHistory(auth.supabase, {
      limit: parseLimit(url.searchParams.get("limit")),
      staleAfterHours: parseLimit(url.searchParams.get("staleAfterHours")),
      priority: parsePriority(url.searchParams.get("priority")),
    });

    return NextResponse.json(
      { history },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePriority(value: string | null): AutomationRunOperationalPriority | undefined {
  if (value === "normal" || value === "attention" || value === "urgent") return value;
  return undefined;
}

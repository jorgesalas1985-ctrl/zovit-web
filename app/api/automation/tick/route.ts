import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { requireIntranetManager } from "@/lib/intranet/apiAuth";
import { persistOperationalAutomationRunBestEffort } from "@/lib/automation/automationRunPersistence";
import { runAutomationCycle } from "@/lib/automation/runAutomationCycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Disparo manual/automático desde paneles admin/intranet.
 * Complementa el cron diario (Hobby) para respuestas más rápidas.
 */
export async function POST() {
  try {
    const intranet = await requireIntranetManager();
    let allowed = false;
    let actorId: string | null = null;

    if (intranet.ok && ["hr_admin", "super_admin"].includes(intranet.manager.intranetRole)) {
      allowed = true;
      actorId = intranet.manager.userId;
    } else {
      const auth = await requireAuthenticatedUser();
      if (!("error" in auth) && auth.profile.role === "admin") {
        allowed = true;
        actorId = auth.user.id;
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const result = await runAutomationCycle({
      identityLimit: 4,
      workerLimit: 4,
      matchLimit: 8,
      paymentLimit: 8,
    });
    const automationRun = await persistOperationalAutomationRunBestEffort({
      createSupabase: createAdminClient,
      result,
      triggerSource: "ticker",
      userId: actorId,
    });

    return NextResponse.json({ ok: true, ...result, automationRun });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

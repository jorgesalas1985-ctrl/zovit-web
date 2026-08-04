import { assertCronAuthorized } from "@/lib/automation/cronAuth";
import { persistOperationalAutomationRunBestEffort } from "@/lib/automation/automationRunPersistence";
import { runAutomationCycle } from "@/lib/automation/runAutomationCycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await runAutomationCycle();
    const automationRun = await persistOperationalAutomationRunBestEffort({
      createSupabase: createAdminClient,
      result,
      triggerSource: "cron",
    });

    return NextResponse.json({ ok: true, ...result, automationRun });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en automatización.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}

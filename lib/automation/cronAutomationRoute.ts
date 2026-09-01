import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/automation/cronAuth";
import { persistOperationalAutomationRunBestEffort } from "@/lib/automation/automationRunPersistence";
import { runAutomationCycle } from "@/lib/automation/runAutomationCycle";
import { createAdminClient } from "@/lib/supabase/admin";

type CronAutomationDependencies = {
  authorize: typeof assertCronAuthorized;
  runCycle: typeof runAutomationCycle;
  persistRun: typeof persistOperationalAutomationRunBestEffort;
};

const defaultDependencies: CronAutomationDependencies = {
  authorize: assertCronAuthorized,
  runCycle: runAutomationCycle,
  persistRun: persistOperationalAutomationRunBestEffort,
};

/** Ejecuta una corrida diaria solo después de validar la credencial de cron. */
export async function handleCronAutomation(
  request: Request,
  dependencies: CronAutomationDependencies = defaultDependencies,
) {
  if (!dependencies.authorize(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await dependencies.runCycle();
    const automationRun = await dependencies.persistRun({
      createSupabase: createAdminClient,
      result,
      triggerSource: "cron",
    });

    return NextResponse.json({ ok: true, ...result, automationRun });
  } catch {
    return NextResponse.json({ error: "No se pudo ejecutar la automatización." }, { status: 500 });
  }
}

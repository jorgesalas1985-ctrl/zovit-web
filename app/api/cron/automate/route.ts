import { handleCronAutomation } from "@/lib/automation/cronAutomationRoute";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleCronAutomation(request);
}

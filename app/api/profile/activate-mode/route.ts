import { NextResponse } from "next/server";
import { isRoleMode } from "@/lib/auth/roles";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";

type ActivateModeAction = "activate_professional" | "activate_client" | "switch_mode";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as {
      action?: ActivateModeAction;
      mode?: string;
    };

    const { supabase } = auth;

    if (body.action === "activate_professional") {
      const { error } = await supabase.rpc("activate_professional_mode");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, active_mode: "professional", redirect: "/verificacion" });
    }

    if (body.action === "activate_client") {
      const { error } = await supabase.rpc("activate_client_mode");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, active_mode: "client", redirect: "/panel" });
    }

    if (body.action === "switch_mode") {
      if (!isRoleMode(body.mode)) {
        return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
      }

      const { error } = await supabase.rpc("switch_active_mode", { p_mode: body.mode });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        active_mode: body.mode,
        redirect: body.mode === "professional" ? "/trabajos" : "/panel",
      });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

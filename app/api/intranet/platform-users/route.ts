import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPlatformUsers, getPlatformUserErrorMessage } from "@/lib/intranet/platformUsers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
    if (profile?.intranet_role !== "super_admin") {
      return NextResponse.json({ error: "Solo el superadministrador puede revisar todas las cuentas." }, { status: 403 });
    }
    return NextResponse.json({ users: await listPlatformUsers() });
  } catch (error) {
    return NextResponse.json({ error: getPlatformUserErrorMessage(error) }, { status: 500 });
  }
}

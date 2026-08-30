import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  clearAiVaultSession,
  createAiVaultSession,
  getAiSecretRecord,
  hasAiVaultSession,
  requireRealSuperAdmin,
  saveAiSecret,
  validateSecret,
  verifyAiSecret,
} from "@/lib/intranet/aiVault";
import { ensureAdvancedTraining, getTraining, runTraining } from "@/lib/intranet/zovitAiTraining";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRealSuperAdmin();
  if (!user) return NextResponse.json({ error: "Acceso exclusivo del superadministrador." }, { status: 403 });
  const unlocked = await hasAiVaultSession(user.id);
  const training = unlocked ? await ensureAdvancedTraining(user.id) : null;
  return NextResponse.json({ configured: Boolean(await getAiSecretRecord(user.id)), unlocked, training });
}

export async function POST(request: Request) {
  try {
    const user = await requireRealSuperAdmin();
    if (!user) return NextResponse.json({ error: "Acceso exclusivo del superadministrador." }, { status: 403 });
    const body = await request.json() as { action?: string; secret?: string; confirmSecret?: string; password?: string };
    if (body.action === "logout") {
      await clearAiVaultSession();
      return NextResponse.json({ ok: true });
    }
    if (body.action === "train") {
      if (!(await hasAiVaultSession(user.id))) return NextResponse.json({ error: "Desbloquea primero el módulo privado." }, { status: 401 });
      return NextResponse.json({ ok: true, training: await runTraining(user.id, await getTraining(user.id), "advanced") });
    }
    const validation = validateSecret(body.secret ?? "");
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
    const record = await getAiSecretRecord(user.id);

    if (body.action === "unlock") {
      if (!record) return NextResponse.json({ error: "Primero debes crear el código secreto." }, { status: 400 });
      if (!verifyAiSecret(body.secret!, record)) return NextResponse.json({ error: "Código secreto incorrecto." }, { status: 401 });
      await createAiVaultSession(user.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setup" || body.action === "reset") {
      if (body.secret !== body.confirmSecret) return NextResponse.json({ error: "Los códigos no coinciden." }, { status: 400 });
      if (body.action === "setup" && record) return NextResponse.json({ error: "El código ya está configurado." }, { status: 409 });
      if (body.action === "reset" || record) {
        if (!user.email || !body.password) return NextResponse.json({ error: "Ingresa la contraseña de tu cuenta." }, { status: 400 });
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !anon) throw new Error("Falta configuración de autenticación.");
        const verifier = createSupabaseClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
        const { error } = await verifier.auth.signInWithPassword({ email: user.email, password: body.password });
        if (error) return NextResponse.json({ error: "La contraseña del superadministrador no es correcta." }, { status: 401 });
      }
      await saveAiSecret(user.id, body.secret!);
      await createAiVaultSession(user.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible abrir ZOVIT IA." }, { status: 500 });
  }
}

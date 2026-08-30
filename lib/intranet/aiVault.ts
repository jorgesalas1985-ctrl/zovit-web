import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "zovit_ai_vault";
const SESSION_SECONDS = 15 * 60;

type SecretRecord = { salt: string; hash: string; updatedAt: string };

function signingKey() {
  const key = process.env.ZOVIT_AI_VAULT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta configurar la clave privada del módulo ZOVIT IA.");
  return key;
}

export async function requireRealSuperAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
  return profile?.intranet_role === "super_admin" ? data.user : null;
}

export async function getAiSecretRecord(userId: string): Promise<SecretRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  const record = data.user?.user_metadata?.zovit_ai_vault as SecretRecord | undefined;
  return record?.salt && record?.hash ? record : null;
}

export function validateSecret(secret: string) {
  if (!/^\d{6}$/.test(secret)) return "El código debe contener exactamente 6 números.";
  return null;
}

export async function saveAiSecret(userId: string, secret: string) {
  const validation = validateSecret(secret);
  if (validation) throw new Error(validation);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  const salt = randomBytes(16).toString("hex");
  const record: SecretRecord = {
    salt,
    hash: scryptSync(secret, salt, 64).toString("hex"),
    updatedAt: new Date().toISOString(),
  };
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...data.user?.user_metadata, zovit_ai_vault: record },
  });
  if (updateError) throw updateError;
}

export function verifyAiSecret(secret: string, record: SecretRecord) {
  const actual = scryptSync(secret, record.salt, 64);
  const expected = Buffer.from(record.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(value: string) {
  return createHmac("sha256", signingKey()).update(value).digest("base64url");
}

export async function createAiVaultSession(userId: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${userId}.${expires}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    // La comprobación se realiza mediante /api/intranet/ai-vault; la cookie
    // debe llegar tanto a esa API como a la página privada.
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function hasAiVaultSession(userId: string) {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [tokenUserId, expiresText, signature] = value.split(".");
  const payload = `${tokenUserId}.${expiresText}`;
  const expected = sign(payload);
  if (!signature || signature.length !== expected.length) return false;
  return tokenUserId === userId && Number(expiresText) > Date.now() / 1000 && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function clearAiVaultSession() {
  (await cookies()).delete(COOKIE_NAME);
}

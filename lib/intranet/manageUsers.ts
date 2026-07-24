import { isIntranetRole, type IntranetRole } from "@/lib/auth/intranetRoles";
import { validatePasswordForCreate } from "@/lib/auth/passwordPolicy";
import { validateCorporateEmail } from "@/lib/intranet/corporateEmail";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export type IntranetUserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  intranetRole: IntranetRole;
  createdAt: string;
};

export type CreateIntranetUserInput = {
  email: string;
  password: string;
  intranetRole: IntranetRole;
  firstName?: string;
  lastName?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  let page = 1;
  const perPage = 200;
  const target = normalizeEmail(email);

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureProfile(
  userId: string,
  input: { firstName?: string; lastName?: string; intranetRole: IntranetRole },
) {
  const admin = createAdminClient();

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      first_name: input.firstName?.trim() || null,
      last_name: input.lastName?.trim() || null,
      role: "client",
      intranet_role: input.intranetRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

export async function listIntranetUsers(): Promise<IntranetUserRecord[]> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, intranet_role, created_at")
    .not("intranet_role", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.id);
      if (authError) throw authError;

      const intranetRole = isIntranetRole(profile.intranet_role) ? profile.intranet_role : null;
      if (!intranetRole) return null;

      return {
        id: profile.id,
        email: authData.user?.email ?? "",
        firstName: profile.first_name,
        lastName: profile.last_name,
        intranetRole,
        createdAt: profile.created_at,
      } satisfies IntranetUserRecord;
    }),
  );

  return rows.filter((row): row is IntranetUserRecord => row !== null);
}

export async function createIntranetUser(input: CreateIntranetUserInput): Promise<IntranetUserRecord> {
  const admin = createAdminClient();
  const email = normalizeEmail(input.email);
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;

  const existing = await findAuthUserByEmail(email);

  if (!existing) {
    const corporateEmailError = validateCorporateEmail(email);
    if (corporateEmailError) throw new Error(corporateEmailError);
  }

  if (existing) {
    const validationMessage = validatePasswordForCreate(input.password);
    if (validationMessage) throw new Error(validationMessage);

    const { error: passwordError } = await admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: "client",
      },
    });

    if (passwordError) throw passwordError;

    await ensureProfile(existing.id, {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      intranetRole: input.intranetRole,
    });

    return {
      id: existing.id,
      email,
      firstName,
      lastName,
      intranetRole: input.intranetRole,
      createdAt: existing.created_at,
    };
  }

  const validationMessage = validatePasswordForCreate(input.password);
  if (validationMessage) throw new Error(validationMessage);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: "client",
      intranet_role: input.intranetRole,
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("No fue posible crear el usuario.");

  await ensureProfile(data.user.id, {
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    intranetRole: input.intranetRole,
  });

  return {
    id: data.user.id,
    email,
    firstName,
    lastName,
    intranetRole: input.intranetRole,
    createdAt: data.user.created_at,
  };
}

export async function updateIntranetUserRole(userId: string, intranetRole: IntranetRole) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ intranet_role: intranetRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}

export async function revokeIntranetAccess(userId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ intranet_role: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}

export async function getIntranetRoleForUser(userId: string): Promise<IntranetRole | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("intranet_role").eq("id", userId).maybeSingle();
  if (error) throw error;
  return isIntranetRole(data?.intranet_role) ? data.intranet_role : null;
}

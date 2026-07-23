import type { UserRole } from "@/lib/auth/roles";
import { isIntranetRole, type IntranetRole } from "@/lib/auth/intranetRoles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IdentityStatus } from "@/lib/verification/types";

export type PlatformUserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  rut: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  intranetRole: IntranetRole | null;
  identityStatus: IdentityStatus;
  identityVerified: boolean;
  createdAt: string;
};

export type UpdatePlatformUserInput = {
  firstName?: string;
  lastName?: string;
  rut?: string;
  phone?: string;
  address?: string;
  role?: UserRole;
  intranetRole?: IntranetRole | null;
};

export function canDeletePlatformUser(user: Pick<PlatformUserRecord, "intranetRole">): boolean {
  return user.intranetRole !== "super_admin";
}

export function canVerifyPlatformUser(user: Pick<PlatformUserRecord, "role">): boolean {
  return user.role === "client" || user.role === "professional";
}

export async function listPlatformUsers(): Promise<PlatformUserRecord[]> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, first_name, last_name, rut, phone, address, role, intranet_role, identity_status, identity_verified, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.id);
      if (authError) throw authError;

      const role = profile.role as UserRole;
      const intranetRole = isIntranetRole(profile.intranet_role) ? profile.intranet_role : null;

      return {
        id: profile.id,
        email: authData.user?.email ?? "",
        firstName: profile.first_name,
        lastName: profile.last_name,
        rut: profile.rut,
        phone: profile.phone,
        address: profile.address,
        role,
        intranetRole,
        identityStatus: (profile.identity_status as IdentityStatus) ?? "none",
        identityVerified: profile.identity_verified ?? false,
        createdAt: profile.created_at,
      } satisfies PlatformUserRecord;
    })
  );

  return rows;
}

export async function getPlatformUser(userId: string): Promise<PlatformUserRecord | null> {
  const users = await listPlatformUsers();
  return users.find((user) => user.id === userId) ?? null;
}

export async function updatePlatformUser(userId: string, input: UpdatePlatformUserInput) {
  const admin = createAdminClient();
  const current = await getPlatformUser(userId);
  if (!current) throw new Error("Usuario no encontrado.");

  if (current.intranetRole === "super_admin" && input.intranetRole !== undefined && input.intranetRole !== "super_admin") {
    throw new Error("No puedes modificar el perfil del super administrador.");
  }

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.firstName !== undefined) payload.first_name = input.firstName.trim() || null;
  if (input.lastName !== undefined) payload.last_name = input.lastName.trim() || null;
  if (input.rut !== undefined) payload.rut = input.rut.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone.trim() || null;
  if (input.address !== undefined) payload.address = input.address.trim() || null;
  if (input.role !== undefined) payload.role = input.role;
  if (input.intranetRole !== undefined) payload.intranet_role = input.intranetRole;

  const { error } = await admin.from("profiles").update(payload).eq("id", userId);
  if (error) throw error;

  if (input.firstName !== undefined || input.lastName !== undefined) {
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: input.firstName?.trim() || current.firstName,
        last_name: input.lastName?.trim() || current.lastName,
      },
    });
  }
}

export async function deletePlatformUser(userId: string) {
  const admin = createAdminClient();
  const current = await getPlatformUser(userId);
  if (!current) throw new Error("Usuario no encontrado.");

  if (!canDeletePlatformUser(current)) {
    throw new Error("El super administrador no puede eliminarse.");
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function reviewPlatformUserVerification(
  userId: string,
  action: "approve" | "reject",
  rejectionReason?: string
) {
  const admin = createAdminClient();
  const current = await getPlatformUser(userId);
  if (!current) throw new Error("Usuario no encontrado.");

  if (!canVerifyPlatformUser(current)) {
    throw new Error("Solo puedes verificar clientes y profesionales.");
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        identity_status: "approved",
        identity_verified: true,
        biometric_verified: true,
        identity_verified_at: now,
        identity_rejection_reason: null,
        updated_at: now,
      })
      .eq("id", userId)
      .eq("identity_status", "pending");

    if (profileError) throw profileError;

    await admin
      .from("identity_documents")
      .update({
        status: "approved",
        reviewed_at: now,
        updated_at: now,
      })
      .eq("profile_id", userId);

    return;
  }

  const reason = rejectionReason?.trim() || "Documentos no válidos.";

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      identity_status: "rejected",
      identity_verified: false,
      biometric_verified: false,
      identity_verified_at: null,
      identity_rejection_reason: reason,
      updated_at: now,
    })
    .eq("id", userId)
    .eq("identity_status", "pending");

  if (profileError) throw profileError;

  await admin
    .from("identity_documents")
    .update({
      status: "rejected",
      admin_notes: reason,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("profile_id", userId);
}

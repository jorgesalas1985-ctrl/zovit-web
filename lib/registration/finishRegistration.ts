import { supabase } from "@/lib/supabase";
import { uploadProfileAvatar } from "@/lib/profile/avatar";
import type { IdentityDocumentType } from "@/lib/verification/types";

export type RegistrationDocument = {
  document_type: IdentityDocumentType;
  file: File;
  metadata?: Record<string, unknown> | null;
};

export type RegistrationProfileUpdate = {
  rut: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  commune?: string;
};

export async function saveProfileRut(userId: string, rut: string): Promise<string | null> {
  return saveRegistrationProfile(userId, { rut });
}

export async function saveRegistrationProfile(
  userId: string,
  profile: RegistrationProfileUpdate
): Promise<string | null> {
  const payload: Record<string, string | null> = {
    rut: profile.rut.trim(),
    updated_at: new Date().toISOString(),
  };

  if (profile.firstName !== undefined) payload.first_name = profile.firstName.trim() || null;
  if (profile.lastName !== undefined) payload.last_name = profile.lastName.trim() || null;
  if (profile.phone !== undefined) payload.phone = profile.phone.trim() || null;
  if (profile.address !== undefined) payload.address = profile.address.trim() || null;
  if (profile.commune !== undefined) payload.commune = profile.commune.trim() || null;

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  return error?.message ?? null;
}

export async function uploadRegistrationDocuments(
  userId: string,
  documents: RegistrationDocument[]
): Promise<string | null> {
  for (const doc of documents) {
    const extension = doc.file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${userId}/${doc.document_type}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("identity-documents")
      .upload(path, doc.file, { contentType: doc.file.type, upsert: false });

    if (uploadError) return uploadError.message;

    const { error: rowError } = await supabase.from("identity_documents").insert({
      profile_id: userId,
      document_type: doc.document_type,
      storage_path: path,
      status: "uploaded",
      metadata: doc.metadata ?? null,
    });

    if (rowError) return rowError.message;
  }

  return null;
}

export async function submitBiometricVerification(): Promise<string | null> {
  const response = await fetch("/api/verification", { method: "POST" });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return data.error ?? "No se pudo enviar la verificación biométrica.";
  }

  return null;
}

export async function completeRegistrationVerification(
  userId: string,
  rut: string,
  documents: RegistrationDocument[],
  avatarFile?: File | null,
  profile?: Omit<RegistrationProfileUpdate, "rut">
): Promise<string | null> {
  const rutError = await saveRegistrationProfile(userId, {
    rut,
    firstName: profile?.firstName,
    lastName: profile?.lastName,
    phone: profile?.phone,
    address: profile?.address,
    commune: profile?.commune,
  });
  if (rutError) return rutError;

  const uploadError = await uploadRegistrationDocuments(userId, documents);
  if (uploadError) return uploadError;

  if (avatarFile) {
    try {
      await uploadProfileAvatar(userId, avatarFile);
    } catch (error) {
      return error instanceof Error ? error.message : "No se pudo guardar la foto de credencial.";
    }
  }

  return submitBiometricVerification();
}

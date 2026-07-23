import { supabase } from "@/lib/supabase";
import type { IdentityDocumentType } from "@/lib/verification/types";

export type RegistrationDocument = {
  document_type: IdentityDocumentType;
  file: File;
  metadata?: Record<string, unknown> | null;
};

export async function saveProfileRut(userId: string, rut: string): Promise<string | null> {
  const { error } = await supabase
    .from("profiles")
    .update({ rut: rut.trim(), updated_at: new Date().toISOString() })
    .eq("id", userId);

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
  documents: RegistrationDocument[]
): Promise<string | null> {
  const rutError = await saveProfileRut(userId, rut);
  if (rutError) return rutError;

  const uploadError = await uploadRegistrationDocuments(userId, documents);
  if (uploadError) return uploadError;

  return submitBiometricVerification();
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { IdentityDocumentType, IdentityVerificationState } from "@/lib/verification/types";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function useIdentityVerification() {
  const [state, setState] = useState<IdentityVerificationState | null>(null);
  const [message, setMessage] = useState("");
  const [busyType, setBusyType] = useState<IdentityDocumentType | "submit" | "biometric" | null>(null);

  const loadState = useCallback(async () => {
    const response = await fetch("/api/verification");
    const data = (await response.json()) as IdentityVerificationState & { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar tu verificación.");
      return null;
    }
    setState(data);
    return data;
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const uploadDocument = useCallback(
    async (
      userId: string,
      type: IdentityDocumentType,
      file: File,
      metadata: Record<string, unknown> | null = null
    ) => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type) && type !== "selfie" && type !== "liveness_proof") {
        setMessage("Formato no permitido. Usa JPG, PNG, WEBP o PDF.");
        return false;
      }

      setBusyType(type === "selfie" || type === "liveness_proof" ? "biometric" : type);
      setMessage("");

      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${userId}/${type}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setMessage(uploadError.message);
        setBusyType(null);
        return false;
      }

      const existing = state?.documents.find((doc) => doc.document_type === type);
      if (existing) {
        await supabase.storage.from("identity-documents").remove([existing.storage_path]);
        await supabase.from("identity_documents").delete().eq("id", existing.id);
      }

      const { error: rowError } = await supabase.from("identity_documents").insert({
        profile_id: userId,
        document_type: type,
        storage_path: path,
        status: "uploaded",
        metadata,
      });

      if (rowError) {
        setMessage(rowError.message);
        setBusyType(null);
        return false;
      }

      await loadState();
      setBusyType(null);
      return true;
    },
    [loadState, state?.documents]
  );

  const submitBiometric = useCallback(async () => {
    setBusyType("submit");
    setMessage("");

    const response = await fetch("/api/verification", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo enviar la verificación biométrica.");
      setBusyType(null);
      return false;
    }

    await loadState();
    setMessage("Tu verificación biométrica fue enviada. Te avisaremos cuando esté revisada.");
    setBusyType(null);
    return true;
  }, [loadState]);

  const submitStudyCertificate = useCallback(async () => {
    setBusyType("submit");
    setMessage("");

    const response = await fetch("/api/verification/certificates", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo enviar tu certificado.");
      setBusyType(null);
      return false;
    }

    await loadState();
    setMessage("Tu certificado de estudios fue enviado. Te avisaremos cuando esté revisado.");
    setBusyType(null);
    return true;
  }, [loadState]);

  return {
    state,
    message,
    setMessage,
    busyType,
    loadState,
    uploadDocument,
    submitBiometric,
    submitStudyCertificate,
  };
}

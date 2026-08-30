import { createAdminClient } from "@/lib/supabase/admin";
import { loadWorkerDraftFallback } from "@/lib/worker/registrationFallback";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

export type PrivateRecordMatch = { profileId: string; personName: string; label: string; storagePath: string; bucket: "worker-credentials" };

export function normalizeRut(value: string) { return value.toUpperCase().replace(/[^0-9K]/g, ""); }

function rutVariants(value: string) {
  const clean = normalizeRut(value);
  if (clean.length < 2) return [];
  const body = clean.slice(0, -1), dv = clean.slice(-1);
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return [...new Set([clean, `${body}-${dv}`, `${dotted}-${dv}`])];
}

export function extractRut(message: string) {
  const match = message.match(/\b(?:\d{1,2}(?:\.\d{3}){2}|\d{7,8})[-\s]?[0-9kK]\b/);
  return match ? normalizeRut(match[0]) : null;
}

export function isPrivateDocumentSearch(message: string) {
  return Boolean(extractRut(message)) && /certific|document|archivo|cedula|carnet|alumno regular|matricula/i.test(message);
}

export async function findStudentEnrollmentByRut(rut: string): Promise<PrivateRecordMatch | null> {
  const admin = createAdminClient();
  const variants = rutVariants(rut);
  if (!variants.length) return null;
  const { data: profiles, error } = await admin.from("profiles").select("id,first_name,last_name,rut").in("rut", variants).limit(5);
  if (error) throw error;
  const clean = normalizeRut(rut);
  const profile = (profiles ?? []).find((item) => normalizeRut(item.rut ?? "") === clean);
  if (!profile) return null;
  const { data: registration } = await admin.from("worker_registrations").select("draft").eq("profile_id", profile.id).maybeSingle();
  let draft = registration?.draft as WorkerRegistrationDraft | undefined;
  if (!draft) draft = (await loadWorkerDraftFallback(admin, profile.id))?.draft;
  const path = draft?.training?.enrollmentStoragePath;
  if (!path || !path.startsWith(`${profile.id}/`)) return null;
  return { profileId: profile.id, personName: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Persona registrada", label: draft?.training?.enrollmentDocName || "Certificado de alumno regular / matrícula", storagePath: path, bucket: "worker-credentials" };
}

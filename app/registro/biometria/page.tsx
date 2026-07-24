"use client";

import { ArrowRight, ScanFace } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Protected } from "@/components/Protected";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { BiometricOnboardingForm } from "@/components/verification/BiometricOnboardingForm";
import { useAuth } from "@/components/AuthProvider";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import { completeRegistrationVerification } from "@/lib/registration/finishRegistration";
import { flushPendingRegistration } from "@/lib/registration/pendingRegistration";
import { canAccessPanel } from "@/lib/verification/types";
import { supabase } from "@/lib/supabase";

export default function RegisterBiometricPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { state, message, busyType, uploadDocument, submitBiometric, loadState } = useIdentityVerification();
  const [rut, setRut] = useState("");
  const [navigating, setNavigating] = useState(false);

  const role = profile?.role ?? "client";
  const isProfessional = role === "professional" || role === "admin";
  const identityStatus = profile?.identity_status ?? state?.identity_status;

  useEffect(() => {
    if (!user?.email) return;

    void flushPendingRegistration(user.email, user.id, completeRegistrationVerification)
      .then((flushed) => {
        if (flushed) {
          void Promise.all([loadState(), refreshProfile()]);
        }
      })
      .catch(() => {
        // Si falla, el usuario puede completar manualmente el formulario.
      });
  }, [loadState, refreshProfile, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("rut")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.rut) setRut(data.rut);
      });
  }, [user]);

  const goToPanel = useCallback(async () => {
    setNavigating(true);
    await refreshProfile();
    window.location.assign("/panel");
  }, [refreshProfile]);

  useEffect(() => {
    if (!canAccessPanel(identityStatus)) return;
    void goToPanel();
  }, [goToPanel, identityStatus]);

  async function handleUpload(
    type: Parameters<typeof uploadDocument>[1],
    file: File,
    metadata?: Record<string, unknown> | null
  ) {
    if (!user) return false;
    return uploadDocument(user.id, type, file, metadata ?? null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !rut.trim()) return;

    await supabase
      .from("profiles")
      .update({ rut: rut.trim(), updated_at: new Date().toISOString() })
      .eq("id", user.id);

    const ok = await submitBiometric();
    if (ok) {
      await Promise.all([loadState(), refreshProfile()]);
      await goToPanel();
    }
  }

  if (navigating || canAccessPanel(identityStatus)) {
    return (
      <Protected>
        <div className="centerState">Ingresando al panel…</div>
      </Protected>
    );
  }

  return (
    <Protected>
      <RoleModeBanner role={isProfessional ? "professional" : "client"} />
      <main className="simplePage">
        <section className="formPageCard verificationPage">
          <div className="eyebrow">
            <ScanFace size={16} /> Registro ZOVIT
          </div>
          <h1>Verificación biométrica</h1>
          <p className="muted">
            Completa este paso al crear tu cuenta para proteger a clientes y profesionales en la plataforma.
          </p>

          {!state || !user ? (
            <div className="centerState">Cargando verificación…</div>
          ) : (
            <BiometricOnboardingForm
              userId={user.id}
              role={role}
              state={state}
              rut={rut}
              onRutChange={setRut}
              busyType={busyType}
              message={message}
              onUpload={handleUpload}
              onSubmit={handleSubmit}
            />
          )}

          {canAccessPanel(identityStatus) && (
            <button type="button" className="secondaryButton" disabled={navigating} onClick={() => void goToPanel()}>
              Ir al panel <ArrowRight size={16} />
            </button>
          )}
        </section>
      </main>
    </Protected>
  );
}

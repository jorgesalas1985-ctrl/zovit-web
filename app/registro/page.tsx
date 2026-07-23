"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, BriefcaseBusiness, ScanFace, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PendingBiometricForm } from "@/components/verification/PendingBiometricForm";
import { getAuthCallbackUrl } from "@/lib/auth/redirects";
import { completeRegistrationVerification } from "@/lib/registration/finishRegistration";
import type { RegistrationDocument } from "@/lib/registration/finishRegistration";
import { storeRegistrationDocuments } from "@/lib/registration/pendingRegistration";
import { supabase } from "@/lib/supabase";
import type { IdentityDocumentType } from "@/lib/verification/types";

type RegisterStep = "biometric" | "account" | "success";

function RegisterStepBadge({ step }: { step: 1 | 2 }) {
  return (
    <p className="registerStepBadge">
      Paso {step} de 2 · {step === 1 ? "Verificación biométrica" : "Crear cuenta"}
    </p>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>("biometric");
  const [role, setRole] = useState<"client" | "professional">("client");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", password: "" });
  const [rut, setRut] = useState("");
  const [documents, setDocuments] = useState<RegistrationDocument[]>([]);
  const [message, setMessage] = useState("");
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(true);
  const [busy, setBusy] = useState(false);

  function addDocument(
    type: IdentityDocumentType,
    file: File,
    metadata?: Record<string, unknown> | null
  ) {
    setDocuments((current) => [
      ...current.filter((doc) => doc.document_type !== type),
      { document_type: type, file, metadata: metadata ?? null },
    ]);
  }

  function continueToAccount(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setStep("account");
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: getAuthCallbackUrl("/panel"),
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          role,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setMessage("No se pudo crear la cuenta. Intenta nuevamente.");
      setBusy(false);
      return;
    }

    if (data.session) {
      const verificationError = await completeRegistrationVerification(userId, rut, documents);
      if (verificationError) {
        setMessage(verificationError);
        setBusy(false);
        return;
      }

      window.location.assign("/panel");
      return;
    }

    try {
      await storeRegistrationDocuments(form.email, rut, documents);
    } catch {
      setMessage("No se pudieron guardar tus documentos. Intenta nuevamente.");
      setBusy(false);
      return;
    }

    setNeedsEmailConfirm(true);
    setStep("success");
    setBusy(false);
  }

  if (step === "success") {
    return (
      <main className="authPage">
        <section className="authCard successCard">
          <div className="successIcon">✓</div>
          <h1>Cuenta creada</h1>
          <p>
            {needsEmailConfirm
              ? "Revisa tu correo, confirma tu cuenta e ingresa. Tu verificación biométrica se enviará automáticamente al confirmar."
              : "Tu cuenta y verificación biométrica fueron registradas correctamente."}
          </p>
          <Link className="primaryButton wide" href="/login">
            Ir a ingresar <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  if (step === "account") {
    return (
      <main className="authPage">
        <section className="authCard large">
          <RegisterStepBadge step={2} />
          <p className="kicker">REGISTRO REAL</p>
          <h1>Crea tu cuenta ZOVIT</h1>
          <p className="muted">Selecciona cómo utilizarás la plataforma y completa tus datos.</p>

          <div className="roleSelector">
            <button className={role === "client" ? "roleCard active" : "roleCard"} onClick={() => setRole("client")}>
              <UserRound /><span><b>Cliente</b><small>Necesito contratar servicios</small></span>
            </button>
            <button className={role === "professional" ? "roleCard active" : "roleCard"} onClick={() => setRole("professional")}>
              <BriefcaseBusiness /><span><b>Profesional</b><small>Quiero ofrecer mis servicios</small></span>
            </button>
          </div>

          <form onSubmit={createAccount} className="formGrid">
            <label>Nombres<input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></label>
            <label>Apellidos<input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></label>
            <label>Teléfono<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Correo electrónico<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label className="full">Contraseña<input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>

            {message && <div className="formMessage full"><AlertCircle size={17} /> {message}</div>}

            <div className="verificationActionsRow full">
              <button type="button" className="secondaryButton" disabled={busy} onClick={() => setStep("biometric")}>
                Volver
              </button>
              <button className="primaryButton wide" disabled={busy}>
                {busy ? "Creando cuenta…" : <>Crear cuenta <ArrowRight size={18} /></>}
              </button>
            </div>
          </form>

          <p className="authFooter">¿Ya tienes cuenta? <Link href="/login">Ingresa aquí</Link></p>
        </section>
      </main>
    );
  }

  return (
    <main className="simplePage">
      <section className="formPageCard verificationPage">
        <RegisterStepBadge step={1} />
        <div className="eyebrow">
          <ScanFace size={16} /> Registro ZOVIT
        </div>
        <h1>Verificación biométrica</h1>
        <p className="muted">
          Paso 1: valida tu identidad con carnet, selfie y prueba de vida. Luego crearás tu cuenta.
        </p>

        <PendingBiometricForm
          documents={documents}
          rut={rut}
          onRutChange={setRut}
          onAddDocument={addDocument}
          onSubmit={continueToAccount}
          busy={busy}
          message={message}
        />

        <p className="authFooter">¿Ya tienes cuenta? <Link href="/login">Ingresa aquí</Link></p>
      </section>
    </main>
  );
}

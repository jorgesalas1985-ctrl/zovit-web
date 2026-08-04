"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Landmark,
  ScanFace,
  UserRound,
} from "lucide-react";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PendingBiometricForm } from "@/components/verification/PendingBiometricForm";
import { ProfilePhotoPicker } from "@/components/profile/ProfilePhotoUpload";
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
  PASSWORD_HINT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePasswordForCreate,
} from "@/lib/auth/passwordPolicy";
import { getAuthCallbackUrl } from "@/lib/auth/redirects";
import { completeRegistrationVerification } from "@/lib/registration/finishRegistration";
import type { RegistrationDocument } from "@/lib/registration/finishRegistration";
import { storeRegistrationDocuments } from "@/lib/registration/pendingRegistration";
import { validateCarnetBirthDateDeclaration } from "@/lib/registration/carnetBirthDate";
import {
  isRegistrationComplete,
  isValidChileanRut,
  normalizeChileanRut,
  validateRegistrationFields,
} from "@/lib/registration/validateRegistration";
import { chileanDateToIso } from "@/lib/ui/chileanDate";
import { FIELD_PLACEHOLDERS, RUT_FORMAT_ERROR } from "@/lib/ui/fieldPlaceholders";
import { supabase } from "@/lib/supabase";
import type { IdentityDocumentType } from "@/lib/verification/types";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/panel";
  return value;
}

type RegisterStep = "biometric" | "account" | "success";
type PublicAccountKind = "client" | "professional" | "student" | "company" | "institution";

function roleForAccountKind(kind: PublicAccountKind): "client" | "professional" {
  return kind === "professional" || kind === "student" ? "professional" : "client";
}

function postSignupPath(kind: PublicAccountKind, nextPath: string): string {
  if (kind === "professional" || kind === "student") return "/registro/trabajador";
  if (kind === "company") return "/empresa";
  if (kind === "institution") return "/institucion";
  return nextPath;
}

function AccountKindSelector({
  accountKind,
  onChange,
}: {
  accountKind: PublicAccountKind;
  onChange: (kind: PublicAccountKind) => void;
}) {
  return (
    <div className="roleSelector">
      <button
        type="button"
        className={accountKind === "client" ? "roleCard active" : "roleCard"}
        onClick={() => onChange("client")}
      >
        <UserRound />
        <span>
          <b>Cliente</b>
          <small>Necesito contratar servicios</small>
        </span>
      </button>
      <button
        type="button"
        className={accountKind === "professional" ? "roleCard active" : "roleCard"}
        onClick={() => onChange("professional")}
      >
        <BriefcaseBusiness />
        <span>
          <b>Profesional</b>
          <small>Quiero ofrecer mis servicios</small>
        </span>
      </button>
      <button
        type="button"
        className={accountKind === "student" ? "roleCard active" : "roleCard"}
        onClick={() => onChange("student")}
      >
        <GraduationCap />
        <span>
          <b>Alumno</b>
          <small>Estoy en formacion y quiero construir mi pasaporte</small>
        </span>
      </button>
      <button
        type="button"
        className={accountKind === "company" ? "roleCard active" : "roleCard"}
        onClick={() => onChange("company")}
      >
        <Building2 />
        <span>
          <b>Empresa</b>
          <small>Quiero gestionar oportunidades y servicios</small>
        </span>
      </button>
      <button
        type="button"
        className={accountKind === "institution" ? "roleCard active" : "roleCard"}
        onClick={() => onChange("institution")}
      >
        <Landmark />
        <span>
          <b>Institucion</b>
          <small>Quiero vincular alumnos, certificados y reportes</small>
        </span>
      </button>
    </div>
  );
}

function RegisterStepBadge({ step }: { step: 1 | 2 }) {
  return (
    <p className="registerStepBadge">
      Paso {step} de 2 · {step === 1 ? "Verificación biométrica" : "Crear cuenta"}
    </p>
  );
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const [step, setStep] = useState<RegisterStep>("biometric");
  const [accountKind, setAccountKind] = useState<PublicAccountKind>("client");
  const role = roleForAccountKind(accountKind);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    commune: "",
    birthDate: "",
  });
  const [rut, setRut] = useState("");
  const [carnetBirthDateConfirmed, setCarnetBirthDateConfirmed] = useState(false);
  const [documents, setDocuments] = useState<RegistrationDocument[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(true);
  const [busy, setBusy] = useState(false);

  const registrationFields = useMemo(
    () => ({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      password: form.password,
      address: form.address,
      commune: form.commune,
      rut,
      birthDate: form.birthDate,
    }),
    [form, rut]
  );

  const canCreateAccount =
    isRegistrationComplete(registrationFields) &&
    validatePasswordForCreate(form.password) === null;

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

    if (!rut.trim()) {
      setMessage("Completa el campo RUT para continuar.");
      return;
    }

    if (!isValidChileanRut(rut)) {
      setMessage(RUT_FORMAT_ERROR);
      return;
    }

    const carnetDateError = validateCarnetBirthDateDeclaration({
      birthDate: form.birthDate,
      confirmed: carnetBirthDateConfirmed,
    });
    if (carnetDateError) {
      setMessage(carnetDateError);
      return;
    }

    setRut(normalizeChileanRut(rut));
    setStep("account");
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const fieldsError = validateRegistrationFields(registrationFields);
    if (fieldsError) {
      setMessage(fieldsError);
      setBusy(false);
      return;
    }

    const passwordError = validatePasswordForCreate(form.password);
    if (passwordError) {
      setMessage(passwordError);
      setBusy(false);
      return;
    }

    const normalizedRut = normalizeChileanRut(rut);
    const birthDateIso = chileanDateToIso(form.birthDate.trim());
    const profileData = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      commune: form.commune.trim(),
      birthDate: form.birthDate.trim(),
      birthDateCarnetConfirmed: true,
    };

    const { data, error } = await supabase.auth.signUp({
      email: normalizeAuthEmail(form.email),
      password: normalizeAuthPassword(form.password),
      options: {
        emailRedirectTo: getAuthCallbackUrl(nextPath),
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
          address: profileData.address,
          commune: profileData.commune,
          birth_date: birthDateIso,
          rut: normalizedRut,
          role,
          account_kind: accountKind,
          primary_service_profile: accountKind === "student" ? "in_training" : null,
          signup_source: "public",
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
      const verificationError = await completeRegistrationVerification(
        userId,
        normalizedRut,
        documents,
        avatarFile,
        profileData
      );
      if (verificationError) {
        setMessage(verificationError);
        setBusy(false);
        return;
      }

      // Profesionales continúan con el registro de perfiles de servicio.
      window.location.assign(
        postSignupPath(accountKind, nextPath)
      );
      return;
    }

    try {
      await storeRegistrationDocuments(
        form.email,
        normalizedRut,
        documents,
        avatarFile,
        profileData
      );
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
          <h1>{needsEmailConfirm ? "Confirma tu correo para activar ZOVIT" : "Cuenta creada"}</h1>
          <p>
            {needsEmailConfirm
              ? "Te enviamos un correo de confirmación. Abre tu correo, confirma la cuenta y después ingresa a ZOVIT. Sin confirmar el correo, el sistema mostrará cuenta no confirmada y la revisión de carnet no aparecerá aún en administración."
              : "Tu cuenta y verificación biométrica fueron registradas correctamente."}
          </p>
          {(accountKind === "professional" || accountKind === "student") && (
            <p className="muted">
              Después de ingresar, completa tu registro para declarar formación,
              experiencia y servicios.
            </p>
          )}
          <Link
            className="primaryButton wide"
            href={
              accountKind === "professional" || accountKind === "student"
                ? `/login?next=${encodeURIComponent("/registro/trabajador")}`
                : accountKind === "company"
                  ? `/login?next=${encodeURIComponent("/empresa")}`
                  : accountKind === "institution"
                    ? `/login?next=${encodeURIComponent("/institucion")}`
                : loginHref
            }
          >
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
          <p className="muted">
            Todos los campos son obligatorios. Debes ser mayor de 18 años (Chile) para crear tu
            cuenta.
          </p>
          <div className="formMessage info full">
            <AlertCircle size={17} /> Al crear la cuenta debes confirmar el correo. Hasta que confirmes,
            no podrás ingresar y tus documentos quedarán pendientes de envío al área de revisión.
          </div>

          <AccountKindSelector accountKind={accountKind} onChange={setAccountKind} />

          <ProfilePhotoPicker
            previewUrl={avatarPreview}
            onFileSelected={(file) => {
              setAvatarFile(file);
              setAvatarPreview((current) => {
                if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                return file ? URL.createObjectURL(file) : null;
              });
            }}
          />

          <form onSubmit={createAccount} className="formGrid" noValidate>
            <label>
              Nombres
              <input
                required
                autoComplete="given-name"
                placeholder={FIELD_PLACEHOLDERS.firstName}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label>
              Apellidos
              <input
                required
                autoComplete="family-name"
                placeholder={FIELD_PLACEHOLDERS.lastName}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
            <label>
              RUT
              <input
                required
                value={rut}
                readOnly
                aria-readonly="true"
                placeholder={FIELD_PLACEHOLDERS.rut}
              />
              <small className="fieldHint">
                Definido en verificación biométrica. {FIELD_PLACEHOLDERS.rutHint}
              </small>
            </label>
            <label>
              Fecha de nacimiento (del carnet)
              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                placeholder={FIELD_PLACEHOLDERS.birthDate}
                value={form.birthDate}
                readOnly
                aria-readonly="true"
              />
              <small className="fieldHint">
                Definida en verificación con carnet. Un revisor la corroborará con tu cédula.
              </small>
            </label>
            <label>
              Teléfono
              <input
                required
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder={FIELD_PLACEHOLDERS.phone}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label className="full">
              Dirección
              <input
                required
                autoComplete="street-address"
                placeholder={FIELD_PLACEHOLDERS.address}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label>
              Comuna
              <input
                required
                autoComplete="address-level2"
                placeholder={FIELD_PLACEHOLDERS.commune}
                value={form.commune}
                onChange={(e) => setForm({ ...form, commune: e.target.value })}
              />
            </label>
            <label>
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={FIELD_PLACEHOLDERS.email}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="full">
              Contraseña
              <input
                type="password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                placeholder={FIELD_PLACEHOLDERS.password}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <small className="fieldHint">{PASSWORD_HINT}</small>
            </label>

            {message && (
              <div className="formMessage full">
                <AlertCircle size={17} /> {message}
              </div>
            )}

            <p className="authLegalNote full">
              Al crear tu cuenta aceptas los{" "}
              <Link href="/legal/terminos">Términos y condiciones</Link> y la{" "}
              <Link href="/legal/privacidad">Política de privacidad</Link> de ZOVIT. Debes coordinar
              y pagar el precio real solo en la app; eludir el pago o declarar un monto menor para
              bajar la comisión puede bloquear tu cuenta.
            </p>

            <div className="verificationActionsRow full">
              <button type="button" className="secondaryButton" disabled={busy} onClick={() => setStep("biometric")}>
                Volver
              </button>
              <button className="primaryButton wide" disabled={busy || !canCreateAccount}>
                {busy ? "Creando cuenta…" : <>Crear cuenta <ArrowRight size={18} /></>}
              </button>
            </div>
          </form>

          <p className="authFooter">¿Ya tienes cuenta? <Link href={loginHref}>Ingresa aquí</Link></p>
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
          Paso 1 (igual para clientes, profesionales, alumnos, empresas e instituciones): valida tu identidad con carnet, selfie y
          prueba de vida. Luego crearás tu cuenta con todos tus datos personales.
        </p>

        <AccountKindSelector accountKind={accountKind} onChange={setAccountKind} />

        <PendingBiometricForm
          documents={documents}
          rut={rut}
          onRutChange={setRut}
          birthDate={form.birthDate}
          onBirthDateChange={(value) => setForm({ ...form, birthDate: value })}
          carnetBirthDateConfirmed={carnetBirthDateConfirmed}
          onCarnetBirthDateConfirmedChange={setCarnetBirthDateConfirmed}
          onAddDocument={addDocument}
          onSubmit={continueToAccount}
          busy={busy}
          message={message}
        />

        <p className="authFooter">¿Ya tienes cuenta? <Link href={loginHref}>Ingresa aquí</Link></p>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="authPage"><section className="authCard">Cargando registro…</section></main>}>
      <RegisterPageContent />
    </Suspense>
  );
}

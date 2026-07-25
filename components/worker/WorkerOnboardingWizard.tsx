"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
  Plus,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { listWorkerSpecialtyOptions } from "@/lib/worker/catalog";
import {
  getParticipations,
  pickPrimaryProfile,
  suggestFromGuidedAssistant,
  suggestProfilesFromParticipations,
  type GuidedAnswers,
} from "@/lib/worker/classify";
import {
  clearLocalWorkerDraft,
  createEmptyWorkerDraft,
  loadLocalWorkerDraft,
  newCredentialId,
  normalizeWorkerDraft,
  saveLocalWorkerDraft,
} from "@/lib/worker/draft";
import {
  COMMUNITY_TASK_OPTIONS,
  PARTICIPATION_OPTIONS,
  SERVICE_PROFILE_COPY,
  WEEK_DAYS,
  WORKER_COPY,
  WORKER_STATUS_LABELS,
} from "@/lib/worker/profiles";
import type {
  ParticipationChoice,
  WorkerRegistrationDraft,
} from "@/lib/worker/types";
import {
  validateAntecedentsStep,
  validateAvailabilityStep,
  validateParticipationStep,
  validatePersonalStep,
  validateReviewStep,
  validateServicesStep,
} from "@/lib/worker/validate";
import { FIELD_PLACEHOLDERS } from "@/lib/ui/fieldPlaceholders";

const STEPS = [
  "Datos personales",
  "Participación",
  "Antecedentes",
  "Servicios",
  "Disponibilidad",
  "Revisión",
  "Estado",
] as const;

type Props = {
  requireAuth?: boolean;
};

export function WorkerOnboardingWizard({ requireAuth = true }: Props) {
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WorkerRegistrationDraft>(() => createEmptyWorkerDraft());
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [guided, setGuided] = useState<GuidedAnswers>({
    hasFormalCredential: null,
    hasExperience: null,
    isStudying: null,
    wantsSupportTasks: null,
  });

  const specialties = useMemo(() => listWorkerSpecialtyOptions(), []);
  const selectedParticipations = getParticipations(draft);
  const activeProfiles = useMemo(() => {
    if (selectedParticipations.includes("unsure")) {
      return draft.suggestedProfiles;
    }
    const fromChoices = suggestProfilesFromParticipations(selectedParticipations);
    return fromChoices.length ? fromChoices : draft.suggestedProfiles;
  }, [draft.suggestedProfiles, selectedParticipations]);

  const hydrate = useCallback(async () => {
    const local = loadLocalWorkerDraft();
    let next = local ?? createEmptyWorkerDraft();

    if (user) {
      try {
        const response = await fetch("/api/worker/registration", { cache: "no-store" });
        const data = await response.json();
        if (response.ok && data.registration?.draft) {
          next = data.registration.draft as WorkerRegistrationDraft;
          if (data.registration.status === "submitted" || data.registration.status === "verified") {
            setStep(7);
          }
        } else if (data.profile) {
          next = createEmptyWorkerDraft({
            firstName: data.profile.first_name ?? "",
            lastName: data.profile.last_name ?? "",
            rut: data.profile.rut ?? "",
            phone: data.profile.phone ?? "",
            address: data.profile.address ?? "",
            commune: data.profile.commune ?? "",
            birthDate: data.profile.birth_date ?? "",
            email: data.email ?? user.email ?? "",
          });
        }
      } catch {
        // local draft fallback
      }
    }

    if (profile && !next.personal.firstName) {
      next = {
        ...next,
        personal: {
          ...next.personal,
          firstName: profile.first_name ?? "",
          lastName: profile.last_name ?? "",
          email: user?.email ?? next.personal.email,
        },
      };
    }

    setDraft(normalizeWorkerDraft(next));
  }, [profile, user]);

  useEffect(() => {
    if (!loading) void hydrate();
  }, [hydrate, loading]);

  useEffect(() => {
    saveLocalWorkerDraft(draft);
  }, [draft]);

  function isMigrationError(error?: string, code?: string) {
    return (
      code === "MIGRATION_REQUIRED" ||
      /worker_registrations|schema cache|does not exist/i.test(error ?? "")
    );
  }

  async function persistDraft(
    next: WorkerRegistrationDraft = draft,
    options?: { quiet?: boolean }
  ) {
    saveLocalWorkerDraft(next);
    if (!user) {
      setSaveState("saved");
      return true;
    }
    setSaveState("saving");
    const response = await fetch("/api/worker/registration", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: next }),
    });
    const data = (await response.json()) as {
      error?: string;
      code?: string;
      hint?: string;
    };
    if (!response.ok) {
      // El borrador ya quedó en este dispositivo; no bloqueamos el flujo.
      setSaveState("error");
      if (!options?.quiet) {
        if (isMigrationError(data.error, data.code)) {
          setMessage(
            "Tu avance quedó guardado en este dispositivo. Para sincronizar con el servidor hay que aplicar en Supabase el SQL SPRINT_11_WORKER_PROFILES.sql."
          );
        } else {
          setMessage(data.error ?? "No se pudo sincronizar con el servidor. Quedó guardado aquí.");
        }
      }
      return false;
    }
    if (!options?.quiet) setMessage("");
    setSaveState("saved");
    return true;
  }

  function toggleParticipation(choice: ParticipationChoice) {
    setDraft((current) => {
      const currentChoices = getParticipations(current);
      let nextChoices: ParticipationChoice[];

      if (choice === "unsure") {
        nextChoices = currentChoices.includes("unsure") ? [] : ["unsure"];
      } else {
        const withoutUnsure = currentChoices.filter((item) => item !== "unsure");
        nextChoices = withoutUnsure.includes(choice)
          ? withoutUnsure.filter((item) => item !== choice)
          : [...withoutUnsure, choice];
      }

      const suggested = nextChoices.includes("unsure")
        ? []
        : suggestProfilesFromParticipations(nextChoices);

      return {
        ...current,
        participations: nextChoices,
        participation: nextChoices[0] ?? null,
        suggestedProfiles: suggested,
        primaryProfile: pickPrimaryProfile(suggested),
      };
    });
  }

  function applyGuidedProfiles(nextGuided: GuidedAnswers) {
    setGuided(nextGuided);
    const suggested = suggestFromGuidedAssistant(nextGuided);
    setDraft((current) => ({
      ...current,
      participations: ["unsure"],
      participation: "unsure",
      suggestedProfiles: suggested,
      primaryProfile: pickPrimaryProfile(suggested),
    }));
  }

  function validateCurrent(): string | null {
    switch (step) {
      case 1:
        return validatePersonalStep(draft);
      case 2:
        return validateParticipationStep(draft);
      case 3:
        return validateAntecedentsStep(draft);
      case 4:
        return validateServicesStep(draft);
      case 5:
        return validateAvailabilityStep(draft);
      case 6:
        return validateReviewStep(draft);
      default:
        return null;
    }
  }

  async function goNext() {
    setMessage("");
    const error = validateCurrent();
    if (error) {
      setMessage(error);
      return;
    }
    // Avanzamos aunque el servidor aún no tenga la migración; el borrador queda local.
    await persistDraft(draft, { quiet: true });
    setMessage("");
    setStep((current) => Math.min(7, current + 1));
  }

  async function submit() {
    setMessage("");
    const error = validateReviewStep(draft);
    if (error) {
      setMessage(error);
      return;
    }
    if (!user) {
      setMessage("Inicia sesión o crea tu cuenta para enviar el registro a revisión.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/worker/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo enviar el registro.");
      return;
    }

    clearLocalWorkerDraft();
    setDraft(data.draft ?? { ...draft, status: "submitted" });
    setStep(7);
  }

  if (loading) {
    return <div className="centerState">Cargando registro de trabajador…</div>;
  }

  if (requireAuth && !user) {
    return (
      <section className="formPageCard workerWizardCard">
        <p className="kicker">REGISTRO TRABAJADOR</p>
        <h1>{WORKER_COPY.title}</h1>
        <p className="muted">{WORKER_COPY.subtitle}</p>
        <p className="formMessage">
          <AlertCircle size={17} /> Primero crea tu cuenta o inicia sesión para continuar el
          registro de trabajador.
        </p>
        <div className="securityHeroActions">
          <Link href="/registro" className="primaryButton">
            Crear cuenta <ArrowRight size={18} />
          </Link>
          <Link href="/login?next=/registro/trabajador" className="secondaryButton">
            Ingresar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="formPageCard workerWizardCard" aria-labelledby="worker-wizard-title">
      <p className="kicker">REGISTRO TRABAJADOR</p>
      <h1 id="worker-wizard-title">{WORKER_COPY.title}</h1>
      <p className="muted">{WORKER_COPY.subtitle}</p>

      <ol className="workerProgress" aria-label="Progreso del registro">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const done = step > number;
          return (
            <li
              key={label}
              className={`workerProgressItem ${active ? "isActive" : ""} ${done ? "isDone" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span>{number}</span>
              <small>{label}</small>
            </li>
          );
        })}
      </ol>

      <div className="workerSaveRow" aria-live="polite">
        <button
          type="button"
          className="secondaryButton"
          onClick={() => void persistDraft()}
          disabled={saveState === "saving"}
        >
          <Save size={16} />
          {saveState === "saving" ? "Guardando…" : "Guardar y continuar más tarde"}
        </button>
        <span className="muted">
          {saveState === "saved"
            ? "Borrador guardado"
            : saveState === "error"
              ? "Guardado en este dispositivo (pendiente sincronizar con Supabase)"
              : "Autosave activo"}
        </span>
      </div>

      {message && (
        <div className="formMessage" role="alert">
          <AlertCircle size={17} /> {message}
        </div>
      )}

      {step === 1 && (
        <div className="formGrid">
          <label>
            Nombres
            <input
              value={draft.personal.firstName}
              placeholder={FIELD_PLACEHOLDERS.firstName}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, firstName: e.target.value } })
              }
            />
          </label>
          <label>
            Apellidos
            <input
              value={draft.personal.lastName}
              placeholder={FIELD_PLACEHOLDERS.lastName}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, lastName: e.target.value } })
              }
            />
          </label>
          <label>
            RUT
            <input
              value={draft.personal.rut}
              placeholder={FIELD_PLACEHOLDERS.rut}
              autoComplete="off"
              inputMode="text"
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, rut: e.target.value } })
              }
            />
            <small className="fieldHint">{FIELD_PLACEHOLDERS.rutHint}</small>
          </label>
          <label>
            Fecha de nacimiento
            <input
              type="date"
              value={draft.personal.birthDate}
              placeholder={FIELD_PLACEHOLDERS.birthDate}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, birthDate: e.target.value } })
              }
            />
          </label>
          <label>
            Teléfono
            <input
              type="tel"
              value={draft.personal.phone}
              placeholder={FIELD_PLACEHOLDERS.phone}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, phone: e.target.value } })
              }
            />
          </label>
          <label>
            Correo electrónico
            <input
              type="email"
              value={draft.personal.email}
              placeholder={FIELD_PLACEHOLDERS.email}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, email: e.target.value } })
              }
            />
          </label>
          <label>
            Dirección
            <input
              value={draft.personal.address}
              placeholder={FIELD_PLACEHOLDERS.address}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, address: e.target.value } })
              }
            />
          </label>
          <label>
            Comuna
            <input
              value={draft.personal.commune}
              placeholder={FIELD_PLACEHOLDERS.commune}
              onChange={(e) =>
                setDraft({ ...draft, personal: { ...draft.personal, commune: e.target.value } })
              }
            />
          </label>
          <p className="muted full">
            La verificación de identidad y fotografía de perfil se completan en el registro de
            cuenta ZOVIT. Este formulario complementa tus antecedentes de servicio.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="workerChoiceGrid">
          <h2>¿Qué tipo de servicios deseas ofrecer?</h2>
          <p className="muted">
            Puedes marcar una, varias o todas las opciones según tus capacidades. En el siguiente
            paso te pediremos los certificados o antecedentes que correspondan a cada selección.
          </p>
          {PARTICIPATION_OPTIONS.map((option) => {
            const active = selectedParticipations.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="checkbox"
                aria-checked={active}
                className={`workerChoiceCard ${active ? "isActive" : ""}`}
                onClick={() => toggleParticipation(option.id)}
              >
                {option.id === "unsure" ? (
                  <HelpCircle size={20} />
                ) : active ? (
                  <CheckSquare size={20} />
                ) : (
                  <Square size={20} />
                )}
                <span>{option.label}</span>
              </button>
            );
          })}

          {selectedParticipations.includes("unsure") && (
            <div className="workerGuidedBox">
              <h3>Asistente guiado</h3>
              <label className="workerYesNo">
                ¿Tienes título, licencia o certificación formal?
                <select
                  value={guided.hasFormalCredential === null ? "" : guided.hasFormalCredential ? "yes" : "no"}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : e.target.value === "yes";
                    applyGuidedProfiles({ ...guided, hasFormalCredential: value });
                  }}
                >
                  <option value="">Selecciona</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="workerYesNo">
                ¿Tienes experiencia comprobable en un oficio?
                <select
                  value={guided.hasExperience === null ? "" : guided.hasExperience ? "yes" : "no"}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : e.target.value === "yes";
                    applyGuidedProfiles({ ...guided, hasExperience: value });
                  }}
                >
                  <option value="">Selecciona</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="workerYesNo">
                ¿Estás estudiando o capacitándote actualmente?
                <select
                  value={guided.isStudying === null ? "" : guided.isStudying ? "yes" : "no"}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : e.target.value === "yes";
                    applyGuidedProfiles({ ...guided, isStudying: value });
                  }}
                >
                  <option value="">Selecciona</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="workerYesNo">
                ¿También quieres tareas de apoyo o baja complejidad?
                <select
                  value={
                    guided.wantsSupportTasks === null ? "" : guided.wantsSupportTasks ? "yes" : "no"
                  }
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : e.target.value === "yes";
                    applyGuidedProfiles({ ...guided, wantsSupportTasks: value });
                  }}
                >
                  <option value="">Selecciona</option>
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
          )}

          {activeProfiles.length > 0 && (
            <div className="workerProfilePreview">
              <p className="muted">{WORKER_COPY.classification}</p>
              <div className="workerProfileCards">
                {activeProfiles.map((profileKey) => (
                  <article key={profileKey} className="workerProfileCard">
                    <h3>{SERVICE_PROFILE_COPY[profileKey].title}</h3>
                    <p>{SERVICE_PROFILE_COPY[profileKey].description}</p>
                    {profileKey === "community_collaborator" && (
                      <p className="workerHighlight">{WORKER_COPY.community}</p>
                    )}
                  </article>
                ))}
              </div>
              <p className="muted">
                Esto es una sugerencia inicial. La verificación definitiva la realiza el equipo
                ZOVIT.
              </p>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="workerAntecedents">
          <p className="muted">{WORKER_COPY.documents}</p>

          {activeProfiles.includes("certified") && (
            <div className="workerBlock">
              <h2>Profesional Certificado</h2>
              {draft.credentials.map((cred, index) => (
                <div key={cred.id} className="formGrid workerNestedCard">
                  <label>
                    Profesión / oficio / especialidad
                    <input
                      value={cred.profession}
                      placeholder={FIELD_PLACEHOLDERS.profession}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, profession: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                    />
                  </label>
                  <label>
                    Institución educacional
                    <input
                      value={cred.institution}
                      placeholder={FIELD_PLACEHOLDERS.institution}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, institution: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                    />
                  </label>
                  <label>
                    Título, licencia o certificación
                    <input
                      value={cred.credentialName}
                      placeholder={FIELD_PLACEHOLDERS.credentialName}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, credentialName: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                    />
                  </label>
                  <label>
                    Año de obtención
                    <input
                      value={cred.yearObtained}
                      placeholder={FIELD_PLACEHOLDERS.yearObtained}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, yearObtained: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                    />
                  </label>
                  <label>
                    Nº registro o licencia
                    <input
                      value={cred.registryNumber}
                      placeholder={FIELD_PLACEHOLDERS.registryNumber}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, registryNumber: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                    />
                  </label>
                  <label>
                    Fecha de vencimiento
                    <input
                      type="date"
                      value={cred.expiresAt}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, expiresAt: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                    />
                  </label>
                  <label className="full">
                    Documento de respaldo (nombre / referencia)
                    <input
                      value={cred.documentName ?? ""}
                      onChange={(e) => {
                        const credentials = [...draft.credentials];
                        credentials[index] = { ...cred, documentName: e.target.value };
                        setDraft({ ...draft, credentials });
                      }}
                      placeholder="Ej: Certificado SEC 2024.pdf (se adjuntará en verificación)"
                    />
                  </label>
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        credentials: draft.credentials.filter((item) => item.id !== cred.id),
                      })
                    }
                  >
                    <Trash2 size={16} /> Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondaryButton"
                onClick={() =>
                  setDraft({
                    ...draft,
                    credentials: [
                      ...draft.credentials,
                      {
                        id: newCredentialId(),
                        profession: "",
                        institution: "",
                        credentialName: "",
                        yearObtained: "",
                        registryNumber: "",
                        expiresAt: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Agregar certificación
              </button>
            </div>
          )}

          {activeProfiles.includes("experience_verified") && (
            <div className="workerBlock formGrid">
              <h2 className="full">Profesional Verificado por Experiencia</h2>
              <label>
                Oficio o especialidad
                <input
                  value={draft.experience.trade}
                  placeholder={FIELD_PLACEHOLDERS.profession}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, trade: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Años de experiencia
                <input
                  value={draft.experience.yearsExperience}
                  placeholder={FIELD_PLACEHOLDERS.yearsExperience}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, yearsExperience: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Descripción de experiencia laboral
                <textarea
                  rows={4}
                  value={draft.experience.description}
                  placeholder={FIELD_PLACEHOLDERS.experienceDescription}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, description: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Portafolio / fotos de trabajos (descripción o enlaces)
                <textarea
                  rows={3}
                  value={draft.experience.portfolioNotes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, portfolioNotes: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Referencias laborales (opcionales, con consentimiento)
                <textarea
                  rows={3}
                  value={draft.experience.references}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, references: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Herramientas o equipamiento
                <input
                  value={draft.experience.tools}
                  placeholder={FIELD_PLACEHOLDERS.tools}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, tools: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Zonas donde prestas servicios
                <input
                  value={draft.experience.serviceZones}
                  placeholder={FIELD_PLACEHOLDERS.serviceZones}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experience: { ...draft.experience, serviceZones: e.target.value },
                    })
                  }
                />
              </label>
            </div>
          )}

          {activeProfiles.includes("in_training") && (
            <div className="workerBlock formGrid">
              <h2 className="full">Profesional en Formación</h2>
              <label>
                Institución educacional
                <input
                  value={draft.training.institution}
                  placeholder={FIELD_PLACEHOLDERS.institution}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, institution: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Carrera, especialidad o curso
                <input
                  value={draft.training.career}
                  placeholder={FIELD_PLACEHOLDERS.career}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, career: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Año o semestre cursado
                <input
                  value={draft.training.semester}
                  placeholder={FIELD_PLACEHOLDERS.semester}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, semester: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Fecha estimada de egreso
                <input
                  type="month"
                  value={draft.training.expectedGraduation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, expectedGraduation: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Certificado de alumno regular / matrícula (referencia)
                <input
                  value={draft.training.enrollmentDocName ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, enrollmentDocName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Competencias declaradas
                <textarea
                  rows={3}
                  value={draft.training.competencies}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, competencies: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Trabajos que estás autorizado o capacitado para realizar
                <textarea
                  rows={3}
                  value={draft.training.allowedWorks}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, allowedWorks: e.target.value },
                    })
                  }
                />
              </label>
              <label className="full">
                Tutor o docente de referencia (opcional)
                <input
                  value={draft.training.tutorReference}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training: { ...draft.training, tutorReference: e.target.value },
                    })
                  }
                />
              </label>
            </div>
          )}

          {activeProfiles.includes("community_collaborator") && (
            <div className="workerBlock formGrid">
              <h2 className="full">Colaborador Comunitario</h2>
              <p className="workerHighlight full">{WORKER_COPY.community}</p>
              <label>
                Disponibilidad
                <input
                  value={draft.community.availability}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      community: { ...draft.community, availability: e.target.value },
                    })
                  }
                  placeholder={FIELD_PLACEHOLDERS.availability}
                />
              </label>
              <label>
                Comuna o zona de atención
                <input
                  value={draft.community.communes}
                  placeholder={FIELD_PLACEHOLDERS.commune}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      community: { ...draft.community, communes: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Medios de transporte
                <input
                  value={draft.community.transport}
                  placeholder={FIELD_PLACEHOLDERS.transport}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      community: { ...draft.community, transport: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Capacidad para levantar peso (opcional)
                <select
                  value={draft.community.canLiftWeight}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      community: {
                        ...draft.community,
                        canLiftWeight: e.target.value as typeof draft.community.canLiftWeight,
                      },
                    })
                  }
                >
                  <option value="">Prefiero no indicar</option>
                  <option value="yes">Sí, con precaución</option>
                  <option value="no">No</option>
                  <option value="prefer_not">Prefiero no responder</option>
                </select>
              </label>
              <label>
                Contacto de emergencia
                <input
                  value={draft.community.emergencyContact}
                  placeholder={FIELD_PLACEHOLDERS.emergencyContact}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      community: { ...draft.community, emergencyContact: e.target.value },
                    })
                  }
                />
              </label>
              <fieldset className="full workerTaskFieldset">
                <legend>Tipo de tareas que deseas realizar</legend>
                {COMMUNITY_TASK_OPTIONS.map((task) => {
                  const checked = draft.community.taskTypes.includes(task);
                  return (
                    <label key={task} className="workerCheckRow">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const taskTypes = checked
                            ? draft.community.taskTypes.filter((item) => item !== task)
                            : [...draft.community.taskTypes, task];
                          setDraft({
                            ...draft,
                            community: { ...draft.community, taskTypes },
                          });
                        }}
                      />
                      {task}
                    </label>
                  );
                })}
              </fieldset>
              <label className="full workerCheckRow">
                <input
                  type="checkbox"
                  checked={draft.community.safetyAccepted}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      community: { ...draft.community, safetyAccepted: e.target.checked },
                    })
                  }
                />
                Acepto las normas de seguridad de ZOVIT y no ofrezco trabajos regulados, de alto
                riesgo o que requieran licencia.
              </label>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="workerServices">
          <p className="muted">{WORKER_COPY.classification}</p>
          <div className="workerServiceList">
            {specialties.map((item) => {
              const selected = draft.services.some((s) => s.specialtySlug === item.specialtySlug);
              const blockedForCommunity =
                activeProfiles.length === 1 &&
                activeProfiles[0] === "community_collaborator" &&
                item.requiresCredential;

              return (
                <label
                  key={`${item.categorySlug}-${item.specialtySlug}`}
                  className={`workerServiceRow ${selected ? "isSelected" : ""} ${
                    blockedForCommunity ? "isBlocked" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={blockedForCommunity}
                    checked={selected}
                    onChange={() => {
                      if (selected) {
                        setDraft({
                          ...draft,
                          services: draft.services.filter(
                            (s) => s.specialtySlug !== item.specialtySlug
                          ),
                        });
                        return;
                      }
                      setDraft({
                        ...draft,
                        services: [
                          ...draft.services,
                          {
                            categorySlug: item.categorySlug,
                            categoryName: item.categoryName,
                            specialtySlug: item.specialtySlug,
                            specialtyName: item.specialtyName,
                            requiresCredential: item.requiresCredential,
                            authorizationStatus: item.requiresCredential ? "blocked" : "pending",
                          },
                        ],
                      });
                    }}
                  />
                  <span>
                    <strong>{item.specialtyName}</strong>
                    <small>
                      {item.categoryName}
                      {item.requiresCredential
                        ? " · Requiere licencia/certificación (bloqueado hasta verificación)"
                        : ""}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="formGrid">
          <fieldset className="full workerTaskFieldset">
            <legend>Días disponibles</legend>
            {WEEK_DAYS.map((day) => {
              const checked = draft.availability.days.includes(day);
              return (
                <label key={day} className="workerCheckRow">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const days = checked
                        ? draft.availability.days.filter((item) => item !== day)
                        : [...draft.availability.days, day];
                      setDraft({
                        ...draft,
                        availability: { ...draft.availability, days },
                      });
                    }}
                  />
                  {day}
                </label>
              );
            })}
          </fieldset>
          <label>
            Horario desde
            <input
              type="time"
              value={draft.availability.hoursFrom}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: { ...draft.availability, hoursFrom: e.target.value },
                })
              }
            />
          </label>
          <label>
            Horario hasta
            <input
              type="time"
              value={draft.availability.hoursTo}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: { ...draft.availability, hoursTo: e.target.value },
                })
              }
            />
          </label>
          <label>
            Comunas o radio de atención
            <input
              value={draft.availability.communes}
              placeholder={FIELD_PLACEHOLDERS.serviceZones}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: { ...draft.availability, communes: e.target.value },
                })
              }
            />
          </label>
          <label>
            Radio (km, opcional)
            <input
              value={draft.availability.radiusKm}
              placeholder={FIELD_PLACEHOLDERS.radiusKm}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: { ...draft.availability, radiusKm: e.target.value },
                })
              }
            />
          </label>
          <label>
            Atención
            <select
              value={draft.availability.attentionMode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: {
                    ...draft.availability,
                    attentionMode: e.target.value as typeof draft.availability.attentionMode,
                  },
                })
              }
            >
              <option value="immediate">Inmediata</option>
              <option value="scheduled">Programada</option>
              <option value="both">Ambas</option>
            </select>
          </label>
          <label>
            Medio de transporte
            <input
              value={draft.availability.transport}
              placeholder={FIELD_PLACEHOLDERS.transport}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: { ...draft.availability, transport: e.target.value },
                })
              }
            />
          </label>
          <label className="full">
            Tarifa referencial (opcional)
            <input
              value={draft.availability.referenceRate}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  availability: { ...draft.availability, referenceRate: e.target.value },
                })
              }
              placeholder={FIELD_PLACEHOLDERS.referenceRate}
            />
          </label>
        </div>
      )}

      {step === 6 && (
        <div className="workerReview">
          <h2>Revisa tu información antes de enviar</h2>
          <dl className="workerReviewList">
            <div>
              <dt>Nombre</dt>
              <dd>
                {draft.personal.firstName} {draft.personal.lastName}
              </dd>
            </div>
            <div>
              <dt>Perfiles sugeridos</dt>
              <dd>
                {activeProfiles.map((key) => SERVICE_PROFILE_COPY[key].title).join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt>Servicios</dt>
              <dd>{draft.services.map((s) => s.specialtyName).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Disponibilidad</dt>
              <dd>
                {draft.availability.days.join(", ")} · {draft.availability.hoursFrom}-
                {draft.availability.hoursTo} · {draft.availability.communes}
              </dd>
            </div>
          </dl>
          <p className="muted">{WORKER_COPY.documents}</p>
          <p className="muted">{WORKER_COPY.classification}</p>
          <label className="workerCheckRow">
            <input
              type="checkbox"
              checked={draft.consentAccepted}
              onChange={(e) => setDraft({ ...draft, consentAccepted: e.target.checked })}
            />
            {WORKER_COPY.consent}
          </label>
        </div>
      )}

      {step === 7 && (
        <div className="workerStatusBox">
          <CheckCircle2 size={36} />
          <h2>{WORKER_COPY.submitted}</h2>
          <p>
            Estado actual:{" "}
            <strong>{WORKER_STATUS_LABELS[draft.status] ?? WORKER_STATUS_LABELS.submitted}</strong>
          </p>
          <p className="muted">
            Te avisaremos cuando tu perfil esté revisado. Mientras tanto puedes completar tu
            verificación de identidad si aún está pendiente.
          </p>
          <div className="securityHeroActions">
            <Link href="/panel" className="primaryButton">
              Ir al panel
            </Link>
            <Link href="/verificacion" className="secondaryButton">
              Verificación de identidad
            </Link>
          </div>
        </div>
      )}

      {step < 7 && (
        <div className="verificationActionsRow">
          <button
            type="button"
            className="secondaryButton"
            disabled={step === 1 || busy}
            onClick={() => setStep((current) => Math.max(1, current - 1))}
          >
            <ArrowLeft size={16} /> Atrás
          </button>
          {step < 6 ? (
            <button type="button" className="primaryButton" onClick={() => void goNext()}>
              Continuar <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="primaryButton"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Enviando…" : "Enviar a revisión"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

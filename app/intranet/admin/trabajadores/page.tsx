"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import {
  SERVICE_PROFILE_COPY,
  WORKER_STATUS_LABELS,
} from "@/lib/worker/profiles";
import type { ServiceProfileType, WorkerRegistrationStatus } from "@/lib/worker/types";
import { BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type WorkerRow = {
  profile_id: string;
  status: WorkerRegistrationStatus;
  suggested_profiles: ServiceProfileType[];
  submitted_at: string | null;
  review_message: string | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    rut: string | null;
    commune: string | null;
    primary_service_profile: ServiceProfileType | null;
    worker_registration_status: WorkerRegistrationStatus;
  };
};

type Detail = {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    rut: string | null;
    worker_admin_notes: string | null;
    primary_service_profile: ServiceProfileType | null;
  } | null;
  registration: {
    draft: {
      personal?: { email?: string; phone?: string };
      services?: Array<{ specialtyName: string; requiresCredential: boolean; authorizationStatus: string }>;
      suggestedProfiles?: ServiceProfileType[];
    };
    review_message: string | null;
  } | null;
  credentials: Array<{
    id: string;
    credential_name: string | null;
    profession: string | null;
    institution: string | null;
    status: string;
  }>;
  services: Array<{
    id: string;
    specialty_name: string | null;
    requires_credential: boolean;
    authorization_status: string;
  }>;
  history: Array<{ id: string; action: string; created_at: string }>;
};

export default function IntranetWorkersReviewPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [primaryProfile, setPrimaryProfile] = useState<ServiceProfileType>("experience_verified");

  async function loadWorkers() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (profileFilter) params.set("profile", profileFilter);
    const response = await fetch(`/api/intranet/workers?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo cargar la cola.");
      return;
    }
    setWorkers(data.workers ?? []);
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    const response = await fetch(`/api/intranet/workers/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo abrir el expediente.");
      return;
    }
    setDetail(data);
    setInternalNotes(data.profile?.worker_admin_notes ?? "");
    setPrimaryProfile(data.profile?.primary_service_profile ?? "experience_verified");
  }

  useEffect(() => {
    void loadWorkers();
  }, [statusFilter, profileFilter]);

  async function runAction(body: Record<string, unknown>) {
    if (!selectedId) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/intranet/workers/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo completar la acción.");
      return;
    }
    setMessage("Acción registrada.");
    await loadWorkers();
    await loadDetail(selectedId);
  }

  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        wide
        title="Revisión de trabajadores"
        description="Revisa antecedentes, asigna perfiles de servicio y autoriza especialidades."
        kicker="RECURSOS HUMANOS"
      >
        <div className="workerAdminFilters">
          <label>
            Estado
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(WORKER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Perfil sugerido
            <select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(SERVICE_PROFILE_COPY).map(([value, copy]) => (
                <option key={value} value={value}>
                  {copy.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message && <div className="notice">{message}</div>}

        <div className="workerAdminLayout">
          <div className="workerAdminList">
            {workers.map((worker) => (
              <button
                key={worker.profile_id}
                type="button"
                className={`workerAdminRow ${selectedId === worker.profile_id ? "isActive" : ""}`}
                onClick={() => void loadDetail(worker.profile_id)}
              >
                <BriefcaseBusiness size={18} />
                <span>
                  <strong>
                    {worker.profiles.first_name} {worker.profiles.last_name}
                  </strong>
                  <small>
                    {WORKER_STATUS_LABELS[worker.status]} ·{" "}
                    {(worker.suggested_profiles ?? [])
                      .map((p) => SERVICE_PROFILE_COPY[p]?.title ?? p)
                      .join(", ") || "Sin perfil"}
                  </small>
                </span>
              </button>
            ))}
            {!workers.length && <p className="muted">No hay registros con estos filtros.</p>}
          </div>

          <div className="workerAdminDetail">
            {!detail ? (
              <p className="muted">Selecciona un trabajador para revisar antecedentes.</p>
            ) : (
              <>
                <h2>
                  {detail.profile?.first_name} {detail.profile?.last_name}
                </h2>
                <p className="muted">
                  RUT visible solo para administración · {detail.profile?.rut || "Sin RUT"}
                </p>

                <h3>Perfil principal</h3>
                <div className="workerAdminActions">
                  <select
                    value={primaryProfile}
                    onChange={(e) => setPrimaryProfile(e.target.value as ServiceProfileType)}
                  >
                    {Object.entries(SERVICE_PROFILE_COPY).map(([value, copy]) => (
                      <option key={value} value={value}>
                        {copy.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="secondaryButton"
                    disabled={busy}
                    onClick={() =>
                      void runAction({
                        action: "set_primary_profile",
                        primaryProfile,
                      })
                    }
                  >
                    Asignar perfil
                  </button>
                </div>

                <h3>Credenciales</h3>
                <ul className="workerAdminCredList">
                  {detail.credentials.map((cred) => (
                    <li key={cred.id}>
                      <div>
                        <strong>{cred.credential_name || "Sin nombre"}</strong>
                        <small>
                          {cred.profession} · {cred.institution} · {cred.status}
                        </small>
                      </div>
                      <div className="workerAdminActions">
                        <button
                          type="button"
                          className="primaryButton"
                          disabled={busy}
                          onClick={() =>
                            void runAction({
                              action: "review_credential",
                              credentialId: cred.id,
                              credentialStatus: "verified",
                            })
                          }
                        >
                          Verificar
                        </button>
                        <button
                          type="button"
                          className="secondaryButton"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt("Motivo del rechazo:");
                            if (!reason?.trim()) return;
                            void runAction({
                              action: "review_credential",
                              credentialId: cred.id,
                              credentialStatus: "rejected",
                              message: reason.trim(),
                            });
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </li>
                  ))}
                  {!detail.credentials.length && <li className="muted">Sin credenciales cargadas.</li>}
                </ul>

                <h3>Servicios</h3>
                <ul className="workerAdminCredList">
                  {detail.services.map((service) => (
                    <li key={service.id}>
                      <div>
                        <strong>{service.specialty_name}</strong>
                        <small>
                          {service.requires_credential ? "Regulado · " : ""}
                          {service.authorization_status}
                        </small>
                      </div>
                      <div className="workerAdminActions">
                        <button
                          type="button"
                          className="primaryButton"
                          disabled={busy}
                          onClick={() =>
                            void runAction({
                              action: "authorize_service",
                              serviceId: service.id,
                            })
                          }
                        >
                          Autorizar
                        </button>
                        <button
                          type="button"
                          className="secondaryButton"
                          disabled={busy}
                          onClick={() =>
                            void runAction({
                              action: "block_service",
                              serviceId: service.id,
                            })
                          }
                        >
                          Bloquear
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <h3>Notas internas</h3>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={busy}
                  onClick={() =>
                    void runAction({ action: "internal_note", internalNotes })
                  }
                >
                  Guardar nota
                </button>

                <h3>Decisión</h3>
                <div className="workerAdminActions">
                  <button
                    type="button"
                    className="primaryButton"
                    disabled={busy}
                    onClick={() =>
                      void runAction({
                        action: "approve",
                        primaryProfile,
                        message: "Perfil verificado por administración ZOVIT.",
                      })
                    }
                  >
                    <ShieldCheck size={16} /> Aprobar
                  </button>
                  <button
                    type="button"
                    className="secondaryButton"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt("Información adicional solicitada:");
                      if (!reason?.trim()) return;
                      void runAction({ action: "request_info", message: reason.trim() });
                    }}
                  >
                    Pedir correcciones
                  </button>
                  <button
                    type="button"
                    className="secondaryButton"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt("Motivo del rechazo:");
                      if (!reason?.trim()) return;
                      void runAction({ action: "reject", message: reason.trim() });
                    }}
                  >
                    Rechazar
                  </button>
                </div>

                <h3>Historial</h3>
                <ul className="workerAdminHistory">
                  {detail.history.map((item) => (
                    <li key={item.id}>
                      {item.action} · {new Date(item.created_at).toLocaleString("es-CL")}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}

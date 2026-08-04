"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  INTRANET_LOGIN_PROFILE_LABELS,
  INTRANET_ROLES,
  isIntranetRole,
} from "@/lib/auth/intranetRoles";
import { type UserRole } from "@/lib/auth/roles";
import {
  canDeletePlatformUser,
  canVerifyPlatformUser,
  type PlatformAccountKind,
  type PlatformUserRecord,
} from "@/lib/intranet/platformUsers";
import { FloatingToast } from "@/components/ui/FloatingToast";
import { IDENTITY_STATUS_LABELS, type IdentityStatus } from "@/lib/verification/types";
import {
  ClipboardCheck,
  Loader2,
  PencilLine,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_LOAD_ERROR = "No fue posible cargar los usuarios.";
const DEFAULT_SAVE_ERROR = "No fue posible guardar los cambios.";
const DEFAULT_DELETE_ERROR = "No fue posible eliminar el usuario.";
const DEFAULT_VERIFY_ERROR = "No fue posible completar la verificación.";

function readApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const message = String((data as { error?: unknown }).error ?? "").trim();
    if (message) return message;
  }

  return fallback;
}

async function readApiResponse(response: Response): Promise<{ data: unknown; parseError: string | null }> {
  try {
    return { data: await response.json(), parseError: null };
  } catch {
    return { data: null, parseError: "La respuesta del servidor no es válida." };
  }
}
const ROLE_LABELS: Record<UserRole, string> = {
  client: "Cliente",
  professional: "Profesional",
  admin: "Administrador",
};

const ACCOUNT_KIND_LABELS: Record<string, string> = {
  client: "Cliente",
  professional: "Profesional",
  student: "Alumno",
  company: "Empresa",
  institution: "Institucion",
};

const ACCOUNT_KIND_OPTIONS: Array<{ value: PlatformAccountKind; label: string }> = [
  { value: "client", label: "Cliente" },
  { value: "professional", label: "Profesional" },
  { value: "student", label: "Alumno" },
  { value: "company", label: "Empresa" },
  { value: "institution", label: "Institucion" },
];

function accountKindToRole(kind: PlatformAccountKind): UserRole {
  return kind === "professional" || kind === "student" ? "professional" : "client";
}

function defaultAccountKindForUser(user: PlatformUserRecord): PlatformAccountKind {
  if (user.accountKind && ACCOUNT_KIND_LABELS[user.accountKind]) {
    return user.accountKind as PlatformAccountKind;
  }
  return user.role === "professional" ? "professional" : "client";
}

type EditForm = {
  firstName: string;
  lastName: string;
  rut: string;
  phone: string;
  address: string;
  accountKind: PlatformAccountKind;
  intranetRole: string;
  confirmEmailManually: boolean;
  emailConfirmationTicket: string;
};

function emptyForm(): EditForm {
  return {
    firstName: "",
    lastName: "",
    rut: "",
    phone: "",
    address: "",
    accountKind: "client",
    intranetRole: "",
    confirmEmailManually: false,
    emailConfirmationTicket: "",
  };
}

function userTypeLabel(user: PlatformUserRecord) {
  if (user.intranetRole) {
    return INTRANET_LOGIN_PROFILE_LABELS[user.intranetRole];
  }
  if (user.accountKind && ACCOUNT_KIND_LABELS[user.accountKind]) {
    return ACCOUNT_KIND_LABELS[user.accountKind];
  }
  return ROLE_LABELS[user.role];
}

export function PlatformUsersManager() {
  const { profile } = useAuth();
  const callerRole = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [toast, setToast] = useState<{ message: string; tone: "error" | "success" | "info" } | null>(
    null,
  );

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingId) ?? null,
    [editingId, users]
  );

  const showToast = useCallback((message: string, tone: "error" | "success" | "info" = "error") => {
    setToast({ message, tone });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const loadUsers = useCallback(async () => {
    setLoading(true);

    const response = await fetch("/api/intranet/platform-users", { cache: "no-store" });
    const { data, parseError } = await readApiResponse(response);

    if (parseError) {
      showToast(parseError, "error");
      setUsers([]);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      showToast(readApiError(data, DEFAULT_LOAD_ERROR), "error");
      setUsers([]);
      setLoading(false);
      return;
    }

    // Esta vista es solo super admin: muestra todas las cuentas sin filtro de visibilidad.
    setUsers((data as { users?: PlatformUserRecord[] }).users ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openEdit(user: PlatformUserRecord) {
    setEditingId(user.id);
    setEditForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      rut: user.rut ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
      accountKind: defaultAccountKindForUser(user),
      intranetRole: user.intranetRole ?? "",
      confirmEmailManually: false,
      emailConfirmationTicket: "",
    });
    clearToast();
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;

    setBusyId(editingId);
    clearToast();

    if (editForm.confirmEmailManually && !editForm.emailConfirmationTicket.trim()) {
      showToast("Ingresa un ticket o motivo para confirmar el correo manualmente.");
      setBusyId("");
      return;
    }

    const response = await fetch(`/api/intranet/platform-users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        rut: editForm.rut,
        phone: editForm.phone,
        address: editForm.address,
        role: accountKindToRole(editForm.accountKind),
        accountKind: editForm.accountKind,
        intranetRole: editForm.intranetRole ? editForm.intranetRole : null,
        confirmEmailManually: editForm.confirmEmailManually,
        emailConfirmationTicket: editForm.emailConfirmationTicket,
      }),
    });

    const { data, parseError } = await readApiResponse(response);
    setBusyId("");

    if (parseError) {
      showToast(parseError, "error");
      return;
    }

    if (!response.ok) {
      showToast(readApiError(data, DEFAULT_SAVE_ERROR), "error");
      return;
    }

    showToast("Usuario actualizado correctamente.", "success");
    setEditingId(null);
    await loadUsers();
  }

  async function deleteUser(user: PlatformUserRecord) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    if (!window.confirm(`¿Eliminar permanentemente la cuenta de ${fullName}?`)) return;

    setBusyId(user.id);
    clearToast();

    const response = await fetch(`/api/intranet/platform-users/${user.id}`, { method: "DELETE" });
    const { data, parseError } = await readApiResponse(response);
    setBusyId("");

    if (parseError) {
      showToast(parseError, "error");
      return;
    }

    if (!response.ok) {
      showToast(readApiError(data, DEFAULT_DELETE_ERROR), "error");
      return;
    }

    showToast(`Cuenta eliminada: ${fullName}.`, "success");
    if (editingId === user.id) setEditingId(null);
    await loadUsers();
  }

  async function verifyUser(user: PlatformUserRecord, action: "approve" | "reject") {
    const reason =
      action === "reject"
        ? window.prompt("Motivo del rechazo (visible para el usuario):")
        : null;

    if (action === "reject" && !reason?.trim()) return;

    setBusyId(user.id);
    clearToast();

    const response = await fetch(`/api/intranet/platform-users/${user.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });

    const { data, parseError } = await readApiResponse(response);
    setBusyId("");

    if (parseError) {
      showToast(parseError, "error");
      return;
    }

    if (!response.ok) {
      const err = readApiError(data, DEFAULT_VERIFY_ERROR);
      showToast(err, "error");
      return;
    }

    showToast(
      action === "approve"
        ? "Verificación biométrica aprobada."
        : "Verificación biométrica rechazada.",
      "success",
    );
    await loadUsers();
  }

  return (
    <>
      {toast && (
        <FloatingToast
          message={toast.message}
          tone={toast.tone}
          seconds={10}
          onClose={clearToast}
        />
      )}

      {editingUser && (
        <article className="intranetCard intranetCardStatic intranetFormCard">
          <PencilLine size={24} />
          <h3>Editar usuario</h3>
          <p className="muted">{editingUser.email}</p>

          <form className="formStack intranetInlineForm" onSubmit={saveEdit}>
            <div className="intranetFormGrid">
              <label>
                Nombre
                <input
                  value={editForm.firstName}
                  onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })}
                />
              </label>
              <label>
                Apellido
                <input
                  value={editForm.lastName}
                  onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })}
                />
              </label>
              <label>
                RUT
                <input
                  value={editForm.rut}
                  onChange={(event) => setEditForm({ ...editForm, rut: event.target.value })}
                />
              </label>
              <label>
                Celular
                <input
                  value={editForm.phone}
                  onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                />
              </label>
            </div>

            <label>
              Dirección
              <input
                value={editForm.address}
                onChange={(event) => setEditForm({ ...editForm, address: event.target.value })}
              />
            </label>

            <div className="intranetFormGrid">
              <label>
                Tipo de cuenta
                <select
                  value={editForm.accountKind}
                  onChange={(event) =>
                    setEditForm({ ...editForm, accountKind: event.target.value as PlatformAccountKind })
                  }
                  disabled={editingUser.intranetRole === "super_admin"}
                >
                  {ACCOUNT_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small className="fieldHint">
                  Alumno se guarda como cuenta profesional en formación.
                </small>
              </label>
              <label>
                Perfil intranet
                <select
                  value={editForm.intranetRole}
                  onChange={(event) => setEditForm({ ...editForm, intranetRole: event.target.value })}
                  disabled={editingUser.intranetRole === "super_admin"}
                >
                  <option value="">Sin acceso intranet</option>
                  {INTRANET_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {INTRANET_LOGIN_PROFILE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="verificationInfoBox">
              <p>
                Correo: <strong>{editingUser.emailConfirmed ? "Confirmado" : "Sin confirmar"}</strong>
              </p>
              {!editingUser.emailConfirmed && (
                <>
                  <label className="checkLine">
                    <input
                      type="checkbox"
                      checked={editForm.confirmEmailManually}
                      onChange={(event) =>
                        setEditForm({ ...editForm, confirmEmailManually: event.target.checked })
                      }
                    />
                    Confirmar correo manualmente por ticket de soporte
                  </label>
                  {editForm.confirmEmailManually && (
                    <label>
                      Ticket o motivo
                      <input
                        required
                        placeholder="Ej: usuario confirma clic, falla iCloud/Supabase"
                        value={editForm.emailConfirmationTicket}
                        onChange={(event) =>
                          setEditForm({ ...editForm, emailConfirmationTicket: event.target.value })
                        }
                      />
                    </label>
                  )}
                </>
              )}
            </div>

            <div className="verificationActionsRow">
              <button type="button" className="secondaryButton" onClick={() => setEditingId(null)}>
                Cancelar
              </button>
              <button type="submit" className="primaryButton" disabled={busyId === editingUser.id}>
                {busyId === editingUser.id ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </article>
      )}

      <div className="intranetTableWrap">
        {loading ? (
          <div className="centerState intranetTableState">
            <Loader2 size={20} className="spinIcon" /> Cargando usuarios…
          </div>
        ) : users.length === 0 ? (
          <div className="centerState intranetTableState">No hay usuarios registrados.</div>
        ) : (
          <table className="intranetTable intranetTableWide">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Correo</th>
                <th>Celular</th>
                <th>Dirección</th>
                <th>Tipo</th>
                <th>Verificación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Sin nombre";
                const deletable = callerRole ? canDeletePlatformUser(user, callerRole) : false;
                const verifiable = canVerifyPlatformUser(user) && user.identityStatus === "pending";
                const needsReview =
                  canVerifyPlatformUser(user) &&
                  (user.identityStatus === "pending" || user.identityStatus === "rejected");

                return (
                  <tr key={user.id}>
                    <td>{fullName}</td>
                    <td>{user.rut || "—"}</td>
                    <td>
                      {user.email || "—"}
                      <small className="verificationMeta">
                        {user.emailConfirmed ? "Correo confirmado" : "Correo sin confirmar"}
                      </small>
                    </td>
                    <td>{user.phone || "—"}</td>
                    <td>{user.address || "—"}</td>
                    <td>{userTypeLabel(user)}</td>
                    <td>
                      <span
                        className={`identityStatusTag identityStatusTag-${
                          user.intranetRole === "super_admin" ? "approved" : user.identityStatus
                        }`}
                      >
                        {user.intranetRole === "super_admin"
                          ? "Protegido"
                          : canVerifyPlatformUser(user)
                            ? IDENTITY_STATUS_LABELS[user.identityStatus as IdentityStatus]
                            : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="intranetActionGroup">
                        <button
                          type="button"
                          className="secondaryButton intranetActionButton"
                          disabled={busyId === user.id}
                          onClick={() => openEdit(user)}
                        >
                          <PencilLine size={15} /> Modificar
                        </button>

                        {needsReview && (
                          <Link
                            href={`/intranet/admin/verificacion?focus=${user.id}`}
                            className="secondaryButton intranetActionButton"
                            title="Abrir revisión de documentos / carnet"
                          >
                            <ClipboardCheck size={15} /> Revisar
                          </Link>
                        )}

                        {verifiable && (
                          <>
                            <button
                              type="button"
                              className="secondaryButton intranetActionButton"
                              disabled={busyId === user.id}
                              onClick={() => void verifyUser(user, "approve")}
                            >
                              <ShieldCheck size={15} /> Verificar
                            </button>
                            <button
                              type="button"
                              className="secondaryButton intranetActionButton"
                              disabled={busyId === user.id}
                              onClick={() => void verifyUser(user, "reject")}
                            >
                              Rechazar
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="intranetDeleteButton"
                          disabled={!deletable || busyId === user.id}
                          title={
                            deletable
                              ? "Eliminar cuenta"
                              : "El super administrador no puede eliminarse"
                          }
                          onClick={() => void deleteUser(user)}
                        >
                          <Trash2 size={15} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

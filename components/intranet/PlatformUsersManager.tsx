"use client";

import {
  INTRANET_LOGIN_PROFILE_LABELS,
  INTRANET_ROLES,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";
import {
  canDeletePlatformUser,
  canVerifyPlatformUser,
  type PlatformUserRecord,
} from "@/lib/intranet/platformUsers";
import { IDENTITY_STATUS_LABELS, type IdentityStatus } from "@/lib/verification/types";
import { AlertCircle, CheckCircle2, Loader2, PencilLine, ShieldCheck, Trash2 } from "lucide-react";
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

type EditForm = {
  firstName: string;
  lastName: string;
  rut: string;
  phone: string;
  address: string;
  role: UserRole;
  intranetRole: string;
};

function emptyForm(): EditForm {
  return {
    firstName: "",
    lastName: "",
    rut: "",
    phone: "",
    address: "",
    role: "client",
    intranetRole: "",
  };
}

function userTypeLabel(user: PlatformUserRecord) {
  if (user.intranetRole) {
    return INTRANET_LOGIN_PROFILE_LABELS[user.intranetRole];
  }
  return ROLE_LABELS[user.role];
}

export function PlatformUsersManager() {
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingId) ?? null,
    [editingId, users]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/intranet/platform-users");
    const { data, parseError } = await readApiResponse(response);

    if (parseError) {
      setError(parseError);
      setUsers([]);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setError(readApiError(data, DEFAULT_LOAD_ERROR));
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers((data as { users?: PlatformUserRecord[] }).users ?? []);
    setLoading(false);
  }, []);

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
      role: user.role,
      intranetRole: user.intranetRole ?? "",
    });
    setMessage("");
    setError("");
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;

    setBusyId(editingId);
    setMessage("");
    setError("");

    const response = await fetch(`/api/intranet/platform-users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        rut: editForm.rut,
        phone: editForm.phone,
        address: editForm.address,
        role: editForm.role,
        intranetRole: editForm.intranetRole ? editForm.intranetRole : null,
      }),
    });

    const { data, parseError } = await readApiResponse(response);
    setBusyId("");

    if (parseError) {
      setError(parseError);
      return;
    }

    if (!response.ok) {
      setError(readApiError(data, DEFAULT_SAVE_ERROR));
      return;
    }

    setMessage("Usuario actualizado correctamente.");
    setEditingId(null);
    await loadUsers();
  }

  async function deleteUser(user: PlatformUserRecord) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    if (!window.confirm(`¿Eliminar permanentemente la cuenta de ${fullName}?`)) return;

    setBusyId(user.id);
    setMessage("");
    setError("");

    const response = await fetch(`/api/intranet/platform-users/${user.id}`, { method: "DELETE" });
    const { data, parseError } = await readApiResponse(response);
    setBusyId("");

    if (parseError) {
      setError(parseError);
      return;
    }

    if (!response.ok) {
      setError(readApiError(data, DEFAULT_DELETE_ERROR));
      return;
    }

    setMessage(`Cuenta eliminada: ${fullName}.`);
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
    setMessage("");
    setError("");

    const response = await fetch(`/api/intranet/platform-users/${user.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });

    const { data, parseError } = await readApiResponse(response);
    setBusyId("");

    if (parseError) {
      setError(parseError);
      return;
    }

    if (!response.ok) {
      setError(readApiError(data, DEFAULT_VERIFY_ERROR));
      return;
    }

    setMessage(
      action === "approve"
        ? "Verificación biométrica aprobada."
        : "Verificación biométrica rechazada."
    );
    await loadUsers();
  }

  return (
    <>
      {message && (
        <div className="formMessage formMessage-success">
          <CheckCircle2 size={17} /> {message}
        </div>
      )}

      {error && (
        <div className="formMessage">
          <AlertCircle size={17} /> {error}
        </div>
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
                Tipo plataforma
                <select
                  value={editForm.role}
                  onChange={(event) => setEditForm({ ...editForm, role: event.target.value as UserRole })}
                  disabled={editingUser.intranetRole === "super_admin"}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
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
                const deletable = canDeletePlatformUser(user);
                const verifiable = canVerifyPlatformUser(user) && user.identityStatus === "pending";

                return (
                  <tr key={user.id}>
                    <td>{fullName}</td>
                    <td>{user.rut || "—"}</td>
                    <td>{user.email || "—"}</td>
                    <td>{user.phone || "—"}</td>
                    <td>{user.address || "—"}</td>
                    <td>{userTypeLabel(user)}</td>
                    <td>
                      <span className={`identityStatusTag identityStatusTag-${user.identityStatus}`}>
                        {canVerifyPlatformUser(user)
                          ? IDENTITY_STATUS_LABELS[user.identityStatus as IdentityStatus]
                          : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="intranetActionGroup">
                        <button
                          type="button"
                          className="secondaryButton intranetActionButton"
                          disabled={busyId === user.id || user.intranetRole === "super_admin"}
                          onClick={() => openEdit(user)}
                        >
                          <PencilLine size={15} /> Modificar
                        </button>

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

"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  assignableIntranetRoles,
  INTRANET_LOGIN_PROFILE_LABELS,
  isIntranetRole,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";
import {
  PASSWORD_HINT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/passwordPolicy";
import {
  canViewerSeeIntranetAccount,
} from "@/lib/intranet/accessVisibility";
import {
  composeCorporateEmail,
  CORPORATE_EMAIL_DOMAIN,
  parseCorporateEmailLocalPart,
  suggestAvailableCorporateEmail,
  validateCorporateEmail,
} from "@/lib/intranet/corporateEmail";
import { AlertCircle, CheckCircle2, Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type IntranetUserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  intranetRole: IntranetRole;
  createdAt: string;
};

export function IntranetUsersManager() {
  const { profile } = useAuth();
  const callerRole = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  const assignableRoles = useMemo(
    () => (callerRole ? assignableIntranetRoles(callerRole) : []),
    [callerRole],
  );

  const [users, setUsers] = useState<IntranetUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailLocalPart, setEmailLocalPart] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [intranetRole, setIntranetRole] = useState<IntranetRole>("worker");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/intranet/users", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No fue posible cargar los accesos.");
      setUsers([]);
      setLoading(false);
      return;
    }

    const visibleUsers = ((data.users ?? []) as IntranetUserRecord[]).filter((user) =>
      callerRole ? canViewerSeeIntranetAccount(callerRole, user.intranetRole) : false
    );

    setUsers(visibleUsers);
    setLoading(false);
  }, [callerRole]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (emailTouched) return;
    const suggested = suggestAvailableCorporateEmail(
      firstName,
      lastName,
      users.map((user) => user.email)
    );
    setEmailLocalPart(parseCorporateEmailLocalPart(suggested));
  }, [emailTouched, firstName, lastName, users]);

  function generateCorporateEmail() {
    const suggested = suggestAvailableCorporateEmail(
      firstName,
      lastName,
      users.map((user) => user.email)
    );
    setEmailLocalPart(parseCorporateEmailLocalPart(suggested));
    setEmailTouched(false);
  }

  const corporateEmail = composeCorporateEmail(emailLocalPart);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    const corporateEmailError = validateCorporateEmail(corporateEmail);
    if (corporateEmailError) {
      setError(corporateEmailError);
      setBusy(false);
      return;
    }

    const response = await fetch("/api/intranet/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email: corporateEmail,
        password,
        intranetRole,
      }),
    });

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "No fue posible crear el acceso.");
      return;
    }

    setMessage(`Acceso creado para ${data.user.email}.`);
    setFirstName("");
    setLastName("");
    setEmailLocalPart("");
    setEmailTouched(false);
    setPassword("");
    setIntranetRole("worker");
    await loadUsers();
  }

  async function changeRole(userId: string, nextRole: IntranetRole) {
    setError("");
    setMessage("");

    const response = await fetch(`/api/intranet/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intranetRole: nextRole }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No fue posible actualizar el perfil.");
      return;
    }

    setMessage("Perfil interno actualizado.");
    await loadUsers();
  }

  async function revokeUser(userId: string, userEmail: string) {
    if (!window.confirm(`¿Revocar acceso intranet de ${userEmail}?`)) return;

    setError("");
    setMessage("");

    const response = await fetch(`/api/intranet/users/${userId}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No fue posible revocar el acceso.");
      return;
    }

    setMessage(`Acceso revocado para ${userEmail}.`);
    await loadUsers();
  }

  function canManageUser(role: IntranetRole) {
    return callerRole ? assignableIntranetRoles(callerRole).includes(role) : false;
  }

  return (
    <>
      <article className="intranetCard intranetCardStatic intranetFormCard">
        <UserPlus size={24} />
        <h3>Crear acceso interno</h3>
        <p className="muted">
          Genera un correo corporativo @{CORPORATE_EMAIL_DOMAIN} y credenciales en Supabase Auth para ingresar a la intranet.
        </p>

        <form className="formStack intranetInlineForm" onSubmit={createUser}>
          <div className="intranetFormGrid">
            <label>
              Nombre
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="María"
              />
            </label>
            <label>
              Apellido
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="González"
              />
            </label>
          </div>

          <label>
            Correo corporativo
            <div className="corporateEmailRow">
              <div className="corporateEmailField">
                <input
                  type="text"
                  required
                  value={emailLocalPart}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  name="zovit-corporate-local"
                  onChange={(event) => {
                    setEmailTouched(true);
                    setEmailLocalPart(parseCorporateEmailLocalPart(event.target.value));
                  }}
                  placeholder="nombre.apellido"
                />
                <span className="corporateEmailDomain">@{CORPORATE_EMAIL_DOMAIN}</span>
              </div>
              <button
                type="button"
                className="secondaryButton"
                onClick={generateCorporateEmail}
                disabled={!firstName.trim() && !lastName.trim()}
              >
                <Mail size={16} /> Generar
              </button>
            </div>
            <small className="fieldHint">
              Siempre termina en @{CORPORATE_EMAIL_DOMAIN}. Ejemplo: maria.gonzalez@{CORPORATE_EMAIL_DOMAIN}
            </small>
          </label>

          <label>
            Contraseña inicial
            <input
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={PASSWORD_HINT}
            />
          </label>

          <label>
            Perfil interno
            <select
              value={intranetRole}
              onChange={(event) => setIntranetRole(event.target.value as IntranetRole)}
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {INTRANET_LOGIN_PROFILE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="primaryButton wide" disabled={busy || assignableRoles.length === 0}>
            {busy ? "Creando acceso…" : "Crear credenciales"}
          </button>
        </form>
      </article>

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

      <div className="intranetTableWrap">
        {loading ? (
          <div className="centerState intranetTableState">
            <Loader2 size={20} className="spinIcon" /> Cargando accesos…
          </div>
        ) : users.length === 0 ? (
          <div className="centerState intranetTableState">Aún no hay accesos internos creados.</div>
        ) : (
          <table className="intranetTable">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Correo</th>
                <th>Perfil</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const editable = canManageUser(user.intranetRole);
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Sin nombre";

                return (
                  <tr key={user.id}>
                    <td>{fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      {editable ? (
                        <select
                          className="intranetTableSelect"
                          value={user.intranetRole}
                          onChange={(event) => void changeRole(user.id, event.target.value as IntranetRole)}
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {INTRANET_LOGIN_PROFILE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        INTRANET_LOGIN_PROFILE_LABELS[user.intranetRole]
                      )}
                    </td>
                    <td>
                      {editable ? (
                        <button
                          type="button"
                          className="intranetIconButton"
                          onClick={() => void revokeUser(user.id, user.email)}
                          aria-label={`Revocar acceso de ${user.email}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
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

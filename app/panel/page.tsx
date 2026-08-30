"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  CreditCard,
  FileText,
  IdCard,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AccountModeControls } from "@/components/AccountModeControls";
import { EcosystemAccessGrid } from "@/components/ecosystem/EcosystemAccessGrid";
import { Protected } from "@/components/Protected";
import { ProfessionalAvailabilityToggle } from "@/components/map/ProfessionalAvailabilityToggle";
import { useAuth } from "@/components/AuthProvider";
import { hasUnrestrictedSuperAdminAccess } from "@/lib/auth/superAdminAccess";
import {
  hasDualMode,
  resolvePanelViewMode,
  roleErrorMessage,
} from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { PanelProfileHeader } from "@/components/panel/PanelProfileHeader";
import { ProfileSectionMenu } from "@/components/panel/ProfileSectionMenu";
import type { SuperAdminTourAccount } from "@/lib/auth/superAdminView";

type RequestItem = {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
};

function PanelContent() {
  const { user, profile } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [workerRegistrationStatus, setWorkerRegistrationStatus] = useState<string | null>(null);
  const [documentAlertCount, setDocumentAlertCount] = useState(0);

  const role = profile?.role;
  const panelView = isRealSuperAdmin && tourAccount === "professional"
    ? "professional"
    : isRealSuperAdmin && tourAccount === "client"
      ? "client"
      : resolvePanelViewMode(profile);
  const isProfessionalView = panelView === "professional";
  const isClientView = panelView === "client";
  const isAdmin = isRealSuperAdmin ? tourAccount === "admin" : role === "admin";
  const isSuperAdmin = isRealSuperAdmin && tourAccount === "super_admin";
  // Certificado solo para dual cliente-profesional o vista profesional (no clientes puros).
  const canShowCertificate = Boolean(user && (hasDualMode(profile) || isProfessionalView));
  const panelAccount: SuperAdminTourAccount = isRealSuperAdmin
    ? tourAccount
    : profile?.intranet_role === "hr_admin" ? "admin"
        : profile?.account_kind === "student" ? "student"
          : profile?.account_kind === "company" ? "company"
            : profile?.account_kind === "institution" ? "institution"
              : isProfessionalView ? "professional" : "client";
  useEffect(() => {
    const accessError = searchParams.get("error");
    if (accessError && isRealSuperAdmin) {
      setAccessMessage("");
      router.replace("/panel");
      return;
    }
    if (accessError) {
      setAccessMessage(roleErrorMessage(accessError));
    }
  }, [isRealSuperAdmin, router, searchParams]);

  useEffect(() => {
    if (!user || !role) return;
    const userId = user.id;

    async function loadPanel() {
      setLoading(true);
      setError("");

      if (isProfessionalView) {
        const [registrationResult, documentAlertsResult] =
          await Promise.all([
          fetch("/api/worker/registration", { cache: "no-store" })
            .then(async (response) => {
              if (!response.ok) return null;
              const data = (await response.json()) as {
                registration?: { status?: string } | null;
              };
              return data.registration?.status ?? null;
            })
            .catch(() => null),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .is("read_at", null)
            .in("title", [
              "Renueva tus documentos ZOVIT",
              "Cuenta pendiente por documentos",
            ]),
        ]);

        setWorkerRegistrationStatus(registrationResult);
        setDocumentAlertCount(documentAlertsResult.count ?? 0);

        setLoading(false);
      return;
    }

      const [requestResult, countResult] = await Promise.all([
        supabase
          .from("solicitudes_de_servicio")
          .select("id,category,description,status,created_at")
          .eq("client_id", userId)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("solicitudes_de_servicio")
          .select("id", { count: "exact", head: true })
          .eq("client_id", userId),
      ]);

      if (requestResult.error) {
        setError("No fue posible cargar tus solicitudes. Intenta nuevamente.");
      } else {
        setRequests((requestResult.data ?? []) as RequestItem[]);
      }

      setRequestCount(countResult.count ?? requestResult.data?.length ?? 0);
      setLoading(false);
    }

    void loadPanel();
  }, [user, role, isProfessionalView]);

  return (
    <main className={`dashboardPage${isProfessionalView ? " panelProfessionalView" : ""}`}>
      {accessMessage && <div className="notice">{accessMessage}</div>}

      <PanelProfileHeader
        account={panelAccount}
        personName={[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email?.split("@")[0]}
      />

      {isProfessionalView &&
        !hasUnrestrictedSuperAdminAccess(profile?.intranet_role, user?.email) &&
        (workerRegistrationStatus === "submitted" ||
          workerRegistrationStatus === "needs_info") && (
        <section className="panelSection compactSection">
          <div className="notice workerPanelNotice">
            Tu registro de trabajador está en revisión. Puedes ver el estado o corregir datos si
            hiciera falta.
            <Link href="/registro/trabajador" className="textLink">
              Ver estado del registro <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {!isAdmin && <AccountModeControls />}

      {isProfessionalView && (
        <section id="mapa-zovit" className="panelSection compactSection panelAnchorSection">
          <ProfessionalAvailabilityToggle />
        </section>
      )}

      {isProfessionalView && documentAlertCount > 0 && (
        <section className="panelSection compactSection">
          <div className="notice workerPanelNotice">
            Tienes {documentAlertCount} aviso documental pendiente. Revisa o renueva tus documentos
            semestrales para mantener tu cuenta operativa.
            <Link href="/registro/trabajador" className="textLink">
              Renovar documentos <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {!isClientView && <EcosystemAccessGrid />}

      {isClientView && (
        <section className="panelSection compactSection unifiedSectionAccess">
          <ProfileSectionMenu title="¿Qué quieres hacer?" options={[
            { href: "/cliente/mapa", label: "Mapa de profesionales", description: "Busca profesionales cercanos y revisa sus servicios." },
            { href: "/cliente/mapa?nueva=1", label: "Nueva solicitud", description: "Publica una necesidad de servicio." },
            { href: "/perfil", label: "Mi perfil", description: "Actualiza tus datos personales y preferencias." },
            { href: "/pagos", label: "Pagar servicios", description: "Paga servicios aceptados y revisa tus comprobantes." },
            { href: "/mis-solicitudes", label: "Mis solicitudes", description: "Revisa tus solicitudes publicadas, finalizadas y canceladas." },
          ]} />
          <Link href="/pagos" className="clientPaymentsShortcut">
            <CreditCard size={18} /> Ir a pagar servicios
          </Link>
        </section>
      )}

      {!isClientView && !isProfessionalView && <details id="gestion-personal" className="panelSection compactSection panelManagementSection clientPanelMenu panelAnchorSection" open>
        {isClientView && (
          <summary>
            <span><p className="kicker">GESTIÓN PERSONAL</p><strong>Cuenta y herramientas</strong></span>
            <span className="clientPanelMenuHint">Abrir</span>
          </summary>
        )}
        <div className="sectionHeading"><div><p className="kicker">GESTIÓN PERSONAL</p><h2>Cuenta y herramientas</h2><p className="muted">Opciones complementarias organizadas para tu perfil.</p></div></div>
      <div className="dashboardGrid">
        <Link href="/perfil" className="dashboardCard">
          <div className="dashboardIcon"><UserRound /></div>
          <div><h3>Mi perfil</h3><p>Actualiza tus datos personales.</p></div>
          <ArrowRight />
        </Link>

        {canShowCertificate && (
          <Link href={`/credencial/${user!.id}`} className="dashboardCard">
            <div className="dashboardIcon"><IdCard /></div>
            <div>
              <h3>Mi certificado ZOVIT</h3>
              <p>Certificado gratuito con QR: imprimir, correo, WhatsApp, LinkedIn o compartir.</p>
            </div>
            <ArrowRight />
          </Link>
        )}

        {isProfessionalView && (
          <Link href="/verificacion" className="dashboardCard">
            <div className="dashboardIcon"><ShieldCheck /></div>
            <div>
              <h3>Verificación gratuita</h3>
              <p>
                Si ya adjuntaste certificados en el registro (botón +), úsalos aquí sin subirlos de
                nuevo.
              </p>
            </div>
            <ArrowRight />
          </Link>
        )}

        {isClientView && (
          <Link href="/pagos" className="dashboardCard">
            <div className="dashboardIcon"><CreditCard /></div>
            <div><h3>Mis pagos</h3><p>Pendientes, historial y comprobantes.</p></div>
            <ArrowRight />
          </Link>
        )}

        {isProfessionalView && (
          <Link href="/pagos/profesional" className="dashboardCard">
            <div className="dashboardIcon"><CreditCard /></div>
            <div><h3>Wallet profesional</h3><p>Saldo, retenciones e ingresos.</p></div>
            <ArrowRight />
          </Link>
        )}

        {isAdmin && (
          <Link href="/admin/verificacion" className="dashboardCard">
            <div className="dashboardIcon"><ShieldCheck /></div>
            <div><h3>Admin verificación</h3><p>Revisa identidades y antecedentes.</p></div>
            <ArrowRight />
          </Link>
        )}

        {isSuperAdmin && (
          <Link href="/intranet/finanzas/pagos" className="dashboardCard">
            <div className="dashboardIcon"><Clock3 /></div>
            <div>
              <h3>Estados de cuenta</h3>
              <p>Solo super admin: wallets, disputas y auditoría de dinero.</p>
            </div>
            <ArrowRight />
          </Link>
        )}

        {isSuperAdmin && (
          <Link href="/intranet/admin/gestion-usuarios" className="dashboardCard">
            <div className="dashboardIcon"><UserRound /></div>
            <div>
              <h3>Todas las cuentas</h3>
              <p>Revisar clientes, profesionales e intranet.</p>
            </div>
            <ArrowRight />
          </Link>
        )}

        <article className="dashboardCard">
          <div className="dashboardIcon"><FileText /></div>
          <div>
            <h3>{requestCount}</h3>
            <p>{isProfessionalView ? "Actividad registrada" : "Solicitudes registradas"}</p>
          </div>
        </article>
      </div></details>}

      {!isClientView && !isProfessionalView ? (
      <section className="panelSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">ACTIVIDAD</p>
            <h2>{isProfessionalView ? "Mi actividad" : "Mis solicitudes"}</h2>
          </div>
        </div>

        {loading ? (
          <div className="emptyState">Cargando información…</div>
        ) : error ? (
          <div className="emptyState"><h3>No pudimos cargar la información</h3><p>{error}</p></div>
        ) : requests.length === 0 ? (
          <div className="emptyState">
            <Clock3 size={34} />
            <h3>{isProfessionalView ? "Todavía no tienes trabajos asignados" : "Todavía no tienes solicitudes"}</h3>
            <p>
              {isProfessionalView
                ? "Revisa trabajos disponibles y envía propuestas a clientes."
                : "Crea la primera para comenzar a utilizar ZOVIT."}
            </p>
            {isProfessionalView ? (
              <Link href="/trabajos" className="primaryButton">Ver trabajos</Link>
            ) : isClientView ? (
              <Link href="/cliente/mapa?nueva=1" className="primaryButton">Crear solicitud</Link>
            ) : null}
          </div>
        ) : (
          <div className="requestList">
            {isProfessionalView && requests.length > 0 && (
              <p className="kicker">TRABAJOS ASIGNADOS</p>
            )}
            {requests.map((request) => (
              <Link
                href={`/solicitudes/${request.id}`}
                className="requestRow"
                key={request.id}
              >
                <div>
                  <span className={`statusPill status-${request.status}`}>
                    {request.status.replaceAll("_", " ")}
                  </span>
                  <h3>{request.category}</h3>
                  <p>{request.description}</p>
                </div>
                <time>{new Date(request.created_at).toLocaleDateString("es-CL")}</time>
              </Link>
            ))}
          </div>
        )}
      </section>
      ) : null}
    </main>
  );
}

export default function PanelPage() {
  return (
    <Protected>
      <Suspense fallback={<div className="centerState">Cargando ZOVIT…</div>}>
        <PanelContent />
      </Suspense>
    </Protected>
  );
}

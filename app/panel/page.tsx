"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  CreditCard,
  FileText,
  IdCard,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Protected } from "@/components/Protected";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { IdentityBadge } from "@/components/verification/IdentityBadge";
import { ExperienceBadge, ProfessionalStatsGrid } from "@/components/experience/ExperienceSection";
import { useAuth } from "@/components/AuthProvider";
import type { ProfessionalStats } from "@/lib/experience/types";
import { roleErrorMessage } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type RequestItem = {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
};

function PanelContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [publishedRequests, setPublishedRequests] = useState<RequestItem[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [professionalStats, setProfessionalStats] = useState<ProfessionalStats | null>(null);

  const role = profile?.role;
  const isClientView = role === "client" || role === "admin";
  const isProfessionalView = role === "professional";
  const isAdmin = role === "admin";

  useEffect(() => {
    const accessError = searchParams.get("error");
    if (accessError) {
      setAccessMessage(roleErrorMessage(accessError));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !role) return;
    const userId = user.id;

    async function loadPanel() {
      setLoading(true);
      setError("");

      if (isProfessionalView) {
        const [jobsResult, publishedResult, statsResult] = await Promise.all([
          supabase
            .from("solicitudes_de_servicio")
            .select("id,category,description,status,created_at")
            .eq("professional_id", userId)
            .order("created_at", { ascending: false })
            .limit(6),
          supabase
            .from("solicitudes_de_servicio")
            .select("id,category,description,status,created_at")
            .eq("client_id", userId)
            .order("created_at", { ascending: false })
            .limit(6),
          supabase.rpc("get_professional_stats", { p_professional_id: userId }),
        ]);

        if (jobsResult.error || publishedResult.error) {
          setError("No fue posible cargar tu actividad. Intenta nuevamente.");
        } else {
          setRequests((jobsResult.data ?? []) as RequestItem[]);
          setPublishedRequests((publishedResult.data ?? []) as RequestItem[]);
          setRequestCount((jobsResult.data?.length ?? 0) + (publishedResult.data?.length ?? 0));
        }

        const statsRow = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
        if (statsRow) {
          setProfessionalStats({
            completed_jobs: Number(statsRow.completed_jobs ?? 0),
            total_hours: Number(statsRow.total_hours ?? 0),
            average_rating: Number(statsRow.average_rating ?? 0),
            rating_count: Number(statsRow.rating_count ?? 0),
            experience_level: (statsRow.experience_level ?? "junior") as ProfessionalStats["experience_level"],
          });
        }

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
    <main className="dashboardPage">
      {accessMessage && <div className="notice">{accessMessage}</div>}

      <RoleModeBanner role={isProfessionalView ? "professional" : "client"} />

      <section className="dashboardHero">
        <div>
          <p className="kicker light">{isProfessionalView ? "PANEL PROFESIONAL" : "PANEL CLIENTE"}</p>
          <h1>
            Hola, {profile?.first_name || user?.email?.split("@")[0] || "usuario"}.
          </h1>
          <p>
            {isProfessionalView
              ? "Administra tus trabajos y construye experiencia verificable en ZOVIT."
              : isAdmin
                ? "Administra solicitudes, trabajos y tu cuenta desde un solo lugar."
                : "Administra tu cuenta y tus solicitudes reales desde un solo lugar."}
          </p>
          <IdentityBadge verified={profile?.identity_verified ?? false} role={isProfessionalView ? "professional" : "client"} />
        </div>

        {isProfessionalView ? (
          <div className="panelHeroActions">
            <Link className="whiteButton" href="/experiencia"><Sparkles size={18} /> Mi experiencia</Link>
            <Link className="secondaryButton" href="/solicitudes/nueva"><Plus size={18} /> Nueva solicitud</Link>
          </div>
        ) : (
          <Link className="whiteButton" href="/solicitudes/nueva"><Plus size={18} /> Nueva solicitud</Link>
        )}
      </section>

      {isProfessionalView && professionalStats && (
        <section className="panelSection compactSection">
          <div className="sectionHeading">
            <div>
              <p className="kicker">REPUTACIÓN ZOVIT</p>
              <h2>Tu progreso verificable</h2>
              <ExperienceBadge level={professionalStats.experience_level} />
            </div>
            {user && (
              <Link className="secondaryButton" href={`/profesional/${user.id}`}>
                <Share2 size={16} /> Perfil público
              </Link>
            )}
          </div>
          <ProfessionalStatsGrid stats={professionalStats} />
        </section>
      )}

      <section className="dashboardGrid">
        <Link href="/perfil" className="dashboardCard">
          <div className="dashboardIcon"><UserRound /></div>
          <div><h3>Mi perfil</h3><p>Actualiza tus datos personales.</p></div>
          <ArrowRight />
        </Link>

        {user && (
          <Link href={`/credencial/${user.id}`} className="dashboardCard">
            <div className="dashboardIcon"><IdCard /></div>
            <div>
              <h3>Mi credencial ZOVIT</h3>
              <p>Credencial verificable con QR para imprimir, compartir o validar en línea.</p>
            </div>
            <ArrowRight />
          </Link>
        )}

        <Link href="/registro/biometria" className="dashboardCard">
          <div className="dashboardIcon"><ShieldCheck /></div>
          <div>
            <h3>Verificación biométrica</h3>
            <p>
              {profile?.identity_verified
                ? "Identidad y biometría verificadas en ZOVIT."
                : profile?.identity_status === "pending"
                  ? "Tu verificación biométrica está en revisión."
                  : "Completa carnet, selfie y prueba de vida."}
            </p>
          </div>
          <ArrowRight />
        </Link>

        {(isProfessionalView || isAdmin) && (
          <Link href="/verificacion" className="dashboardCard">
            <div className="dashboardIcon"><ShieldCheck /></div>
            <div>
              <h3>Verificación gratuita</h3>
              <p>Sube tus certificados de estudios como profesional.</p>
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

        {(isProfessionalView || isAdmin) && (
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

        {isAdmin && (
          <Link href="/admin/pagos" className="dashboardCard">
            <div className="dashboardIcon"><Clock3 /></div>
            <div><h3>Admin pagos</h3><p>Disputas, comisiones y auditoría.</p></div>
            <ArrowRight />
          </Link>
        )}

        {isClientView && (
          <Link href="/solicitudes/nueva" className="dashboardCard">
            <div className="dashboardIcon"><BriefcaseBusiness /></div>
            <div><h3>Solicitar servicio</h3><p>Crea una nueva solicitud.</p></div>
            <ArrowRight />
          </Link>
        )}

        {(isProfessionalView || isAdmin) && (
          <Link href="/experiencia" className="dashboardCard">
            <div className="dashboardIcon"><Sparkles /></div>
            <div><h3>Experiencia verificada</h3><p>Historial real de trabajos en ZOVIT.</p></div>
            <ArrowRight />
          </Link>
        )}

        {(isProfessionalView || isAdmin) && (
          <Link href="/solicitudes/nueva" className="dashboardCard">
            <div className="dashboardIcon"><Plus /></div>
            <div><h3>Publicar solicitud</h3><p>Publica un trabajo para recibir propuestas.</p></div>
            <ArrowRight />
          </Link>
        )}

        {(isProfessionalView || isAdmin) && (
          <Link href="/trabajos" className="dashboardCard">
            <div className="dashboardIcon"><BriefcaseBusiness /></div>
            <div><h3>Trabajos</h3><p>Revisa solicitudes disponibles y asignadas.</p></div>
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
      </section>

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
        ) : requests.length === 0 && publishedRequests.length === 0 ? (
          <div className="emptyState">
            <Clock3 size={34} />
            <h3>{isProfessionalView ? "Todavía no tienes actividad" : "Todavía no tienes solicitudes"}</h3>
            <p>
              {isProfessionalView
                ? "Publica una solicitud o acepta un trabajo disponible."
                : "Crea la primera para comenzar a utilizar ZOVIT."}
            </p>
            {isProfessionalView || isAdmin ? (
              <div className="panelHeroActions">
                <Link href="/solicitudes/nueva" className="primaryButton">Publicar solicitud</Link>
                <Link href="/trabajos" className="secondaryButton">Ver trabajos</Link>
              </div>
            ) : (
              <Link href="/solicitudes/nueva" className="primaryButton">Crear solicitud</Link>
            )}
          </div>
        ) : (
          <div className="requestList">
            {isProfessionalView && publishedRequests.length > 0 && (
              <>
                <p className="kicker">SOLICITUDES PUBLICADAS</p>
                {publishedRequests.map((request) => (
                  <Link
                    href={`/solicitudes/${request.id}`}
                    className="requestRow"
                    key={`pub-${request.id}`}
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
              </>
            )}
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

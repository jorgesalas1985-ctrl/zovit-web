"use client";

import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ClientServiceMap } from "@/components/map/ClientServiceMap";
import { ProposalSection } from "@/components/payments/ProposalSection";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { calculateDistanceKm } from "@/lib/geo/distance";
import { CHILE_VAT_RATE, formatCLP, roundCLP, ZOVIT_COMMISSION_RATE } from "@/lib/payments/types";
import { calculateClientCharge } from "@/lib/payments/mercadopagoFees";
import { AlertCircle, CheckCircle2, Clock3, MapPin, MessageCircle, Navigation, Send, WalletCards } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type RequestRow = {
  id: string;
  client_id: string;
  professional_id: string | null;
  category: string;
  description: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
  client_latitude?: number | null;
  client_longitude?: number | null;
  service_commune?: string | null;
  service_region?: string | null;
  estimated_budget?: number | null;
};

type Message = { id: string; sender_id: string; body: string; created_at: string };
type RequestPayment = { id: string; publicId: string; status: string };

const statusLabels: Record<string, string> = {
  publicada: "Publicada",
  aceptada: "Aceptada",
  en_camino: "En camino",
  en_ejecucion: "En ejecución",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

function RequestDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const [profileRole, setProfileRole] = useState("client");
  const [canProposeAsProfessional, setCanProposeAsProfessional] = useState(false);
  const [professionalLocation, setProfessionalLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [requestPayment, setRequestPayment] = useState<RequestPayment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"debit" | "credit">("debit");
  const [creditInstallments, setCreditInstallments] = useState<1 | 3 | 6 | 9 | 12>(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError("");
    const [profileResult, requestResult, messageResult, paymentResult] = await Promise.all([
      supabase.from("profiles").select("role,latitude,longitude,can_act_as_professional,active_mode").eq("id", user.id).single(),
      supabase.from("solicitudes_de_servicio").select("*").eq("id", id).single(),
      supabase.from("request_messages").select("id,sender_id,body,created_at").eq("request_id", id).order("created_at"),
      fetch(`/api/payments/request/${encodeURIComponent(id)}`, { cache: "no-store" }).then((response) => response.json().catch(() => ({}))),
    ]);
    setProfileRole(profileResult.data?.role ?? "client");
    setCanProposeAsProfessional(Boolean(
      profileResult.data?.role === "admin" ||
      profileResult.data?.role === "professional" ||
      (profileResult.data?.can_act_as_professional && profileResult.data?.active_mode === "professional"),
    ));
    if (typeof profileResult.data?.latitude === "number" && typeof profileResult.data?.longitude === "number") {
      setProfessionalLocation({ latitude: profileResult.data.latitude, longitude: profileResult.data.longitude });
    } else {
      setProfessionalLocation(null);
    }
    if (requestResult.error || !requestResult.data) {
      setError("No existe la solicitud o no tienes permiso para verla.");
      setRequest(null);
    } else {
      setRequest(requestResult.data as RequestRow);
    }
    setMessages((messageResult.data ?? []) as Message[]);
    setRequestPayment(paymentResult?.payment ?? null);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user || !id) return;
    const channel = supabase.channel(`request-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "request_messages", filter: `request_id=eq.${id}` }, (payload) => {
        setMessages((current) => current.some((message) => message.id === payload.new.id)
          ? current
          : [...current, payload.new as Message]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "solicitudes_de_servicio", filter: `id=eq.${id}` }, (payload) => {
        setRequest(payload.new as RequestRow);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const isClient = Boolean(user && request?.client_id === user.id);
  const isProfessional = Boolean(user && request?.professional_id === user.id);
  const viewingAsClient = isRealSuperAdmin ? tourAccount === "client" : isClient;
  const viewingAsProfessional = isRealSuperAdmin
    ? tourAccount === "professional"
    : !isClient && canProposeAsProfessional;
  const canInteract = isClient || isProfessional || profileRole === "admin";
  const hasClientCoordinates = typeof request?.client_latitude === "number" && typeof request?.client_longitude === "number";
  const revealExactLocation = Boolean(isClient || (request && request.status !== "publicada"));
  const mapLocation = request && hasClientCoordinates ? {
    latitude: request.client_latitude! + (revealExactLocation ? 0 : 0.0045),
    longitude: request.client_longitude! + (revealExactLocation ? 0 : 0.0045),
    formattedAddress: revealExactLocation ? request.address : `${request.service_commune ?? request.address} (ubicación aproximada)`,
    commune: request.service_commune ?? null,
    region: request.service_region ?? null,
    source: "search" as const,
  } : null;
  const distanceKm = mapLocation && professionalLocation
    ? Math.max(0.5, calculateDistanceKm(professionalLocation.latitude, professionalLocation.longitude, mapLocation.latitude, mapLocation.longitude))
    : null;
  const arrivalMinutes = distanceKm == null ? null : Math.max(5, Math.round((distanceKm / 25) * 60));
  const storedBudget = Number(request?.estimated_budget ?? 0);
  // Compatibilidad con solicitudes antiguas donde "20" se ingresó como 20 mil pesos.
  const requestedAmount = storedBudget > 0 && storedBudget < 1000 ? storedBudget * 1000 : storedBudget;
  const baseFare = 4000;
  const distanceFare = distanceKm == null ? 0 : roundCLP(distanceKm * 600);
  const timeFare = arrivalMinutes == null ? 0 : arrivalMinutes * 100;
  const serviceSubtotal = baseFare + distanceFare + timeFare;
  const serviceVat = roundCLP(serviceSubtotal * CHILE_VAT_RATE);
  const platformFee = roundCLP(serviceSubtotal * ZOVIT_COMMISSION_RATE);
  const platformFeeVat = roundCLP(platformFee * CHILE_VAT_RATE);
  const estimatedTotal = roundCLP(requestedAmount + serviceSubtotal + serviceVat + platformFee + platformFeeVat);
  const serviceTotal = serviceSubtotal + serviceVat;
  const zovitCommissionTotal = platformFee + platformFeeVat;
  const selectedInstallments = paymentMethod === "credit" ? creditInstallments : 1;
  const mercadoPagoCharge = calculateClientCharge(estimatedTotal, selectedInstallments);
  const installmentAmount = selectedInstallments > 1
    ? Math.ceil(mercadoPagoCharge.clientChargedAmount / selectedInstallments)
    : null;
  const displayedServiceTotal = serviceTotal + (paymentMethod === "debit" ? mercadoPagoCharge.processingFee : 0);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!user || !request || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { error: sendError } = await supabase.from("request_messages").insert({
      request_id: request.id,
      sender_id: user.id,
      body,
    });
    if (sendError) {
      setText(body);
      setError(sendError.message);
    }
  }

  async function cancelService() {
    if (!request) return;
    setBusy(true);
    setError("");
    const { data, error: cancelError } = await supabase.rpc("client_cancel_service_request", {
      p_request_id: request.id,
    });
    if (cancelError) {
      setError(cancelError.message);
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.fee_status === "pendiente") {
        setError(`La solicitud fue cancelada. Quedó un cargo pendiente de ${formatCLP(Number(result.fee_amount ?? 0))}, disponible en Pagos.`);
      }
      await load();
    }
    setBusy(false);
  }

  async function progressPaidWork(action: "start-work" | "complete-work" | "approve") {
    if (!requestPayment) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/payments/orders/${requestPayment.id}/${action}`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "No se pudo actualizar el servicio.");
    else await load();
    setBusy(false);
  }

  return (
    <main className="simplePage requestDetailPage">
      <section className="requestWorkspace">
        <div className="detailTopbar">
          {request && <span className={`statusPill status-${request.status}`}>{statusLabels[request.status] ?? request.status}</span>}
        </div>

        {loading ? <div className="emptyState">Cargando solicitud…</div> : !request ? (
          <div className="emptyState"><AlertCircle size={36} /><h3>No pudimos abrirla</h3><p>{error}</p></div>
        ) : (
          <>
            <header className="requestWorkspaceHeader">
              <div><p className="kicker">SOLICITUD DE SERVICIO</p><h1>{request.category}</h1><p>{request.description}</p></div>
              <div className="requestAddress"><MapPin size={18} /><span>{request.address}</span></div>
            </header>

            {error && <div className="formMessage"><AlertCircle size={17} />{error}</div>}

            <div className="statusTimeline">
              {["publicada", "aceptada", "en_camino", "en_ejecucion", "finalizada"].map((status, index, statuses) => {
                const current = statuses.indexOf(request.status);
                return <div className={index <= current ? "timelineStep active" : "timelineStep"} key={status}><span>{index + 1}</span><small>{statusLabels[status]}</small></div>;
              })}
            </div>

            <section className="moduleCard serviceEstimateCard">
              <div className="moduleHeading">
                <div><p className="kicker">RESUMEN Y ESTIMACIÓN</p><h2>Servicio, viaje y ubicación</h2></div>
                <WalletCards />
              </div>
              <div className="serviceEstimateLayout">
                <div className="serviceLocationPreview">
                  {mapLocation ? (
                    <ClientServiceMap location={mapLocation} radiusKm={1} professionals={[]} selectedId={null} onSelectProfessional={() => undefined} />
                  ) : (
                    <div className="mapErrorState"><p>Esta solicitud todavía no tiene coordenadas guardadas.</p></div>
                  )}
                  {!revealExactLocation && <span className="approximateLocationBadge">Zona aproximada por seguridad</span>}
                </div>
                <div className="serviceEstimateDetails">
                  <div className="tripEstimateStrip">
                    <span><Navigation size={18} /><strong>{distanceKm == null ? "Por calcular" : `${distanceKm.toFixed(1)} km`}</strong><small>Distancia</small></span>
                    <span><Clock3 size={18} /><strong>{arrivalMinutes == null ? "Por calcular" : `${arrivalMinutes} min`}</strong><small>Llegada estimada</small></span>
                  </div>
                  <div className="electronicPaymentSelector" aria-label="Medio de pago electrónico">
                    <label className="creditInstallmentsField">
                      Medio de pago
                      <select value={paymentMethod === "debit" ? "debit" : `credit-${creditInstallments}`} onChange={(event) => {
                        const value = event.target.value;
                        if (value === "debit") {
                          setPaymentMethod("debit");
                          setCreditInstallments(1);
                        } else {
                          setPaymentMethod("credit");
                          setCreditInstallments(Number(value.replace("credit-", "")) as typeof creditInstallments);
                        }
                      }}>
                        <option value="debit">Débito</option>
                        <option value="credit-1">Crédito 1 cuota</option>
                        <option value="credit-3">Crédito 3 cuotas</option>
                        <option value="credit-6">Crédito 6 cuotas</option>
                        <option value="credit-9">Crédito 9 cuotas</option>
                        <option value="credit-12">Crédito 12 cuotas</option>
                      </select>
                    </label>
                  </div>
                  <dl className="fareBreakdown">
                    <div><dt>Bencina solicitada (IVA incluido)</dt><dd>{requestedAmount > 0 ? formatCLP(requestedAmount) : "No informado"}</dd></div>
                    <div><dt>Servicio</dt><dd>{formatCLP(displayedServiceTotal)}</dd></div>
                    <div><dt>Comisión ZOVIT</dt><dd>{formatCLP(zovitCommissionTotal)}</dd></div>
                    {paymentMethod === "credit" && <div><dt>Costo bancario por pago electrónico</dt><dd>{formatCLP(mercadoPagoCharge.processingFee)}</dd></div>}
                    <div className="fareTotal"><dt>TOTAL A PAGAR (IVA incluido)</dt><dd>{formatCLP(mercadoPagoCharge.clientChargedAmount)}</dd></div>
                  </dl>
                  {installmentAmount && <p className="installmentTotalCopy">{selectedInstallments} cuotas de {formatCLP(installmentAmount)}</p>}
                  <div className="promoCodeBox">
                    <label htmlFor="request-promo-code">Código promocional</label>
                    <div>
                      <input id="request-promo-code" value={promoCode} onChange={(event) => { setPromoCode(event.target.value.toUpperCase()); setPromoMessage(""); }} placeholder="Ingresa tu código" />
                      <button type="button" className="secondaryButton" disabled={!promoCode.trim()} onClick={() => setPromoMessage("El código se validará antes de crear el pago.")}>Aplicar</button>
                    </div>
                    {promoMessage && <small>{promoMessage}</small>}
                  </div>
                  <p className="estimateNotice">Pago protegido mediante Mercado Pago. El costo bancario corresponde al procesamiento electrónico y es asumido por el cliente; no es una comisión ZOVIT.</p>
                </div>
              </div>
            </section>

            <ProposalSection
              requestId={request.id}
              requestStatus={request.status}
              isClient={viewingAsClient}
              isProfessional={viewingAsProfessional}
              fuelAmount={requestedAmount}
              serviceAmount={serviceSubtotal}
            />

            <div className="requestColumns">
              <div className="requestMainColumn">
                <section className="moduleCard chatCard">
                  <div className="moduleHeading"><div><p className="kicker">COMUNICACIÓN</p><h2>Chat del servicio</h2></div><MessageCircle /></div>
                  <div className="chatMessages">
                    {messages.length === 0 && <p className="chatEmpty">Aún no hay mensajes. Escribe el primero.</p>}
                    {messages.map((message) => (
                      <div key={message.id} className={message.sender_id === user?.id ? "chatBubble own" : "chatBubble"}>
                        <p>{message.body}</p>
                        <time>{new Date(message.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</time>
                      </div>
                    ))}
                    <div ref={chatEnd} />
                  </div>
                  <form className="chatForm" onSubmit={sendMessage}>
                    <input value={text} onChange={(event) => setText(event.target.value)} placeholder={canInteract ? "Escribe un mensaje…" : "Disponible al asignarse un profesional"} disabled={!canInteract} />
                    <button className="primaryButton" disabled={!canInteract || !text.trim()} aria-label="Enviar mensaje"><Send size={18} /></button>
                  </form>
                </section>
              </div>

              <aside className="requestSideColumn">
                <section className="moduleCard actionCard">
                  <p className="kicker">GESTIÓN</p><h2>Acciones</h2>
                  {isProfessional && request.status === "aceptada" && requestPayment?.status === "pago_retenido" && <button className="primaryButton fullButton" disabled={busy} onClick={() => void progressPaidWork("start-work")}>Iniciar trabajo</button>}
                  {isProfessional && request.status === "aceptada" && requestPayment?.status !== "pago_retenido" && <p className="muted">Esperando que el cliente complete el pago protegido.</p>}
                  {isProfessional && request.status === "en_ejecucion" && requestPayment?.status === "trabajo_en_ejecucion" && <button className="primaryButton fullButton" disabled={busy} onClick={() => void progressPaidWork("complete-work")}>Finalizar trabajo</button>}
                  {viewingAsClient && request.status === "aceptada" && requestPayment?.status === "esperando_pago" && <Link className="primaryButton fullButton" href={`/pagos?payment=${encodeURIComponent(requestPayment.publicId)}`}>Pagar con Mercado Pago</Link>}
                  {viewingAsClient && request.status === "finalizada" && requestPayment?.status === "esperando_aprobacion_cliente" && <button className="primaryButton fullButton" disabled={busy} onClick={() => void progressPaidWork("approve")}>Confirmar trabajo y liberar pago</button>}
                  {isClient && request.status === "publicada" && <button className="dangerButton fullButton" disabled={busy} onClick={() => void cancelService()}>Cancelar solicitud</button>}
                  {request.status === "finalizada" && <div className="completionBox"><CheckCircle2 /><strong>Trabajo finalizado</strong><span>La solicitud quedó completada.</span></div>}
                </section>
                <section className="moduleCard"><p className="kicker">INFORMACIÓN</p><dl className="requestMeta"><div><dt>Publicada</dt><dd>{new Date(request.created_at).toLocaleString("es-CL")}</dd></div><div><dt>Última actualización</dt><dd>{new Date(request.updated_at).toLocaleString("es-CL")}</dd></div><div><dt>Profesional</dt><dd>{request.professional_id ? "Asignado" : "Aún no asignado"}</dd></div></dl></section>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function RequestDetailPage() {
  return <Protected><RequestDetailContent /></Protected>;
}

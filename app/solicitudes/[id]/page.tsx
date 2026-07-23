"use client";

import { Protected } from "@/components/Protected";
import { ProposalSection } from "@/components/payments/ProposalSection";
import { ServiceRatingForm } from "@/components/ServiceRatingForm";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, MapPin, MessageCircle, Send, Upload } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type RequestRow = {
  id:string; client_id:string; professional_id:string|null; category:string; description:string; address:string;
  status:string; created_at:string; updated_at:string;
};
type Message = { id:string; sender_id:string; body:string; created_at:string };
type Photo = { id:string; uploaded_by:string; photo_type:"before"|"after"; storage_path:string; created_at:string; url?:string };
type StatusHistory = { id:string; old_status:string|null; new_status:string; created_at:string };
type ExistingRating = { id:string; rating:number; comment:string|null };

const statusLabels: Record<string,string> = {
  publicada:"Publicada", aceptada:"Aceptada", en_camino:"En camino", en_ejecucion:"En ejecución",
  finalizada:"Finalizada", cancelada:"Cancelada"
};
const nextStatus: Record<string,string> = { aceptada:"en_camino", en_camino:"en_ejecucion", en_ejecucion:"finalizada" };

function proposalsVisible(status: string) {
  return ["aceptada", "en_camino", "en_ejecucion"].includes(status);
}
const activeFlow = ["publicada","aceptada","en_camino","en_ejecucion","finalizada"];

export default function RequestDetailPage() {
  const { id } = useParams<{id:string}>();
  const { user, profile } = useAuth();
  const profileRole = profile?.role ?? "client";
  const [request, setRequest] = useState<RequestRow|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [existingRating, setExistingRating] = useState<ExistingRating | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true); setError("");
    const [requestResult, messageResult, photoResult, historyResult, ratingResult] = await Promise.all([
      supabase.from("solicitudes_de_servicio").select("*").eq("id", id).single(),
      supabase.from("request_messages").select("id,sender_id,body,created_at").eq("request_id", id).order("created_at"),
      supabase.from("request_photos").select("id,uploaded_by,photo_type,storage_path,created_at").eq("request_id", id).order("created_at"),
      supabase.from("request_status_history").select("id,old_status,new_status,created_at").eq("request_id", id).order("created_at", { ascending: false }).limit(8),
      supabase.from("service_ratings").select("id,rating,comment").eq("request_id", id).maybeSingle(),
    ]);
    if (requestResult.error || !requestResult.data) setError("No existe la solicitud o no tienes permiso para verla.");
    else setRequest(requestResult.data as RequestRow);
    setMessages((messageResult.data ?? []) as Message[]);
    setHistory((historyResult.data ?? []) as StatusHistory[]);
    setExistingRating((ratingResult.data as ExistingRating | null) ?? null);

    const photoRows = (photoResult.data ?? []) as Photo[];
    const withUrls = await Promise.all(photoRows.map(async (photo) => {
      const { data } = await supabase.storage.from("request-photos").createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: data?.signedUrl };
    }));
    setPhotos(withUrls);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user || !id) return;
    const channel = supabase.channel(`request-${id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"request_messages", filter:`request_id=eq.${id}` }, (payload) => {
        setMessages((current) => current.some((m) => m.id === payload.new.id) ? current : [...current, payload.new as Message]);
      })
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"solicitudes_de_servicio", filter:`id=eq.${id}` }, (payload) => setRequest(payload.new as RequestRow))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const isClient = !!user && request?.client_id === user.id;
  const isProfessional = !!user && request?.professional_id === user.id;
  const isParticipant = isClient || isProfessional;
  const isAdmin = profileRole === "admin";
  const isCancelled = request?.status === "cancelada";
  const isFinalized = request?.status === "finalizada";
  const canCollaborate = !!request && !isCancelled && request.status !== "publicada" && (isParticipant || isAdmin);
  const chatPlaceholder = request?.status === "publicada"
    ? "El chat se habilitará cuando un profesional acepte la solicitud."
    : isCancelled
      ? "Esta solicitud fue cancelada."
      : isFinalized
        ? "Trabajo finalizado. El historial queda disponible."
        : "Escribe un mensaje…";

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!user || !text.trim() || !request || !canCollaborate) return;
    const body = text.trim(); setText("");
    const { error: sendError } = await supabase.from("request_messages").insert({ request_id:request.id, sender_id:user.id, body });
    if (sendError) { setText(body); setError(sendError.message); }
  }

  async function updateStatus(status: string) {
    if (!request) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.rpc("change_service_request_status", { request_id:request.id, new_status:status });
    if (updateError) setError(updateError.message);
    else await load();
    setBusy(false);
  }

  async function uploadPhoto(file: File, type:"before"|"after") {
    if (!user || !request || !canCollaborate) return;
    setBusy(true); setError("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${request.id}/${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("request-photos").upload(path, file, { contentType:file.type, upsert:false });
    if (uploadError) setError(uploadError.message);
    else {
      const { error: rowError } = await supabase.from("request_photos").insert({ request_id:request.id, uploaded_by:user.id, photo_type:type, storage_path:path });
      if (rowError) setError(rowError.message); else await load();
    }
    setBusy(false);
  }

  return (
    <Protected>
      <main className="simplePage requestDetailPage">
        <section className="requestWorkspace">
          <div className="detailTopbar">
            <Link href={profileRole === "professional" ? "/trabajos" : "/panel"} className="backLink"><ArrowLeft size={18}/> Volver</Link>
            {request && <span className={`statusPill status-${request.status}`}>{statusLabels[request.status] ?? request.status}</span>}
          </div>

          {loading ? <div className="emptyState">Cargando solicitud…</div> : !request ? (
            <div className="emptyState"><AlertCircle size={36}/><h3>No pudimos abrirla</h3><p>{error}</p></div>
          ) : (
            <>
              <header className="requestWorkspaceHeader">
                <div><p className="kicker">SOLICITUD DE SERVICIO</p><h1>{request.category}</h1><p>{request.description}</p></div>
                <div className="requestAddress"><MapPin size={18}/><span>{request.address}</span></div>
              </header>

              {error && <div className="formMessage"><AlertCircle size={17}/>{error}</div>}

              {isCancelled ? (
                <div className="cancelledBanner">Esta solicitud fue cancelada y ya no admite cambios.</div>
              ) : (
                <div className="statusTimeline">
                  {activeFlow.map((status, index) => {
                    const current = activeFlow.indexOf(request.status);
                    return <div className={index <= current ? "timelineStep active" : "timelineStep"} key={status}><span>{index + 1}</span><small>{statusLabels[status]}</small></div>;
                  })}
                </div>
              )}

              <div className="requestColumns">
                <div className="requestMainColumn">
                  <section className="moduleCard">
                    <div className="moduleHeading"><div><p className="kicker">EVIDENCIA</p><h2>Fotos del trabajo</h2></div><Camera/></div>
                    {!canCollaborate && <p className="muted">Las fotos estarán disponibles cuando la solicitud sea aceptada por un profesional.</p>}
                    <div className="photoGroups">
                      {(["before","after"] as const).map((type) => (
                        <div key={type} className="photoGroup">
                          <div className="photoGroupTitle"><strong>{type === "before" ? "Antes" : "Después"}</strong>
                            {canCollaborate && <label className="uploadButton"><Upload size={16}/> Subir foto<input type="file" accept="image/*" disabled={busy} onChange={(e) => { const f=e.target.files?.[0]; if(f) void uploadPhoto(f,type); e.currentTarget.value=""; }}/></label>}
                          </div>
                          <div className="photoGrid">
                            {photos.filter((p) => p.photo_type === type).length === 0 ? <div className="photoPlaceholder">Sin fotografías</div> : photos.filter((p) => p.photo_type === type).map((photo) => photo.url ? <Image src={photo.url} alt={type === "before" ? "Antes del trabajo" : "Después del trabajo"} width={320} height={240} unoptimized key={photo.id}/> : null)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="moduleCard chatCard">
                    <div className="moduleHeading"><div><p className="kicker">COMUNICACIÓN</p><h2>Chat del servicio</h2></div><MessageCircle/></div>
                    <div className="chatMessages">
                      {messages.length === 0 && <p className="chatEmpty">{chatPlaceholder}</p>}
                      {messages.map((message) => <div key={message.id} className={message.sender_id === user?.id ? "chatBubble own" : "chatBubble"}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString("es-CL", {hour:"2-digit",minute:"2-digit"})}</time></div>)}
                      <div ref={chatEnd}/>
                    </div>
                    <form className="chatForm" onSubmit={sendMessage}><input value={text} onChange={(e)=>setText(e.target.value)} placeholder={chatPlaceholder} disabled={!canCollaborate}/><button className="primaryButton" disabled={!canCollaborate || !text.trim()}><Send size={18}/></button></form>
                  </section>
                </div>

                <aside className="requestSideColumn">
                  {(request.status === "publicada" || proposalsVisible(request.status)) && (
                    <ProposalSection
                      requestId={request.id}
                      requestStatus={request.status}
                      isClient={isClient}
                      isProfessional={isProfessional}
                    />
                  )}
                  <section className="moduleCard actionCard"><p className="kicker">GESTIÓN</p><h2>Acciones</h2>
                    {isProfessional && nextStatus[request.status] && <button className="primaryButton fullButton" disabled={busy} onClick={()=>void updateStatus(nextStatus[request.status])}>{request.status === "aceptada" ? "Marcar en camino" : request.status === "en_camino" ? "Iniciar trabajo" : "Finalizar trabajo"}</button>}
                    {isClient && ["publicada","aceptada"].includes(request.status) && <button className="dangerButton fullButton" disabled={busy} onClick={()=>void updateStatus("cancelada")}>Cancelar solicitud</button>}
                    {request.status === "finalizada" && <div className="completionBox"><CheckCircle2/><strong>Trabajo finalizado</strong><span>La solicitud quedó completada.</span></div>}
                    {request.professional_id && (
                      <Link className="secondaryButton fullButton" href={`/profesional/${request.professional_id}`}>Ver perfil del profesional</Link>
                    )}
                    {request.status === "publicada" && isClient && <p className="muted">Esperando que un profesional acepte tu solicitud.</p>}
                    {!isParticipant && !isAdmin && <p className="muted">Solo los participantes pueden administrar esta solicitud.</p>}
                  </section>
                  {isClient && request.status === "finalizada" && !existingRating && (
                    <section className="moduleCard">
                      <ServiceRatingForm requestId={request.id} onSubmitted={() => void load()} />
                    </section>
                  )}
                  {existingRating && (
                    <section className="moduleCard">
                      <p className="kicker">TU CALIFICACIÓN</p>
                      <h2>{existingRating.rating} estrellas</h2>
                      {existingRating.comment && <p>{existingRating.comment}</p>}
                    </section>
                  )}
                  <section className="moduleCard"><p className="kicker">INFORMACIÓN</p><dl className="requestMeta"><div><dt>Publicada</dt><dd>{new Date(request.created_at).toLocaleString("es-CL")}</dd></div><div><dt>Última actualización</dt><dd>{new Date(request.updated_at).toLocaleString("es-CL")}</dd></div><div><dt>Profesional</dt><dd>{request.professional_id ? "Asignado" : "Aún no asignado"}</dd></div></dl></section>
                  {history.length > 0 && (
                    <section className="moduleCard">
                      <p className="kicker">HISTORIAL</p>
                      <h2>Actividad</h2>
                      <div className="activityLog">
                        {history.map((entry) => (
                          <div className="activityLogItem" key={entry.id}>
                            {entry.old_status ? `${statusLabels[entry.old_status] ?? entry.old_status} → ${statusLabels[entry.new_status] ?? entry.new_status}` : statusLabels[entry.new_status] ?? entry.new_status}
                            <time>{new Date(entry.created_at).toLocaleString("es-CL")}</time>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </>
          )}
        </section>
      </main>
    </Protected>
  );
}

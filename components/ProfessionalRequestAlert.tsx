"use client";

import { useAuth } from "@/components/AuthProvider";
import { canAccessProfessionalFeatures } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { AlertCircle, CheckCircle2, HandCoins, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Invitation = { id: string; request_id: string; read_at: string | null };
type RequestAlert = { id: string; category: string; description: string; address: string; professionalNet: number; isFuelDelivery?: boolean };
const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function ProfessionalRequestAlert() {
  const { user, profile } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const [queue, setQueue] = useState<Invitation[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [request, setRequest] = useState<RequestAlert | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const active = queue.find((item) => !dismissed.includes(item.id)) ?? null;
  const enabled = Boolean(user && (
    (isRealSuperAdmin && tourAccount === "professional") ||
    (profile && canAccessProfessionalFeatures(profile))
  ));

  useEffect(() => {
    setSoundEnabled(window.localStorage.getItem("zovit-professional-alert-sound") === "enabled");
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;
    const unlock = () => {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      void context.resume();
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [soundEnabled]);

  // Al cambiar de cuenta/modo, vuelve a mostrar la oferta pendiente al regresar a Profesional.
  useEffect(() => {
    setDismissed([]);
    setQueue([]);
    setRequest(null);
    setMessage("");
  }, [enabled, tourAccount, user?.id]);

  const load = useCallback(async () => {
    if (!user || !enabled) return;
    const { data } = await supabase.from("notifications")
      .select("id,request_id,read_at")
      .eq("user_id", user.id)
      .eq("title", "Nuevo trabajo para ti")
      .is("read_at", null)
      .not("request_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(5);
    const invitations = (data ?? []) as Invitation[];
    if (invitations.length > 0) {
      setQueue(invitations);
      return;
    }
    // Solicitud elegida directamente por el cliente: también debe alertar al profesional.
    const direct = await fetch("/api/professional/request-alert", { cache: "no-store" });
    const directData = await direct.json() as { request?: RequestAlert };
    setQueue(directData.request ? [{ id: `assigned:${directData.request.id}`, request_id: directData.request.id, read_at: null }] : []);
  }, [enabled, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user || !enabled) return;
    const channel = supabase.channel(`professional-request-alert-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const notification = payload.new as Invitation & { title?: string };
        if (notification.title === "Nuevo trabajo para ti" && notification.request_id) setQueue((current) => [...current, notification]);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, user]);

  useEffect(() => {
    if (!active) { setRequest(null); return; }
    let cancelled = false;
    fetch(`/api/professional/request-alert?requestId=${encodeURIComponent(active.request_id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { request?: RequestAlert; error?: string };
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) { setRequest(data.request ?? null); setMessage(""); }
      })
      .catch((error: unknown) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "No fue posible cargar la solicitud."); });
    return () => { cancelled = true; };
  }, [active]);

  const playAlertTone = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    const context = audioContext.current ?? new AudioContext();
    audioContext.current = context;
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.setValueAtTime(990, context.currentTime + 0.13);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  }, [soundEnabled]);

  useEffect(() => {
    if (!active) return;
    setSecondsLeft(10);
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          void markAndDismiss(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
    // Reinicia exactamente cuando cambia la oferta activa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => {
    if (!active || secondsLeft === 10 || secondsLeft % 2 !== 0) return;
    playAlertTone();
  }, [active, playAlertTone, secondsLeft]);

  function enableSound() {
    setSoundEnabled(true);
    window.localStorage.setItem("zovit-professional-alert-sound", "enabled");
    const context = audioContext.current ?? new AudioContext();
    audioContext.current = context;
    void context.resume().then(playAlertTone);
  }

  async function markAndDismiss(read: boolean) {
    if (!active) return;
    if (read && !active.id.startsWith("assigned:")) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", active.id);
    }
    setDismissed((current) => [...current, active.id]);
  }

  async function accept() {
    if (!active) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.rpc("accept_service_request", { request_id: active.request_id });
    setBusy(false);
    if (error) { setMessage(error.message || "No fue posible aceptar el servicio."); return; }
    await markAndDismiss(true);
  }

  if (!enabled || !active) return null;
  return <div className="professionalRequestAlertOverlay" role="presentation">
    <section className="professionalRequestAlert" role="dialog" aria-modal="true" aria-label="Nueva solicitud de servicio">
      <button type="button" className="mapProClose" onClick={() => void markAndDismiss(false)} aria-label="Cerrar y seguir esperando"><X size={18} /></button>
      <p className="kicker">NUEVA SOLICITUD DISPONIBLE · {secondsLeft} s</p><h2>Un cliente solicita tu servicio</h2>
      <div className="professionalRequestTimer" aria-label={`Quedan ${secondsLeft} segundos`}><span style={{ width: `${secondsLeft * 10}%` }} /></div>
      {request ? <><div className="professionalRequestAlertDetail"><strong>{request.category}</strong><p>{request.description}</p><small>{request.address}</small></div><div className="professionalRequestAlertNet"><span><HandCoins size={18} /> {request.isFuelDelivery ? "Recibirás por bencina y traslado" : "Recibirás líquido por el servicio"}</span><strong>{clp.format(request.professionalNet)}</strong></div></> : <p className="muted">Cargando detalle…</p>}
      {message && <p className="formMessage"><AlertCircle size={16} />{message}</p>}
      <div className="mapModalActions"><button type="button" className="secondaryButton" disabled={busy} onClick={() => void markAndDismiss(true)}>Cancelar</button><button type="button" className="primaryButton" disabled={busy || !request} onClick={() => void accept()}><CheckCircle2 size={17} />{busy ? "Aceptando…" : "Aceptar servicio"}</button></div>
      <button type="button" className="professionalRequestSound" onClick={soundEnabled ? () => { setSoundEnabled(false); window.localStorage.removeItem("zovit-professional-alert-sound"); } : enableSound}>{soundEnabled ? <><Volume2 size={16} /> Sonido activado</> : <><VolumeX size={16} /> Activar sonido de solicitudes</>}</button>
    </section>
  </div>;
}

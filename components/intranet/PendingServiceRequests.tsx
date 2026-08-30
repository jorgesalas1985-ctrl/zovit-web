"use client";

import { Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type RequestRow = { id: string; category: string; description: string; address: string; status: string; created_at: string; professional_id: string | null };

export function PendingServiceRequests() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/intranet/service-requests", { cache: "no-store" });
    const data = await response.json() as { requests?: RequestRow[]; error?: string };
    setRequests(data.requests ?? []); setMessage(response.ok ? "" : data.error ?? "No fue posible cargar las solicitudes."); setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function act(id: string, action: "cancel" | "delete") {
    const verb = action === "delete" ? "eliminar" : "cancelar";
    if (!window.confirm(`¿Seguro que deseas ${verb} esta solicitud?`)) return;
    setBusyId(id); setMessage("");
    const response = await fetch("/api/intranet/service-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setMessage(data.error ?? "No fue posible actualizar la solicitud."); else await load();
    setBusyId("");
  }
  if (loading) return <p className="muted">Cargando solicitudes…</p>;
  return <section className="pendingRequestsAdmin"><p className="muted">Se muestran solicitudes activas. Cancelar mantiene auditoría; eliminar solo está disponible antes de asignar profesional o pago.</p>{message && <p className="notice">{message}</p>}{requests.length === 0 ? <p className="emptyState">No hay solicitudes pendientes.</p> : <div className="pendingRequestsList">{requests.map((service) => <article key={service.id} className="pendingRequestCard"><div><span className="statusPill">{service.status}</span><h3>{service.category}</h3><p>{service.description}</p><small>{service.address} · {new Date(service.created_at).toLocaleString("es-CL")}</small></div><div className="pendingRequestActions"><button className="dangerButton" disabled={busyId === service.id} onClick={() => void act(service.id, "cancel")}><XCircle size={16} />Cancelar</button>{service.status === "publicada" && !service.professional_id && <button className="secondaryButton" disabled={busyId === service.id} onClick={() => void act(service.id, "delete")}><Trash2 size={16} />Eliminar</button>}</div></article>)}</div>}</section>;
}

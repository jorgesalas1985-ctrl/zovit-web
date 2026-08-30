"use client";

import { Bot, BrainCircuit, Send, ShieldCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Message = { id: string; role: "superadmin" | "assistant"; text: string; createdAt: string; kind: string; links?: Array<{ label: string; href: string }> };

export function ZovitAiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [asOrder, setAsOrder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/intranet/ai-chat", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setMessages(data.messages ?? []); else setError(data.error ?? "No fue posible abrir la conversación.");
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault(); if (!message.trim()) return;
    const outgoing = message.trim();
    const optimisticId = `pending-${Date.now()}`;
    setMessages((current) => [...current, { id: optimisticId, role: "superadmin", text: outgoing, createdAt: new Date().toISOString(), kind: asOrder ? "training_order" : "message" }]);
    setMessage("");
    setBusy(true); setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/intranet/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: outgoing, asOrder }), signal: controller.signal });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? await response.json() : { error: "El servidor entregó una respuesta no válida." };
      if (response.status === 403) {
        window.dispatchEvent(new CustomEvent("zovit-ai-session-expired"));
        throw new Error("La sesión privada venció. Ingresa nuevamente tu código secreto.");
      }
      if (!response.ok) throw new Error(data.error ?? "No fue posible enviar el mensaje.");
      setMessages(data.messages ?? []); setAsOrder(false);
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setMessage(outgoing);
      setError(sendError instanceof DOMException && sendError.name === "AbortError" ? "ZOVIT IA tardó demasiado en responder. Inténtalo nuevamente." : sendError instanceof Error ? sendError.message : "No fue posible enviar el mensaje.");
    }
    finally { window.clearTimeout(timeout); setBusy(false); }
  }

  return (
    <section className="aiPrivateChat">
      <header className="aiChatHeader"><div className="aiChatAvatar"><BrainCircuit size={26} /></div><div><span><ShieldCheck size={14} /> Canal exclusivo del superadministrador</span><h3>Conversar con ZOVIT IA</h3><p>Consulta, entrega instrucciones o guarda una orden de entrenamiento.</p></div></header>
      <div ref={messagesRef} className="aiChatMessages" aria-live="polite">
        {messages.length === 0 && <div className="aiChatWelcome"><Bot size={32} /><strong>Estoy lista para conversar contigo.</strong><p>Pregúntame qué sé de ZOVIT o entrégame mi primera orden privada.</p></div>}
        {messages.map((item) => <div key={item.id} className={`aiChatBubble aiChatBubble--${item.role}`}><small>{item.role === "superadmin" ? "Tú · Superadministrador" : "ZOVIT IA"}{item.kind === "training_order" ? " · Orden" : ""}</small><p>{item.text}</p>{item.links?.map((link) => <a key={link.href} className="secondaryButton aiChatDocumentLink" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}</div>)}
      </div>
      {error && <div className="formMessage aiChatError" role="alert">{error}</div>}
      <form className="aiChatComposer" onSubmit={send}><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="Escribe un mensaje para ZOVIT IA…" rows={3} /><div className="aiChatComposerActions"><label className="aiOrderToggle"><input type="checkbox" checked={asOrder} onChange={(event) => setAsOrder(event.target.checked)} /><span>Guardar como orden de entrenamiento</span></label><button className="primaryButton" disabled={busy || !message.trim()}><Send size={17} /> {busy ? "Enviando…" : "Enviar"}</button></div></form>
    </section>
  );
}

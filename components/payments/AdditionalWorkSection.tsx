"use client";

import { calculateBreakdown, formatCLP } from "@/lib/payments/types";
import { AlertCircle, PlusCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  requestId: string;
  enabled: boolean;
};

export function AdditionalWorkSection({ requestId, enabled }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("15000");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  const breakdown = calculateBreakdown(Number(amount) || 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/payments/additional-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        amount: Number(amount),
        description: description.trim(),
      }),
    });
    const data = (await response.json()) as {
      error?: string;
      paymentPublicId?: string;
    };

    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo crear el trabajo adicional.");
      return;
    }

    setDescription("");
    setMessage(
      `Trabajo adicional creado (${data.paymentPublicId ?? ""}). Paga en ZOVIT para proteger el dinero.`,
    );
    router.push("/pagos");
  }

  return (
    <section className="moduleCard">
      <div className="moduleHeading">
        <div>
          <p className="kicker">EXTRA</p>
          <h2>Trabajo adicional</h2>
        </div>
        <PlusCircle />
      </div>
      <p className="muted">
        ¿Surgió algo más en el lugar? Agrégalo aquí con el monto real, paga en ZOVIT y queda
        protegido. No acuerden precios menores en la app para bajar la comisión ni cobren el resto
        fuera: eso puede bloquear cuentas.
      </p>

      <form className="formStack" onSubmit={(e) => void submit(e)}>
        <label>
          ¿Qué trabajo adicional?
          <textarea
            required
            minLength={8}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: también cambiar 2 enchufes del living"
          />
        </label>
        <label>
          Monto acordado (CLP)
          <input
            type="number"
            min={1000}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <p className="muted">
          Total a pagar: {formatCLP(breakdown.amountGross)} · Profesional recibe aprox.{" "}
          {formatCLP(breakdown.amountNet)} (tras comisión ZOVIT).
        </p>
        <button className="primaryButton wide" type="submit" disabled={busy}>
          {busy ? "Creando…" : "Crear y pagar en ZOVIT"}
        </button>
      </form>

      {message && (
        <div className="formMessage">
          <AlertCircle size={17} /> {message}
        </div>
      )}
    </section>
  );
}

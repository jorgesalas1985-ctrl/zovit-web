"use client";

import { Protected } from "@/components/Protected";
import { RoleGuard } from "@/components/RoleGuard";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const copyByStatus = {
  success: {
    title: "Pago aprobado",
    text: "Mercado Pago confirmó tu pago. ZOVIT lo retendrá hasta que confirmes que el trabajo fue completado.",
    icon: CheckCircle2,
    tone: "success",
  },
  failure: {
    title: "Pago rechazado",
    text: "El pago no se completó. Puedes intentarlo nuevamente desde tu panel de pagos.",
    icon: XCircle,
    tone: "error",
  },
  pending: {
    title: "Pago pendiente",
    text: "Tu pago quedó pendiente. Si elegiste un medio offline, completa el pago en el punto indicado por Mercado Pago.",
    icon: Clock3,
    tone: "warn",
  },
} as const;

export default function MercadoPagoReturnPage() {
  const params = useParams<{ status: string }>();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const statusKey =
    params.status === "success" || params.status === "failure" || params.status === "pending"
      ? params.status
      : "failure";
  const copy = copyByStatus[statusKey];
  const Icon = copy.icon;

  useEffect(() => {
    async function syncReturn() {
      const externalReference =
        searchParams.get("external_reference") ?? searchParams.get("payment") ?? undefined;

      if (!externalReference) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/payments/mercadopago/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalReference,
          paymentId: searchParams.get("payment_id") ?? undefined,
          collectionStatus: searchParams.get("collection_status") ?? searchParams.get("status") ?? undefined,
          status: searchParams.get("status") ?? undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo sincronizar el retorno de Mercado Pago.");
      } else if (data.registered) {
        setMessage("Pago registrado en ZOVIT correctamente.");
      } else if (data.alreadyProcessed) {
        setMessage("Este pago ya había sido procesado.");
      }

      setLoading(false);
    }

    void syncReturn();
  }, [searchParams]);

  return (
    <Protected>
      <RoleGuard allowedRoles={["client", "admin"]}>
        <main className="simplePage">
          <section className={`formPageCard mpReturn mpReturn-${copy.tone}`}>
            <Icon size={42} />
            <h1>{copy.title}</h1>
            <p className="muted">{copy.text}</p>
            {loading && <p className="muted">Sincronizando pago con ZOVIT…</p>}
            {message && (
              <div className="formMessage">
                <AlertCircle size={17} /> {message}
              </div>
            )}
            <Link href="/pagos" className="primaryButton">
              Ir a mis pagos <ArrowRight size={16} />
            </Link>
          </section>
        </main>
      </RoleGuard>
    </Protected>
  );
}

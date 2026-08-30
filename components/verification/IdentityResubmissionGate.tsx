"use client";

import { useAuth } from "@/components/AuthProvider";
import { AlertTriangle, FileUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function IdentityResubmissionGate() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!user) { setBlocked(false); return; }
    void fetch("/api/verification/resubmission-gate", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { blocked?: boolean; reason?: string }) => { setBlocked(Boolean(data.blocked)); setReason(data.reason ?? ""); })
      .catch(() => setBlocked(false));
  }, [user, pathname]);

  if (!blocked || pathname === "/verificacion") return null;
  return (
    <div className="identityResubmissionGate" role="dialog" aria-modal="true" aria-label="Documentos pendientes">
      <section>
        <AlertTriangle size={32} aria-hidden="true" />
        <span className="eyebrow">CUENTA SUSPENDIDA POR DOCUMENTOS</span>
        <h1>Debes completar la corrección documental</h1>
        <p>El plazo de 30 días para reenviar los documentos solicitados venció. Para volver a usar ZOVIT, reemplaza los archivos observados y envíalos nuevamente a revisión.</p>
        {reason ? <p className="identityResubmissionReason">{reason}</p> : null}
        <button type="button" className="primaryButton" onClick={() => router.replace("/verificacion")}><FileUp size={19} /> Completar documentos ahora</button>
      </section>
    </div>
  );
}

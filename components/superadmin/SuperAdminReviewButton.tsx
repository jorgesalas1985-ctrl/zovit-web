"use client";

import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { FloatingToast } from "@/components/ui/FloatingToast";
import { ClipboardCheck } from "lucide-react";
import { useCallback, useState } from "react";

type ToastState = { message: string; tone: "error" | "success" | "info" };

/**
 * Botón de super admin para disparar revisión de identidades al instante.
 */
export function SuperAdminReviewButton() {
  const { isRealSuperAdmin } = useSuperAdminView();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  if (!isRealSuperAdmin) return null;

  async function runReview() {
    if (busy) return;
    setBusy(true);
    setToast({ message: "Procesando cola de verificación…", tone: "info" });

    try {
      const response = await fetch("/api/intranet/verification/ai-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 15, includeDudosos: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        processed?: number;
        approved?: number;
        rejected?: number;
        dudoso?: number;
      };

      if (!response.ok) {
        setToast({
          message: data.error ?? "No se pudo lanzar la revisión.",
          tone: "error",
        });
        return;
      }

      const processed = data.processed ?? 0;
      setToast({
        message: processed
          ? `Revisión lista: ${processed} casos · ${data.approved ?? 0} aprobados · ${data.rejected ?? 0} rechazados · ${data.dudoso ?? 0} dudosos.`
          : "No hay carnets pendientes. Si la cuenta fue recién creada, primero debe confirmar el correo e ingresar para enviar sus documentos a revisión.",
        tone: processed ? "success" : "info",
      });
    } catch {
      setToast({ message: "Error de red al lanzar la revisión.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {toast && (
        <FloatingToast
          message={toast.message}
          tone={toast.tone}
          seconds={10}
          onClose={clearToast}
        />
      )}
      <button
        type="button"
        className="superAdminReviewButton"
        disabled={busy}
        onClick={() => void runReview()}
        title="Revisar cola de verificación de identidad ahora"
      >
        <ClipboardCheck size={18} aria-hidden />
        <span>{busy ? "Revisando…" : "Revisar identidades"}</span>
      </button>
    </>
  );
}

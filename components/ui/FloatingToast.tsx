"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  message: string;
  tone?: "error" | "success" | "info";
  seconds?: number;
  onClose: () => void;
};

export function FloatingToast({ message, tone = "error", seconds = 10, onClose }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [message, seconds, onClose]);

  return (
    <div className={`floatingToast floatingToast--${tone}`} role="alert" aria-live="assertive">
      {tone === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <p>{message}</p>
      <button type="button" className="floatingToastClose" aria-label="Cerrar" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
